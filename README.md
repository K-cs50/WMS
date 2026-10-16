# WMS-Water Management & Supply
### Civic-Tech Infrastructure Monitoring & Community Water Dispatch System
*Built for the ALTHON 2.0 Hackathon — Water-Supply Timing Tracker (Theme 2: Community & Everyday Services)*

---

## 🏛️ Executive Overview
**WMS (Water Management System)** is an infrastructure-grade civic intelligence platform designed for Hyderabad's municipal water supply network. It transforms the unpredictability of municipal tap water into an actionable, transparent operational picture. 

Departing entirely from generic AI-dashboard templates, WMS uses a **Swiss editorial and municipal operations room aesthetic** that prioritizes public trust, data provenance, statutory price compliance, and mathematical transparency.

Citizens and municipal ward liaisons can:
- Verify scheduled vs. actual ground-truth water supply timings with decay-calibrated reliability scores ($\lambda=0.01$).
- Review official gazette bulletins and corroborate field observations across wards.
- Inspect aquifer stress and reservoir capacities on high-accuracy GIS maps.
- Requisition water tankers under statutory price caps (₹0.16/L potable, ₹0.12/L utility) with GPS telemetry slips.
- Pool neighborhood demand with Resident Welfare Associations (RWAs) to trigger wholesale volume tariffs.
- Query AquaAssist—a civic telemetry synthesis terminal grounded in official bulletins.

---

## 🎨 Design System & Visual Identity

The platform implements an editorial, infrastructure-inspired design language:

| Design Token | Hex Code | Visual Application |
| :--- | :--- | :--- |
| **Deep Ink** | `#172B32` | Primary typography, navigation rail, gazette mastheads, active selectors |
| **Warm Paper** | `#F4F1E9` | Ambient canvas background evoking official administrative gazettes |
| **River Teal** | `#167D78` | Verified telemetry markers, statutory compliance indicators, active state highlights |
| **Infrastructure Orange** | `#D96B3B` | Operational alerts, maintenance advisories, acute pressure stress markers |
| **Muted Slate** | `#75858A` | Technical micro-labels, category identifiers, metadata provenance |
| **White** | `#FFFFFF` | Primary data cards and modal surfaces (`1px solid #DED8CA`, 3–4px radius) |
| **Critical Red** | `#B93838` | Severe water deficits, pipeline ruptures, unverified conflict warnings |

### Typography Hierarchy
- **Editorial Headlines**: `Newsreader` (Google Fonts editorial serif) for mastheads and civic bulletins.
- **Interface Body**: `Plus Jakarta Sans` for clean, high-legibility interface controls.
- **Tabular & Telemetry**: `JetBrains Mono` with `font-variant-numeric: tabular-nums` for volume figures (liters, MLD), coordinates, and timestamps.

---

## 🚀 Live Services & Architecture
- **Frontend Web App**: `http://127.0.0.1:5173` (React 19, TypeScript, Vite, Tailwind CSS v4, Leaflet.js, Recharts, Lucide Icons)
- **FastAPI Backend**: `http://127.0.0.1:8000` (FastAPI, SQLAlchemy, SQLite/PostgreSQL, Pydantic, Python-Jose JWT, Bcrypt)
- **Interactive API Documentation (Swagger UI)**: `http://127.0.0.1:8000/docs`

---

## 🔑 Demo Credentials (Quick Sign-In)
Pre-seeded demo accounts with 1-click quick-fill buttons on the login page:

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Consumer (Citizen)** | `priya@wms.demo` | `Demo@1234` | View supply timings, broadcast ground reports, book tankers, join bulk pools, query AquaAssist |
| **Locality Rep (Kondapur)**| `ravi@wms.demo` | `Demo@1234` | Locality representative permissions to broadcast community alerts across wards |
| **Provider (Logistics)**| `provider@wms.demo`| `Demo@1234` | Fleet dispatch, accept/reject tanker bookings, update delivery status |
| **Administrator** | `admin@wms.demo` | `Admin@1234` | Authorize official HMWSSB notices, moderate reports, audit users, trigger source telemetry sync |

---

## 💡 Core Features & Technical Highlights

