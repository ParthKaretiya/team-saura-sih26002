# Routing Engine Spike: GraphHopper for SauraRoute

This document details the routing engine strategy, local test setup, OSM PBF data handling, and the route evaluation workflow for **SauraRoute** (SIH26002).

---

## 1. Objectives of the Spike
1. Validate that standard routing (**Origin → Destination → Route Geometry**) can be executed locally over OpenStreetMap (OSM) data.
2. Formulate the pipeline for extracting the North Eastern Region (NER) road network without processing the entire multi-gigabyte India dataset.
3. Establish how GraphHopper's **Custom Models** will later receive real-time risk scores to alter routing weights (risk-aware routing).

---

## 2. OSM PBF Data Sourcing for the North Eastern Region

### The Challenge
* The official Geofabrik repository provides an `india-latest.osm.pbf` extract (~1.5 GB compressed, ~15+ GB uncompressed in memory). Loading all of India into a local GraphHopper instance requires 8–16 GB of RAM, which is excessive for local development and CI/CD pipelines.
* Geofabrik does not provide a standalone regional extract for North East India.

### Extraction Approaches
To extract only the 8 North Eastern states (Assam, Arunachal Pradesh, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, Tripura), we have two practical approaches:

#### Approach A: Bounding Box Clipping with Osmium (Local)
1. Download `india-latest.osm.pbf` from [Geofabrik India](https://download.geofabrik.de/asia/india.html).
2. Use the open-source CLI tool `osmium-tool` to clip the geographic bounding box for the NER:
   * **NER Bounding Box Coordinates:** `[min_lon: 88.0, min_lat: 21.5, max_lon: 97.5, max_lat: 29.5]`
3. Command:
   ```bash
   osmium extract --bbox 88.0,21.5,97.5,29.5 india-latest.osm.pbf -o data/raw/ner-roads.osm.pbf
   ```
   *Resulting file size:* ~120 MB to 200 MB (fits easily within memory on any standard development machine).

#### Approach B: Custom Extract via BBBike / HOT Export Tool (Cloud)
* Request an automated polygon extract directly from [BBBike Extract Service](https://extract.bbbike.org/) or the Humanitarian OpenStreetMap Team (HOT) export portal using the NER polygon.

---

## 3. GraphHopper Configuration

GraphHopper runs as a lightweight Java service (or container). Below is the recommended `config.yml` for the local instance:

```yaml
graphhopper:
  datareader.file: data/raw/ner-roads.osm.pbf
  graph.location: data/processed/graphhopper-cache
  
  # Enable elevation if DEM data is attached
  graph.elevation.provider: srtm
  graph.elevation.cache_dir: data/raw/elevation-cache
  
  profiles:
    - name: car
      vehicle: car
      weighting: custom
      custom_model:
        speed:
          - if: "true"
            limit_to: "100"
        priority:
          - if: "road_class == MOTORWAY || road_class == TRUNK || road_class == PRIMARY"
            multiply_by: "1.0"
          - else:
            multiply_by: "0.8"
            
    - name: cargo_truck
      vehicle: roads
      weighting: custom
      custom_model_files: [truck_profile.json]

  profiles_ch: []  # Disable Contraction Hierarchies to allow flexible dynamic risk weighting
  profiles_lm: []

server:
  application_connectors:
    - type: http
      port: 8989
      bind_host: 0.0.0.0
```

---

## 4. How Routing Will Work at Runtime

```mermaid
sequenceDiagram
    autonumber
    actor Client as Web / Mobile Client
    participant NodeAPI as Node.js API (services/api)
    participant ML as ML Service (services/ml)
    participant GH as GraphHopper Engine (:8989)

    Client->>NodeAPI: POST /api/routes/optimize {origin, destination, avoidRisk: true}
    NodeAPI->>ML: GET /api/risk/active-zones (High risk segment polygons)
    ML-->>NodeAPI: Return GeoJSON polygons with hazard multiplier
    Note over NodeAPI: Builds GraphHopper Custom Model JSON<br/>penalizing transit inside hazard zones
    NodeAPI->>GH: POST /route {points, profile: "cargo_truck", custom_model}
    GH-->>NodeAPI: Return optimal path {coordinates, distance_m, time_s}
    NodeAPI-->>Client: 200 OK with GeoJSON route & risk advisory warnings
```

---

## 5. Local Validation Procedure (Standard Baseline Route)

To validate the routing engine once the `ner-roads.osm.pbf` file is placed in `data/raw/`:

### 1. Launch GraphHopper Container
```bash
docker run -d \
  --name sauraroute-graphhopper \
  -p 8989:8989 \
  -v $(pwd)/data/raw:/data \
  graphhopper/graphhopper:latest \
  -Ddw.graphhopper.datareader.file=/data/ner-roads.osm.pbf
```

### 2. Execute Test Query (Guwahati → Shillong corridor)
* **Origin (Guwahati):** `lat: 26.1445, lon: 91.7362`
* **Destination (Shillong):** `lat: 25.5788, lon: 91.8933`

```bash
curl "http://localhost:8989/route?point=26.1445,91.7362&point=25.5788,91.8933&profile=car&points_encoded=false"
```

### 3. Expected Output Schema
```json
{
  "hints": {
    "visited_nodes.sum": 1240,
    "visited_nodes.average": 1240.0
  },
  "paths": [
    {
      "distance": 98450.2,
      "weight": 5890.1,
      "time": 7200000,
      "transfers": 0,
      "points_encoded": false,
      "bbox": [91.7362, 25.5788, 91.8933, 26.1445],
      "points": {
        "type": "LineString",
        "coordinates": [
          [91.7362, 26.1445],
          [91.7821, 25.9810],
          [91.8933, 25.5788]
        ]
      },
      "instructions": [
        {
          "distance": 1200.0,
          "heading": 135.0,
          "sign": 0,
          "interval": [0, 2],
          "text": "Continue onto GS Road (NH-40)",
          "time": 90000,
          "street_name": "GS Road"
        }
      ]
    }
  ]
}
```

---

## 6. Future Risk-Aware Extension (Next Phases)
GraphHopper Custom Models support dynamic area penalties via the `areas` object:
```json
{
  "priority": [
    {
      "if": "in_area_landslide_warning",
      "multiply_by": "0.1"
    }
  ],
  "areas": {
    "in_area_landslide_warning": {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[91.80, 25.80], [91.85, 25.80], [91.85, 25.85], [91.80, 25.85], [91.80, 25.80]]]
      }
    }
  }
}
```
This enables the router to naturally detour cargo vehicles around active landslide warnings or flood-submerged passes without breaking baseline routing connectivity.
