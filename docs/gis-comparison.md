# GIS Technology Comparison

This document provides a comparative analysis of map visualization and client-side GIS libraries to determine the optimal mapping stack for the **SauraRoute** platform.

---

## 1. Comparison Matrix

| Criteria | OpenStreetMap (OSM Tile Server) | MapLibre GL JS | Mapbox GL JS (v3) | Google Maps JS API | Leaflet |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cost** | Free (for low-volume tile usage) | **Free** (completely open source client) | Free tier (50k map loads/mo), then pay-per-load | Pay-as-you-go ($200 free monthly credit) | **Free** (completely open source client) |
| **Licensing** | [ODbL](https://opendatacommons.org/licenses/odbl/) (data), tiles vary | [BSD 3-Clause](https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt) | Proprietary | Proprietary (highly restrictive) | [BSD 2-Clause](https://github.com/Leaflet/Leaflet/blob/main/LICENSE) |
| **Render Engine** | Raster tiles | **Vector WebGL** (3D terrain, high-perf) | Vector WebGL (3D terrain, high-perf) | Raster/Vector (hybrid, WebGL options) | Raster tiles |
| **Routing Support** | None (requires external routing API) | None (renders routes via GeoJSON lines) | Excellent (built-in directions APIs) | Excellent (built-in directions APIs) | None (requires external plugins) |
| **Offline Support** | Poor (restricted tile caching terms) | **Excellent** (supports local vector tile packages) | Forbidden by TOS (tile caching prohibited) | Forbidden by TOS (no offline usage) | **Excellent** (stores tiles locally via file system) |
| **Customization** | Low (pre-rendered raster styles) | **Very High** (custom vector styles, 3D overlays) | Extremely High (rich style studio) | Medium (cloud styling, limited 3D terrain) | Medium (rich plugin ecosystem, raster limitations) |
| **React Integration**| Simple leaf components | **Excellent** (via `@vis.gl/react-map-gl`) | Excellent (via `@vis.gl/react-map-gl`) | Good (via `@vis.gl/react-google-maps`) | Excellent (via `react-leaflet`) |
| **SIH Suitability** | High (for simple basemaps) | **Extremely High** (enables 3D elevation maps for free) | Moderate (credit card required, pricing risk) | Low (no offline demo, expensive) | High (best for low-spec or offline-first) |

---

## 2. In-Depth Library Analysis

### A. MapLibre GL JS (Recommended Frontend Map Engine)
* **What is it:** An open-source fork of Mapbox GL JS (v1.13) created after Mapbox changed its license to a proprietary, paid model.
* **Pros:**
  * Uses WebGL to render vector maps dynamically on the client, resulting in crisp rendering at any zoom level.
  * Officially supports **3D Terrain/DEM overlay**, which is critical for representing the mountainous topography of the North Eastern Region.
  * Completely free, open source, and lacks tracking or telemetry dependencies.
  * Allows loading custom, locally hosted vector tile formats (`.mbtiles`), supporting fully offline or intranet operations.
* **Cons:** Requires a vector tile server (like MapTiler, Stadia Maps, or self-hosted OpenMapTiles) to serve base map files if not running offline.

### B. Leaflet
* **What is it:** The veteran lightweight open-source library for mobile-friendly interactive maps using raster tiles.
* **Pros:**
  * Extremely small footprint (~40KB gzip), making it performant on low-spec mobile devices.
  * Outstanding offline capability: can load standard png tiles directly from local folders or database caches.
  * Hundreds of open-source plugins (e.g., custom marker rotation, heatmaps).
* **Cons:**
  * Lacks support for vector tiles or dynamic 3D terrain out of the box (restricted to flat 2D raster tiles).
  * Smooth rotation and zooming are limited compared to WebGL engines.

### C. Mapbox GL JS (v3)
* **What is it:** The industry standard vector mapping client library.
* **Pros:** Highly polished, feature-rich, with outstanding visual designers (Mapbox Studio).
* **Cons:** Requires a billing account and credit card to use. Free tier is generous (50k loads), but scaling past it is expensive. Their Terms of Service explicitly forbid caching tiles or using maps offline, rendering it unsuitable for the offline field app.

### D. Google Maps JavaScript API
* **What is it:** The most popular web mapping SDK.
* **Pros:** Unmatched address search (Geocoding) and local business database.
* **Cons:** Extremely restrictive licensing. Forbids caching coordinates, overlaying Google routes on other maps, or using the SDK in offline environments. No free tier (uses billing credits).

---

## 3. Technology Recommendation for Team Saura

To build the SIH prototype, **Team Saura should select the following GIS stack**:

1. **Web Dashboard (`apps/web`):** Use **MapLibre GL JS** (via `@vis.gl/react-map-gl`).
   * *Rationale:* Enables 3D terrain elevation rendering to highlight landslide risk slopes in the NER. It is completely free and works with open vector layers.
2. **Mobile Field App (`apps/mobile`):** Use **Leaflet** (or MapLibre GL Native).
   * *Rationale:* The mobile app requires a strict offline-first design because of poor internet coverage in the NER. Leaflet allows us to package a subset map of primary NER transport corridors (e.g., NH-2) as offline raster png files inside the application bundle, enabling maps to render with zero cell service.
3. **Map Base Layers:** Use free vector tile schemes from **MapTiler** (for online dev testing) or **OpenMapTiles** self-hosted files.
