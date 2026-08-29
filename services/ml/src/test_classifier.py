"""
Unit Test Suite for SauraRoute Step 7 ML Classifiers.
Tests feature validation, dataset builder, feature scaling, model training, and inference.
"""

import os
import sys
import unittest
import numpy as np

# Ensure module import path
sys.path.append(os.path.dirname(__file__))

from schema import LandslideFeatures, FEATURE_NAMES
from dataset_builder import build_dataset
from feature_engineering import FeaturePipeline
from train_classifier import train_landslide_model
from classifier_service import LandslideClassifierService


class TestMLPipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
        cls.data_path = os.path.join(cls.base_dir, "data/processed/historical_landslides_ner.json")
        cls.models_dir = os.path.join(cls.base_dir, "services/ml/models")

    def test_feature_validation_accepts_valid_inputs(self):
        feat = LandslideFeatures(
            precipitation_24h_mm=45.0,
            slope_degrees=28.0,
            distance_to_hotspot_km=3.5,
            active_incident_count_15km=1,
            elevation_m=450.0,
            soil_saturation_index=0.65
        )
        FeaturePipeline.validate_features(feat)
        arr = feat.to_array()
        self.assertEqual(len(arr), len(FEATURE_NAMES))
        self.assertEqual(arr[0], 45.0)
        self.assertEqual(arr[1], 28.0)

    def test_feature_validation_rejects_negative_precipitation(self):
        feat = LandslideFeatures(precipitation_24h_mm=-5.0, slope_degrees=20.0, distance_to_hotspot_km=10.0)
        with self.assertRaises(ValueError):
            FeaturePipeline.validate_features(feat)

    def test_feature_validation_rejects_invalid_slope_angles(self):
        feat_high = LandslideFeatures(precipitation_24h_mm=10.0, slope_degrees=95.0, distance_to_hotspot_km=10.0)
        with self.assertRaises(ValueError):
            FeaturePipeline.validate_features(feat_high)

        feat_neg = LandslideFeatures(precipitation_24h_mm=10.0, slope_degrees=-2.0, distance_to_hotspot_km=10.0)
        with self.assertRaises(ValueError):
            FeaturePipeline.validate_features(feat_neg)

    def test_dataset_builder_produces_balanced_data(self):
        X, y, samples = build_dataset(self.data_path, random_seed=42)
        self.assertEqual(X.shape[0], 40)
        self.assertEqual(X.shape[1], 6)
        self.assertEqual(len(y), 40)
        self.assertEqual(np.sum(y == 1), 20)
        self.assertEqual(np.sum(y == 0), 20)

    def test_feature_pipeline_scaling_and_serialization(self):
        X, y, _ = build_dataset(self.data_path, random_seed=42)
        pipe = FeaturePipeline()
        X_scaled = pipe.fit_transform(X)

        # Scaled mean should be ~0 and std ~1
        np.testing.assert_almost_equal(X_scaled.mean(axis=0), np.zeros(6), decimal=5)
        np.testing.assert_almost_equal(X_scaled.std(axis=0), np.ones(6), decimal=5)

        # Test dictionary export and reconstruction
        pipe_dict = pipe.to_dict()
        reconstructed_pipe = FeaturePipeline.from_dict(pipe_dict)
        self.assertTrue(reconstructed_pipe.fitted)
        X_re_scaled = reconstructed_pipe.transform(X)
        np.testing.assert_almost_equal(X_scaled, X_re_scaled)

    def test_model_training_and_reproducibility(self):
        clf1, pipe1, meta1 = train_landslide_model(self.data_path, self.models_dir, random_seed=42)
        clf2, pipe2, meta2 = train_landslide_model(self.data_path, self.models_dir, random_seed=42)

        self.assertEqual(meta1["dataset_statistics"]["total_samples"], 40)
        self.assertEqual(meta1["cross_validation_5fold"]["mean_accuracy"], meta2["cross_validation_5fold"]["mean_accuracy"])
        self.assertEqual(meta1["feature_importances"], meta2["feature_importances"])

    def test_inference_service_benign_valley_scenario(self):
        service = LandslideClassifierService()
        result = service.predict(
            precipitation_mm=0.0,
            slope_deg=2.0,
            distance_hotspot_km=30.0,
            incident_count=0,
            elevation_m=50.0,
            soil_saturation=0.1
        )
        self.assertEqual(result["prediction"], "NO_HAZARD")
        self.assertLess(result["probability"], 0.30)
        self.assertIn(result["risk_tier"], ["LOW", "MEDIUM"])
        self.assertGreaterEqual(result["confidence"], 0.0)

    def test_inference_service_severe_mountain_storm_scenario(self):
        service = LandslideClassifierService()
        result = service.predict(
            precipitation_mm=130.0,
            slope_deg=38.0,
            distance_hotspot_km=0.5,
            incident_count=1,
            elevation_m=800.0,
            soil_saturation=0.95
        )
        self.assertEqual(result["prediction"], "LANDSLIDE_RISK")
        self.assertGreater(result["probability"], 0.70)
        self.assertIn(result["risk_tier"], ["HIGH", "CRITICAL"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
