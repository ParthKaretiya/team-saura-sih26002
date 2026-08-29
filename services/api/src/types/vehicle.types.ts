export type VehicleStatus = 'IDLE' | 'ACTIVE' | 'MAINTENANCE' | 'OFFLINE';

export interface VehicleRecord {
  id: string;
  vehicle_code: string;
  latitude: number | null;
  longitude: number | null;
  speed: number;
  heading: number;
  status: VehicleStatus;
  created_at: string;
  updated_at: string;
}

export interface VehicleFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: {
    id: string;
    vehicleCode: string;
    speed: number;
    heading: number;
    status: VehicleStatus;
    updatedAt: string;
  };
}

export interface VehicleFeatureCollection {
  type: 'FeatureCollection';
  features: VehicleFeature[];
}
