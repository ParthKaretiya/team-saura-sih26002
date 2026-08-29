export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RainfallFactor {
  subscore: number;
  valueMm: number;
  weight: number;
  description: string;
}

export interface SlopeFactor {
  subscore: number;
  degrees: number;
  weight: number;
  description: string;
}

export interface IncidentFactor {
  subscore: number;
  nearestDistanceKm: number | null;
  countWithin15km: number;
  weight: number;
  description: string;
}

export interface HistoricalHotspotFactor {
  subscore: number;
  nearestDistanceKm: number | null;
  nearestName?: string;
  weight: number;
  description: string;
}

export interface RiskFactorBreakdown {
  rainfall: RainfallFactor;
  slope: SlopeFactor;
  activeIncidents: IncidentFactor;
  historicalHotspots: HistoricalHotspotFactor;
}

export interface PointRiskAssessment {
  location: {
    latitude: number;
    longitude: number;
  };
  score: number;
  level: RiskLevel;
  factors: RiskFactorBreakdown;
  summary: string;
}

export interface SampledWaypointRisk {
  coordinates: [longitude: number, latitude: number];
  distanceAlongRouteKm: number;
  score: number;
  level: RiskLevel;
  primaryFactor: string;
}

export interface RouteRiskSummary {
  overallLevel: RiskLevel;
  meanScore: number;
  maxScore: number;
  hazardousSegmentCount: number;
  dominantTrigger: string;
  sampledWaypointsCount: number;
  waypoints: SampledWaypointRisk[];
}

export interface HistoricalLandslideRecord {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  state: string;
  eventDate?: string;
  triggerType?: string;
  fatalities?: number;
  severity?: string;
  provenance?: Record<string, unknown>;
  description?: string;
}

export interface HazardZoneFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  };
  properties: {
    id: string;
    name: string;
    state: string;
    severity: string;
    eventDate?: string;
    triggerType?: string;
    fatalities?: number;
    provenanceSource?: string;
    description?: string;
  };
}

export interface HazardZoneFeatureCollection {
  type: 'FeatureCollection';
  features: HazardZoneFeature[];
}
