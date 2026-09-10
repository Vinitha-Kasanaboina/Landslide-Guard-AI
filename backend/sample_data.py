import json
import uuid
from datetime import datetime, timedelta
from database import get_db_connection
from risk_engine import risk_engine_instance
from emergency_priority import calculate_emergency_priority

# Pilot Regions Coordinates
# Wayanad, Kerala: ~ 11.6854 N, 76.1320 E (Meppadi / Chooralmala / Mundakkai area)
# Rudraprayag, Uttarakhand: ~ 30.2844 N, 78.9811 E (Kedarnath valley / Sonprayag)

SAMPLE_RISK_ZONES = [
    {
        "id": "zone_wayanad_1",
        "name": "Chooralmala - Mundakkai Slope Zone",
        "pilot_region": "Wayanad, Kerala",
        "polygon_coords": [
            [11.6950, 76.1200],
            [11.7050, 76.1400],
            [11.6850, 76.1550],
            [11.6750, 76.1300]
        ],
        "baseline_risk_score": 78.5,
        "rainfall_mm": 185.0,
        "soil_moisture_pct": 88.0,
        "avg_slope_deg": 42.0,
        "population_at_risk": 4200,
        "critical_infra": ["State Highway 59", "Chooralmala School", "Primary Health Centre"]
    },
    {
        "id": "zone_wayanad_2",
        "name": "Meppadi Tea Estate Ridge",
        "pilot_region": "Wayanad, Kerala",
        "polygon_coords": [
            [11.6600, 76.1000],
            [11.6700, 76.1200],
            [11.6500, 76.1250],
            [11.6450, 76.1050]
        ],
        "baseline_risk_score": 45.0,
        "rainfall_mm": 92.0,
        "soil_moisture_pct": 62.0,
        "avg_slope_deg": 28.0,
        "population_at_risk": 1800,
        "critical_infra": ["Local Estate Road"]
    },
    {
        "id": "zone_uttarakhand_1",
        "name": "Sonprayag - Gaurikund Highway Corridor",
        "pilot_region": "Rudraprayag, Uttarakhand",
        "polygon_coords": [
            [30.6200, 79.0100],
            [30.6350, 79.0300],
            [30.6150, 79.0450],
            [30.6000, 79.0200]
        ],
        "baseline_risk_score": 84.0,
        "rainfall_mm": 210.0,
        "soil_moisture_pct": 92.0,
        "avg_slope_deg": 52.0,
        "population_at_risk": 6500,
        "critical_infra": ["NH-107 Pilgrim Highway", "Sonprayag Bridge", "Disaster Emergency Post"]
    },
    {
        "id": "zone_uttarakhand_2",
        "name": "Ukhimath Hillside Slope",
        "pilot_region": "Rudraprayag, Uttarakhand",
        "polygon_coords": [
            [30.5100, 79.0900],
            [30.5250, 79.1100],
            [30.5000, 79.1200],
            [30.4900, 79.1000]
        ],
        "baseline_risk_score": 38.0,
        "rainfall_mm": 45.0,
        "soil_moisture_pct": 48.0,
        "avg_slope_deg": 24.0,
        "population_at_risk": 1200,
        "critical_infra": ["District Secondary Road"]
    }
]

SAMPLE_REPORTS = [
    {
        "id": "rep_001",
        "local_report_id": "loc_w101",
        "user_name": "Rajesh Kumar (Field Officer)",
        "user_role": "Field Officer",
        "latitude": 11.6912,
        "longitude": 76.1345,
        "gps_accuracy": 6.5,
        "location_name": "Chooralmala Bridge Segment",
        "pilot_region": "Wayanad, Kerala",
        "timestamp": (datetime.now() - timedelta(hours=2)).isoformat(),
        "description": "Deep ground fissure observed spanning 15 meters along the hill slope after continuous morning downpour.",
        "incident_type": "Ground Crack",
        "image_path": "/media/sample_ground_crack.jpg",
        "sync_status": "Synced Successfully",
        "metadata_synced": 1,
        "image_synced": 1,
        "offline_ai_result": "Possible Ground Crack Detected",
        "offline_ai_confidence": 84.0,
        "server_ai_class": "Ground Crack",
        "server_ai_confidence": 92.4,
        "server_ai_severity": "Moderate",
        "verification_status": "Verified"
    },
    {
        "id": "rep_002",
        "local_report_id": "loc_w102",
        "user_name": "Ananya Nair (Citizen)",
        "user_role": "Citizen",
        "latitude": 11.6880,
        "longitude": 76.1380,
        "gps_accuracy": 8.0,
        "location_name": "Mundakkai Road Section",
        "pilot_region": "Wayanad, Kerala",
        "timestamp": (datetime.now() - timedelta(minutes=45)).isoformat(),
        "description": "Large boulders and mud completely blocking local connectivity road.",
        "incident_type": "Landslide Debris",
        "image_path": "/media/sample_landslide_debris.jpg",
        "sync_status": "Synced Successfully",
        "metadata_synced": 1,
        "image_synced": 1,
        "offline_ai_result": "Debris Movement Warning",
        "offline_ai_confidence": 88.0,
        "server_ai_class": "Landslide Debris",
        "server_ai_confidence": 95.8,
        "server_ai_severity": "High",
        "verification_status": "Verified"
    },
    {
        "id": "rep_003",
        "local_report_id": "loc_u201",
        "user_name": "Vikram Singh (Citizen)",
        "user_role": "Citizen",
        "latitude": 30.6280,
        "longitude": 79.0210,
        "gps_accuracy": 5.2,
        "location_name": "NH-107 Km 42 near Sonprayag",
        "pilot_region": "Rudraprayag, Uttarakhand",
        "timestamp": (datetime.now() - timedelta(minutes=20)).isoformat(),
        "description": "Massive rockfall from upper cliff side, active falling stones ongoing.",
        "incident_type": "Rockfall",
        "image_path": "/media/sample_rockfall.jpg",
        "sync_status": "Synced Successfully",
        "metadata_synced": 1,
        "image_synced": 1,
        "offline_ai_result": "Possible Rockfall Detected",
        "offline_ai_confidence": 91.0,
        "server_ai_class": "Rockfall",
        "server_ai_confidence": 97.2,
        "server_ai_severity": "Critical",
        "verification_status": "Verified"
    }
]

