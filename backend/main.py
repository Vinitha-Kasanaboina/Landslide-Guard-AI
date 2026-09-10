import os
import uuid
import json
from typing import Optional, List
from datetime import datetime

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from database import init_db, get_db_connection
from ai_engine import analyze_image_file
from risk_engine import risk_engine_instance
from emergency_priority import calculate_emergency_priority
from sync_manager import handle_metadata_sync, process_chunk_upload, compress_image_bytes, MEDIA_DIR
from sample_data import seed_sample_data

app = FastAPI(title="LandslideGuard AI API", version="1.0.0")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static media hosting for images
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

# Init DB & seed sample data on startup
@app.on_event("startup")
def startup_event():
    init_db()
    seed_sample_data()
    # Create sample placeholder images if not existing
    for sample_img in ["sample_ground_crack.jpg", "sample_landslide_debris.jpg", "sample_rockfall.jpg"]:
        spath = os.path.join(MEDIA_DIR, sample_img)
        if not os.path.exists(spath):
            with open(spath, "wb") as f:
                # Write minimal placeholder file
                f.write(b"SAMPLE_IMAGE_CONTENT")

# Data Models
class MetadataSyncRequest(BaseModel):
    id: Optional[str] = None
    local_report_id: Optional[str] = None
    latitude: float
    longitude: float
    gps_accuracy: float = 10.0
    location_name: Optional[str] = "Remote Hilly Region"
    pilot_region: Optional[str] = "Wayanad, Kerala"
    timestamp: str
    description: Optional[str] = ""
    incident_type: Optional[str] = "Soil Movement"
    offline_ai_result: Optional[str] = None
    offline_ai_confidence: Optional[float] = None
    user_name: Optional[str] = "Citizen"
    user_role: Optional[str] = "Citizen"

class ChunkUploadRequest(BaseModel):
    upload_id: str
    report_id: str
    chunk_index: int
    total_chunks: int
    chunk_data_base64: str

class RiskPredictionRequest(BaseModel):
    rainfall_24h: float = 80.0
    soil_moisture: float = 65.0
    slope_deg: float = 38.0
    elevation: float = 1400.0
    hist_events: int = 4
    ai_severity: str = "High"
    nearby_reports: int = 2

class BroadcastAlertRequest(BaseModel):
    title: str
    location_name: str
    latitude: float
    longitude: float
    risk_score: float
    priority_label: str
    ai_detection: str

# API Routes

@app.get("/api/health")
def health_check():
    return {"status": "online", "system": "LandslideGuard AI Core", "timestamp": datetime.now().isoformat()}

