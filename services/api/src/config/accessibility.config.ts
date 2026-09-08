/**
 * Configuration for Step 9 road accessibility intelligence and active-route alerts.
 *
 * Kept separate from OPTIMIZATION_CONFIG (Step 8) so accessibility routing
 * thresholds do not leak into hazard-weighting concerns.
 */
export interface AccessibilityRoutingConfig {
  // Prototype corridor-vs-route intersection tolerance, in meters.
  // A route candidate is treated as intersecting a CLOSED corridor when any
  // sampled waypoint lies within this distance of the corridor's LineString.
  intersectionToleranceMeters: number;

  // CLOSED corridors always exclude an intersecting candidate. RESTRICTED
  // corridors only demote the candidate when its hazard exposure is at or above
  // this score (reuses the Step-6 risk classification boundary semantics).
  restrictedDemotionThresholdScore: number;
}

export const ACCESSIBILITY_CONFIG = {
  routing: {
    intersectionToleranceMeters: 250,
    restrictedDemotionThresholdScore: 50.0,
  } as AccessibilityRoutingConfig,

  // Alert severity mapping for corridor status → alert level.
  alerts: {
    roadClosureSeverity: 'CRITICAL' as const,
    roadRestrictionSeverity: 'WARNING' as const,
  },
};