# Machine Learning Data Feasibility

This document assesses the feasibility of potential Machine Learning models for the **SauraRoute** platform, based on the actual availability of public datasets for the North Eastern Region (NER) of India.

---

## Evaluation of Prediction Targets

---

### Target A: Road Disruption Risk
* **Definition:** Predict the probability that a specific road segment will be blocked or disrupted on a given day.
* **Required Features:** 
  * Static terrain data (slope, soil type).
  * Real-time weather data (current rainfall, forecast accumulation).
  * Traffic patterns and historical road closures.
* **Available Datasets:**
  * USGS SRTM 30m DEM (terrain slope).
  * Open-Meteo API (weather forecasts & historical rainfall).
* **Missing Datasets:** 
  * No public, official dataset cataloging daily historical road closures or structural disruptions for roads in the NER.
* **Feasibility:** **MEDIUM-LOW**
  * *Reason:* Because we lack historical labels of road closures (the "ground truth" target variable), training a supervised classifier is difficult without heavy simulation.
* **Possible Prototype Approach:** Use simulated road blockages based on a logical heuristic (e.g., if slope > 25° and daily rainfall > 100mm, predict a disruption).

---

### Target B: Travel-Time / ETA Prediction
* **Definition:** Predict the travel time or arrival delay for a vehicle transit along a specific route.
* **Required Features:**
  * Route geometry and segment lengths.
  * Real-time GPS speed inputs from vehicles.
  * Historic travel times under different weather and traffic conditions.
* **Available Datasets:**
  * OpenStreetMap road network.
  * Open-Meteo historical weather.
* **Missing Datasets:**
  * Real logistics fleet GPS data (commercial companies keep telematics private).
  * Historical vehicle transit logs for NER highways.
* **Feasibility:** **LOW**
  * *Reason:* Without actual historical telemetry from hundreds of trucks over different seasons, any model would be a pure function of road speed limits plus simulated noise.
* **Possible Prototype Approach:** Generate synthetic GPS feeds moving along paths and train a model to predict travel time under simulated "rain delay" indices.

---

### Target C: Landslide Susceptibility / Risk (RECOMMENDED)
* **Definition:** Predict the probability of a landslide occurrence on a slope adjacent to a highway segment under active weather triggers.
* **Required Features:**
  * **Static Terrain Features:** Slope gradient, elevation, aspect, soil/geological type.
  * **Dynamic Weather Triggers:** Cumulative antecedent rainfall (e.g., last 3 days, last 7 days of rain).
  * **Ground Truth Labels:** Coordinates and dates of past landslide events.
* **Available Datasets:**
  * **Terrain:** USGS SRTM 30m DEM (fully accessible).
  * **Weather:** Open-Meteo Historical API (provides daily historical rainfall back to 1940 at any coordinate).
  * **Ground Truth:** **NASA Global Landslide Catalog** (includes historical dates, lat/long, rainfall triggers) + **GSI Landslide Inventory** (available via Bharatlas download containing thousands of coordinate points).
* **Missing Datasets:** Highly localized soil moisture sensor data (can be substituted with regional GFS model soil estimates from Open-Meteo).
* **Feasibility:** **HIGH**
  * *Reason:* We have all three critical components for supervised training: (1) terrain slope, (2) historical weather at the exact coordinates of past landslides, and (3) actual verified landslide coordinate/date points.
* **Possible Prototype Approach:**
  1. Extract coordinates and dates from the GSI / NASA landslide inventories for the NER.
  2. For each landslide point, query Open-Meteo for rainfall in the 1 to 7 days leading up to the landslide date. This forms the **positive training set**.
  3. Sample random "non-landslide" coordinates along the road network on dry dates to form the **negative training set**.
  4. Train a binary classifier (e.g., Random Forest or XGBoost) to output landslide probability given slope and rainfall.

---

### Target D: Flood-Related Accessibility Risk
* **Definition:** Predict if a road segment will be submerged or flooded based on rainfall forecasts.
* **Required Features:**
  * High-resolution hydrological basin models, watershed maps, flood plains.
  * Drainage capacity of local road infrastructure.
  * Real-time river gauges and water levels.
* **Available Datasets:** 
  * Regional rainfall forecasts (Open-Meteo).
* **Missing Datasets:** 
  * Local river gauge measurements are highly restricted.
  * No public dataset for highway drainage design.
  * Catchment boundaries are difficult to obtain at high resolution.
* **Feasibility:** **LOW**
  * *Reason:* Flood modeling is highly dependent on sub-surface structures and high-resolution local hydrology, which is unavailable for public student access in the NER.
* **Possible Prototype Approach:** Fallback to marking roads near major river channels (using OSM river ways) as high risk when forecast rainfall exceeds a severe threshold.

---

## Technology & Feasibility Recommendation

Based on the data availability search, **Target C (Landslide Susceptibility/Risk)** is the most realistic and scientifically valid ML model for Team Saura's prototype.

### Summary of Feasible ML Setup
1. **Model Type:** Binary Supervised Classifier (Random Forest or LightGBM).
2. **Inputs:**
   * `slope_gradient` (Derived from SRTM 30m DEM)
   * `precipitation_24h` (Daily rainfall from weather API)
   * `precipitation_72h` (Antecedent rainfall from weather API)
3. **Labels:** Past landslide coords from GSI / NASA datasets.
4. **Output:** A risk probability score (0.0 to 1.0) indicating landslide hazard for a given road segment under the current weather forecast.