def seed_sample_data():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if data exists
    cursor.execute("SELECT COUNT(*) FROM risk_zones")
    if cursor.fetchone()[0] == 0:
        now = datetime.now().isoformat()
        
        # Seed Risk Zones
        for z in SAMPLE_RISK_ZONES:
            risk_res = risk_engine_instance.predict_risk(
                rainfall_24h=z["rainfall_mm"],
                soil_moisture=z["soil_moisture_pct"],
                slope_deg=z["avg_slope_deg"],
                hist_events=4,
                ai_severity="High"
            )
            cursor.execute("""
                INSERT INTO risk_zones (
                    id, name, pilot_region, polygon_coords, baseline_risk_score,
                    current_risk_score, risk_category, rainfall_mm, soil_moisture_pct,
                    avg_slope_deg, population_at_risk, critical_infra, last_updated
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                z["id"], z["name"], z["pilot_region"], json.dumps(z["polygon_coords"]),
                z["baseline_risk_score"], risk_res["risk_score"], risk_res["category"],
                z["rainfall_mm"], z["soil_moisture_pct"], z["avg_slope_deg"],
                z["population_at_risk"], json.dumps(z["critical_infra"]), now
            ))

        # Seed Sample Reports
        for r in SAMPLE_REPORTS:
            risk_res = risk_engine_instance.predict_risk(
                rainfall_24h=140.0,
                soil_moisture=82.0,
                slope_deg=38.0,
                ai_severity=r["server_ai_severity"],
                nearby_reports=2
            )
            prio_res = calculate_emergency_priority(
                risk_score=risk_res["risk_score"],
                ai_severity=r["server_ai_severity"],
                nearby_reports=2,
                affected_population=3000,
                critical_infra=["State Highway", "School"]
            )
            
            cursor.execute("""
                INSERT INTO reports (
                    id, local_report_id, user_role, user_name, latitude, longitude,
                    gps_accuracy, location_name, pilot_region, timestamp, description,
                    incident_type, image_path, sync_status, metadata_synced, image_synced,
                    offline_ai_result, offline_ai_confidence, server_ai_class,
                    server_ai_confidence, server_ai_severity, risk_score, risk_category,
                    priority_level, priority_label, verification_status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                r["id"], r["local_report_id"], r["user_role"], r["user_name"],
                r["latitude"], r["longitude"], r["gps_accuracy"], r["location_name"],
                r["pilot_region"], r["timestamp"], r["description"], r["incident_type"],
                r["image_path"], r["sync_status"], r["metadata_synced"], r["image_synced"],
                r["offline_ai_result"], r["offline_ai_confidence"], r["server_ai_class"],
                r["server_ai_confidence"], r["server_ai_severity"], risk_res["risk_score"],
                risk_res["category"], prio_res["priority_level"], prio_res["priority_label"],
                r["verification_status"], now
            ))

            # Also seed active alert for high risk reports
            if prio_res["priority_level"] == 1:
                cursor.execute("""
                    INSERT INTO alerts (
                        id, report_id, title, location_name, latitude, longitude,
                        risk_score, priority_label, ai_detection, gps_accuracy, issued_at, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
                """, (
                    f"alt_{r['id']}", r["id"], f"CRITICAL ALERT: {r['incident_type']} in {r['location_name']}",
                    r["location_name"], r["latitude"], r["longitude"], risk_res["risk_score"],
                    prio_res["priority_label"], r["server_ai_class"], r["gps_accuracy"], now
                ))

        conn.commit()

    conn.close()
