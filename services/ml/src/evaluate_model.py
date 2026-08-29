"""
Model Evaluation and Metrics Module for SauraRoute Landslide Classifier.
Computes confusion matrix, precision, recall, F1, ROC-AUC, Brier calibration score,
and scenario-based validation metrics across the North Eastern Region.
"""

import json
import os
import sys
from typing import Dict, Any, List
import numpy as np
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    brier_score_loss,
)
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.ensemble import RandomForestClassifier

from schema import FEATURE_NAMES, LandslideFeatures
from dataset_builder import build_dataset
from feature_engineering import FeaturePipeline


def evaluate_classifier(
    historical_json_path: str,
    output_report_path: str,
    random_seed: int = 42
) -> Dict[str, Any]:
    """
    Computes rigorous cross-validated classification metrics and exports evaluation report.
    """
    X, y, samples = build_dataset(historical_json_path, random_seed=random_seed)

    # Feature scaling
    pipeline = FeaturePipeline()
    X_scaled = pipeline.fit_transform(X)

    # Base Classifier
    clf = RandomForestClassifier(
        n_estimators=50,
        max_depth=4,
        random_state=random_seed,
        class_weight="balanced"
    )

    # 5-Fold Stratified Cross-Validated Predictions (out-of-fold to prevent leakage)
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=random_seed)
    y_pred_cv = cross_val_predict(clf, X_scaled, y, cv=skf, method="predict")
    y_proba_cv = cross_val_predict(clf, X_scaled, y, cv=skf, method="predict_proba")[:, 1]

    # Fit final model for scenario validation
    clf.fit(X_scaled, y)

    # Compute Core Metrics
    acc = accuracy_score(y, y_pred_cv)
    prec = precision_score(y, y_pred_cv, zero_division=0)
    rec = recall_score(y, y_pred_cv, zero_division=0)
    f1 = f1_score(y, y_pred_cv, zero_division=0)
    roc_auc = roc_auc_score(y, y_proba_cv)
    brier = brier_score_loss(y, y_proba_cv)
    cm = confusion_matrix(y, y_pred_cv)

    # Scenario-based validation probes
    scenarios = [
        {
            "name": "Guwahati Brahmaputra Plains (Dry, Flat)",
            "features": LandslideFeatures(precipitation_24h_mm=0.0, slope_degrees=2.5, distance_to_hotspot_km=25.0, active_incident_count_15km=0, elevation_m=55.0, soil_saturation_index=0.15),
            "expected_risk": "LOW"
        },
        {
            "name": "Nongpoh GS Road Escarpment (Monsoon Storm, Steep)",
            "features": LandslideFeatures(precipitation_24h_mm=120.0, slope_degrees=34.0, distance_to_hotspot_km=0.5, active_incident_count_15km=1, elevation_m=650.0, soil_saturation_index=0.90),
            "expected_risk": "HIGH"
        },
        {
            "name": "Tezpur Foothills (Moderate Rain, Gentle Slopes)",
            "features": LandslideFeatures(precipitation_24h_mm=25.0, slope_degrees=12.0, distance_to_hotspot_km=18.0, active_incident_count_15km=0, elevation_m=90.0, soil_saturation_index=0.40),
            "expected_risk": "LOW_TO_MEDIUM"
        }
    ]

    scenario_results: List[Dict[str, Any]] = []
    for sc in scenarios:
        vec = np.array([sc["features"].to_array()])
        vec_scaled = pipeline.transform(vec)
        prob = float(clf.predict_proba(vec_scaled)[0, 1])
        pred_label = "LANDSLIDE_RISK" if prob >= 0.50 else "NO_HAZARD"
        scenario_results.append({
            "scenario": sc["name"],
            "probability": round(prob, 4),
            "prediction": pred_label,
            "expected": sc["expected_risk"]
        })

    report = {
        "evaluation_methodology": "5-Fold Stratified Out-of-Fold Cross Validation",
        "sample_counts": {
            "total": len(y),
            "positive_events": int(np.sum(y == 1)),
            "negative_controls": int(np.sum(y == 0))
        },
        "metrics": {
            "accuracy": round(float(acc), 4),
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1_score": round(float(f1), 4),
            "roc_auc": round(float(roc_auc), 4),
            "brier_score_loss": round(float(brier), 4)
        },
        "confusion_matrix": {
            "true_negatives": int(cm[0, 0]),
            "false_positives": int(cm[0, 1]),
            "false_negatives": int(cm[1, 0]),
            "true_positives": int(cm[1, 1])
        },
        "scenario_probe_validation": scenario_results
    }

    os.makedirs(os.path.dirname(output_report_path), exist_ok=True)
    with open(output_report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    return report


if __name__ == "__main__":
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
    data_path = os.path.join(base_dir, "data/processed/historical_landslides_ner.json")
    report_path = os.path.join(base_dir, "services/ml/models/evaluation_report.json")

    rep = evaluate_classifier(data_path, report_path)
    print("==================================================")
    print("SauraRoute Landslide ML Classifier — Evaluation Report")
    print("==================================================")
    print(f"Accuracy:  {rep['metrics']['accuracy']*100:.2f}%")
    print(f"Precision: {rep['metrics']['precision']*100:.2f}%")
    print(f"Recall:    {rep['metrics']['recall']*100:.2f}%")
    print(f"F1-Score:  {rep['metrics']['f1_score']:.4f}")
    print(f"ROC-AUC:   {rep['metrics']['roc_auc']:.4f}")
    print(f"Brier Score: {rep['metrics']['brier_score_loss']:.4f}")
    print(f"Confusion Matrix: TN={rep['confusion_matrix']['true_negatives']}, FP={rep['confusion_matrix']['false_positives']}, FN={rep['confusion_matrix']['false_negatives']}, TP={rep['confusion_matrix']['true_positives']}")
    print("--------------------------------------------------")
    print("Scenario Probes:")
    for sc in rep['scenario_probe_validation']:
        print(f"  * {sc['scenario']:50s} -> Prob: {sc['probability']*100:5.1f}% [{sc['prediction']}]")
    print("==================================================")
