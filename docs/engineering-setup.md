# Engineering Setup & Verification Guide

This guide describes the local development setup, environment configurations, and verification procedures for the **SauraRoute** platform.

---

## 1. Prerequisites & Version Requirements

| Dependency | Minimum Version | Tested Version | Purpose |
| :--- | :--- | :--- | :--- |
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
```

---

## 3. How to Start Each Service

### Service A: PostgreSQL + PostGIS (Docker)
1. Start the container:
   ```bash
   docker compose up -d db
   ```
2. Run database migrations:
   ```bash
   cd services/api
   npm run db:migrate
   ```
3. Seed baseline vehicles and sample incident:
   ```bash
   npm run db:seed
   ```

### Service B: Node.js API (`services/api`)
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

### Service C: Vehicle Telemetry Simulator (`services/api`)
1. In a separate terminal, start the waypoint-driven telemetry simulator:
   ```bash
   cd services/api
   npx tsx src/scripts/simulate-telematics.ts
   ```
   *Emits GPS updates for `SAURA-001`, `SAURA-002`, `SAURA-003` every 3 seconds.*

### Service D: Web Map Dashboard (`apps/web`)
1. Start the Vite development server:
   ```bash
   cd apps/web
   npm run dev
   # Access at http://localhost:5173
   ```

### Service E: Python ML / Terrain Processing (`services/ml`)
1. Activate virtual environment and run slope tests:
   ```bash
   cd services/ml
   .\venv\Scripts\activate      # Windows (or source venv/bin/activate on Linux/macOS)
   python src/test_slope.py
   ```

---

## 4. How to Verify Each Service

### 1. Verify API Endpoints & PostGIS Data
* **Health Check:** `GET http://localhost:3000/api/health`
* **Weather Integration:** `GET http://localhost:3000/api/weather?lat=26.1445&lon=91.7362`
* **List Incidents (GeoJSON):** `GET http://localhost:3000/api/incidents`
* **Report New Incident:**
  ```bash
  curl -X POST http://localhost:3000/api/incidents \
    -H "Content-Type: application/json" \
    -d '{
      "type": "LANDSLIDE",
      "severity": "CRITICAL",
      "description": "Severe rockfall on GS Road",
      "latitude": 26.0450,
      "longitude": 91.7730
    }'
  ```
* **List Vehicles (GeoJSON):** `GET http://localhost:3000/api/vehicles`

### 2. Verify Web Application (MapLibre GL JS)
1. Open `http://localhost:5173`.
2. Inspect the map:
   * **Incidents Layer:** Rendered with circles color-coded by severity (`CRITICAL`: Red, `HIGH`: Orange, `MEDIUM`: Amber, `LOW`: Blue).
   * **Vehicles Layer:** Rendered with emerald green circles showing `SAURA-001`, `SAURA-002`, `SAURA-003`.
   * **Interactive Popups:** Clicking any marker shows detailed properties.
   * **Live Polling:** Vehicle markers move across waypoints as the simulator runs.

### 3. Run Automated Tests
```bash
cd services/api
npm test
```
**Expected Output:**
```text
==================================================
SauraRoute Automated Verification Suite (Step 4)
==================================================
--- 1. Validation Utilities ---
  [PASS] validateCoordinates accepts valid latitude and longitude
  [PASS] validateCoordinates rejects out-of-range latitude (> 90)
  [PASS] validateCoordinates rejects out-of-range longitude (> 180)
  [PASS] validateIncidentType accepts LANDSLIDE and rejects INVALID_TYPE
  [PASS] validateSeverity accepts CRITICAL and rejects SUPER_HIGH
  [PASS] validateIncidentStatus accepts REPORTED, VERIFIED, REJECTED, ACTIVE, RESOLVED
  [PASS] validateStatusTransition enforces lifecycle rules
--- 2. Incident Service & GeoJSON Standards ---
  [PASS] IncidentService creates and lists incidents in GeoJSON format
  [PASS] IncidentService updates status through lifecycle and handles REJECTED
--- 3. Vehicle Service & Tracking ---
  [PASS] VehicleService lists seeded vehicles in GeoJSON format
  [PASS] VehicleService updates vehicle position and handles 404 for unknown vehicle
--- 4. Weather Service Integration ---
  [PASS] WeatherService rejects invalid coordinates with 400
  [PASS] WeatherService fetches and normalizes weather for requested coordinates
==================================================
Results: 13 passed, 0 failed.
==================================================
```
