# Data Strategy & Inventory

This document defines the research-backed data strategy for **SauraRoute**, identifying exact data sources, licensing rules, technical specifications, and usability evaluations for a student hackathon prototype.

---

## 1. Data Inventory Table

Below is the verified inventory of data sources available for the North Eastern Region (NER) of India.

| Data | Source | Coverage | Resolution | Update Frequency | API/Download | License | Real-time? | Usability | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Road Network** | [OpenStreetMap (OSM) via Geofabrik](https://download.geofabrik.de/india.html) | Global (India/NER specific files available) | Vector (highly detailed nodes/ways) | Daily updates | Direct PBF/Shapefile download | [ODbL 1.0](https://opendatacommons.org/licenses/odbl/) | No | **HIGH** | Best free vector road geometry with names, classifications, bridges, and tunnels. |
| **Rural Roads** | [Ministry of Rural Development GeoSadak](https://geosadak-pmgsy.nic.in/opendata/) | Rural India (including NER districts) | Vector (GIS shapefiles) | Periodic | Manual download | [GoI Open Data License](https://data.gov.in/sites/default/files/NDSAP/NDSAP-ImplementationGuidelines.pdf) | No | **MEDIUM** | Supplements OSM with secondary rural roads. |
| **National Highways** | [NHAI Datalake / API Setu](https://datalake.nhai.gov.in/) | National highways only | Vector / Tabular | UNKNOWN | Restricted (Academic request with NDA required) | Government Proprietary | No | **LOW** | Unusable for public hackathon due to NDA and institutional restrictions. |
| **Administrative Boundaries** | [Data{Meet} Community Maps](https://github.com/datameet/maps) | India (State, District, Constituency boundaries) | Vector (Shapefile/GeoJSON) | Periodic | GitHub download | [Creative Commons Attribution 2.5 India](https://creativecommons.org/licenses/by/2.5/in/) | No | **HIGH** | Ready-to-use vector boundary layers. |
| **Administrative Boundaries** | [Survey of India Online Maps Portal](https://onlinemaps.surveyofindia.gov.in/) | India National | Vector (Shapefile) | Periodic | Download after registration | Government Proprietary (restricted use) | No | **MEDIUM** | Authoritative but requires registration and manual download. |
| **Weather & Rainfall** | [Open-Meteo API](https://open-meteo.com/) | Global (including NER points) | 9km - 11km | Hourly updates | Free REST API (no API key required) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Yes | **HIGH** | Excellent free weather forecasts and historical weather (back to 1940). |
| **Weather & Rainfall** | [IMD API Gateway](https://api.imd.gov.in/) | National (India/NER stations) | Station-level | Real-time | Restricted REST API (requires registration/approval) | Government Proprietary | Yes | **LOW** | Hard to integrate for student prototypes due to whitelisting and access restrictions. |
| **Terrain Elevation** | [USGS EarthExplorer (SRTM DEM)](https://earthexplorer.usgs.gov/) | Global landmass (lat 60N to 56S) | 30-meter (1 arc-second) | Static | Bulk download (GeoTIFF) | Public Domain | No | **HIGH** | Industry standard DEM for calculating terrain slope gradients. |
| **Terrain Elevation** | [ISRO Bhuvan CartoDEM](https://bhuvan.nrsc.gov.in/) | India | 30-meter | Static | Download after registration | DOS/ISRO/NRSC Proprietary (Non-commercial research) | No | **MEDIUM** | High quality, but requires registration and manual tile stitching. |
| **Terrain Elevation Lookup** | [Open-Meteo Elevation API](https://open-meteo.com/en/docs/elevation-api) | Global | 90-meter | Static | REST API | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | No | **HIGH** | Perfect for checking elevation of single points instantly without processing GeoTIFFs. |
| **Historical Landslides** | [GSI Inventory via Bharatlas](https://bharatlas.com/view/gsi_landslide_inventory) | India (contains ~30,000+ entries) | Point GeoJSON | Static (compiled database) | Direct download | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | No | **HIGH** | Pre-processed GSI national landslide inventory points. |
| **Historical Landslides** | [ISRO Bhuvan Landslide Atlas](https://bhuvan.nrsc.gov.in/) | India (~80,000 events) | Visual maps / PDF | Static (1998 - 2022) | Manual visual download | DOS/ISRO/NRSC Proprietary | No | **MEDIUM** | Comprehensive atlas but difficult to scrape/download raw vector layers. |
| **Historical Landslides** | [NASA Global Landslide Catalog (GLC)](https://earthdata.nasa.gov/) | Global | Point records | Periodic | REST API / CSV download | Public Domain | No | **HIGH** | Excellent global database of rainfall-triggered landslide events. |
| **Traffic Data** | [Google Maps Distance Matrix / Traffic](https://developers.google.com/maps) | Global (high NER highway coverage) | Dynamic road speeds | Real-time | REST API (Paid / Billing required) | Proprietary (No caching allowed) | Yes | **LOW** | Expensive, requires active internet, and terms forbid database caching. |
| **Traffic Data** | [Mapbox Directions API v5](https://docs.mapbox.com/api/navigation/directions/) | Global (good NER highway coverage) | Dynamic road speeds | Real-time | REST API (Free tier, then paid) | Proprietary (No caching allowed) | Yes | **MEDIUM** | Easier to integrate than Google Maps but requires network connection. |
| **Vehicle GPS Logs** | **Internal Mock Telematics Service** | Customized (NER routes) | High (seconds interval) | User-defined | Local code simulation | Open Source / Internal | Yes | **HIGH** | Necessary fallback since real logistics fleet telematics are private. |
| **Field Incident Reports** | **Internal Crowd-sourced Mobile Client** | NER Logistics routes | Precision GPS + Photos | Real-time / Synchronized | Local SQLite to REST sync | Open Source / Internal | Yes | **HIGH** | Core component of SauraRoute. Serves as our real-time road closure source. |

---

## 2. Road Network Strategy
* **Primary Source:** OpenStreetMap (OSM) `.pbf` extracts retrieved from [Geofabrik India](https://download.geofabrik.de/india.html).
* **Usability Verification:** 
  * **Road Geometry:** High quality for national highways (NH-2, NH-37, etc.) and state roads in NER.
  * **Classifications:** Explicitly tagged (e.g., `highway=trunk`, `highway=primary`, `highway=secondary`).
  * **Bridges/Tunnels:** Tagged via `bridge=yes` or `tunnel=yes` properties.
  * **Access Restrictions:** Specified via tags like `access=no`, `motorcar=no`, or weight restrictions where mapped.
* **Routing Suitability:** OSM road networks are the standard graph source for enterprise routing software. By parsing OSM data, we can build a highly precise spatial graph network suitable for custom routing algorithms.
* **Fallback:** For missing rural roads, we will supplement the database using PMGSY GeoSadak vector files.

---

## 3. Weather & Climate Strategy
* **Primary Source:** [Open-Meteo API](https://open-meteo.com/).
* **Verification:** Open-Meteo provides a free public endpoint with no registration or API keys needed. It has a rate limit of 10,000 requests per day, which is more than sufficient for development and demonstration.
* **Forecast Coverage:** Hourly meteorological variables (rainfall, soil moisture, temperature) for 7 days.
* **Historical Coverage:** Hourly data back to 1940, allowing us to query rainfall volumes during past documented landslide dates to train ML classifiers.
* **Fallback:** If Open-Meteo is offline, the backend API will fallback to a static, month-wise historical average rainfall lookup table mapped by district.

---

## 4. Terrain & Landslide Hazard Strategy
* **Primary Source:** USGS EarthExplorer SRTM 30m Digital Elevation Model (DEM) tiles.
* **Processing Workflow:** 
  1. Download the SRTM tiles covering the coordinates of the NER (roughly latitudes 21°N to 30°N, longitudes 89°E to 98°E).
  2. Compute elevation slope gradients using Python's `rasterio` and `richdem` libraries.
  3. Extract the average slope angle for each OSM road segment using spatial intersections.
  4. Train the ML predictor using calculated segment slopes and historical rain measurements.
* **Historical Correlation:** We will cross-reference landslide locations from the [NASA Global Landslide Catalog](https://earthdata.nasa.gov/) and GSI inventories with weather records from Open-Meteo on those specific event dates.

---

## 5. Traffic & GPS Strategy
* **Real-time Traffic:** Avoid using paid APIs like Google Maps because of pricing constraints and caching prohibitions (which prevent storing routing graphs). We will rely on our crowdsourced reports to mark specific road segments as congested or blocked.
* **Vehicle GPS Simulation:** Since actual logistics telematics are private corporate properties, we will run an internal telemetry simulator.
  * The simulator runs a cron task that moves mock trucks along active route lines, emitting standard JSON logs to the API server:
  ```json
  {
    "vehicle_id": "vh_sauraroute_101",
    "timestamp": "2026-08-29T10:30:00Z",
    "latitude": 26.1443,
    "longitude": 91.7365,
    "speed": 45.0,
    "heading": 180,
    "status": "MOVING"
  }
  ```

---

## 6. Data Quality, Licensing & Compliance
1. **OpenStreetMap Data:** OpenStreetMap is open data, licensed under the **Open Database License (ODbL)**. Any derivative database we build that uses OSM data must also be released under ODbL, and appropriate attribution is required (`© OpenStreetMap contributors`).
2. **Open-Meteo Weather:** Free for non-commercial use under the **Creative Commons Attribution 4.0 International (CC BY 4.0)** license.
3. **NASA / USGS Data:** Public domain. No restrictions on use, but citation is recommended.
4. **Data{Meet} Maps:** Licensed under **CC BY 2.5 India**. Requires attribution to Data{Meet} and contributors.
5. **No Proprietary Code/Keys:** No Google Maps or Mapbox secret keys will be committed to Github. All API setups will fetch keys dynamically from `.env` configurations.
