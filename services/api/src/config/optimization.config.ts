export interface OptimizationWeights {
  duration: number;  // Time penalty weight (e.g. 0.40)
  distance: number;  // Distance penalty weight (e.g. 0.10)
  hazard: number;    // Risk & ML hazard weight (e.g. 0.50)
}

export const OPTIMIZATION_CONFIG = {
  // Objective weights (must sum to 1.0)
  defaultWeights: {
    duration: 0.40,
    distance: 0.10,
    hazard: 0.50,
  } as OptimizationWeights,

  // Speed-only baseline weights (for comparisons)
  speedOnlyWeights: {
    duration: 0.85,
    distance: 0.15,
    hazard: 0.0,
  } as OptimizationWeights,

  // Safety-prioritized weights
  safetyFirstWeights: {
    duration: 0.25,
    distance: 0.05,
    hazard: 0.70,
  } as OptimizationWeights,

  // Detour bounds & thresholds
  constraints: {
    maxDetourRatio: 1.35,          // Maximum 35% extra distance/duration allowed
    minRiskReductionRatio: 0.15,   // Minimum 15% hazard reduction required to justify detour
    highRiskThresholdScore: 50.0,  // Risk scores >= 50 (HIGH/CRITICAL) trigger detour evaluation
  },

  // Dynamic rerouting thresholds
  rerouting: {
    triggerScore: 50.0,            // Rerouting evaluated when current route risk >= 50
    criticalIncidentRadiusKm: 5.0, // Active CRITICAL incidents within 5km of route trigger reroute
    minRerouteImprovement: 0.15,   // Recommended reroute must be at least 15% safer
  },

  // GraphHopper alternative routing parameters
  graphHopperAlternatives: {
    maxPaths: 3,
    maxWeightFactor: 1.8,
    maxShareFactor: 0.85,
  },
};
