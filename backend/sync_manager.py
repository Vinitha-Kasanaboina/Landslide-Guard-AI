import os
import json
import uuid
import base64
from datetime import datetime
from PIL import Image
import io
from database import get_db_connection

MEDIA_DIR = os.path.join(os.path.dirname(__file__), "media")
os.makedirs(MEDIA_DIR, exist_ok=True)

def compress_image_bytes(image_bytes: bytes, target_max_kb: int = 500) -> bytes:
    """
    Compresses an input image to a low-bandwidth size (e.g. 5MB -> 450KB)
    """
    try:
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize if dimensions are huge
        max_dim = 1200
        if max(img.size) > max_dim:
            img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
            
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=60, optimize=True)
        return buffer.getvalue()
    except Exception as e:
        return image_bytes

def handle_metadata_sync(report_data: dict):
    """
    Priority 1: Sync critical emergency metadata first when connection is very poor (2G).
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    report_id = report_data.get("id") or str(uuid.uuid4())
    
    cursor.execute("SELECT id FROM reports WHERE id = ?", (report_id,))
    existing = cursor.fetchone()

    now = datetime.now().isoformat()

    if existing:
        cursor.execute("""
            UPDATE reports SET
                latitude = ?,
                longitude = ?,
                gps_accuracy = ?,
                location_name = ?,
                pilot_region = ?,
                timestamp = ?,
                description = ?,
                incident_type = ?,
                metadata_synced = 1,
                sync_status = 'Metadata Synced'
            WHERE id = ?
        """, (
            report_data.get("latitude"),
            report_data.get("longitude"),
            report_data.get("gps_accuracy"),
            report_data.get("location_name", "Remote Hilly Region"),
            report_data.get("pilot_region", "Wayanad, Kerala"),
            report_data.get("timestamp", now),
            report_data.get("description", ""),
            report_data.get("incident_type", "Soil Movement"),
            report_id
        ))
    else:
        cursor.execute("""
            INSERT INTO reports (
                id, local_report_id, user_role, user_name, user_contact,
                latitude, longitude, gps_accuracy, location_name, pilot_region,
                timestamp, description, incident_type, metadata_synced, sync_status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'Metadata Synced', ?)
        """, (
            report_id,
            report_data.get("local_report_id", report_id),
            report_data.get("user_role", "Citizen"),
            report_data.get("user_name", "Anonymous Citizen"),
            report_data.get("user_contact", ""),
            report_data.get("latitude"),
            report_data.get("longitude"),
            report_data.get("gps_accuracy", 10.0),
            report_data.get("location_name", "Remote Hilly Region"),
            report_data.get("pilot_region", "Wayanad, Kerala"),
            report_data.get("timestamp", now),
            report_data.get("description", ""),
            report_data.get("incident_type", "Soil Movement"),
            now
        ))

    conn.commit()
    conn.close()

    return {"status": "success", "report_id": report_id, "sync_stage": "Metadata Synced"}

def process_chunk_upload(upload_id: str, report_id: str, chunk_index: int, total_chunks: int, chunk_base64: str):
    """
    Handles chunked resumable upload for low bandwidth internet.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM upload_chunks WHERE upload_id = ?", (upload_id,))
    session = cursor.fetchone()

    chunk_bytes = base64.b64decode(chunk_base64)
    chunk_file_dir = os.path.join(MEDIA_DIR, "chunks", upload_id)
    os.makedirs(chunk_file_dir, exist_ok=True)
    chunk_path = os.path.join(chunk_file_dir, f"chunk_{chunk_index}.bin")

    with open(chunk_path, "wb") as f:
        f.write(chunk_bytes)

    now = datetime.now().isoformat()

    if not session:
        received_map = [chunk_index]
        cursor.execute("""
            INSERT INTO upload_chunks (
                upload_id, report_id, total_chunks, received_chunks, chunks_map, completed, created_at, updated_at
            ) VALUES (?, ?, ?, 1, ?, 0, ?, ?)
        """, (upload_id, report_id, total_chunks, json.dumps(received_map), now, now))
    else:
        received_map = json.loads(session["chunks_map"])
        if chunk_index not in received_map:
            received_map.append(chunk_index)
        
        cursor.execute("""
            UPDATE upload_chunks SET
                received_chunks = ?,
                chunks_map = ?,
                updated_at = ?
            WHERE upload_id = ?
        """, (len(received_map), json.dumps(received_map), now, upload_id))

    conn.commit()

    is_completed = len(received_map) >= total_chunks
    final_file_url = None

    if is_completed:
        # Reassemble chunks
        final_filename = f"report_{report_id}_{uuid.uuid4().hex[:6]}.jpg"
        final_file_path = os.path.join(MEDIA_DIR, final_filename)
        
        with open(final_file_path, "wb") as outfile:
            for i in range(total_chunks):
                cpath = os.path.join(chunk_file_dir, f"chunk_{i}.bin")
                if os.path.exists(cpath):
                    with open(cpath, "rb") as infile:
                        outfile.write(infile.read())

        cursor.execute("UPDATE upload_chunks SET completed = 1 WHERE upload_id = ?", (upload_id,))
        
        # Update report DB record
        cursor.execute("""
            UPDATE reports SET
                image_path = ?,
                image_synced = 1,
                sync_status = 'Synced Successfully'
            WHERE id = ?
        """, (f"/media/{final_filename}", report_id))
        
        conn.commit()
        final_file_url = f"/media/{final_filename}"

    conn.close()

    return {
        "upload_id": upload_id,
        "report_id": report_id,
        "received_chunks": len(received_map),
        "total_chunks": total_chunks,
        "progress_pct": round((len(received_map) / total_chunks) * 100, 1),
        "completed": is_completed,
        "file_url": final_file_url
    }
