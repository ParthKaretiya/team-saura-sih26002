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
* **Status:** IMPLEMENTED (WORKING — baseline route)
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

## 7. Machine Learning Classifiers (Step 7)

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

## 8. Hazard-Aware Route Optimization & Accessibility Integration (Steps 8 & 9)

SauraRoute implements **candidate-route optimization** (Approach B). GraphHopper returns alternative candidate routes for the requested origin and destination. In Step 9, candidate routes are first evaluated against registered road accessibility corridors:
- Intersecting **`CLOSED`** corridors marks candidates ineligible (`isEligible: false`), pruning them from optimization if eligible alternatives exist.
- Intersecting **`RESTRICTED`** corridors keeps candidates eligible (`isEligible: true`) while surfacing warning metadata.
- If all candidates are closed, the engine returns a best-effort route marked `ALL_CANDIDATES_CLOSED` rather than falsely claiming no road geometry exists.

Eligible candidates are then profiled with the Step-6 risk engine and Step-7 ML advisory predictions, and a deterministic selector picks the safest route that stays within the configured detour budget ($1.35\times$).

> [!NOTE]
> **Prototype Proximity Heuristic:** Corridor intersection detection currently uses a deterministic, dependency-free equirectangular point-to-segment distance algorithm with a configured tolerance of **250 meters** (`intersectionToleranceMeters`). This is a prototype geometric proximity heuristic, **not** lane-level, edge-level, or authoritative road-network graph closure enforcement.
> GraphHopper edge weights are **not** dynamically modified at runtime.

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
  * `routingPreference`: optional, one of `FASTEST` | `BALANCED` | `SAFEST` (defaults to `BALANCED`).
  * `routingOptions`: optional (`profile`, `alternativeRoutes`, `maxPaths`, `customModel`).
