"""
Feature Engineering Pipeline for SauraRoute ML Classifiers.
Handles feature extraction, input validation, feature scaling, and transformation.
"""

from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from schema import LandslideFeatures, FEATURE_NAMES


class FeaturePipeline:
    """
    Standardizes raw numerical features into normalized vectors for model training and inference.
    Stores mean and standard deviation for deterministic scaling.
    """

    def __init__(self, means: Optional[List[float]] = None, stds: Optional[List[float]] = None):
        self.means = np.array(means, dtype=np.float64) if means is not None else None
        self.stds = np.array(stds, dtype=np.float64) if stds is not None else None
        self.fitted = means is not None and stds is not None

    def fit(self, X: np.ndarray) -> "FeaturePipeline":
        """Computes means and standard deviations from feature matrix X."""
        if X.ndim != 2 or X.shape[1] != len(FEATURE_NAMES):
            raise ValueError(f"Expected X with shape (N, {len(FEATURE_NAMES)}), got {X.shape}")
        
        self.means = np.mean(X, axis=0)
        self.stds = np.std(X, axis=0)
        # Avoid division by zero for constant features
        self.stds[self.stds < 1e-6] = 1.0
        self.fitted = True
        return self

    def transform(self, X: np.ndarray) -> np.ndarray:
        """Standardizes feature matrix X using fitted mean and std."""
        if not self.fitted or self.means is None or self.stds is None:
            raise RuntimeError("FeaturePipeline must be fitted before transforming data.")
        return (X - self.means) / self.stds

    def fit_transform(self, X: np.ndarray) -> np.ndarray:
        """Fits and transforms feature matrix in a single step."""
        return self.fit(X).transform(X)

    @staticmethod
    def validate_features(features: LandslideFeatures) -> None:
        """Validates physical range constraints on input features."""
        if features.precipitation_24h_mm < 0:
            raise ValueError(f"Precipitation cannot be negative: {features.precipitation_24h_mm}")
        if features.slope_degrees < 0 or features.slope_degrees > 90:
            raise ValueError(f"Slope must be in [0, 90] degrees: {features.slope_degrees}")
        if features.distance_to_hotspot_km < 0:
            raise ValueError(f"Distance to hotspot cannot be negative: {features.distance_to_hotspot_km}")
        if features.active_incident_count_15km < 0:
            raise ValueError(f"Incident count cannot be negative: {features.active_incident_count_15km}")
        if features.soil_saturation_index < 0.0 or features.soil_saturation_index > 1.0:
            raise ValueError(f"Soil saturation index must be in [0, 1]: {features.soil_saturation_index}")

    def extract_from_raw(
        self,
        precipitation_mm: float,
        slope_deg: float,
        distance_hotspot_km: float,
        incident_count: int = 0,
        elevation_m: float = 500.0,
        soil_saturation: float = 0.5
    ) -> LandslideFeatures:
        """Constructs and validates a LandslideFeatures object from raw parameters."""
        feat = LandslideFeatures(
            precipitation_24h_mm=float(precipitation_mm),
            slope_degrees=float(slope_deg),
            distance_to_hotspot_km=float(distance_hotspot_km),
            active_incident_count_15km=int(incident_count),
            elevation_m=float(elevation_m),
            soil_saturation_index=float(soil_saturation)
        )
        self.validate_features(feat)
        return feat

    def to_dict(self) -> Dict[str, Any]:
        """Serializes scaling parameters for export and cross-language runtime."""
        return {
            "feature_names": FEATURE_NAMES,
            "means": self.means.tolist() if self.means is not None else [],
            "stds": self.stds.tolist() if self.stds is not None else [],
            "fitted": self.fitted
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "FeaturePipeline":
        """Instantiates pipeline from serialized dictionary."""
        return cls(means=data.get("means"), stds=data.get("stds"))
