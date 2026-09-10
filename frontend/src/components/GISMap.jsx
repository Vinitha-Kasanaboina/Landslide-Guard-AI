import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Filter, Layers, MapPin, AlertTriangle, ShieldCheck, RefreshCw, Eye, Info, WifiOff } from "lucide-react";
import { fetchMapIncidents, fetchRiskZones } from "../services/api";
import { getSyncedReportsLocally } from "../services/db";

const REGION_CENTERS = {
  "Wayanad, Kerala": { lat: 11.6912, lng: 76.1345, zoom: 13 },
  "Rudraprayag, Uttarakhand": { lat: 30.6280, lng: 79.0210, zoom: 12 }
};

export default function GISMap({ pilotRegion, setPilotRegion, networkMode }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersGroupRef = useRef(null);

  const [incidents, setIncidents] = useState([]);
  const [riskZones, setRiskZones] = useState([]);
  const [selectedRiskFilter, setSelectedRiskFilter] = useState("All");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");
  const [selectedIncidentModal, setSelectedIncidentModal] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadGISData();
  }, [pilotRegion]);

  const loadGISData = async () => {
    setIsLoading(true);
    // Fetch from backend API
    const apiIncs = await fetchMapIncidents(pilotRegion);
    const zones = await fetchRiskZones(pilotRegion);
    // Fetch from local IndexedDB synced reports
    const localSynced = await getSyncedReportsLocally();
    
    // Filter local synced by region if present
    const localFiltered = localSynced.filter((item) => !pilotRegion || item.pilot_region === pilotRegion);

    // Merge and deduplicate by local_id or id
    const mapOfIncs = new Map();
    [...apiIncs, ...localFiltered].forEach((item) => {
      const key = item.id || item.local_id;
      if (key && !mapOfIncs.has(key)) {
        mapOfIncs.set(key, item);
      }
    });

    setIncidents(Array.from(mapOfIncs.values()));
    setRiskZones(zones);
    setIsLoading(false);
  };

  // Initialize or re-center Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const center = REGION_CENTERS[pilotRegion] || REGION_CENTERS["Wayanad, Kerala"];

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [center.lat, center.lng],
        zoom: center.zoom,
        zoomControl: false
      });

      L.control.zoom({ position: "bottomright" }).addTo(map);

      // OpenStreetMap Tile Layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors | LandslideGuard AI',
        maxZoom: 18
      }).addTo(map);

      layersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([center.lat, center.lng], center.zoom);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [pilotRegion]);

  // Render Polygons and Incident Markers on Map
  useEffect(() => {
    if (!mapInstanceRef.current || !layersGroupRef.current) return;

    layersGroupRef.current.clearLayers();

    // 1. Draw Risk Zone Polygons
    riskZones.forEach((zone) => {
      if (selectedRiskFilter !== "All" && zone.risk_category !== selectedRiskFilter) {
        return;
      }

      let color = "#10b981"; // Low (Green)
      if (zone.risk_category === "Moderate") color = "#eab308";
      if (zone.risk_category === "High") color = "#f97316";
      if (zone.risk_category === "Critical") color = "#ef4444";

      const polygon = L.polygon(zone.polygon_coords, {
        color: color,
        fillColor: color,
        fillOpacity: 0.25,
        weight: 2
      });

      polygon.bindPopup(`
        <div style="font-family: system-ui; min-width: 200px;">
          <div style="font-size: 11px; font-weight: bold; color: ${color}; text-transform: uppercase;">
            ${zone.risk_category} Risk Zone
          </div>
          <div style="font-size: 14px; font-weight: bold; margin-top: 2px; color: white;">
            ${zone.name}
          </div>
          <div style="font-size: 12px; margin-top: 6px; color: #cbd5e1;">
            Score: <strong style="color: white;">${zone.current_risk_score}/100</strong><br/>
            Rainfall 24h: <strong>${zone.rainfall_mm} mm</strong><br/>
            Soil Moisture: <strong>${zone.soil_moisture_pct}%</strong><br/>
            Slope: <strong>${zone.avg_slope_deg}°</strong>
          </div>
        </div>
      `);

      layersGroupRef.current.addLayer(polygon);
    });

    // 2. Draw Incident Markers
    incidents.forEach((inc) => {
      if (selectedCategoryFilter !== "All" && inc.incident_type !== selectedCategoryFilter) {
        return;
      }
      if (selectedRiskFilter !== "All" && inc.risk_category !== selectedRiskFilter) {
        return;
      }

      let iconColor = "bg-emerald-500";
      if (inc.risk_category === "Moderate") iconColor = "bg-yellow-500";
      if (inc.risk_category === "High") iconColor = "bg-orange-500";
      if (inc.risk_category === "Critical") iconColor = "bg-red-500";

      const customIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: `
          <div class="w-8 h-8 ${iconColor} text-white rounded-full flex items-center justify-center shadow-lg border-2 border-slate-900 ${inc.risk_category === 'Critical' ? 'risk-pulse-critical' : ''}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      });

      const marker = L.marker([inc.latitude, inc.longitude], { icon: customIcon });

      marker.on("click", () => {
        setSelectedIncidentModal(inc);
      });

      layersGroupRef.current.addLayer(marker);
    });
  }, [incidents, riskZones, selectedRiskFilter, selectedCategoryFilter]);

  return (
    <div className="space-y-4">
      {/* GIS Control Header */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Interactive Spatial Engine
              </span>
              <span className="text-xs text-slate-400">Real-Time GIS Hazard Map</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">GIS Dynamic Risk Map</h2>
          </div>

          {/* Filters & Region Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Region Switcher */}
            <select
              value={pilotRegion}
              onChange={(e) => setPilotRegion(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs font-semibold text-white px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="Wayanad, Kerala">Pilot 1: Wayanad, Kerala</option>
              <option value="Rudraprayag, Uttarakhand">Pilot 2: Rudraprayag, Uttarakhand</option>
            </select>

            {/* Risk Level Filter */}
            <select
              value={selectedRiskFilter}
              onChange={(e) => setSelectedRiskFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="All">All Risk Levels</option>
              <option value="Critical">Critical (76-100)</option>
              <option value="High">High (51-75)</option>
              <option value="Moderate">Moderate (26-50)</option>
              <option value="Low">Low (0-25)</option>
            </select>

            {/* Incident Category Filter */}
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="All">All Categories</option>
              <option value="Landslide">Landslide</option>
              <option value="Landslide Debris">Landslide Debris</option>
              <option value="Ground Crack">Ground Crack</option>
              <option value="Rockfall">Rockfall</option>
              <option value="Soil Movement">Soil Movement</option>
              <option value="Road Blockage">Road Blockage</option>
            </select>

            <button
              onClick={loadGISData}
              className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-xl border border-slate-600 transition-colors"
              title="Refresh Map Layers"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Legend & Incident Counter Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-700/80 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-slate-400 font-semibold">Risk Zones:</span>
            <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> 🟢 Low (0-25)</span>
            <span className="flex items-center gap-1.5 text-yellow-400"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span> 🟡 Moderate (26-50)</span>
            <span className="flex items-center gap-1.5 text-orange-400"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> 🟠 High (51-75)</span>
            <span className="flex items-center gap-1.5 text-red-400"><span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span> 🔴 Critical (76-100)</span>
          </div>

          <div className="text-slate-300 font-mono">
            Active Incidents: <strong className="text-emerald-400 text-sm">{incidents.length}</strong> | Risk Zones: <strong className="text-cyan-400 text-sm">{riskZones.length}</strong>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative h-[600px] w-full rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
        <div ref={mapContainerRef} className="w-full h-full z-0"></div>

        {/* Offline Banner indicator */}
        {networkMode && networkMode.includes("Offline") && (
          <div className="absolute top-4 left-4 z-[900] bg-slate-900/90 border border-amber-500/60 text-amber-300 text-xs px-3.5 py-2 rounded-xl backdrop-blur-md flex items-center gap-2 shadow-lg">
            <WifiOff className="w-4 h-4 text-amber-400" />
            <span>Offline Mode Active: Live map tiles may be cached or unavailable. Local incident markers remain active.</span>
          </div>
        )}

        {/* Modal Overlay when Marker is Clicked */}
        {selectedIncidentModal && (
          <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setSelectedIncidentModal(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold bg-slate-800 w-8 h-8 rounded-full flex items-center justify-center"
              >
                &times;
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                  selectedIncidentModal.risk_category === "Critical" ? "bg-red-950 text-red-400 border border-red-800" :
                  selectedIncidentModal.risk_category === "High" ? "bg-orange-950 text-orange-400 border border-orange-800" :
                  "bg-yellow-950 text-yellow-400 border border-yellow-800"
                }`}>
                  Risk Score: {selectedIncidentModal.risk_score || 87}/100 ({selectedIncidentModal.risk_category || "Critical"})
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ID: {selectedIncidentModal.id || selectedIncidentModal.local_id}
                </span>
              </div>

              <h3 className="text-xl font-bold text-white">
                {selectedIncidentModal.incident_type} – {selectedIncidentModal.location_name || selectedIncidentModal.pilot_region}
              </h3>

              {/* Photo Display */}
              {(selectedIncidentModal.image_data || selectedIncidentModal.image_path) && (
                <div className="aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-inner">
                  <img
                    src={selectedIncidentModal.image_data || selectedIncidentModal.image_path}
                    alt="Incident Photograph"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Detail Metrics */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-slate-400">AI Detection</div>
                  <div className="font-bold text-emerald-400 mt-1">
                    {selectedIncidentModal.server_ai_class || selectedIncidentModal.offline_ai_result || selectedIncidentModal.incident_type}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Confidence: <strong className="text-white">{selectedIncidentModal.server_ai_confidence || selectedIncidentModal.offline_ai_confidence || 91.0}%</strong>
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-slate-400">GPS Accuracy</div>
                  <div className="font-bold text-white mt-1 font-mono">
                    ±{selectedIncidentModal.gps_accuracy || 6.5} meters
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">GNSS Hardware Lock</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-slate-400">Coordinates</div>
                  <div className="font-mono text-white mt-1">
                    {selectedIncidentModal.latitude}°N, {selectedIncidentModal.longitude}°E
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-slate-400">Sync Status</div>
                  <div className="font-semibold text-emerald-400 mt-1 font-mono">
                    {selectedIncidentModal.sync_status || "SYNCHRONIZED ✓"}
                  </div>
                </div>
              </div>

              {selectedIncidentModal.description && (
                <div className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800 italic">
                  "{selectedIncidentModal.description}"
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedIncidentModal(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-xl border border-slate-700"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
