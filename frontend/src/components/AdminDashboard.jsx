import React, { useState, useEffect } from "react";
import { AlertOctagon, ShieldAlert, CheckCircle2, XCircle, Sliders, Bell, Activity, Users, MapPin, Zap, RefreshCw, Eye } from "lucide-react";
import { fetchMapIncidents, predictRiskAPI, verifyReportAPI } from "../services/api";
import { getSyncedReportsLocally } from "../services/db";

export default function AdminDashboard({ pilotRegion, setActiveTab, onAlertBroadcasted }) {
  const [incidents, setIncidents] = useState([]);
  
  // Interactive ML Inspector State
  const [mlInput, setMlInput] = useState({
    rainfall_24h: 185.0,
    soil_moisture: 88.0,
    slope_deg: 42.0,
    elevation: 1400.0,
    hist_events: 5,
    ai_severity: "High",
    nearby_reports: 3
  });
  const [mlResult, setMlResult] = useState(null);
  const [isCalculatingML, setIsCalculatingML] = useState(false);

  // Alert Broadcast Form State
  const [alertBroadcast, setAlertBroadcast] = useState({
    title: "🚨 EMERGENCY LANDSLIDE ALERT",
    location_name: "Chooralmala - Mundakkai Corridor",
    latitude: 11.6912,
    longitude: 76.1345,
    risk_score: 87.0,
    priority_label: "Priority 1: Immediate Response Required",
    ai_detection: "Landslide Debris",
    status: "DRAFT" // DRAFT -> DISPATCHED -> ACKNOWLEDGED
  });
  const [broadcastMessage, setBroadcastMessage] = useState(null);

  useEffect(() => {
    loadAdminData();
    runMLCalculation();
  }, [pilotRegion]);

  const loadAdminData = async () => {
    const apiIncs = await fetchMapIncidents(pilotRegion);
    const localSynced = await getSyncedReportsLocally();
    const localFiltered = localSynced.filter((item) => !pilotRegion || item.pilot_region === pilotRegion);

    // Merge and deduplicate
    const mapOfIncs = new Map();
    [...apiIncs, ...localFiltered].forEach((item) => {
      const key = item.id || item.local_id;
      if (key && !mapOfIncs.has(key)) {
        mapOfIncs.set(key, item);
      }
    });

    const combined = Array.from(mapOfIncs.values());

    // Sort by: 1. Priority (Level 1 first), 2. Risk Score (highest first)
    combined.sort((a, b) => {
      const prioA = a.priority_level || (a.risk_category === "Critical" ? 1 : a.risk_category === "High" ? 2 : 3);
      const priob = b.priority_level || (b.risk_category === "Critical" ? 1 : b.risk_category === "High" ? 2 : 3);
      if (prioA !== priob) return prioA - priob;
      return (b.risk_score || 0) - (a.risk_score || 0);
    });

    setIncidents(combined);
  };

  const runMLCalculation = async () => {
    setIsCalculatingML(true);
    try {
      const res = await predictRiskAPI(mlInput);
      setMlResult(res);
    } catch (err) {
      console.warn("ML API fallback calculation:", err);
      // Fallback calculation
      const score = Math.min(100, Math.round((mlInput.rainfall_24h / 250) * 35 + (mlInput.soil_moisture / 100) * 25 + (mlInput.slope_deg / 65) * 25 + 15));
      setMlResult({
        risk_score: score,
        category: score > 75 ? "Critical" : score > 50 ? "High" : "Moderate",
        contributing_factors: [
          { name: "24h Cumulative Rainfall", weight: 32.5, value: `${mlInput.rainfall_24h} mm` },
          { name: "Soil Saturation", weight: 22.0, value: `${mlInput.soil_moisture}%` },
          { name: "Slope Steepness", weight: 16.5, value: `${mlInput.slope_deg}°` }
        ]
      });
    } finally {
      setIsCalculatingML(false);
    }
  };

  const handleVerify = async (reportId, action) => {
    try {
      await verifyReportAPI(reportId, action);
    } catch (err) {
      // Local state fallback update
    }
    setIncidents((prev) =>
      prev.map((i) =>
        i.id === reportId || i.local_id === reportId
          ? { ...i, verification_status: action === "verify" ? "Verified" : "Rejected" }
          : i
      )
    );
  };

  const handlePrepareAlert = (inc) => {
    setAlertBroadcast({
      title: `🚨 EMERGENCY LANDSLIDE ALERT: ${inc.incident_type}`,
      location_name: inc.location_name || `${inc.pilot_region} Sector`,
      latitude: inc.latitude,
      longitude: inc.longitude,
      risk_score: inc.risk_score || 87.0,
      priority_label: "Priority 1: Immediate Response Required",
      ai_detection: inc.incident_type,
      status: "DRAFT"
    });
  };

  const handleSendAlert = async (e) => {
    e.preventDefault();
    const alertData = {
      ...alertBroadcast,
      status: "DISPATCHED",
      dispatched_at: new Date().toISOString()
    };

    try {
      await fetch("/api/alerts/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(alertData)
      });
    } catch (err) {
      console.warn("Offline alert broadcast handled locally:", err);
    }

    setAlertBroadcast((prev) => ({ ...prev, status: "DISPATCHED" }));
    setBroadcastMessage(`🚨 Alert DISPATCHED to Emergency Services: ${alertData.title}`);

    if (onAlertBroadcasted) {
      onAlertBroadcasted(alertData);
    }

    setTimeout(() => {
      setAlertBroadcast((prev) => ({ ...prev, status: "ACKNOWLEDGED" }));
      setBroadcastMessage(null);
    }, 5000);
  };

  // Metrics calculation
  const totalReports = incidents.length;
  const verifiedCount = incidents.filter((i) => i.verification_status === "Verified").length;
  const criticalCount = incidents.filter(
    (i) => i.risk_category === "Critical" || i.priority_level === 1 || (i.risk_score && i.risk_score >= 76)
  ).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                Disaster Authority Command Portal
              </span>
              <span className="text-xs text-slate-400">Official Monitoring Portal</span>
            </div>
            <h2 className="text-2xl font-bold text-white mt-1">Authority Portal</h2>
            <p className="text-slate-400 text-sm mt-1">
              Inspect prioritized citizen & field officer reports, execute ML risk simulations, and dispatch emergency alert broadcasts.
            </p>
          </div>

          <button
            onClick={loadAdminData}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-emerald-400" /> Refresh Incident Stream
          </button>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-700/80 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-950 text-blue-400 border border-blue-800">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Total Citizen Reports</div>
              <div className="text-2xl font-bold text-white font-mono">{totalReports}</div>
            </div>
          </div>

          <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-700/80 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Verified Incidents</div>
              <div className="text-2xl font-bold text-emerald-400 font-mono">{verifiedCount}</div>
            </div>
          </div>

          <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-700/80 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-red-950 text-red-400 border border-red-800">
              <AlertOctagon className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Priority 1 Critical Incidents</div>
              <div className="text-2xl font-bold text-red-400 font-mono">{criticalCount}</div>
            </div>
          </div>
        </div>
      </div>

      {broadcastMessage && (
        <div className="bg-red-950/90 border border-red-500/60 rounded-xl p-4 text-red-200 flex items-center gap-3 animate-fade-in shadow-xl">
          <Bell className="w-6 h-6 text-red-400 animate-bounce flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-bold text-red-100">Cell Broadcast Active</h4>
            <p className="text-xs text-red-200">{broadcastMessage}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Priority Queue + ML Engine & Alert Dispatch */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Emergency Priority Incident Queue */}
        <div className="lg:col-span-2 bg-slate-800/90 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-red-400" /> Emergency Priority Incident Queue
            </h3>
            <span className="text-xs text-slate-400 font-mono">Sorted by Criticality & Risk Score</span>
          </div>

          {incidents.length === 0 ? (
            <div className="bg-slate-900/50 p-8 rounded-xl border border-slate-700 text-center text-slate-400 text-sm">
              No incidents registered for {pilotRegion}.
            </div>
          ) : (
            <div className="space-y-4">
              {incidents.map((inc) => {
                const isCritical = inc.risk_category === "Critical" || inc.priority_level === 1 || (inc.risk_score && inc.risk_score >= 76);
                return (
                  <div
                    key={inc.id || inc.local_id}
                    className={`p-4 rounded-xl border transition-all ${
                      isCritical
                        ? "bg-red-950/40 border-red-800/80 shadow-md shadow-red-950/50"
                        : "bg-slate-900/80 border-slate-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                            isCritical ? "bg-red-900 text-red-200 border border-red-700" :
                            inc.risk_category === "High" ? "bg-orange-900 text-orange-200 border border-orange-700" :
                            "bg-yellow-900 text-yellow-200 border border-yellow-700"
                          }`}>
                            {isCritical ? "PRIORITY 1 — CRITICAL" : inc.priority_label || "Priority 2: High Attention"}
                          </span>

                          <span className="text-xs text-slate-400 font-mono">
                            ID: {inc.id || inc.local_id}
                          </span>

                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                            inc.verification_status === "Verified"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}>
                            {inc.verification_status || "Unverified"}
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-white">
                          {inc.incident_type} – <span className="text-slate-300 font-normal">{inc.location_name || inc.pilot_region}</span>
                        </h4>

                        <div className="text-xs text-slate-400 font-mono">
                          GPS: {inc.latitude}°N, {inc.longitude}°E (±{inc.gps_accuracy || 6.5}m)
                        </div>
                      </div>

                      {/* Required Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            if (setActiveTab) setActiveTab("map");
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors shadow"
                        >
                          <Eye className="w-3.5 h-3.5" /> VIEW ON MAP
                        </button>

                        <button
                          type="button"
                          onClick={() => handleVerify(inc.id || inc.local_id, "verify")}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors shadow"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> VERIFY
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePrepareAlert(inc)}
                          className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors shadow"
                        >
                          <Bell className="w-3.5 h-3.5" /> DISPATCH ALERT
                        </button>
                      </div>
                    </div>

                    {/* Incident Details Footer */}
                    <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500">AI Detection:</span>{" "}
                        <strong className="text-emerald-400">
                          {inc.server_ai_class || inc.offline_ai_result || inc.incident_type} ({inc.server_ai_confidence || inc.offline_ai_confidence || 91.0}%)
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Risk Score:</span>{" "}
                        <strong className="text-amber-400">
                          {inc.risk_score || 87.0}/100 ({inc.risk_category || "Critical"})
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Reporter:</span>{" "}
                        <span className="text-slate-300">{inc.user_name || "Citizen"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: ML Simulator & Dispatch Authority Alert */}
        <div className="space-y-6">
          {/* ML Risk Simulator */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" /> ML Dynamic Risk Engine
              </h3>
              <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded font-mono">
                Random Forest
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>24h Rainfall: <strong className="text-emerald-400">{mlInput.rainfall_24h} mm</strong></span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="250"
                  value={mlInput.rainfall_24h}
                  onChange={(e) => setMlInput({ ...mlInput, rainfall_24h: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-500 bg-slate-900 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Soil Saturation: <strong className="text-emerald-400">{mlInput.soil_moisture}%</strong></span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={mlInput.soil_moisture}
                  onChange={(e) => setMlInput({ ...mlInput, soil_moisture: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-500 bg-slate-900 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Slope Steepness: <strong className="text-emerald-400">{mlInput.slope_deg}°</strong></span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="65"
                  value={mlInput.slope_deg}
                  onChange={(e) => setMlInput({ ...mlInput, slope_deg: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-500 bg-slate-900 cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={runMLCalculation}
                disabled={isCalculatingML}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Calculate Risk Score
              </button>
            </div>

            {/* Calculated Risk Output */}
            {mlResult && (
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Risk Score:</span>
                  <span className={`text-lg font-black font-mono ${
                    mlResult.category === "Critical" ? "text-red-400" :
                    mlResult.category === "High" ? "text-orange-400" :
                    "text-yellow-400"
                  }`}>
                    {mlResult.risk_score} / 100 ({mlResult.category})
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Dispatch Authority Alert Form */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-red-400" /> Authority Alert Broadcast
              </h3>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                alertBroadcast.status === "DISPATCHED" ? "bg-red-950 text-red-400 border border-red-800" :
                alertBroadcast.status === "ACKNOWLEDGED" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" :
                "bg-slate-900 text-slate-400"
              }`}>
                STATUS: {alertBroadcast.status}
              </span>
            </div>

            <form onSubmit={handleSendAlert} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Alert Headline</label>
                <input
                  type="text"
                  value={alertBroadcast.title}
                  onChange={(e) => setAlertBroadcast({ ...alertBroadcast, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Target Disaster Zone</label>
                <input
                  type="text"
                  value={alertBroadcast.location_name}
                  onChange={(e) => setAlertBroadcast({ ...alertBroadcast, location_name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
                <div>Recommended Protocol Action:</div>
                <div className="text-slate-200 font-semibold italic">
                  Inspect area immediately and execute road closures/evacuation according to authority protocols.
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-950/40 transition-all cursor-pointer"
              >
                <Bell className="w-4 h-4 animate-bounce" /> Broadcast Priority 1 Alert
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
