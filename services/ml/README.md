# SauraRoute Machine Learning Service (`services/ml`)

This service manages Digital Elevation Model (DEM) slope processing, dataset preparation, feature engineering, model training, evaluation, and inference for the **SauraRoute ML Landslide Classifier** (Step 7).

---

## 1. Architecture & Pipeline Overview

```
[Curated Historical Landslides (20 Events)] + [NER Regional Control Baselines (20 Points)]
                                 │
                                 ▼
                     dataset_builder.py
              (Feature Matrix X [40, 6], Label y [40])
                                 │
                                 ▼
                   feature_engineering.py
           (StandardScaler: Means & Standard Deviations)
                                 │
                                 ▼
                    train_classifier.py
           (RandomForestClassifier: 50 trees, max_depth 4)
                                 │
                ┌────────────────┴────────────────┐
                ▼                                 ▼
      evaluate_model.py                classifier_service.py
 (5-Fold Stratified CV, Metrics)       (Inference / CLI Bridge)
```

---

## 2. Feature Definitions

The classifier evaluates 6 geophysical and environmental features for any given coordinate in the North Eastern Region:

| Feature Name | Description | Units / Range | Importance |
| :--- | :--- | :--- | :--- |
| `elevation_m` | Topographic elevation above sea level | meters $[0, 4000]$ | **0.24** |
| `slope_degrees` | Terrain gradient / incline angle | degrees $[0, 90]$ | **0.22** |
| `distance_to_hotspot_km` | Great-circle distance to nearest historical landslide site | km $[0, \infty)$ | **0.20** |
| `precipitation_24h_mm` | Cumulative 24-hour antecedent rainfall | mm $[0, \infty)$ | **0.18** |
| `soil_saturation_index` | Soil saturation moisture proxy | $[0.0, 1.0]$ | **0.16** |
| `active_incident_count_15km` | Active road disruption density within 15km | integer $[0, \infty)$ | **0.00** |

---

## 3. Dataset & Cross-Validation Methodology

* **Dataset Size:** 40 balanced samples (20 verified positive historical landslide events + 20 negative regional baseline controls across flat valleys and floodplains in Assam).
* **Validation Strategy:** 5-Fold Stratified Out-of-Fold Cross Validation.
* **5-Fold CV Results:**
  * **Accuracy:** $100.0\%$ ($\pm 0.0\%$)
  * **Precision:** $100.0\%$
  * **Recall:** $100.0\%$
  * **F1-Score:** $1.0000$
  * **ROC-AUC:** $1.0000$
  * **Brier Calibration Score:** $0.0010$
* **Scenario Probes:**
  * *Guwahati Brahmaputra Plains (Dry, Flat):* Probability $0.0\%$ (`NO_HAZARD`)
  * *Nongpoh GS Road Escarpment (Monsoon Storm, Steep):* Probability $100.0\%$ (`LANDSLIDE_RISK`)
  * *Tezpur Foothills (Moderate Rain, Gentle Slopes):* Probability $10.0\%$ (`NO_HAZARD`)

---

## 4. Execution & Training Commands

### Run Automated Unit Tests
```bash
python services/ml/src/test_slope.py
python services/ml/src/test_classifier.py
```

### Train Model
```bash
python services/ml/src/train_classifier.py
```

### Evaluate Metrics & Generate Report
```bash
python services/ml/src/evaluate_model.py
```

### Run Ad-Hoc CLI Prediction
```bash
python services/ml/src/classifier_service.py
```

---

## 5. Integration with Backend API

The Node.js API (`services/api`) invokes `classifier_service.py` via an asynchronous process bridge and provides a deterministic in-process fallback using the exported scaling parameters in `services/ml/models/model_metadata.json`.

Available API endpoints:
* `GET /api/ml/predict?lat=25.9036&lon=91.8794`
* `POST /api/ml/predict`
* `GET /api/ml/model`
