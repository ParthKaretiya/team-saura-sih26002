export interface MLFeaturePayload {
  precipitation_24h_mm: number;
  slope_degrees: number;
  distance_to_hotspot_km: number;
  active_incident_count_15km: number;
  elevation_m: number;
  soil_saturation_index: number;
}

export interface MLPredictionData {
  prediction: 'LANDSLIDE_RISK' | 'NO_HAZARD';
  probability: number;
  risk_tier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  modelVersion: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  features: MLFeaturePayload;
  featureImportance: Record<string, number>;
}

export interface MLPredictionResponse {
  status: 'success' | 'error';
  data?: MLPredictionData;
  message?: string;
}

export interface MLModelInfo {
  model_name: string;
  model_version: string;
  algorithm: string;
  dataset_statistics: {
    total_samples: number;
    positive_samples: number;
    negative_samples: number;
    features_count: number;
  };
  cross_validation_5fold: {
    mean_accuracy: number;
    std_accuracy: number;
    mean_roc_auc: number;
  };
  feature_importances: Record<string, number>;
}
