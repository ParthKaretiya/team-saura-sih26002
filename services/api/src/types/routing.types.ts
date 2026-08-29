import { RiskLevel, RouteRiskSummary } from './risk.types.js';
import { MLPredictionData } from './ml.types.js';

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
}

export interface RouteOptimizationResult {
  origin: Coordinate;
  destination: Coordinate;
  selectedCandidateId: string;
  selectedRoute: CandidateRouteProfile;
  baselineRoute: CandidateRouteProfile;
  candidatesCount: number;
  candidates: CandidateRouteProfile[];
  optimization: {
    strategy: 'SAFETY_OPTIMIZED' | 'SPEED_BASELINE';
    selectionReason: string;
    hazardReductionPercent: number;
    additionalDistanceKm: number;
    additionalDurationMinutes: number;
  };
}

export interface RerouteEvaluationResult {
  rerouteRecommended: boolean;
  reason: string;
  currentRoute: {
    riskLevel: RiskLevel;
    meanRiskScore: number;
    maxRiskScore: number;
    hazardousSegmentCount: number;
  };
  recommendedRoute?: CandidateRouteProfile;
  metrics?: {
    hazardReductionPercent: number;
    additionalDistanceMeters: number;
    additionalDurationSeconds: number;
  };
  evaluatedCandidatesCount: number;
}
