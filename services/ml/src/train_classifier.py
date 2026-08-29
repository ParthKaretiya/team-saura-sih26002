"""
Model Training Module for SauraRoute Landslide Classifier.
Trains a deterministic Random Forest classifier on regional terrain, weather, and historical landslide features.
"""

import json
import os
import sys
from typing import Dict, Any, Tuple
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold, cross_val_score
import joblib

from schema import FEATURE_NAMES
from dataset_builder import build_dataset
from feature_engineering import FeaturePipeline

MODEL_VERSION = "v1.0.0-rf-step7"


def train_landslide_model(
    historical_data_path: str,
    output_dir: str,
    n_estimators: int = 50,
    max_depth: int = 4,
    random_seed: int = 42
) -> Tuple[RandomForestClassifier, FeaturePipeline, Dict[str, Any]]:
    """
    Trains a deterministic Random Forest model and exports model artifacts.
    """
    os.makedirs(output_dir, exist_ok=True)

    # 1. Prepare dataset
    X, y, samples = build_dataset(historical_data_path, random_seed=random_seed)

    # 2. Fit feature standardization pipeline
    pipeline = FeaturePipeline()
    X_scaled = pipeline.fit_transform(X)

    # 3. Initialize deterministic Random Forest Classifier
    clf = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        random_state=random_seed,
        class_weight="balanced"
    )

    # 4. Perform 5-fold Stratified Cross-Validation
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=random_seed)
    cv_scores = cross_val_score(clf, X_scaled, y, cv=skf, scoring="accuracy")
    cv_roc_auc = cross_val_score(clf, X_scaled, y, cv=skf, scoring="roc_auc")

    # 5. Fit model on full training set
    clf.fit(X_scaled, y)

    # 6. Extract feature importances
    feature_importances: Dict[str, float] = {}
    for name, imp in zip(FEATURE_NAMES, clf.feature_importances_):
        feature_importances[name] = round(float(imp), 4)

    # Sort by importance descending
    sorted_importances = dict(sorted(feature_importances.items(), key=lambda item: item[1], reverse=True))

    # 7. Compile training summary metadata
    metadata = {
        "model_name": "SauraRoute-Landslide-RandomForest",
        "model_version": MODEL_VERSION,
        "algorithm": "RandomForestClassifier",
        "hyperparameters": {
            "n_estimators": n_estimators,
            "max_depth": max_depth,
            "random_state": random_seed,
            "class_weight": "balanced"
        },
        "dataset_statistics": {
            "total_samples": len(y),
            "positive_samples": int(np.sum(y == 1)),
            "negative_samples": int(np.sum(y == 0)),
            "features_count": len(FEATURE_NAMES)
        },
        "cross_validation_5fold": {
            "mean_accuracy": round(float(np.mean(cv_scores)), 4),
            "std_accuracy": round(float(np.std(cv_scores)), 4),
            "mean_roc_auc": round(float(np.mean(cv_roc_auc)), 4),
            "std_roc_auc": round(float(np.std(cv_roc_auc)), 4)
        },
        "feature_importances": sorted_importances,
        "scaling_pipeline": pipeline.to_dict()
    }

    # 8. Save artifacts
    model_joblib_path = os.path.join(output_dir, "landslide_rf_model.joblib")
    joblib.dump(clf, model_joblib_path)

    metadata_path = os.path.join(output_dir, "model_metadata.json")
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    return clf, pipeline, metadata


if __name__ == "__main__":
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
    data_path = os.path.join(base_dir, "data/processed/historical_landslides_ner.json")
    out_dir = os.path.join(base_dir, "services/ml/models")

    clf, pipeline, meta = train_landslide_model(data_path, out_dir)
    print("==================================================")
    print(f"Model Training Complete: {meta['model_name']} ({meta['model_version']})")
    print(f"Total Samples: {meta['dataset_statistics']['total_samples']} (Pos: {meta['dataset_statistics']['positive_samples']}, Neg: {meta['dataset_statistics']['negative_samples']})")
    print(f"5-Fold CV Accuracy: {meta['cross_validation_5fold']['mean_accuracy']*100:.2f}% (±{meta['cross_validation_5fold']['std_accuracy']*100:.2f}%)")
    print(f"5-Fold CV ROC-AUC:  {meta['cross_validation_5fold']['mean_roc_auc']:.4f}")
    print("Feature Importances:")
    for feat, imp in meta['feature_importances'].items():
        print(f"  - {feat:30s}: {imp:.4f}")
    print("==================================================")
