import { RiskLevel } from '../types/risk.types.js';

export const RISK_CONFIG = {
  // Weights (Sum = 1.0)
  weights: {
    rainfall: 0.35,
    slope: 0.25,
    activeIncidents: 0.25,
    historicalHotspots: 0.15,
  },

  // Rainfall Subscore Thresholds (mm in last/next 24h)
  rainfall: {
    lowMaxMm: 5.0,        // < 5mm -> 0
    moderateMaxMm: 20.0,  // 5-20mm -> 30
    heavyMaxMm: 50.0,     // 20-50mm -> 70
    torrentialMinMm: 50.0,// > 50mm -> 100
  },

  // Terrain Slope Subscore Thresholds (degrees)
  slope: {
    flatMaxDeg: 10.0,     // < 10° -> 0
    gentleMaxDeg: 25.0,   // 10-25° -> 40
    steepMaxDeg: 40.0,    // 25-40° -> 75
    cliffMinDeg: 40.0,    // > 40° -> 100
  },

  // Active Incident Proximity Thresholds (km)
  incidents: {
    immediateDistanceKm: 5.0,   // < 5km -> up to 100 based on severity
    localDistanceKm: 15.0,      // 5-15km -> up to 60 based on severity
    maxSearchRadiusKm: 25.0,
  },

  // Historical Hotspot Proximity Thresholds (km)
  history: {
    directHotspotKm: 2.0,       // < 2km -> 100
    adjacentHotspotKm: 5.0,     // 2-5km -> 60
    regionalHotspotKm: 10.0,    // 5-10km -> 30
    maxSearchRadiusKm: 15.0,
  },

  // Risk Level Classification Boundaries
  boundaries: {
    lowMax: 25.0,        // [0, 25) -> LOW
    mediumMax: 50.0,     // [25, 50) -> MEDIUM
    highMax: 75.0,       // [50, 75) -> HIGH
    criticalMin: 75.0,   // [75, 100] -> CRITICAL
  },
};

/**
 * Classifies a numeric risk score [0, 100] into a standard RiskLevel.
 */
export function classifyRiskLevel(score: number): RiskLevel {
  const clamped = Math.max(0, Math.min(100, score));
  if (clamped < RISK_CONFIG.boundaries.lowMax) return 'LOW';
  if (clamped < RISK_CONFIG.boundaries.mediumMax) return 'MEDIUM';
  if (clamped < RISK_CONFIG.boundaries.highMax) return 'HIGH';
  return 'CRITICAL';
}