### 1. Operations Room Overview (`/dashboard`)
- **Live Supply Status Matrix**: Real-time scheduled supply vs. verified actual supply comparison.
- **Mathematical Reliability Engine**: Real-time evaluation of supply reliability via exponential temporal decay:
  $$R = \prod (1 - p_i) \cdot e^{-\lambda \Delta t} \quad (\lambda = 0.01)$$
- **Ward-Level Stress Distribution**: Aquifer depth, supply window, pressure status, and verified citizen reports.

### 2. Official Statutory Gazette & Community Bulletins (`/broadcasts`)
- **Strict Authority Separation**:
  - `Official Municipal Bulletin`: Verified administrator accounts citing official municipal gazettes with official seals.
  - `Community Field Report`: Corroborated observations by registered citizens.
  - `Conflicting Reports`: Automatic penalty when opposite statuses are reported within 2 hours.
- **Multi-Ward Dispatch Terminal**: For municipal liaisons to issue notices with target ward tagging and severity classification.
- **Anti-Spam Rate Limiting**: 5-minute cooldown per citizen per ward.

### 3. Editorial Source Registry & Provenance Console (`/sources`)
- **Provenance Disclosures**: Distinct cards for **HMWS&SB**, **GHMC Engineering**, **Telangana Water Resources (TS-ICAD)**, **IMD Hyderabad**, and **CGWB**.
- **Data Provenance Console**: Expandable technical drawer detailing data freshness, update frequency, access constraints, and a live synchronization button triggering `/api/sources/sync`.

### 4. Geospatial Water Stress & Location Mapping (`/map`)
- **Real Leaflet & OpenStreetMap Canvas**: High-accuracy polygon boundaries and coordinate mapping for Hyderabad wards (Banjara Hills, Jubilee Hills, Kondapur, etc.).
- **High-Accuracy GPS**: Browser Geolocation API integration with automatic distance calculation to nearest supply infrastructure.
- **Telemetry Pins**: High-contrast markers in River Teal (`#167D78`) and Infrastructure Orange (`#D96B3B`).

### 5. Supply Window Forecast (`/forecast`)
- **Engineering Timeline**: Recharts confidence curve differentiating measured historical baseline from forward-looking predictive models without fabricating sensor readings.

### 6. Tanker Allocation & Dispatch Registry (`/book-tanker`)
- **Regulated Tariff Enforcement**: Base tariffs capped at ₹0.16/L (Potable) and ₹0.12/L (Utility).
- **Telemetry Slips**: Step-by-step delivery tracking (*Order Confirmed* $\rightarrow$ *In Transit* $\rightarrow$ *Flow-Meter Delivered*).

### 7. Collective Demand Aggregation Pools (`/bulk-water`)
- **RWA Pooling Aggregator**: Allows Resident Welfare Associations (RWAs) to aggregate tanker capacity (threshold: 10 homes) to lock in wholesale rates (₹0.11/L) and reduce street congestion.

### 8. AquaAssist Telemetry Synthesis Terminal (`/assistant`)
- **Civic Telemetry Interface**: Replaces generic AI chatbots with a serious intelligence terminal citing official gazettes and reporting model confidence intervals.

---

## 🔍 Data-Source Integrity & Disclosures

To maintain strict civic trust, WMS adheres to honest disclosures:
1. **Live HMWSSB Piped Timings**: HMWSSB does not provide a public real-time SCADA sensor API. Municipal schedules are ingested from published ward gazettes; ground status is corroborated by real-time citizen observations.
2. **Delivery Tanker GPS Tracking**: Tanker markers represent simulated fleet locations for delivery demonstration purposes.
3. **IMD Meteorological Telemetry**: Live temperature and precipitation metrics stream dynamically from the Open-Meteo & IMD public meteorological services.

---

## 🛠️ How to Run Locally

### 1. Backend Setup & Startup
```bash
cd backend
python -m pip install -r requirements.txt
python seed.py          # Seeds cities, localities, schedules, indicators & demo users
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### 2. Frontend Setup & Startup
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev -- --host 127.0.0.1 --port 5173
```

### 3. Run Automated Integration Test Suite
```bash
cd backend
python test_suite_internal.py
```
*All 13 asynchronous end-to-end integration tests execute and verify authentication, broadcasts, anti-spam rate limiting, official permissions, geospatial telemetry, and data source ingestion.*
