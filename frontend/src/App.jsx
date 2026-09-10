import React, { useState, useEffect } from "react";
import { Shield, Camera, WifiOff, Signal, Map, Sliders, Bell, HardDrive, Compass, LayoutDashboard, Cpu } from "lucide-react";
import LandingHero from "./components/LandingHero";
import CitizenReportView from "./components/CitizenReportView";
import SyncCenter from "./components/SyncCenter";
import GISMap from "./components/GISMap";
import AdminDashboard from "./components/AdminDashboard";
import ErrorBoundary from "./components/ErrorBoundary";
import { getOfflineReportsLocally } from "./services/db";
import { fetchAlerts } from "./services/api";

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [networkMode, setNetworkMode] = useState("Offline"); // 'Offline' | 'Very Poor 2G' | 'Poor 3G' | 'Good 4G'
  const [pilotRegion, setPilotRegion] = useState("Wayanad, Kerala");
  const [pendingCount, setPendingCount] = useState(0);
  const [activeAlerts, setActiveAlerts] = useState([]);

  useEffect(() => {
    refreshPendingReports();
    loadAlerts();
  }, [networkMode, pilotRegion]);

  const refreshPendingReports = async () => {
    const list = await getOfflineReportsLocally();
    setPendingCount(list.length);
  };

  const loadAlerts = async () => {
    const alerts = await fetchAlerts();
    setActiveAlerts(alerts);
  };

  const handleAlertBroadcasted = (newAlert) => {
    setActiveAlerts((prev) => [newAlert, ...prev]);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        {/* Emergency Alert Ticker Header */}
        {activeAlerts.length > 0 && (
          <div className="bg-red-950/90 border-b border-red-800 text-red-200 px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="flex h-2 w-2 relative flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-red-400 font-bold uppercase tracking-wider">CRITICAL BROADCAST:</span>
              <span className="truncate">
                {activeAlerts[0].title} – {activeAlerts[0].location_name} (Lat: {activeAlerts[0].latitude}°N, Lng: {activeAlerts[0].longitude}°E)
              </span>
            </div>
            <span className="text-[11px] bg-red-900/90 px-2 py-0.5 rounded font-mono text-red-200 border border-red-700 flex-shrink-0 ml-2">
              Priority 1 Active
            </span>
          </div>
        )}

        {/* Main Top Navigation Bar */}
        <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 gap-4">
              {/* Logo Brand */}
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("overview")}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-950/50">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                    LandslideGuard <span className="text-emerald-400 font-mono text-xs px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800">AI</span>
                  </h1>
                  <p className="text-[10px] text-slate-400 font-medium">Offline-First Disaster GIS System</p>
                </div>
              </div>

              {/* Navigation Tabs */}
              <nav className="hidden lg:flex items-center gap-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/80">
                {[
                  { id: "overview", label: "Overview", icon: LayoutDashboard },
                  { id: "report", label: "Report Incident", icon: Camera },
                  { id: "sync", label: "Sync Center", icon: Cpu, badge: pendingCount },
                  { id: "map", label: "GIS Risk Map", icon: Map },
                  { id: "admin", label: "Authority Portal", icon: Sliders }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all relative cursor-pointer ${
                        isActive
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-950"
                          : "text-slate-300 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>

                      {tab.badge > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-amber-500 text-slate-950 rounded-full font-bold">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Top Right Controls: Network Simulator & Pilot Region */}
              <div className="flex items-center gap-3">
                {/* Pilot Region Selector */}
                <div className="hidden sm:flex items-center gap-1.5 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
                  <Compass className="w-3.5 h-3.5 text-indigo-400" />
                  <select
                    value={pilotRegion}
                    onChange={(e) => setPilotRegion(e.target.value)}
                    className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="Wayanad, Kerala" className="bg-slate-900">Wayanad, KL</option>
                    <option value="Rudraprayag, Uttarakhand" className="bg-slate-900">Rudraprayag, UT</option>
                  </select>
                </div>

                {/* Global Network Simulator Switch */}
                <div className="flex items-center gap-1.5 bg-slate-950/90 px-3 py-1.5 rounded-xl border border-slate-800">
                  {networkMode.includes("Offline") ? (
                    <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />
                  ) : (
                    <Signal className="w-4 h-4 text-emerald-400" />
                  )}

                  <select
                    value={networkMode}
                    onChange={(e) => setNetworkMode(e.target.value)}
                    className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer text-white"
                  >
                    <option value="Offline" className="bg-slate-900 text-amber-400">Offline (Zero Net)</option>
                    <option value="Very Poor 2G" className="bg-slate-900 text-orange-400">Very Poor 2G</option>
                    <option value="Poor 3G" className="bg-slate-900 text-yellow-400">Poor 3G</option>
                    <option value="Good 4G" className="bg-slate-900 text-emerald-400">Good 4G / WiFi</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Navigation Dropdown Bar */}
          <div className="lg:hidden flex items-center justify-around border-t border-slate-800 bg-slate-900 py-2 px-2 overflow-x-auto text-xs">
            {[
              { id: "overview", label: "Overview", icon: LayoutDashboard },
              { id: "report", label: "Report", icon: Camera },
              { id: "sync", label: "Sync", icon: Cpu, badge: pendingCount },
              { id: "map", label: "GIS Map", icon: Map },
              { id: "admin", label: "Authority", icon: Sliders }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                  activeTab === tab.id ? "text-emerald-400 font-bold" : "text-slate-400"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </header>

        {/* Main Page Content Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === "overview" && <LandingHero setActiveTab={setActiveTab} />}
          {activeTab === "report" && (
            <CitizenReportView
              networkMode={networkMode}
              pilotRegion={pilotRegion}
              onReportCreated={refreshPendingReports}
            />
          )}
          {activeTab === "sync" && (
            <SyncCenter
              networkMode={networkMode}
              setNetworkMode={setNetworkMode}
              pendingCount={pendingCount}
              refreshPending={refreshPendingReports}
            />
          )}
          {activeTab === "map" && (
            <GISMap
              pilotRegion={pilotRegion}
              setPilotRegion={setPilotRegion}
              networkMode={networkMode}
            />
          )}
          {activeTab === "admin" && (
            <AdminDashboard
              pilotRegion={pilotRegion}
              setActiveTab={setActiveTab}
              onAlertBroadcasted={handleAlertBroadcasted}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="bg-slate-900 border-t border-slate-800 py-6 text-center text-xs text-slate-400">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>LandslideGuard AI &copy; 2026 – Offline-First AI Landslide Monitoring System</span>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <span>Pilot 1: Wayanad, Kerala</span>
              <span>Pilot 2: Rudraprayag, Uttarakhand</span>
              <span>Storage: SQLite / IndexedDB</span>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
