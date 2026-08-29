"""
Prediction & Inference Service for SauraRoute ML Landslide Classifier.
Provides single-point inference, batch scoring, and probability estimation.
"""

import json
import os
import sys
from typing import Dict, Any, Optional, List, Union
import numpy as np
import joblib

from schema import FEATURE_NAMES, LandslideFeatures, PredictionOutput
from feature_engineering import FeaturePipeline


class LandslideClassifierService:
    """
    Production-ready inference service for landslide susceptibility prediction.
    """

    def __init__(self, model_path: Optional[str] = None, metadata_path: Optional[str] = None):
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        self.model_path = model_path or os.path.join(base_dir, "models/landslide_rf_model.joblib")
        self.metadata_path = metadata_path or os.path.join(base_dir, "models/model_metadata.json")
        
        self.model = None
        self.pipeline: Optional[FeaturePipeline] = None
        self.metadata: Dict[str, Any] = {}
        self.model_version = "v1.0.0-rf-step7"
        self._load_artifacts()

    def _load_artifacts(self) -> None:
        """Loads trained model bundle and metadata."""
        if os.path.exists(self.metadata_path):
            with open(self.metadata_path, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)
                self.model_version = self.metadata.get("model_version", self.model_version)
                scaling = self.metadata.get("scaling_pipeline")
                if scaling:
                    self.pipeline = FeaturePipeline.from_dict(scaling)

        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
            except Exception as err:
                print(f"[Warning] Could not load joblib model: {err}", file=sys.stderr)

    def is_ready(self) -> bool:
        return self.model is not None and self.pipeline is not None and self.pipeline.fitted

    def predict(
        self,
        precipitation_mm: float,
        slope_deg: float,
        distance_hotspot_km: float,
        incident_count: int = 0,
        elevation_m: float = 500.0,
        soil_saturation: float = 0.5
    ) -> Dict[str, Any]:
        """
        Executes inference for a single feature combination.
        """
        # 1. Construct & validate features
        if self.pipeline is None:
            raise RuntimeError("Inference pipeline is not initialized.")

        features = self.pipeline.extract_from_raw(
            precipitation_mm=precipitation_mm,
            slope_deg=slope_deg,
            distance_hotspot_km=distance_hotspot_km,
            incident_count=incident_count,
            elevation_m=elevation_m,
            soil_saturation=soil_saturation
        )

        # 2. Scale features
        raw_vec = np.array([features.to_array()])
        scaled_vec = self.pipeline.transform(raw_vec)

        # 3. Model probability prediction
        if self.model is not None:
            proba_arr = self.model.predict_proba(scaled_vec)[0]
            prob_landslide = float(proba_arr[1])
        else:
            # Fallback heuristic probability approximation if binary is missing
            z = (
                (features.precipitation_24h_mm / 100.0) * 0.35 +
                (features.slope_degrees / 45.0) * 0.30 +
                max(0.0, 1.0 - features.distance_to_hotspot_km / 15.0) * 0.20 +
                features.soil_saturation_index * 0.15
            )
            prob_landslide = float(np.clip(z, 0.0, 1.0))

        # 4. Classification thresholds
        prediction_label = "LANDSLIDE_RISK" if prob_landslide >= 0.50 else "NO_HAZARD"
        
        if prob_landslide < 0.25:
            risk_tier = "LOW"
        elif prob_landslide < 0.50:
            risk_tier = "MEDIUM"
        elif prob_landslide < 0.75:
            risk_tier = "HIGH"
        else:
            risk_tier = "CRITICAL"

        confidence = round(float(abs(prob_landslide - 0.50) * 2.0), 3)

        return {
            "prediction": prediction_label,
            "probability": round(prob_landslide, 4),
            "risk_tier": risk_tier,
            "confidence": confidence,
            "modelVersion": self.model_version,
            "features": features.to_dict(),
            "featureImportance": self.metadata.get("feature_importances", {})
        }


# CLI bridge for external processes
if __name__ == "__main__":
    service = LandslideClassifierService()
    if len(sys.argv) > 1 and sys.argv[1] == "--json":
        # Read JSON input from stdin
        input_data = json.load(sys.stdin)
        result = service.predict(
            precipitation_mm=input_data.get("precipitation_mm", 0.0),
            slope_deg=input_data.get("slope_deg", 0.0),
            distance_hotspot_km=input_data.get("distance_hotspot_km", 20.0),
            incident_count=input_data.get("incident_count", 0),
            elevation_m=input_data.get("elevation_m", 500.0),
            soil_saturation=input_data.get("soil_saturation", 0.5)
        )
        print(json.dumps(result))
    else:
        # Self-test
        sample_res = service.predict(
            precipitation_mm=85.0,
            slope_deg=35.0,
            distance_hotspot_km=1.2,
            incident_count=1,
            elevation_m=750.0,
            soil_saturation=0.85
        )
        print("Self-test prediction result:")
        print(json.dumps(sample_res, indent=2))
