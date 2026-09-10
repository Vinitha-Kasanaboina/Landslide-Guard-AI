import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "landslide_guard.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Incident Reports table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        local_report_id TEXT,
        user_role TEXT DEFAULT 'Citizen',
        user_name TEXT,
        user_contact TEXT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        gps_accuracy REAL,
        location_name TEXT,
        pilot_region TEXT DEFAULT 'Wayanad, Kerala',
        timestamp TEXT NOT NULL,
        description TEXT,
        incident_type TEXT,
        image_path TEXT,
        compressed_image_path TEXT,
        sync_status TEXT DEFAULT 'Pending',
        metadata_synced INTEGER DEFAULT 0,
        image_synced INTEGER DEFAULT 0,
        offline_ai_result TEXT,
        offline_ai_confidence REAL,
        server_ai_class TEXT,
        server_ai_confidence REAL,
        server_ai_severity TEXT,
        risk_score REAL,
        risk_category TEXT,
        priority_level INTEGER,
        priority_label TEXT,
        verification_status TEXT DEFAULT 'Unverified',
        created_at TEXT NOT NULL
    )
    """)

    # Upload Chunks tracking table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS upload_chunks (
        upload_id TEXT PRIMARY KEY,
        report_id TEXT NOT NULL,
        total_chunks INTEGER NOT NULL,
        received_chunks INTEGER DEFAULT 0,
        chunks_map TEXT, -- JSON string of received chunk indexes
        file_path TEXT,
        completed INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    # GIS Risk Zones table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS risk_zones (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        pilot_region TEXT NOT NULL,
        polygon_coords TEXT NOT NULL, -- JSON array of [lat, lng]
        baseline_risk_score REAL NOT NULL,
        current_risk_score REAL NOT NULL,
        risk_category TEXT NOT NULL,
        rainfall_mm REAL DEFAULT 0.0,
        soil_moisture_pct REAL DEFAULT 0.0,
        avg_slope_deg REAL DEFAULT 0.0,
        population_at_risk INTEGER DEFAULT 0,
        critical_infra TEXT, -- JSON array of strings (e.g. Highways, Hospitals)
        last_updated TEXT NOT NULL
    )
    """)

    # Emergency Alerts table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        report_id TEXT,
        title TEXT NOT NULL,
        location_name TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        risk_score REAL NOT NULL,
        priority_label TEXT NOT NULL,
        ai_detection TEXT,
        gps_accuracy REAL,
        issued_at TEXT NOT NULL,
        status TEXT DEFAULT 'Active',
        actions_taken TEXT
    )
    """)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
