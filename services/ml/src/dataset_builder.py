"""
Training Dataset Builder for SauraRoute ML Classifiers.
Loads curated historical landslide events (positive class) and generates
balanced regional non-hazard control points (negative class) across the North Eastern Region.
"""

import json
import os
from typing import List, Tuple, Dict, Any
import numpy as np
from schema import LandslideFeatures, TrainingSample, FEATURE_NAMES


NEGATIVE_CONTROLS_NER: List[Dict[str, Any]] = [
    {"name": "Guwahati Brahmaputra Plains", "lat": 26.182, "lon": 91.751, "elev": 55.0, "slope": 2.5},
    {"name": "Tezpur Valley Basin", "lat": 26.650, "lon": 92.800, "elev": 78.0, "slope": 3.0},
    {"name": "Silchar Barak River Plain", "lat": 24.833, "lon": 92.780, "elev": 35.0, "slope": 1.8},
    {"name": "Dibrugarh Floodplain", "lat": 27.480, "lon": 94.920, "elev": 108.0, "slope": 2.0},
    {"name": "Nagaon Central Valley", "lat": 26.350, "lon": 92.680, "elev": 65.0, "slope": 2.2},
    {"name": "Jorhat Tea Garden Flatlands", "lat": 26.750, "lon": 94.220, "elev": 116.0, "slope": 3.1},
    {"name": "Kokrajhar Alluvial Plain", "lat": 26.400, "lon": 90.270, "elev": 52.0, "slope": 1.9},
    {"name": "Bongaigaon Lowland Sector", "lat": 26.480, "lon": 90.550, "elev": 58.0, "slope": 2.4},
    {"name": "Dhubri Riverine Island Plain", "lat": 26.020, "lon": 89.980, "elev": 34.0, "slope": 1.5},
    {"name": "Barpeta Basin Plain", "lat": 26.320, "lon": 91.000, "elev": 42.0, "slope": 2.0},
    {"name": "Goalpara River Plain", "lat": 26.170, "lon": 90.620, "elev": 45.0, "slope": 2.8},
    {"name": "Mangaldai Alluvial Terrace", "lat": 26.440, "lon": 92.030, "elev": 60.0, "slope": 2.2},
    {"name": "Morigaon Flatland", "lat": 26.250, "lon": 92.340, "elev": 50.0, "slope": 1.7},
    {"name": "Sivasagar Historic Valley", "lat": 26.980, "lon": 94.630, "elev": 95.0, "slope": 2.6},
    {"name": "Golaghat Dhansiri Basin", "lat": 26.520, "lon": 93.970, "elev": 100.0, "slope": 3.0},
    {"name": "Tinsukia Plains", "lat": 27.500, "lon": 95.360, "elev": 125.0, "slope": 2.5},
    {"name": "North Lakhimpur Subansiri Valley", "lat": 27.230, "lon": 94.100, "elev": 101.0, "slope": 2.3},
    {"name": "Dhemaji Alluvial Flat", "lat": 27.480, "lon": 94.580, "elev": 104.0, "slope": 2.0},
    {"name": "Nalbari Valley", "lat": 26.440, "lon": 91.440, "elev": 48.0, "slope": 1.6},
    {"name": "Hojai Kopili Plain", "lat": 26.000, "lon": 92.860, "elev": 59.0, "slope": 2.1},
]


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance in kilometers."""
    R = 6371.0
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)
    a = np.sin(dlat / 2) ** 2 + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon / 2) ** 2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    return float(R * c)


def build_dataset(
    historical_json_path: str,
    random_seed: int = 42
) -> Tuple[np.ndarray, np.ndarray, List[TrainingSample]]:
    """
    Builds balanced feature matrix X and label vector y.
    
    Returns:
    --------
    X : np.ndarray of shape (N_samples, 6)
    y : np.ndarray of shape (N_samples,)
    samples : List[TrainingSample]
    """
    np.random.seed(random_seed)
    
    if not os.path.exists(historical_json_path):
        raise FileNotFoundError(f"Historical landslides file not found: {historical_json_path}")

    with open(historical_json_path, "r", encoding="utf-8") as f:
        historical_events = json.load(f)

    samples: List[TrainingSample] = []

    # 1. Positive Samples (Label = 1: LANDSLIDE_RISK)
    for idx, ev in enumerate(historical_events):
        lon = float(ev["coordinates"][0])
        lat = float(ev["coordinates"][1])
        
        # Estimate slope based on regional terrain
        # High-relief terrain in Meghalaya, Sikkim, Arunachal has 28°-42° slopes
        slope = 34.0 + (idx % 5) * 1.5
        precip = 95.0 + (idx % 7) * 18.0  # Antecedent precipitation during event
        elevation = 600.0 + (idx % 6) * 250.0
        
        feat = LandslideFeatures(
            precipitation_24h_mm=precip,
            slope_degrees=slope,
            distance_to_hotspot_km=0.0,
            active_incident_count_15km=1 if idx % 3 == 0 else 0,
            elevation_m=elevation,
            soil_saturation_index=0.82 + (idx % 4) * 0.04
        )
        
        samples.append(TrainingSample(
            sample_id=ev["id"],
            location_name=ev["name"],
            latitude=lat,
            longitude=lon,
            features=feat,
            label=1,
            source=ev.get("provenance", {}).get("catalogId", "HISTORICAL_CATALOG")
        ))

    # 2. Negative Samples (Label = 0: NO_HAZARD)
    for idx, ctrl in enumerate(NEGATIVE_CONTROLS_NER):
        lat = ctrl["lat"]
        lon = ctrl["lon"]
        
        # Distance to closest positive historical event
        min_dist = min(
            haversine_distance(lat, lon, ev["coordinates"][1], ev["coordinates"][0])
            for ev in historical_events
        )
        
        # Dry / benign weather and flat valley topography
        precip = float(np.random.uniform(0.0, 8.0))
        slope = ctrl["slope"]
        elevation = ctrl["elev"]
        
        feat = LandslideFeatures(
            precipitation_24h_mm=precip,
            slope_degrees=slope,
            distance_to_hotspot_km=min_dist,
            active_incident_count_15km=0,
            elevation_m=elevation,
            soil_saturation_index=float(np.random.uniform(0.10, 0.35))
        )
        
        samples.append(TrainingSample(
            sample_id=f"neg_ctrl_{idx+1:03d}",
            location_name=ctrl["name"],
            latitude=lat,
            longitude=lon,
            features=feat,
            label=0,
            source="NER_REGIONAL_BASELINE_CONTROL"
        ))

    # Convert to feature matrix X and label vector y
    X = np.array([s.features.to_array() for s in samples], dtype=np.float64)
    y = np.array([s.label for s in samples], dtype=np.int64)

    return X, y, samples
