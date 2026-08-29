"""
Data schema definitions for SauraRoute Step 7 ML Classifiers.
Defines feature structures, training sample representations, and prediction payloads.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional


FEATURE_NAMES: List[str] = [
    "precipitation_24h_mm",
    "slope_degrees",
    "distance_to_hotspot_km",
    "active_incident_count_15km",
    "elevation_m",
    "soil_saturation_index"
]

FEATURE_DESCRIPTIONS: Dict[str, str] = {
    "precipitation_24h_mm": "Cumulative 24-hour rainfall / antecedent precipitation in millimeters",
    "slope_degrees": "Terrain incline angle in degrees [0, 90] derived from DEM / topography",
    "distance_to_hotspot_km": "Great-circle distance to the nearest historical landslide event in kilometers",
    "active_incident_count_15km": "Count of active road hazard incidents within a 15km radius",
    "elevation_m": "Approximate terrain elevation above sea level in meters",
    "soil_saturation_index": "Estimated soil saturation index proxy [0.0, 1.0]"
}


@dataclass
class LandslideFeatures:
    """Raw numerical feature values for model input."""
    precipitation_24h_mm: float
    slope_degrees: float
    distance_to_hotspot_km: float
    active_incident_count_15km: int = 0
    elevation_m: float = 500.0
    soil_saturation_index: float = 0.5

    def to_array(self) -> List[float]:
        """Returns ordered feature vector matching FEATURE_NAMES."""
        return [
            float(self.precipitation_24h_mm),
            float(self.slope_degrees),
            float(self.distance_to_hotspot_km),
            float(self.active_incident_count_15km),
            float(self.elevation_m),
            float(self.soil_saturation_index),
        ]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "precipitation_24h_mm": round(self.precipitation_24h_mm, 2),
            "slope_degrees": round(self.slope_degrees, 2),
            "distance_to_hotspot_km": round(self.distance_to_hotspot_km, 2),
            "active_incident_count_15km": int(self.active_incident_count_15km),
            "elevation_m": round(self.elevation_m, 1),
            "soil_saturation_index": round(self.soil_saturation_index, 3),
        }


@dataclass
class TrainingSample:
    """Single labeled training sample."""
    sample_id: str
    location_name: str
    latitude: float
    longitude: float
    features: LandslideFeatures
    label: int  # 1 = LANDSLIDE_RISK, 0 = NO_HAZARD
    source: str = "CURATED_CATALOG"


@dataclass
class PredictionOutput:
    """Interpretable ML prediction payload."""
    prediction: str  # 'LANDSLIDE_RISK' or 'NO_HAZARD'
    probability: float  # [0.0, 1.0] probability of positive class
    risk_tier: str  # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    confidence: float  # Margin over decision boundary
    model_version: str
    features: Dict[str, Any]
    feature_importance: Optional[Dict[str, float]] = None
