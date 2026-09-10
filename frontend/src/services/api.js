const API_BASE = "/api";

export async function fetchMapIncidents(pilotRegion) {
  try {
    const url = pilotRegion ? `${API_BASE}/map/incidents?pilot_region=${encodeURIComponent(pilotRegion)}` : `${API_BASE}/map/incidents`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch map incidents");
    return await res.json();
  } catch (err) {
    console.warn("API offline, returning fallback data:", err);
    return [];
  }
}

export async function fetchRiskZones(pilotRegion) {
  try {
    const url = pilotRegion ? `${API_BASE}/map/risk-zones?pilot_region=${encodeURIComponent(pilotRegion)}` : `${API_BASE}/map/risk-zones`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch risk zones");
    return await res.json();
  } catch (err) {
    console.warn("API offline, returning fallback risk zones:", err);
    return [];
  }
}

export async function fetchAlerts() {
  try {
    const res = await fetch(`${API_BASE}/alerts`);
    if (!res.ok) throw new Error("Failed to fetch alerts");
    return await res.json();
  } catch (err) {
    return [];
  }
}

export async function syncReportMetadataAPI(reportData) {
  const res = await fetch(`${API_BASE}/reports/${reportData.id || reportData.local_id}/sync-metadata`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reportData)
  });
  if (!res.ok) throw new Error("Metadata sync failed");
  return await res.json();
}

export async function uploadChunkAPI(chunkPayload) {
  const res = await fetch(`${API_BASE}/reports/${chunkPayload.report_id}/upload-chunk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(chunkPayload)
  });
  if (!res.ok) throw new Error("Chunk upload failed");
  return await res.json();
}

export async function predictRiskAPI(riskInput) {
  const res = await fetch(`${API_BASE}/predict-risk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(riskInput)
  });
  if (!res.ok) throw new Error("Risk prediction failed");
  return await res.json();
}

export async function verifyReportAPI(reportId, action) {
  const res = await fetch(`${API_BASE}/reports/${reportId}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action })
  });
  if (!res.ok) throw new Error("Report verification failed");
  return await res.json();
}
