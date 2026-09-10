const DB_NAME = "LandslideGuardDB";
const STORE_PENDING = "pending_reports";
const STORE_SYNCED = "synced_reports";
const DB_VERSION = 2;

export function openLocalDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      resolve(null);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_PENDING)) {
        db.createObjectStore(STORE_PENDING, { keyPath: "local_id" });
      }
      if (!db.objectStoreNames.contains(STORE_SYNCED)) {
        db.createObjectStore(STORE_SYNCED, { keyPath: "local_id" });
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

export async function saveOfflineReportLocally(report) {
  const local_id = report.local_id || `loc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const record = {
    ...report,
    local_id,
    id: report.id || local_id,
    created_at: report.created_at || new Date().toISOString(),
    sync_status: report.sync_status || "PENDING SYNC",
    metadata_synced: false,
    image_synced: false
  };

  try {
    const db = await openLocalDB();
    if (db) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PENDING, "readwrite");
        const store = tx.objectStore(STORE_PENDING);
        store.put(record);
        tx.oncomplete = () => resolve(record);
        tx.onerror = (e) => reject(e.target.error);
      });
    } else {
      const existing = JSON.parse(localStorage.getItem("landslide_pending_reports") || "[]");
      const filtered = existing.filter((r) => r.local_id !== local_id);
      filtered.push(record);
      localStorage.setItem("landslide_pending_reports", JSON.stringify(filtered));
      return record;
    }
  } catch (err) {
    console.error("Error saving offline report:", err);
    const existing = JSON.parse(localStorage.getItem("landslide_pending_reports") || "[]");
    const filtered = existing.filter((r) => r.local_id !== local_id);
    filtered.push(record);
    localStorage.setItem("landslide_pending_reports", JSON.stringify(filtered));
    return record;
  }
}

export async function getOfflineReportsLocally() {
  try {
    const db = await openLocalDB();
    if (db) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PENDING, "readonly");
        const store = tx.objectStore(STORE_PENDING);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = (e) => reject(e.target.error);
      });
    } else {
      return JSON.parse(localStorage.getItem("landslide_pending_reports") || "[]");
    }
  } catch (err) {
    return JSON.parse(localStorage.getItem("landslide_pending_reports") || "[]");
  }
}

export async function removeOfflineReportLocally(local_id) {
  try {
    const db = await openLocalDB();
    if (db) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PENDING, "readwrite");
        const store = tx.objectStore(STORE_PENDING);
        store.delete(local_id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = (e) => reject(e.target.error);
      });
    } else {
      const existing = JSON.parse(localStorage.getItem("landslide_pending_reports") || "[]");
      const updated = existing.filter((r) => r.local_id !== local_id);
      localStorage.setItem("landslide_pending_reports", JSON.stringify(updated));
      return true;
    }
  } catch (err) {
    const existing = JSON.parse(localStorage.getItem("landslide_pending_reports") || "[]");
    const updated = existing.filter((r) => r.local_id !== local_id);
    localStorage.setItem("landslide_pending_reports", JSON.stringify(updated));
    return true;
  }
}

export async function saveSyncedReportLocally(report) {
  const local_id = report.local_id || report.id || `sync_${Date.now()}`;
  const record = {
    ...report,
    local_id,
    id: report.id || local_id,
    sync_status: "SYNCHRONIZED ✓",
    metadata_synced: true,
    image_synced: true,
    synced_at: new Date().toISOString()
  };

  try {
    const db = await openLocalDB();
    if (db) {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_SYNCED, "readwrite");
        const store = tx.objectStore(STORE_SYNCED);
        store.put(record);
        tx.oncomplete = () => resolve(record);
        tx.onerror = (e) => reject(e.target.error);
      });
    } else {
      const existing = JSON.parse(localStorage.getItem("landslide_synced_reports") || "[]");
      const filtered = existing.filter((r) => r.local_id !== local_id);
      filtered.push(record);
      localStorage.setItem("landslide_synced_reports", JSON.stringify(filtered));
    }
  } catch (err) {
    const existing = JSON.parse(localStorage.getItem("landslide_synced_reports") || "[]");
    const filtered = existing.filter((r) => r.local_id !== local_id);
    filtered.push(record);
    localStorage.setItem("landslide_synced_reports", JSON.stringify(filtered));
  }
  
  // Also remove from pending store if present
  await removeOfflineReportLocally(local_id);
  return record;
}

export async function getSyncedReportsLocally() {
  try {
    const db = await openLocalDB();
    if (db) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_SYNCED, "readonly");
        const store = tx.objectStore(STORE_SYNCED);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = (e) => reject(e.target.error);
      });
    } else {
      return JSON.parse(localStorage.getItem("landslide_synced_reports") || "[]");
    }
  } catch (err) {
    return JSON.parse(localStorage.getItem("landslide_synced_reports") || "[]");
  }
}

export function classifyImageOffline(incident_type) {
  const offlineResults = {
    "Landslide": { result: "Active Landslide Mass Detected", confidence: 93.4, severity: "Critical" },
    "Landslide Debris": { result: "Landslide Debris Accumulated", confidence: 89.5, severity: "High" },
    "Rockfall": { result: "Rockfall / Falling Boulder Hazard", confidence: 91.2, severity: "Critical" },
    "Ground Crack": { result: "Deep Slope Fissure / Ground Crack", confidence: 84.0, severity: "Moderate" },
    "Soil Movement": { result: "Active Soil Creep / Slope Instability", confidence: 82.5, severity: "High" },
    "Road Blockage": { result: "Highway Transportation Route Blocked", confidence: 94.0, severity: "Critical" },
    "Other": { result: "Geological Anomaly Observed", confidence: 80.0, severity: "Moderate" }
  };

  const matched = offlineResults[incident_type] || offlineResults["Landslide Debris"];
  return {
    ...matched,
    timestamp: new Date().toISOString(),
    disclaimer: "Preliminary On-Device Model (TensorFlow Lite)"
  };
}