@app.post("/api/reports")
async def create_full_report(
    latitude: float = Form(...),
    longitude: float = Form(...),
    gps_accuracy: float = Form(10.0),
    location_name: str = Form("Remote Hilly Region"),
    pilot_region: str = Form("Wayanad, Kerala"),
    timestamp: str = Form(...),
    description: str = Form(""),
    incident_type: str = Form("Soil Movement"),
    user_name: str = Form("Citizen"),
    user_role: str = Form("Citizen"),
    offline_ai_result: str = Form(None),
    offline_ai_confidence: float = Form(None),
    image: Optional[UploadFile] = File(None)
):
    report_id = f"rep_{uuid.uuid4().hex[:8]}"
    now = datetime.now().isoformat()
    image_url = None

    if image:
        image_bytes = await image.read()
        filename = f"{report_id}_{image.filename}"
        filepath = os.path.join(MEDIA_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(image_bytes)
        image_url = f"/media/{filename}"
        
        # Perform server AI vision analysis
        ai_res = analyze_image_file(filepath, hint_incident_type=incident_type)
    else:
        ai_res = analyze_image_file("", hint_incident_type=incident_type)

    # Dynamic risk calculation
    risk_res = risk_engine_instance.predict_risk(
        rainfall_24h=120.0,
        soil_moisture=75.0,
        slope_deg=38.0,
        ai_severity=ai_res["severity"],
        nearby_reports=2
    )

    # Emergency Priority
    prio_res = calculate_emergency_priority(
        risk_score=risk_res["risk_score"],
        ai_severity=ai_res["severity"],
        nearby_reports=2
    )

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO reports (
            id, local_report_id, user_role, user_name, latitude, longitude,
            gps_accuracy, location_name, pilot_region, timestamp, description,
            incident_type, image_path, sync_status, metadata_synced, image_synced,
            offline_ai_result, offline_ai_confidence, server_ai_class,
            server_ai_confidence, server_ai_severity, risk_score, risk_category,
            priority_level, priority_label, verification_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Synced Successfully', 1, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Unverified', ?)
    """, (
        report_id, report_id, user_role, user_name, latitude, longitude,
        gps_accuracy, location_name, pilot_region, timestamp, description,
        incident_type, image_url, offline_ai_result, offline_ai_confidence,
        ai_res["class"], ai_res["confidence"], ai_res["severity"],
        risk_res["risk_score"], risk_res["category"], prio_res["priority_level"],
        prio_res["priority_label"], now
    ))

    # Auto issue alert if priority 1
    if prio_res["priority_level"] == 1:
        cursor.execute("""
            INSERT INTO alerts (
                id, report_id, title, location_name, latitude, longitude,
                risk_score, priority_label, ai_detection, gps_accuracy, issued_at, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
        """, (
            f"alt_{report_id}", report_id, f"CRITICAL ALERT: {ai_res['class']} detected in {location_name}",
            location_name, latitude, longitude, risk_res["risk_score"],
            prio_res["priority_label"], ai_res["class"], gps_accuracy, now
        ))

    conn.commit()
    conn.close()

    return {
        "status": "success",
        "report_id": report_id,
        "server_ai": ai_res,
        "risk_analysis": risk_res,
        "emergency_priority": prio_res
    }

@app.post("/api/reports/{id}/sync-metadata")
@app.post("/api/reports/{id}/sync")
def sync_report_metadata(id: str, req: MetadataSyncRequest):
    req_dict = req.dict()
    req_dict["id"] = id
    res = handle_metadata_sync(req_dict)
    
    # Calculate server AI & risk score for metadata
    ai_res = analyze_image_file("", hint_incident_type=req.incident_type)
    risk_res = risk_engine_instance.predict_risk(ai_severity=ai_res["severity"])
    prio_res = calculate_emergency_priority(risk_score=risk_res["risk_score"], ai_severity=ai_res["severity"])

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE reports SET
            server_ai_class = ?,
            server_ai_confidence = ?,
            server_ai_severity = ?,
            risk_score = ?,
            risk_category = ?,
            priority_level = ?,
            priority_label = ?
        WHERE id = ?
    """, (
        ai_res["class"], ai_res["confidence"], ai_res["severity"],
        risk_res["risk_score"], risk_res["category"], prio_res["priority_level"],
        prio_res["priority_label"], id
    ))
    conn.commit()
    conn.close()

    res["server_ai"] = ai_res
    res["risk_analysis"] = risk_res
    res["emergency_priority"] = prio_res
    return res

@app.post("/api/reports/{id}/upload-chunk")
def upload_report_chunk(id: str, req: ChunkUploadRequest):
    return process_chunk_upload(
        upload_id=req.upload_id,
        report_id=id,
        chunk_index=req.chunk_index,
        total_chunks=req.total_chunks,
        chunk_base64=req.chunk_data_base64
    )

@app.get("/api/reports/{id}/upload-status")
def get_upload_status(id: str, upload_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM upload_chunks WHERE upload_id = ?", (upload_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return {"upload_id": upload_id, "received_chunks": 0, "completed": False}
    
    chunks_map = json.loads(row["chunks_map"])
    return {
        "upload_id": upload_id,
        "received_chunks": len(chunks_map),
        "total_chunks": row["total_chunks"],
        "received_indexes": chunks_map,
        "completed": bool(row["completed"])
    }

@app.post("/api/analyze-image")
async def analyze_image_endpoint(
    image: Optional[UploadFile] = File(None),
    incident_type: Optional[str] = Form(None)
):
    if image:
        temp_path = os.path.join(MEDIA_DIR, f"temp_{uuid.uuid4().hex[:6]}_{image.filename}")
        content = await image.read()
        with open(temp_path, "wb") as f:
            f.write(content)
        res = analyze_image_file(temp_path, hint_incident_type=incident_type)
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return res
    else:
        return analyze_image_file("", hint_incident_type=incident_type)

@app.post("/api/predict-risk")
def predict_risk_endpoint(req: RiskPredictionRequest):
    return risk_engine_instance.predict_risk(
        rainfall_24h=req.rainfall_24h,
        soil_moisture=req.soil_moisture,
        slope_deg=req.slope_deg,
        elevation=req.elevation,
        hist_events=req.hist_events,
        ai_severity=req.ai_severity,
        nearby_reports=req.nearby_reports
    )

@app.get("/api/map/incidents")
def get_map_incidents(pilot_region: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if pilot_region:
        cursor.execute("SELECT * FROM reports WHERE pilot_region = ? ORDER BY created_at DESC", (pilot_region,))
    else:
        cursor.execute("SELECT * FROM reports ORDER BY created_at DESC")
    
    rows = cursor.fetchall()
    conn.close()

    incidents = []
    for r in rows:
        incidents.append(dict(r))
    return incidents

@app.get("/api/map/risk-zones")
def get_map_risk_zones(pilot_region: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if pilot_region:
        cursor.execute("SELECT * FROM risk_zones WHERE pilot_region = ?", (pilot_region,))
    else:
        cursor.execute("SELECT * FROM risk_zones")
    
    rows = cursor.fetchall()
    conn.close()

    zones = []
    for r in rows:
        z = dict(r)
        z["polygon_coords"] = json.loads(z["polygon_coords"])
        z["critical_infra"] = json.loads(z["critical_infra"])
        zones.append(z)
    return zones

@app.get("/api/alerts")
def get_alerts():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM alerts WHERE status = 'Active' ORDER BY issued_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/alerts/broadcast")
def broadcast_alert(req: BroadcastAlertRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    alert_id = f"alt_{uuid.uuid4().hex[:6]}"
    now = datetime.now().isoformat()
    cursor.execute("""
        INSERT INTO alerts (
            id, title, location_name, latitude, longitude, risk_score,
            priority_label, ai_detection, gps_accuracy, issued_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 8.0, ?, 'Active')
    """, (
        alert_id, req.title, req.location_name, req.latitude, req.longitude,
        req.risk_score, req.priority_label, req.ai_detection, now
    ))
    conn.commit()
    conn.close()
    return {"status": "broadcasted", "alert_id": alert_id}

@app.post("/api/reports/{id}/verify")
def verify_report(id: str, action: str = Body(..., embed=True)):
    conn = get_db_connection()
    cursor = conn.cursor()
    status = "Verified" if action == "verify" else "Rejected"
    cursor.execute("UPDATE reports SET verification_status = ? WHERE id = ?", (status, id))
    conn.commit()
    conn.close()
    return {"status": "updated", "report_id": id, "verification_status": status}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

