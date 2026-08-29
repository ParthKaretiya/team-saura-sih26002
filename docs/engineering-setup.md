# Engineering Setup & Verification Guide

This guide describes the local development setup, environment configurations, and verification procedures for the **SauraRoute** platform.

---

## 1. Prerequisites & Version Requirements

| Dependency | Minimum Version | Tested Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Java** | `17.x` | `Temurin 17.0.18+8` | Local GraphHopper 10.2 routing engine (`services/routing`) |
| **Node.js** | `>= 20.0.0` | `v20.x+` / `v22.x` | Backend API (`services/api`) and Web Dashboard (`apps/web`) |
| **npm** | `>= 9.0.0` | `10.x+` | Package manager |
| **Python** | `>= 3.10` | `3.12.10` | Geospatial and ML terrain processing (`services/ml`) |
| **Docker / Compose** | `>= 24.0.0` | Optional for local spikes | Runs PostgreSQL + PostGIS database container |

---

## 2. Environment Configuration

Copy `.env.example` to `.env` in the repository root:

```ini
# --- API Port ---
API_PORT=3000

# --- Database Configurations ---
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sauraroute_db
DB_USER=postgres
DB_PASSWORD=sauraroute_dev_2026
DB_URL=postgresql://postgres:sauraroute_dev_2026@localhost:5432/sauraroute_db

# --- GraphHopper Routing ---
GRAPHHOPPER_URL=http://localhost:8989
GRAPHHOPPER_TIMEOUT_MS=5000
GRAPHHOPPER_PROFILE=car
```

---

## 3. How to Start Each Service

### Service A: Local GraphHopper Routing Engine (`services/routing`)
1. From the repository root (requires Java 17):
   ```powershell
   .\services\routing\start-graphhopper.ps1
   ```
   *GraphHopper runs on `http://localhost:8989`.*

### Service B: PostgreSQL + PostGIS (Docker)
1. Start the container:
   ```bash
   docker compose up -d db
   ```
2. Run database migrations and seed baseline data:
   ```bash
   cd services/api
   npm run db:migrate
   npm run db:seed
   ```

### Service C: Node.js API (`services/api`)
1. Start the development server (with auto-reload):
   ```bash
   cd services/api
   npm run dev
   # Runs on http://localhost:3000
   ```
2. Run automated test suite:
   ```bash
   npm test
   ```

### Service D: Vehicle Telemetry Simulator (`services/api`)
1. In a separate terminal, start the waypoint-driven telemetry simulator:
   ```bash
   cd services/api
   npx tsx src/scripts/simulate-telematics.ts
   ```

### Service E: Web Map Dashboard (`apps/web`)
1. Start the Vite development server:
   ```bash
   cd apps/web
   npm run dev
   # Access at http://localhost:5173
   ```

### Service F: Python ML / Terrain Processing (`services/ml`)
1. Activate virtual environment and run slope tests:
   ```bash
   cd services/ml
   .\venv\Scripts\activate      # Windows (or source venv/bin/activate on Linux/macOS)
   python src/test_slope.py
   ```

---

## 4. How to Verify Each Service

### 1. Verify Real Routing Engine & API Pipeline
* **Health Check:** `GET http://localhost:8989/health` $\rightarrow$ `200 OK`
* **Route Calculation (Guwahati → Shillong):**
  ```bash
  curl "http://localhost:3000/api/routes?originLat=26.1445&originLon=91.7362&destinationLat=25.5788&destinationLon=91.8933"
  ```

### 2. Verify Risk Intelligence Foundation (Step 6)
* **Point Risk Assessment:**
  ```bash
  curl "http://localhost:3000/api/risk/point?lat=25.9036&lon=91.8794"
  ```
  *Expected:* `200 OK`, `score` $[0, 100]$, `level` (`LOW`/`MEDIUM`/`HIGH`/`CRITICAL`), factor subscores for `rainfall`, `slope`, `activeIncidents`, and `historicalHotspots`.
* **Corridor Route Risk Assessment:**
  ```bash
  curl -X POST "http://localhost:3000/api/risk/route" -H "Content-Type: application/json" -d "{\"coordinates\": [[91.7362, 26.1445], [91.7821, 25.9810], [91.8933, 25.5788]]}"
  ```
* **Hazard Zones GeoJSON:**
  ```bash
  curl "http://localhost:3000/api/risk/zones"
  ```

### 3. Verify Incidents & Vehicles
* **Weather Integration:** `GET http://localhost:3000/api/weather?lat=26.1445&lon=91.7362`
* **List Incidents (GeoJSON):** `GET http://localhost:3000/api/incidents`
* **List Vehicles (GeoJSON):** `GET http://localhost:3000/api/vehicles`

### 4. Verify Web Application (MapLibre GL JS)
1. Open `http://localhost:5173`.
2. Inspect the map:
   * **Basemap & Hazard Zones:** Purple markers indicating cataloged historical landslide events across the NER with toggle checkbox in legend.
   * **Incidents & Fleet:** Active hazards and trucks moving live.
   * **Route & Risk Calculation:** Select *"Guwahati → Shillong"* and press *"Calculate Route & Assess Risk"*.
   * **Visuals:** Blue highway line renders on map, zooming to corridor, and displays Distance, Travel Time, and **Corridor Risk Level Banner** (`HIGH RISK (62/100) — Primary Trigger: Steep Terrain`).

### 5. Verify Machine Learning Classifiers (Step 7)
* **Run Python ML Tests:**
  ```bash
  python services/ml/src/test_classifier.py
  python services/ml/src/test_slope.py
  ```
* **Train Random Forest Classifier:**
  ```bash
  python services/ml/src/train_classifier.py
  ```
* **Evaluate 5-Fold Stratified Metrics:**
  ```bash
  python services/ml/src/evaluate_model.py
  ```
* **ML API Prediction:**
  ```bash
  curl "http://localhost:3000/api/ml/predict?lat=25.9036&lon=91.8794"
  curl "http://localhost:3000/api/ml/model"
  ```
