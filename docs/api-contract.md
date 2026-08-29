# API Contract (Provisional)

This document outlines the initial, high-level REST API contracts for the SauraRoute services.

> [!IMPORTANT]
> **Status: Provisional API Contract**
> None of these endpoints have been implemented. The inputs, outputs, and paths are subject to changes based on database design, mobile constraints, and client integrations.

---

## 1. Authentication

### `POST /api/auth/login`
* **Purpose:** Authenticate users (operators, drivers, or administrators) and issue a JWT token.
* **Authentication Required:** No
* **Status:** Provisional API Contract
* **Request Structure:**
  ```json
  {
    "username": "driver_saura",
    "password": "securepassword123"
  }
  ```
* **Response Structure (Success):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr_908123",
      "username": "driver_saura",
      "role": "DRIVER"
    }
  }
  ```

---

## 2. Vehicles

### `GET /api/vehicles`
* **Purpose:** List all active logistics vehicles.
* **Authentication Required:** Yes (Operator/Admin)
* **Status:** Provisional API Contract
* **Request Structure:** None
* **Response Structure (Success):**
  ```json
  [
    {
      "id": "vh_001",
      "plateNumber": "AS-01-XX-1234",
      "status": "ACTIVE",
      "lastLocation": {
        "latitude": 26.1445,
        "longitude": 91.7362,
        "updatedAt": "2026-08-29T10:00:00Z"
      }
    }
  ]
  ```

### `GET /api/vehicles/:id`
* **Purpose:** Get a single vehicle's details and active route details.
* **Authentication Required:** Yes
* **Status:** Provisional API Contract
* **Request Structure:** None (Path parameter `:id` is the vehicle ID)
* **Response Structure (Success):**
  ```json
  {
    "id": "vh_001",
    "plateNumber": "AS-01-XX-1234",
    "status": "ACTIVE",
    "driverId": "usr_908123",
    "lastLocation": {
      "latitude": 26.1445,
      "longitude": 91.7362,
      "updatedAt": "2026-08-29T10:00:00Z"
    }
  }
  ```

### `POST /api/vehicles/:id/location`
* **Purpose:** Update the current GPS coordinates of the vehicle (telemetry).
* **Authentication Required:** Yes (Driver/Device)
* **Status:** Provisional API Contract
* **Request Structure:**
  ```json
  {
    "latitude": 26.1445,
    "longitude": 91.7362,
    "timestamp": "2026-08-29T10:00:00Z"
  }
  ```
* **Response Structure (Success):**
  ```json
  {
    "success": true,
    "status": "LOCATION_UPDATED"
  }
  ```

---

## 3. Incidents & Road Blockages

### `GET /api/incidents`
* **Purpose:** Retrieve active road incidents and blockages within the NER. Supports optional bounds filtering.
* **Authentication Required:** Yes
* **Status:** Provisional API Contract
* **Request Structure:** (Optional query parameters e.g. `?status=ACTIVE`)
* **Response Structure (Success):**
  ```json
  [
    {
      "id": "inc_442",
      "type": "LANDSLIDE",
      "description": "Partial blockage on NH-2 near Kohima",
      "latitude": 25.6751,
      "longitude": 94.1086,
      "status": "ACTIVE",
      "severity": "HIGH",
      "reportedAt": "2026-08-29T08:30:00Z"
    }
  ]
  ```

### `POST /api/incidents`
* **Purpose:** Report a new road incident (e.g., landslide, heavy flooding, route blockage). Used by drivers or field agents.
* **Authentication Required:** Yes
* **Status:** Provisional API Contract
* **Request Structure:**
  ```json
  {
    "type": "LANDSLIDE",
    "description": "Mud and rocks blocking the single-lane pass",
    "latitude": 25.6751,
    "longitude": 94.1086,
    "severity": "HIGH"
  }
  ```
* **Response Structure (Success):**
  ```json
  {
    "id": "inc_442",
    "status": "SUBMITTED",
    "message": "Incident report submitted successfully"
  }
  ```

### `PATCH /api/incidents/:id`
* **Purpose:** Update the status or resolution of a reported incident.
* **Authentication Required:** Yes (Operator/Admin)
* **Status:** Provisional API Contract
* **Request Structure:**
  ```json
  {
    "status": "RESOLVED",
    "resolutionDetails": "Debris cleared by local recovery team. Road fully open."
  }
  ```
* **Response Structure (Success):**
  ```json
  {
    "id": "inc_442",
    "status": "RESOLVED",
    "updatedAt": "2026-08-29T10:15:00Z"
  }
  ```

---

## 4. Route Optimization

### `POST /api/routes/optimize`
* **Purpose:** Calculate the optimal route between an origin and destination coordinate, taking into account distances, active incidents, and predicted terrain hazards.
* **Authentication Required:** Yes
* **Status:** Provisional API Contract
* **Request Structure:**
  ```json
  {
    "origin": {
      "latitude": 26.1445,
      "longitude": 91.7362
    },
    "destination": {
      "latitude": 25.6751,
      "longitude": 94.1086
    },
    "vehicleType": "HEAVY_CARGO",
    "avoidHighRiskZones": true
  }
  ```
* **Response Structure (Success):**
  ```json
  {
    "distanceKm": 345.2,
    "estimatedDurationMinutes": 510,
    "riskIndex": 0.12,
    "pathGeoJSON": {
      "type": "LineString",
      "coordinates": [
        [91.7362, 26.1445],
        [92.5123, 25.9221],
        [94.1086, 25.6751]
      ]
    },
    "alerts": [
      {
        "message": "Vulnerability warning: Moderate rainfall forecast along NH-2 corridor.",
        "severity": "MEDIUM"
      }
    ]
  }
  ```

---

## 5. Machine Learning / Risk Prediction

### `POST /api/risk/predict`
* **Purpose:** Evaluate the immediate hazard level of a specific road segment based on meteorological and terrain parameters. Internal endpoint called by route optimizer.
* **Authentication Required:** Yes (Internal/API Token)
* **Status:** Provisional API Contract
* **Request Structure:**
  ```json
  {
    "segmentId": "seg_nh02_90",
    "currentRainfallMm": 45.2,
    "soilSaturation": 0.85,
    "slopeGradient": 32.5
  }
  ```
* **Response Structure (Success):**
  ```json
  {
    "segmentId": "seg_nh02_90",
    "landslideProbability": 0.78,
    "riskLevel": "CRITICAL",
    "confidenceScore": 0.89
  }
  ```
