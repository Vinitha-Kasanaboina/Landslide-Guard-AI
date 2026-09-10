import React from "react";
import { Shield, Camera, WifiOff, Cpu, Map, AlertTriangle, ArrowRight } from "lucide-react";

export default function LandingHero({ setActiveTab }) {
  return (
    <div className="space-y-12 py-4">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 p-8 sm:p-12 shadow-2xl">
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Shield className="w-4 h-4" /> Offline-First Disaster GIS System
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Offline-First AI Landslide Monitoring & Dynamic GIS Risk Mapping
          </h1>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            <strong className="text-emerald-400">LandslideGuard AI</strong> empowers citizens and field officers in remote hilly regions to capture ground cracks, rockfalls, and soil movement with <strong className="text-amber-400">zero internet connectivity</strong>. Automatically tags GPS/GNSS coordinates, compresses data, and synchronizes dynamically when network signals resume.
          </p>

          {/* Quick CTA Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => setActiveTab("report")}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3.5 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all text-sm hover:scale-[1.02] cursor-pointer"
            >
              <Camera className="w-5 h-5" /> Report Incident Offline <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveTab("map")}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-3.5 rounded-xl border border-slate-600 flex items-center gap-2 transition-all text-sm hover:scale-[1.02] cursor-pointer"
            >
              <Map className="w-5 h-5 text-indigo-400" /> Explore GIS Risk Map <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Feature Pillar Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          onClick={() => setActiveTab("report")}
          className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 p-6 rounded-2xl space-y-3 cursor-pointer transition-all group shadow-xl"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-950 text-amber-400 border border-amber-800 flex items-center justify-center group-hover:scale-110 transition-transform">
            <WifiOff className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
            Zero-Internet Tagging
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Hardware GPS/GNSS auto-attaches lat, lng, timestamp, and accuracy. Stored safely in local IndexedDB.
          </p>
        </div>

        <div
          onClick={() => setActiveTab("sync")}
          className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 p-6 rounded-2xl space-y-3 cursor-pointer transition-all group shadow-xl"
        >
          <div className="w-12 h-12 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
            Adaptive Sync Engine
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Sends emergency metadata first over 2G, compresses images (5MB to 450KB), and resumes chunked uploads automatically.
          </p>
        </div>

        <div
          onClick={() => setActiveTab("map")}
          className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 p-6 rounded-2xl space-y-3 cursor-pointer transition-all group shadow-xl"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-800 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Map className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
            Interactive GIS Maps
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Color-coded risk zones (Green to Red), interactive report markers, rainfall trends, and dynamic hazard escalation.
          </p>
        </div>

        <div
          onClick={() => setActiveTab("admin")}
          className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 p-6 rounded-2xl space-y-3 cursor-pointer transition-all group shadow-xl"
        >
          <div className="w-12 h-12 rounded-xl bg-red-950 text-red-400 border border-red-800 flex items-center justify-center group-hover:scale-110 transition-transform">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white group-hover:text-red-400 transition-colors">
            Emergency Priority Queue
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            ML model scores landslide risk (0–100) and sorts authority incident alerts by Priority 1, 2, and 3 urgency.
          </p>
        </div>
      </div>
    </div>
  );
}
