# SauraRoute Routing Service

This directory contains the configuration and launcher for the local **GraphHopper 10.2** routing engine using OpenStreetMap North-Eastern India road data.

---

## Current Status
* **Step 5 Phase 0 (Feasibility Spike):** COMPLETE — Verified GraphHopper 10.2 on Java 17 with North-East India PBF.
* **Step 5 Full Implementation (Pipeline Integration):** COMPLETE — SauraRoute Node.js API (`GET /api/routes`) and MapLibre web visualization integrated and verified end-to-end.

---

## Routing Architecture Flow

```mermaid
flowchart LR
    Client[Web Dashboard - MapLibre] -->|GET /api/routes?originLat=..&originLon=..&destinationLat=..&destinationLon=..| API[SauraRoute API :3000]
    API -->|validateCoordinates| RouteCtrl[Route Controller]
    RouteCtrl --> RoutingSvc[Routing Service]
    RoutingSvc --> GHClient[GraphHopper Client]
    GHClient -->|HTTP GET /route?profile=car| LocalGH[GraphHopper 10.2 :8989]
    LocalGH --> OSMGraph[(North-East OSM Graph Cache)]
    LocalGH -->> GHClient: Unencoded GeoJSON LineString (3,278 pts)
    GHClient -->> RoutingSvc: Raw path payload
    RoutingSvc -->> RouteCtrl: Normalized RouteResponse (meters, seconds, GeoJSON)
    RouteCtrl -->> Client: HTTP 200 JSON
    Client -->> Client: Render LineString on MapLibre & fitBounds
```

---

## Local Prerequisites
* **Java 17:** OpenJDK 17 / Eclipse Adoptium Temurin 17
* **PBF Extract:** `data/raw/north-eastern-zone-latest.osm.pbf`
* **GraphHopper Web JAR:** `data/raw/graphhopper-web-10.2.jar`

---

## Running the Routing Service

```powershell
.\services\routing\start-graphhopper.ps1
```

* GraphHopper runs on `http://localhost:8989`
* Admin / health endpoint on `http://localhost:8990/healthcheck`

---

## Verified Integration Benchmark (Guwahati → Shillong)

* **Origin:** `26.1445, 91.7362` (Guwahati)
* **Destination:** `25.5788, 91.8933` (Shillong)
* **Distance:** `95.99 km` (`95,992 meters`)
* **Duration:** `87.9 minutes` (`5,274 seconds`)
* **Geometry:** `LineString` with 3,278 coordinates in `[longitude, latitude]` order
* **Navigation Steps:** 39 turn instructions (e.g. NH6, Dispur Flyover, GS Road)
