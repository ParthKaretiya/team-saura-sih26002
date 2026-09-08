# API Contract

This document outlines the REST API contracts and implementation statuses for the **SauraRoute** platform.

---

## 1. Health & System

### `GET /api/health`
* **Status:** IMPLEMENTED (WORKING)
* **Response Structure:**
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-08-29T10:00:00.000Z",
    "services": {
      "database": "connected"
    }
  }
  ```

---

## 2. Weather Integration

### `GET /api/weather`
* **Status:** IMPLEMENTED (WORKING)
* **Query Parameters:** `lat` (latitude), `lon` (longitude)
* **Response Structure:**
  ```json
  {
    "status": "success",
    "data": {
      "location": { "latitude": 26.1445, "longitude": 91.7362 },
      "current": { "temperature": 28.5, "precipitation": 12.4, "weatherCode": 61 },
      "forecast": []
    }
  }
  ```

---

## 3. Incidents & Road Disruptions

### `GET /api/incidents`
* **Status:** IMPLEMENTED (WORKING)
* **Response Structure:** GeoJSON `FeatureCollection` containing `Point` features in `[longitude, latitude]` order.

### `POST /api/incidents`
* **Status:** IMPLEMENTED (WORKING)
* **Request Structure:**
  ```json
  {
    "type": "LANDSLIDE",
    "severity": "HIGH",
    "description": "Debris on NH-40 corridor",
    "latitude": 25.9021,
    "longitude": 91.8012
  }
  ```

### `PATCH /api/incidents/:id/status`
* **Status:** IMPLEMENTED (WORKING)
* **Request Structure:** `{ "status": "VERIFIED" }`

---

## 4. Vehicle Telemetry & Fleet Tracking

### `GET /api/vehicles`
* **Status:** IMPLEMENTED (WORKING)
* **Response Structure:** GeoJSON `FeatureCollection` with vehicle locations, headings, and speeds.

### `POST /api/vehicles/:id/location`
* **Status:** IMPLEMENTED (WORKING)
* **Request Structure:** `{ "latitude": 26.15, "longitude": 91.74, "speed": 45.0, "heading": 140.0 }`

---

## 5. Routing Engine (GraphHopper 10.2)

### `GET /api/routes`
* **Status:** IMPLEMENTED (WORKING)
* **Query Parameters:** `originLat`, `originLon`, `destinationLat`, `destinationLon`
* **Response Structure:**
  ```json
  {
    "status": "success",
    "data": {
      "origin": { "latitude": 26.1445, "longitude": 91.7362 },
      "destination": { "latitude": 25.5788, "longitude": 91.8933 },
      "distanceMeters": 95992,
      "durationSeconds": 5274,
      "geometry": {
        "type": "LineString",
        "coordinates": [[91.736153, 26.144276], [91.893275, 25.578769]]
      },
      "instructions": []
    }
  }
  ```

---

## 6. Risk Intelligence (Step 6)

### `GET /api/risk/point`
* **Status:** IMPLEMENTED (WORKING)
* **Query Parameters:** `lat` (latitude), `lon` (longitude)
* **Response Structure:**
  ```json
  {
    "status": "success",
    "data": {
      "location": { "latitude": 26.1445, "longitude": 91.7362 },
      "score": 68.5,
      "level": "HIGH",
      "factors": {
        "rainfall": { "subscore": 70.0, "valueMm": 38.4, "weight": 0.35, "description": "Heavy precipitation alert (38.4mm)" },
        "slope": { "subscore": 75.0, "degrees": 32.5, "weight": 0.25, "description": "Steep mountain escarpment (32.5°)" },
        "activeIncidents": { "subscore": 80.0, "nearestDistanceKm": 4.2, "countWithin15km": 1, "weight": 0.25, "description": "Active HIGH incident 4.2km away" },
        "historicalHotspots": { "subscore": 60.0, "nearestDistanceKm": 3.1, "nearestName": "Nongpoh Slide", "weight": 0.15, "description": "Known historical landslide zone: Nongpoh 3.1km away" }
      },
      "summary": "HIGH risk driven by heavy precipitation (38.4mm), steep escarpment (32.5°), and nearby active incident."
    }
  }
  ```

### `POST /api/risk/route`
* **Status:** IMPLEMENTED (WORKING)
* **Request Structure:**
  ```json
  {
    "coordinates": [
      [91.7362, 26.1445],
      [91.7821, 25.9810],
      [91.8933, 25.5788]
    ]
  }
  ```
* **Response Structure:**
  ```json
  {
    "status": "success",
    "data": {
      "overallLevel": "HIGH",
      "meanScore": 58.2,
      "maxScore": 72.0,
      "hazardousSegmentCount": 2,
      "dominantTrigger": "Steep Terrain",
      "sampledWaypointsCount": 18,
      "waypoints": []
    }
  }
  ```

### `GET /api/risk/zones`
* **Status:** IMPLEMENTED (WORKING)
* **Response Structure:** GeoJSON `FeatureCollection` of curated reference historical landslide hazard points across the North Eastern Region.

---

## 6. Machine Learning Classifiers (Step 7)

### `GET /api/ml/predict`
* **Status:** IMPLEMENTED (WORKING)
* **Query Parameters:** `lat` (latitude), `lon` (longitude)
* **Response Structure:**
  ```json
  {
    "status": "success",
    "data": {
      "prediction": "LANDSLIDE_RISK",
      "probability": 0.88,
      "risk_tier": "CRITICAL",
      "confidence": 0.76,
      "modelVersion": "v1.0.0-rf-step7",
      "location": { "latitude": 25.9036, "longitude": 91.8794 },
      "features": {
        "precipitation_24h_mm": 140.0,
        "slope_degrees": 38.0,
        "distance_to_hotspot_km": 0.0,
        "active_incident_count_15km": 1,
        "elevation_m": 750.0,
        "soil_saturation_index": 0.95
      },
      "featureImportance": {
        "elevation_m": 0.24,
        "slope_degrees": 0.22,
        "distance_to_hotspot_km": 0.20,
        "precipitation_24h_mm": 0.18,
        "soil_saturation_index": 0.16,
        "active_incident_count_15km": 0.00
      }
    }
  }
  ```

### `POST /api/ml/predict`
* **Status:** IMPLEMENTED (WORKING)
* **Request Structure (Feature Vector):**
  ```json
  {
    "features": {
      "precipitation_24h_mm": 85.0,
      "slope_degrees": 35.0,
      "distance_to_hotspot_km": 2.5,
      "active_incident_count_15km": 0,
      "elevation_m": 600.0,
      "soil_saturation_index": 0.75
    }
  }
  ```

### `GET /api/ml/model`
* **Status:** IMPLEMENTED (WORKING)
* **Response Structure:** Model metadata, algorithm parameters, 5-fold cross-validation accuracy, and feature importances.

---

## 7. Hazard-Aware Route Optimization (Step 8)

Step 8 implements **candidate-route optimization** (Approach B). GraphHopper returns several alternative candidate routes for the same origin/destination; each candidate is profiled with the Step-6 risk engine, and a deterministic selector picks the safest route that stays within the configured detour budget. This is distinct from true GraphHopper edge-level hazard weighting — the graph's edge weights are not modified.

### `POST /api/routes/optimize`
* **Status:** IMPLEMENTED (WORKING)
* **Request Structure:**
  ```json
  {
    "origin": { "latitude": 26.1445, "longitude": 91.7362 },
    "destination": { "latitude": 25.5788, "longitude": 91.8933 },
    "routingPreference": "BALANCED",
    "routingOptions": { "maxPaths": 3 }
  }
  ```
  * `origin` / `destination`: required coordinate objects (`latitude`, `longitude`).
  * `routingPreference`: optional, one of `FASTEST` | `BALANCED` | `SAFEST` (defaults to `BALANCED` when omitted).
  * `routingOptions`: optional (`profile`, `alternativeRoutes`, `maxPaths`, `customModel`).
* **Response Structure** (`RouteOptimizationResult`):
  ```json
  {
    "status": "success",
    "data": {
      "origin": { "latitude": 26.1445, "longitude": 91.7362 },
      "destination": { "latitude": 25.5788, "longitude": 91.8933 },
      "selectedCandidateId": "candidate-1",
      "selectedRoute": { "candidateId": "candidate-1", "name": "Candidate 1", "isBaseline": false, "distanceMeters": 98450, "durationSeconds": 7200, "geometry": { "type": "LineString", "coordinates": [] }, "instructions": [], "risk": { "overallLevel": "LOW", "meanScore": 20, "maxScore": 30, "hazardousSegmentCount": 0, "dominantTrigger": "None", "sampledWaypointsCount": 18 }, "compositeCost": 0.42, "normalizedCost": { "durationScore": 0.8, "distanceScore": 0.7, "hazardScore": 0.2, "totalCost": 0.42 } },
      "baselineRoute": { "candidateId": "candidate-0", "name": "Candidate 0", "isBaseline": true, "distanceMeters": 95992, "durationSeconds": 5274, "geometry": { "type": "LineString", "coordinates": [] }, "instructions": [], "risk": { "overallLevel": "HIGH", "meanScore": 58, "maxScore": 72, "hazardousSegmentCount": 2, "dominantTrigger": "Steep Terrain", "sampledWaypointsCount": 18 }, "compositeCost": 0.8, "normalizedCost": { "durationScore": 1, "distanceScore": 1, "hazardScore": 0.66, "totalCost": 0.8 } },
      "candidatesCount": 3,
      "candidates": [],
      "preference": "BALANCED",
      "safetyIntelligence": { "status": "AVAILABLE" },
      "optimization": {
        "strategy": "SAFETY_OPTIMIZED",
        "selectionReason": "Balanced route selected because it provided the best configured time-risk tradeoff within the allowed detour.",
        "hazardReductionPercent": 32,
        "additionalDistanceKm": 2.5,
        "additionalDurationMinutes": 8
      }
    }
  }
  ```
  * `candidates` is the full array of profiled `CandidateRouteProfile` objects; `selectedRoute` and `baselineRoute` are also present individually for convenience.
  * `safetyIntelligence.status` is `DEGRADED` (with a `reason`) when any candidate's risk could not be fully evaluated; the selector then falls back to the fastest baseline honestly rather than fabricating risk.

### `POST /api/routes/reroute`
* **Status:** IMPLEMENTED (WORKING)
* **Request Structure:**
  ```json
  {
    "origin": { "latitude": 26.1445, "longitude": 91.7362 },
    "destination": { "latitude": 25.5788, "longitude": 91.8933 },
    "currentRoute": {
      "origin": { "latitude": 26.1445, "longitude": 91.7362 },
      "destination": { "latitude": 25.5788, "longitude": 91.8933 },
      "distanceMeters": 95992,
      "durationSeconds": 5274,
      "geometry": { "type": "LineString", "coordinates": [] },
      "instructions": []
    },
    "routingOptions": { "maxPaths": 3 }
  }
  ```
  * `currentRoute` must include positive `distanceMeters` / `durationSeconds` and a `LineString` geometry with at least two coordinates.
* **Response Structure** (`RerouteEvaluationResult`):
  ```json
  {
    "status": "success",
    "data": {
      "rerouteRecommended": true,
      "reason": "Rerouting is recommended because the current route has a critical active-incident hazard and a safer detour is available.",
      "currentRoute": { "riskLevel": "HIGH", "meanRiskScore": 58, "maxRiskScore": 72, "hazardousSegmentCount": 2 },
      "safetyIntelligence": { "status": "AVAILABLE" },
      "recommendedRoute": { "candidateId": "candidate-1", "name": "Candidate 1", "isBaseline": false, "distanceMeters": 101000, "durationSeconds": 7600, "geometry": { "type": "LineString", "coordinates": [] }, "instructions": [], "risk": { "overallLevel": "LOW", "meanScore": 20, "maxScore": 30, "hazardousSegmentCount": 0, "dominantTrigger": "None", "sampledWaypointsCount": 18 }, "compositeCost": 0.4, "normalizedCost": { "durationScore": 0.8, "distanceScore": 0.7, "hazardScore": 0.2, "totalCost": 0.4 } },
      "metrics": { "hazardReductionPercent": 35, "additionalDistanceMeters": 5000, "additionalDurationSeconds": 600 },
      "evaluatedCandidatesCount": 3
    }
  }
  ```
  * When rerouting is not warranted, `rerouteRecommended` is `false`, `reason` carries the backend explanation, and `recommendedRoute`/`metrics` are omitted.

### `GET /api/routes` (backward-compatible)
* **Status:** IMPLEMENTED (WORKING — unchanged)
* Remains the existing baseline route endpoint (see Section 5). Step 8 adds the two endpoints above without altering `GET /api/routes` response shape or behavior.
