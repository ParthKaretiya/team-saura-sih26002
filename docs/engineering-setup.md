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
2. Check container health:
   ```bash
   docker ps -f name=sauraroute-db
   ```

### Service B: Node.js API (`services/api`)
1. Navigate to the API folder and install dependencies:
   ```bash
   cd services/api
   npm install
   ```
2. Start the development server (with auto-reload):
   ```bash
   npm run dev
   ```
3. Or run the production build:
   ```bash
   npm run build
   npm start
   ```

### Service C: Web Application (`apps/web`)
1. Navigate to the web folder and install dependencies:
   ```bash
   cd apps/web
   npm install
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
3. Access the application in your browser at `http://localhost:5173`.

### Service D: Python ML / Terrain Processing (`services/ml`)
1. Navigate to the ML folder and create/activate a virtual environment:
   ```bash
   cd services/ml
   python -m venv venv
   
   # On Windows:
   .\venv\Scripts\activate
   
   # On macOS/Linux:
   source venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run slope processing verification:
   ```bash
   python src/test_slope.py
   ```

---

## 4. How to Verify Each Service

### 1. Verify Node.js API & PostGIS Connection
Send a request to the health check endpoint:
* **HTTP:** `GET http://localhost:3000/api/health`
* **cURL command:**
  ```bash
  curl http://localhost:3000/api/health
  ```
* **Expected Response (with PostGIS running):**
  ```json
  {
    "status": "ok",
    "timestamp": "2026-08-29T05:10:10.420Z",
    "database": "connected",
    "postgis": "3.3 USE_GEOS=1 USE_PROJ=1 USE_STATS=1"
  }
  ```
* **Expected Response (without PostGIS running):**
  ```json
  {
    "status": "ok",
    "timestamp": "2026-08-29T05:10:10.420Z",
    "database": "disconnected",
    "postgis": null
  }
  ```

### 2. Verify Web Application (MapLibre GL JS)
1. Run `npm run build` inside `apps/web` to confirm clean TypeScript compilation and asset bundling.
2. Run `npm run dev` and open `http://localhost:5173`.
3. Verify that the map canvas initializes centered on the North Eastern Region of India (`longitude: 93.5, latitude: 26.0`) with navigation controls in the top-right corner.

### 3. Verify Python DEM Slope Processing
Run the automated test suite:
```bash
cd services/ml
python src/test_slope.py
```
**Expected Output:**
```text
==================================================
SauraRoute DEM Slope Processing — Foundation Test
==================================================
[*] Target Angle:   0.0° | Computed Mean:   0.0° | Max Error: 0.000000° [PASSED]
[*] Target Angle:  15.0° | Computed Mean:  15.0° | Max Error: 0.000000° [PASSED]
[*] Target Angle:  30.0° | Computed Mean:  30.0° | Max Error: 0.000000° [PASSED]
[*] Target Angle:  45.0° | Computed Mean:  45.0° | Max Error: 0.000000° [PASSED]
[*] Target Angle:  60.0° | Computed Mean:  60.0° | Max Error: 0.000000° [PASSED]
--------------------------------------------------
[*] Synthetic Gaussian Hill (100x100 grid, 30m cell resolution):
    - Min Elevation: 0.0m | Max Elevation: 499.1m
    - Min Slope:     0.00° | Max Slope:     40.83°
    - Mean Slope:    7.90°
==================================================
[+] ALL SLOPE CALCULATIONS VALIDATED SUCCESSFULLY.
==================================================
```
