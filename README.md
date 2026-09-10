# LandslideGuard AI – Offline-First AI Landslide Monitoring & Dynamic GIS Risk Mapping Platform

**LandslideGuard AI** is a production-style, full-stack prototype built for the **Smart India Hackathon (SIH)**. It provides zero-internet mobile incident reporting, automatic GPS/GNSS location tagging, adaptive low-bandwidth synchronization, computer vision AI image analysis, dynamic ML landslide risk prediction, interactive GIS hazard mapping, authority emergency prioritization, and a guided SIH Historical Event Replay mode.

---

## 🌟 Key Architecture & Innovation Highlights

1. **Zero-Internet Native Mobile Reporting**:
   - Capture photo evidence of ground cracks, landslides, rockfalls, soil movement, or road blockages with **no mobile data or Wi-Fi**.
   - Automatic GPS/GNSS tagging: Lat, Long, Timestamp, and Accuracy (±meters) without requiring manual location selection.
   - Saves complete reports locally in **SQLite / IndexedDB** on the client device.
   - On-device preliminary AI model (TensorFlow Lite equivalent) provides immediate offline warnings to the field officer/citizen.

2. **Adaptive Low-Bandwidth Synchronization Engine**:
   - **Zero Internet**: Saves report securely in local database.
   - **Very Poor Internet (2G)**: Transmits **Priority 1 Emergency Metadata** first (Lat, Lng, Timestamp, Risk Level ~500 Bytes payload) so authorities receive emergency coordinates immediately.
   - **Poor Internet (3G)**: Automatically compresses images (e.g. 5 MB original to 450 KB optimized) and uploads via **Resumable Chunked Upload protocol**. Pauses and resumes seamlessly if signal drops.
   - **Good Internet (4G/WiFi)**: Full report sync, high-resolution original image upload, and server confirmation.

3. **AI Computer Vision Analysis**:
   - Classifies incident images into: `Landslide Debris`, `Rockfall`, `Ground Crack`, `Soil Movement`, `Road Blockage`, and `Normal / No Visible Danger`.
   - Displays confidence percentage (e.g. 95.8%) and severity levels (`Critical`, `High`, `Moderate`, `Low`).

4. **Dynamic ML Landslide Risk Engine**:
   - Scikit-Learn **Random Forest** regressor combining 24h rainfall intensity, soil moisture %, slope steepness, elevation, historical landslide density, AI image severity, and citizen report consensus.
   - Outputs dynamic risk score (0–100) and risk category (`Low` 0-25, `Moderate` 26-50, `High` 51-75, `Critical` 76-100).

5. **Interactive GIS Risk Map**:
   - Built with Leaflet.js & OpenStreetMap.
   - Color-coded risk zone polygons (Green: Low, Yellow: Moderate, Orange: High, Red: Critical).
   - Citizen incident markers with rich popups showing images, AI confidence, GPS accuracy, and risk scores.
   - Switchable pilot regions: **Wayanad, Kerala** (Western Ghats) & **Rudraprayag, Uttarakhand** (Himalayan Corridor).

6. **Disaster Management Authority Portal**:
   - Emergency Priority Incident Queue sorted by Priority Score (Priority 1: Immediate Response Required, Priority 2: High Attention, Priority 3: Monitoring Required).
   - Verification/Rejection panel for incoming reports.
   - Interactive ML factor simulator slider panel.
   - Automated emergency alert broadcaster.---

## 📁 Repository Structure

```text
landslide Guard AI/
├── backend/
│   ├── main.py                # FastAPI server REST API endpoints
│   ├── database.py            # SQLite schema & database connection helpers
│   ├── ai_engine.py           # Computer vision AI image classifier
│   ├── risk_engine.py         # ML Landslide Risk prediction model (Random Forest)
│   ├── emergency_priority.py  # Emergency priority score calculation algorithm
│   ├── sync_manager.py        # Low-bandwidth sync & chunked upload manager
│   ├── sample_data.py         # Pre-populated pilot datasets for Wayanad & Rudraprayag
│   └── requirements.txt       # Python backend dependencies
├── frontend/
│   ├── index.html             # HTML entry point with Leaflet GIS CSS
│   ├── package.json           # React + Vite + Tailwind + Leaflet dependencies
│   ├── vite.config.js         # Vite configuration with backend proxy
│   ├── tailwind.config.js     # Tailwind CSS configuration & hazard colors
│   └── src/
│       ├── main.jsx           # React DOM root render
│       ├── App.jsx            # Main app shell & global navigation
│       ├── index.css          # Tailwind directives & dark Leaflet map theme
│       ├── services/
│       │   ├── db.js          # IndexedDB local offline database & offline AI
│       │   └── api.js         # REST API client service
│       └── components/
│           ├── LandingHero.jsx        # Platform introduction & key features
│           ├── CitizenReportView.jsx  # Mobile offline incident report camera/GPS view
│           ├── SyncCenter.jsx         # Adaptive low-bandwidth sync & chunk monitor
│           ├── GISMap.jsx             # Interactive Leaflet GIS map with risk zones
│           └── AdminDashboard.jsx     # Disaster Authority dashboard & priority queue
└── README.md
```

---

## 🛠️ Quick Setup & Local Execution

### Prerequisites
- Python 3.10+
- Node.js v18+ & npm

### Step 1: Start Backend Server (FastAPI)

```bash
cd backend
python -m pip install -r requirements.txt
python main.py
```
The FastAPI backend will start at `http://localhost:8000`. You can inspect the API docs at `http://localhost:8000/docs`.

### Step 2: Start Frontend Application (React + Vite)

```bash
cd frontend
npm install
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

---

## 🎯 How to Demonstrate to SIH Judges

1. **Test Offline Incident Capture**:
   - Set the Network Switcher at the top right to **Offline (Zero Net)**.
   - Open the **Report Incident** tab.
   - Notice automatic GNSS location lock (`11.6912°N, 76.1345°E, ±6.5m accuracy`).
   - Select a sample photo (e.g. *Ground Crack Fissure*).
   - Observe the **Preliminary On-Device AI** badge (`Possible Ground Crack Detected - 84.0%`).
   - Click **Save Offline in Local Database**. The report is stored immediately in device IndexedDB/SQLite.

2. **Test Adaptive Low-Bandwidth Sync Engine**:
   - Switch network mode to **Very Poor 2G**.
   - Navigate to the **Sync Center** tab and click **Sync Pending Reports**.
   - Watch **Priority 1 Emergency Metadata** upload first (~500 Bytes payload).
   - Switch network mode to **Poor 3G** and watch image compression + **Resumable Chunked Upload** progress bar (Chunks 1 to 5).

3. **Test Interactive GIS Risk Map**:
   - Open the **GIS Risk Map** tab.
   - Inspect color-coded polygons for **Wayanad, Kerala** or switch to **Rudraprayag, Uttarakhand**.
   - Click any incident marker to inspect the detailed modal popup (Image thumbnail, Server AI confidence %, GPS accuracy, risk score).

4. **Test Disaster Management Authority Portal**:
   - Open the **Authority Portal** tab.
   - Inspect the **Emergency Priority Incident Queue** sorted by Priority 1, 2, and 3 urgency.
   - Drag sliders on the **ML Dynamic Risk Simulator** to observe real-time Random Forest risk prediction and factor explainability.
   - Click **Broadcast Priority 1 Warning** to send emergency cell broadcasts.
