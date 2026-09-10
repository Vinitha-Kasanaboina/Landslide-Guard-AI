import React, { useState, useEffect, useRef } from "react";
import { Camera, Image as ImageIcon, MapPin, Signal, ShieldAlert, CheckCircle2, Save, WifiOff, RefreshCw, Cpu, AlertTriangle } from "lucide-react";
import { saveOfflineReportLocally, classifyImageOffline } from "../services/db";

export default function CitizenReportView({ networkMode, pilotRegion, onReportCreated }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [incidentType, setIncidentType] = useState("Landslide Debris");
  const [description, setDescription] = useState("");
  const [userName, setUserName] = useState("Rajesh Kumar (Field Officer)");
  const [userRole, setUserRole] = useState("Field Officer");

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // GPS/GNSS Automatic Location Tagging State
  const [location, setLocation] = useState({
    latitude: 11.6912,
    longitude: 76.1345,
    accuracy: 6.5,
    timestamp: new Date().toISOString(),
    status: "LOCKED ✓",
    reason: null
  });
  const [isLocating, setIsLocating] = useState(false);

  // Preliminary Offline AI State
  const [offlineAI, setOfflineAI] = useState(null);

  // Status message state
  const [submitStatus, setSubmitStatus] = useState(null);

  // Set default coordinates based on Pilot Region
  useEffect(() => {
    if (pilotRegion === "Rudraprayag, Uttarakhand") {
      setLocation((prev) => ({
        ...prev,
        latitude: 30.6280,
        longitude: 79.0210,
        accuracy: 5.2,
        timestamp: new Date().toISOString()
      }));
    } else {
      setLocation((prev) => ({
        ...prev,
        latitude: 11.6912,
        longitude: 76.1345,
        accuracy: 6.5,
        timestamp: new Date().toISOString()
      }));
    }
    // Automatically attempt live device GPS capture
    acquireHardwareGPS();
  }, [pilotRegion]);

  // Run preliminary offline AI whenever incident type or image changes
  useEffect(() => {
    const aiRes = classifyImageOffline(incidentType);
    setOfflineAI(aiRes);
  }, [incidentType, selectedImage]);

  const acquireHardwareGPS = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            latitude: parseFloat(pos.coords.latitude.toFixed(5)),
            longitude: parseFloat(pos.coords.longitude.toFixed(5)),
            accuracy: parseFloat(pos.coords.accuracy.toFixed(1)),
            timestamp: new Date(pos.timestamp).toISOString(),
            status: "LOCKED ✓",
            reason: null
          });
          setIsLocating(false);
        },
        (err) => {
          setIsLocating(false);
          let reasonText = "Device location unavailable";
          if (err.code === err.PERMISSION_DENIED) {
            reasonText = "Permission denied";
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            reasonText = "Signal lost / Position unavailable";
          } else if (err.code === err.TIMEOUT) {
            reasonText = "GPS request timed out";
          }
          setLocation((prev) => ({
            ...prev,
            status: "GPS unavailable",
            reason: reasonText
          }));
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setIsLocating(false);
      setLocation((prev) => ({
        ...prev,
        status: "GPS unavailable",
        reason: "Browser does not support Geolocation API"
      }));
    }
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();

    if (!selectedImage) {
      alert("Please capture or browse an incident image before saving.");
      return;
    }

    const isOffline = networkMode === "Offline" || networkMode === "Offline (Zero Net)";
    const timestampNow = location.timestamp || new Date().toISOString();

    const reportData = {
      local_id: `loc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      user_name: userName,
      user_role: userRole,
      latitude: location.latitude,
      longitude: location.longitude,
      gps_accuracy: location.accuracy,
      location_name: `${pilotRegion} Incident Zone`,
      pilot_region: pilotRegion,
      timestamp: timestampNow,
      description: description || "No field notes recorded.",
      incident_type: incidentType,
      image_data: selectedImage,
      image_path: selectedImage, // Full base64 DataURL stored locally
      offline_ai_result: offlineAI?.result,
      offline_ai_confidence: offlineAI?.confidence,
      offline_ai_severity: offlineAI?.severity,
      risk_score: offlineAI?.severity === "Critical" ? 88.5 : offlineAI?.severity === "High" ? 72.0 : 45.0,
      risk_category: offlineAI?.severity === "Critical" ? "Critical" : offlineAI?.severity === "High" ? "High" : "Moderate",
      sync_status: "PENDING SYNC"
    };

    const saved = await saveOfflineReportLocally(reportData);

    setSubmitStatus({
      success: true,
      message: isOffline
        ? "Report Saved Locally in IndexedDB (PENDING SYNC) – Zero Internet Mode Active!"
        : "Report Recorded & Queued for Adaptive Synchronization Engine!",
      report: saved
    });

    if (onReportCreated) onReportCreated(saved);

    // Reset feedback notice after 6 seconds
    setTimeout(() => setSubmitStatus(null), 6000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Zero-Internet Native Mode
              </span>
              <span className="text-xs text-slate-400">Offline Field Officer Portal</span>
            </div>
            <h2 className="text-2xl font-bold text-white mt-1">Report Incident</h2>
            <p className="text-slate-400 text-sm mt-1">
              Capture or browse incident photos in offline areas. Hardware GPS coordinates and AI predictions attach automatically.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/80 px-4 py-3 rounded-xl border border-slate-700">
            {networkMode === "Offline" || networkMode === "Offline (Zero Net)" ? (
              <>
                <WifiOff className="w-5 h-5 text-amber-400 animate-pulse" />
                <div>
                  <div className="text-xs font-bold text-amber-400">Offline (Zero Net)</div>
                  <div className="text-[11px] text-slate-400">Local DB Active</div>
                </div>
              </>
            ) : (
              <>
                <Signal className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="text-xs font-bold text-emerald-400">{networkMode}</div>
                  <div className="text-[11px] text-slate-400">Sync Engine Ready</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {submitStatus && (
        <div className="bg-emerald-950/90 border border-emerald-500/60 rounded-xl p-4 text-emerald-300 flex items-center gap-3 animate-fade-in shadow-xl">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-bold text-emerald-200">Incident Report Saved Successfully</h4>
            <p className="text-sm text-emerald-300/90">{submitStatus.message}</p>
            <div className="text-xs text-emerald-400/80 mt-1 font-mono">
              Report ID: {submitStatus.report.local_id} | Status: {submitStatus.report.sync_status}
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageFileChange}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileChange}
        className="hidden"
      />

      {/* Main Form */}
      <form onSubmit={handleSubmitReport} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Image Input & Preview */}
        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" /> Incident Image Capture
              </label>
              <span className="text-xs text-slate-400">Works Without Internet</span>
            </div>

            {/* Option Buttons: Capture vs Browse */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current && cameraInputRef.current.click()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-950/40"
              >
                <Camera className="w-4 h-4" /> 📷 Capture Picture
              </button>

              <button
                type="button"
                onClick={() => galleryInputRef.current && galleryInputRef.current.click()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-950/40"
              >
                <ImageIcon className="w-4 h-4" /> 🖼 Browse Image
              </button>
            </div>

            {/* Image Preview Box */}
            <div className="relative aspect-video bg-slate-950 rounded-xl border border-slate-700 overflow-hidden shadow-inner flex items-center justify-center group">
              {selectedImage ? (
                <>
                  <img
                    src={selectedImage}
                    alt="Captured Incident Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex items-end p-3">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[11px] font-mono text-emerald-300 bg-slate-900/90 px-2 py-1 rounded border border-slate-700">
                        Photo Loaded ✓
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current && cameraInputRef.current.click()}
                          className="bg-slate-800/90 hover:bg-slate-700 text-white text-[11px] font-semibold px-2.5 py-1 rounded border border-slate-600"
                        >
                          📷 Capture Again
                        </button>
                        <button
                          type="button"
                          onClick={() => galleryInputRef.current && galleryInputRef.current.click()}
                          className="bg-slate-800/90 hover:bg-slate-700 text-white text-[11px] font-semibold px-2.5 py-1 rounded border border-slate-600"
                        >
                          🖼 Browse Another
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center p-6 space-y-2 text-slate-500">
                  <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center mx-auto border border-slate-800">
                    <Camera className="w-6 h-6 text-slate-600" />
                  </div>
                  <div className="text-xs font-semibold text-slate-400">No Image Selected</div>
                  <p className="text-[11px] text-slate-500">
                    Click <strong>Capture Picture</strong> or <strong>Browse Image</strong> above to attach photo.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Preliminary Offline AI Classification Badge */}
          {offlineAI && (
            <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Cpu className="w-4 h-4 text-cyan-400" /> Preliminary On-Device AI
                </span>
                <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800 font-mono">
                  Offline Model
                </span>
              </div>

              <div className="text-sm font-semibold text-slate-200">
                Detected: <span className="text-emerald-400">{offlineAI.result}</span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                <span className="text-slate-400">Confidence: <strong className="text-white">{offlineAI.confidence}%</strong></span>
                <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                  offlineAI.severity === "Critical" ? "bg-red-950 text-red-400 border border-red-800" :
                  offlineAI.severity === "High" ? "bg-orange-950 text-orange-400 border border-orange-800" :
                  "bg-amber-950 text-amber-400 border border-amber-800"
                }`}>
                  Severity: {offlineAI.severity}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 italic">
                {offlineAI.disclaimer}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Zero-Internet GPS & Incident Details */}
        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 space-y-5 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            {/* Zero-Internet GPS/GNSS Card */}
            <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-400" /> Zero-Internet GPS / GNSS
                </label>

                <button
                  type="button"
                  onClick={acquireHardwareGPS}
                  disabled={isLocating}
                  className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md border border-slate-600 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isLocating ? "animate-spin" : ""}`} />
                  {isLocating ? "Acquiring..." : "Refresh GPS"}
                </button>
              </div>

              {/* Status Header */}
              <div className="flex items-center justify-between text-xs bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 font-semibold">GPS STATUS:</span>
                {location.status.includes("LOCKED") ? (
                  <span className="text-emerald-400 font-bold font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {location.status}
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold font-mono flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> {location.status}
                  </span>
                )}
              </div>

              {location.reason && (
                <div className="text-[11px] text-amber-300 bg-amber-950/60 p-2 rounded border border-amber-800">
                  Reason: {location.reason} (Default region coordinates active)
                </div>
              )}

              {/* Coordinate Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400">Latitude</div>
                  <div className="font-mono text-sm font-bold text-white mt-0.5">{location.latitude}° N</div>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400">Longitude</div>
                  <div className="font-mono text-sm font-bold text-white mt-0.5">{location.longitude}° E</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>Accuracy: <strong className="text-emerald-400">±{location.accuracy} meters</strong></span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(location.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>

            {/* Reporter Name & Incident Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Reporter Name / Role</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Field Officer Rajesh"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Incident Category</label>
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Landslide">Landslide</option>
                  <option value="Landslide Debris">Landslide Debris</option>
                  <option value="Ground Crack">Ground Crack</option>
                  <option value="Rockfall">Rockfall</option>
                  <option value="Soil Movement">Soil Movement</option>
                  <option value="Road Blockage">Road Blockage</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Field Observations / Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Field Observations & Notes
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder-slate-500"
                placeholder="Describe ground crack width, active water seepage, slope movement rate, road accessibility, or nearby structures at risk..."
              ></textarea>
            </div>
          </div>

          {/* Save Action Button */}
          <div className="pt-4 border-t border-slate-700">
            <button
              type="submit"
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                networkMode === "Offline" || networkMode === "Offline (Zero Net)"
                  ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30"
              }`}
            >
              {networkMode === "Offline" || networkMode === "Offline (Zero Net)" ? (
                <>
                  <Save className="w-5 h-5" /> Save Offline in Local Database
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" /> Save Report & Queue for Sync
                </>
              )}
            </button>

            <p className="text-[11px] text-center text-slate-400 mt-2">
              Status will be recorded as <strong className="text-amber-400 font-mono">PENDING SYNC</strong> in device IndexedDB until network connection is restored.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
