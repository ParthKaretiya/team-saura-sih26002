import type { RouteGeometry } from './routing.types.js';

/**
 * Corridor accessibility states consumed by the planned AccessibilityService and
 * closure-aware routing.
 *
 * OPEN       — corridor is normally routable.
 * RESTRICTED — corridor remains potentially usable but must be surfaced to the
 *              operator and may influence candidate selection in later logic.
 * CLOSED     — corridor must be treated as unavailable when a route candidate
 *              intersects it.
 */
export type AccessibilityStatus = 'OPEN' | 'RESTRICTED' | 'CLOSED';

export const VALID_ACCESSIBILITY_STATUSES: AccessibilityStatus[] = [
  'OPEN',
  'RESTRICTED',
  'CLOSED',
];

export const ALLOWED_ACCESSIBILITY_STATUS_TRANSITIONS: Record<
  AccessibilityStatus,
  AccessibilityStatus[]
> = {
  OPEN: ['RESTRICTED', 'CLOSED'],
  RESTRICTED: ['OPEN', 'CLOSED'],
  CLOSED: ['OPEN', 'RESTRICTED'],
};

/**
 * Persistence/domain representation of a road corridor accessibility record.
 * `geometry` is a GeoJSON LineString in [longitude, latitude] order, matching the
 * existing routing geometry convention.
 */
export interface AccessibilityRecord {
  id: string;
  name: string;
  road_code?: string;
  status: AccessibilityStatus;
  reason?: string;
  source: string;
  geometry: RouteGeometry;
  created_at: string;
  updated_at: string;
}

export interface AccessibilityFeature {
  type: 'Feature';
  geometry: RouteGeometry;
  properties: {
    id: string;
    name: string;
    roadCode?: string;
    status: AccessibilityStatus;
    reason?: string;
    source: string;
    updatedAt: string;
  };
}

export interface AccessibilityFeatureCollection {
  type: 'FeatureCollection';
  features: AccessibilityFeature[];
}