* **Response Structure** (`RouteOptimizationResult`):
  ```json
  {
    "status": "success",
    "data": {
      "origin": { "latitude": 26.1445, "longitude": 91.7362 },
      "destination": { "latitude": 25.5788, "longitude": 91.8933 },
      "selectedCandidateId": "candidate_2",
      "selectedRoute": {
        "candidateId": "candidate_2",
        "name": "Alternative Corridor 2",
        "isBaseline": false,
        "distanceMeters": 98450,
        "durationSeconds": 7200,
        "geometry": { "type": "LineString", "coordinates": [[91.7362, 26.1445], [91.8933, 25.5788]] },
        "instructions": [],
        "risk": { "overallLevel": "LOW", "meanScore": 20.0, "maxScore": 30.0, "hazardousSegmentCount": 0, "dominantTrigger": "None", "sampledWaypointsCount": 18, "waypoints": [] },
        "compositeCost": 0.42,
        "normalizedCost": { "durationScore": 0.8, "distanceScore": 0.7, "hazardScore": 0.2, "totalCost": 0.42 },
        "accessibility": {
          "status": "ACCESSIBLE",
          "isEligible": true,
          "affectedCorridors": []
        }
      },
      "baselineRoute": {
        "candidateId": "candidate_1",
        "name": "Baseline Highway Route (Fastest)",
        "isBaseline": true,
        "distanceMeters": 95992,
        "durationSeconds": 5274,
        "geometry": { "type": "LineString", "coordinates": [[91.7362, 26.1445], [91.8933, 25.5788]] },
        "instructions": [],
        "risk": { "overallLevel": "HIGH", "meanScore": 58.0, "maxScore": 72.0, "hazardousSegmentCount": 2, "dominantTrigger": "Steep Terrain", "sampledWaypointsCount": 18, "waypoints": [] },
        "compositeCost": 0.8,
        "normalizedCost": { "durationScore": 1.0, "distanceScore": 1.0, "hazardScore": 0.66, "totalCost": 0.8 },
        "accessibility": {
          "status": "CLOSED",
          "isEligible": false,
          "affectedCorridors": [
            { "id": "acc_01", "name": "GS Road Pass", "status": "CLOSED", "source": "NHAI" }
          ],
          "exclusionReason": "Candidate intersects one or more CLOSED corridors."
        }
      },
      "candidatesCount": 2,
      "candidates": [],
      "preference": "BALANCED",
      "safetyIntelligence": { "status": "AVAILABLE" },
      "optimization": {
        "strategy": "SAFETY_OPTIMIZED",
        "selectionReason": "Safer route selected because it materially reduced hazard exposure while remaining within the allowed detour.",
        "hazardReductionPercent": 32.0,
        "additionalDistanceKm": 2.5,
        "additionalDurationMinutes": 8.0
      },
      "accessibility": {
        "status": "ACCESSIBLE",
        "affectedCorridors": [
          { "id": "acc_01", "name": "GS Road Pass", "status": "CLOSED", "source": "NHAI" }
        ]
      }
    }
  }
  ```

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
      "geometry": { "type": "LineString", "coordinates": [[91.7362, 26.1445], [91.8933, 25.5788]] },
      "instructions": []
    },
    "routingOptions": { "maxPaths": 3 }
  }
  ```
* **Response Structure** (`RerouteEvaluationResult`):
  ```json
  {
    "status": "success",
    "data": {
      "rerouteRecommended": true,
      "reason": "Rerouting is recommended because a candidate provides the configured safety improvement within the allowed detour.",
      "currentRoute": {
        "riskLevel": "HIGH",
        "meanRiskScore": 58.0,
        "maxRiskScore": 72.0,
        "hazardousSegmentCount": 2,
        "accessibility": {
          "status": "CLOSED",
          "isEligible": false,
          "affectedCorridors": []
        }
      },
      "safetyIntelligence": { "status": "AVAILABLE" },
      "recommendedRoute": {
        "candidateId": "candidate_2",
        "name": "Alternative Corridor 2",
        "isBaseline": false,
        "distanceMeters": 101000,
        "durationSeconds": 7600,
        "geometry": { "type": "LineString", "coordinates": [] },
        "instructions": [],
        "risk": { "overallLevel": "LOW", "meanScore": 20.0, "maxScore": 30.0, "hazardousSegmentCount": 0, "dominantTrigger": "None", "sampledWaypointsCount": 18, "waypoints": [] },
        "compositeCost": 0.4,
        "normalizedCost": { "durationScore": 0.8, "distanceScore": 0.7, "hazardScore": 0.2, "totalCost": 0.4 }
      },
      "metrics": {
        "hazardReductionPercent": 35.0,
        "additionalDistanceMeters": 5008,
        "additionalDurationSeconds": 2326
      },
      "evaluatedCandidatesCount": 2,
      "accessibility": {
        "status": "ACCESSIBLE",
        "affectedCorridors": []
      }
    }
  }
  ```

---

## 9. Road Accessibility Intelligence & Corridor Management (Step 9)

Corridors are tracked in PostGIS (table `road_accessibility`) with authoritative in-memory fallback. Corridors use GeoJSON `LineString` geometries in standard `[longitude, latitude]` order.

### Status Vocabulary & Transitions
* **`OPEN`**: Corridor is normally routable.
* **`RESTRICTED`**: Corridor remains usable but flagged for operator awareness and potential candidate demotion.
* **`CLOSED`**: Route candidates intersecting this corridor are disqualified from optimization when eligible alternatives exist.

Allowed transitions (self-transitions are rejected):
* `OPEN` $\rightarrow$ `RESTRICTED` | `CLOSED`
* `RESTRICTED` $\rightarrow$ `OPEN` | `CLOSED`
* `CLOSED` $\rightarrow$ `OPEN` | `RESTRICTED`

### `GET /api/accessibility`
* **Status:** IMPLEMENTED (WORKING)
* **Response Structure:** GeoJSON `FeatureCollection`
  ```json
  {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "LineString",
          "coordinates": [[91.8012, 25.9021], [91.8345, 25.8765]]
        },
        "properties": {
          "id": "acc_01a2b3c4",
          "name": "GS Road Nongpoh Corridor",
          "roadCode": "NH-40",
          "status": "CLOSED",
          "reason": "Major landslide blockage near Nongpoh",
          "source": "Meghalaya PWD",
          "updatedAt": "2026-09-08T05:30:00.000Z"
        }
      }
    ]
  }
  ```

### `POST /api/accessibility`
* **Status:** IMPLEMENTED (WORKING)
* **Request Structure:**
  ```json
  {
    "name": "NH-40 Nongpoh Section",
    "road_code": "NH-40",
    "status": "CLOSED",
    "reason": "Landslide clearing in progress",
    "source": "State Disaster Management Authority",
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [91.8012, 25.9021],
        [91.8345, 25.8765]
      ]
    }
  }
  ```
* **Response:** HTTP 201 `{ "status": "success", "data": { "id": "acc_...", ... } }`

### `PATCH /api/accessibility/:id/status`
* **Status:** IMPLEMENTED (WORKING)
* **Request Structure:**
  ```json
  {
    "status": "RESTRICTED",
    "reason": "Single lane opened for light vehicles"
  }
  ```
* **Response:** HTTP 200 `{ "status": "success", "data": { ... } }` (or HTTP 400 on invalid transition / HTTP 404 if not found).

### `DELETE /api/accessibility/:id`
* **Status:** IMPLEMENTED (WORKING)
* **Response:** HTTP 204 No Content (or HTTP 404 if corridor ID not found).

---

## 10. Active Alerts & Warnings (Step 9)

Alerts are computed dynamically on read from active corridor states. No push notifications, SMS, or external messaging subsystems are used in this step.

### `GET /api/alerts`
* **Status:** IMPLEMENTED (WORKING)
* **Generation Rules:**
  * Corridors with status `CLOSED` map to category `ROAD_CLOSURE` and severity `CRITICAL`.
  * Corridors with status `RESTRICTED` map to category `ROAD_RESTRICTION` and severity `WARNING`.
  * Corridors with status `OPEN` produce **no** alerts.
* **Response Structure:**
  ```json
  {
    "status": "success",
    "data": {
      "items": [
        {
          "id": "accessibility-acc_01a2b3c4-closed",
          "category": "ROAD_CLOSURE",
          "severity": "CRITICAL",
          "title": "Road closure: GS Road Nongpoh Corridor",
          "message": "Major landslide blockage near Nongpoh",
          "accessibilityCorridorId": "acc_01a2b3c4",
          "accessibilityStatus": "CLOSED",
          "created_at": "2026-09-08T05:30:00.000Z",
          "updated_at": "2026-09-08T05:30:00.000Z"
        }
      ]
    }
  }
  ```
