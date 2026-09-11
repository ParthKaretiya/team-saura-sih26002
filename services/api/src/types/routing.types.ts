import { RiskLevel, RouteRiskSummary } from './risk.types.js';
import type { AccessibilityRecord } from './accessibility.types.js';

/**
 * All GeoJSON positions use [longitude, latitude] ordering (RFC 7946).
 * API request coordinates remain named latitude/longitude objects to avoid
 * positional ambiguity at the HTTP boundary.
 */
export type GeoJsonPosition = [longitude: number, latitude: number];

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RouteRequest {
  origin: Coordinate;
  destination: Coordinate;
}

export interface RouteGeometry {
  type: 'LineString';
  coordinates: GeoJsonPosition[];
}

export interface RouteNavigationInstruction {
  text: string;
  distanceMeters: number;
  durationSeconds: number;
}

export interface RouteResponse {
  origin: Coordinate;
  destination: Coordinate;
  distanceMeters: number;
  durationSeconds: number;
  geometry: RouteGeometry;
  instructions: RouteNavigationInstruction[];
}

export interface RoutingOptions {
  profile?: string;
  customModel?: Record<string, unknown>;
  alternativeRoutes?: boolean;
  maxPaths?: number;
}

export type RoutingPreference = 'FASTEST' | 'BALANCED' | 'SAFEST';

export type RouteAccessibility =
  | 'ACCESSIBLE'
  | 'RESTRICTED'
  | 'CLOSED'
  | 'UNKNOWN';

export interface CandidateAccessibility {
  status: RouteAccessibility;
  isEligible: boolean;
  affectedCorridors: AccessibilityRecord[];
  exclusionReason?: string;
}

export interface RouteAccessibilitySummary {
  status: 'ACCESSIBLE' | 'RESTRICTED' | 'ALL_CANDIDATES_CLOSED' | 'UNKNOWN';
  affectedCorridors: AccessibilityRecord[];
  reason?: string;
}

export interface CandidateRouteProfile {
  candidateId: string;
  name: string;
  isBaseline: boolean;
  distanceMeters: number;
  durationSeconds: number;
  geometry: RouteGeometry;
  instructions: RouteNavigationInstruction[];
  risk: RouteRiskSummary;
  mlSummary?: {
    maxProbability: number;
    meanProbability: number;
    riskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    prediction: 'LANDSLIDE_RISK' | 'NO_HAZARD';
  };
  compositeCost: number;
  normalizedCost: {
    durationScore: number;
    distanceScore: number;
    hazardScore: number;
    totalCost: number;
  };
  accessibility?: CandidateAccessibility;
}

export interface RouteSelectionExplanation {
  summary: string;
  selectedRouteName: string;
  isBaseline: boolean;
  baselineRiskScore: number;
  baselineRiskLevel: RiskLevel;
  selectedRiskScore: number;
  selectedRiskLevel: RiskLevel;
  hazardReductionPercent: number;
  detourKm: number;
  detourMinutes: number;
  detourRatio: number;
  accessibilityStatus: RouteAccessibility;
  corridorStatusSummary?: string;
  factors: string[];
}

export interface RouteOptimizationResult {
  origin: Coordinate;
  destination: Coordinate;
  selectedCandidateId: string;
  selectedRoute: CandidateRouteProfile;
  baselineRoute: CandidateRouteProfile;
  candidatesCount: number;
  candidates: CandidateRouteProfile[];
  preference: RoutingPreference;
  safetyIntelligence: {
    status: 'AVAILABLE' | 'DEGRADED';
    reason?: string;
  };
  optimization: {
    strategy: 'SAFETY_OPTIMIZED' | 'SPEED_BASELINE';
    selectionReason: string;
    hazardReductionPercent: number;
    additionalDistanceKm: number;
    additionalDurationMinutes: number;
    explanation?: RouteSelectionExplanation;
  };
  accessibility?: RouteAccessibilitySummary;
}

export interface RerouteExplanation {
  summary: string;
  currentRiskScore: number;
  currentRiskLevel: RiskLevel;
  recommendedRiskScore?: number;
  recommendedRiskLevel?: RiskLevel;
  hazardReductionPercent?: number;
  additionalDistanceKm?: number;
  additionalDurationMinutes?: number;
  detourRatio?: number;
  triggerReason: string;
}

export interface RerouteEvaluationResult {
  rerouteRecommended: boolean;
  reason: string;
  currentRoute: {
    riskLevel: RiskLevel;
    meanRiskScore: number;
    maxRiskScore: number;
    hazardousSegmentCount: number;
    accessibility?: CandidateAccessibility;
  };
  safetyIntelligence: {
    status: 'AVAILABLE' | 'DEGRADED';
    reason?: string;
  };
  recommendedRoute?: CandidateRouteProfile;
  metrics?: {
    hazardReductionPercent: number;
    additionalDistanceMeters: number;
    additionalDurationSeconds: number;
    additionalDistanceKm?: number;
    additionalDurationMinutes?: number;
    detourRatio?: number;
  };
  evaluatedCandidatesCount: number;
  accessibility?: RouteAccessibilitySummary;
  explanation?: RerouteExplanation;
}
