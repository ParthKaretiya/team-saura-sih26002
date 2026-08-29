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
