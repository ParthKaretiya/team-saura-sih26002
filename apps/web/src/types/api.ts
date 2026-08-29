export interface IncidentFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  };
  properties: {
    id: string;
    type: string;
    severity: string;
    description: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    resolvedAt?: string | null;
  };
}

export interface IncidentFeatureCollection {
  type: 'FeatureCollection';
  features: IncidentFeature[];
}

export interface VehicleFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  };
  properties: {
    id: string;
    vehicleCode: string;
    speed: number;
    heading: number;
    status: string;
    updatedAt: string;
  };
}

export interface VehicleFeatureCollection {
  type: 'FeatureCollection';
  features: VehicleFeature[];
}

export interface RouteNavigationInstruction {
  text: string;
  distanceMeters: number;
  durationSeconds: number;
}

export interface RouteResponse {
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
  distanceMeters: number;
  durationSeconds: number;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // [lon, lat]
  };
  instructions: RouteNavigationInstruction[];
}
