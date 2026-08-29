import { pool } from '../db/connection.js';
import {
  VehicleFeature,
  VehicleFeatureCollection,
  VehicleRecord,
} from '../types/vehicle.types.js';

// Baseline fallback in-memory store initialized with test vehicles
const inMemoryVehicles = new Map<string, VehicleRecord>([
  [
    'vh_saura_001',
    {
      id: 'vh_saura_001',
      vehicle_code: 'SAURA-001',
      latitude: 26.1445,
      longitude: 91.7362,
      speed: 45.0,
      heading: 145.0,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  [
    'vh_saura_002',
    {
      id: 'vh_saura_002',
      vehicle_code: 'SAURA-002',
      latitude: 25.9021,
      longitude: 91.8012,
      speed: 38.0,
      heading: 160.0,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  [
    'vh_saura_003',
    {
      id: 'vh_saura_003',
      vehicle_code: 'SAURA-003',
      latitude: 25.5788,
      longitude: 91.8933,
      speed: 0.0,
      heading: 0.0,
      status: 'IDLE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
]);

export class VehicleService {
  async listVehicles(): Promise<VehicleFeatureCollection> {
    let records: VehicleRecord[] = [];

    try {
      const client = await pool.connect();
      try {
        const query = `
          SELECT id, vehicle_code, ST_X(location) as longitude, ST_Y(location) as latitude, speed, heading, status, created_at, updated_at
          FROM vehicles
          ORDER BY vehicle_code ASC;
        `;
        const { rows } = await client.query(query);
        records = rows as VehicleRecord[];
      } finally {
        client.release();
      }
    } catch {
      // Fallback in-memory
      records = Array.from(inMemoryVehicles.values());
    }

    // Convert records to GeoJSON FeatureCollection [longitude, latitude]
    const features: VehicleFeature[] = records
      .filter(r => r.longitude !== null && r.latitude !== null)
      .map(r => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [Number(r.longitude), Number(r.latitude)], // [lon, lat]
        },
        properties: {
          id: r.id,
          vehicleCode: r.vehicle_code,
          speed: Number(r.speed) || 0,
          heading: Number(r.heading) || 0,
          status: r.status,
          updatedAt: r.updated_at,
        },
      }));

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  async updateLocation(
    vehicleId: string,
    params: {
      latitude: number;
      longitude: number;
      speed?: number;
      heading?: number;
    }
  ): Promise<VehicleRecord | null> {
    const speed = params.speed ?? 0.0;
    const heading = params.heading ?? 0.0;
    const now = new Date().toISOString();

    try {
      const client = await pool.connect();
      try {
        const query = `
          UPDATE vehicles
          SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
              speed = $3,
              heading = $4,
              status = 'ACTIVE',
              updated_at = NOW()
          WHERE id = $5 OR vehicle_code = $5
          RETURNING id, vehicle_code, ST_X(location) as longitude, ST_Y(location) as latitude, speed, heading, status, created_at, updated_at;
        `;
        const { rows } = await client.query(query, [
          params.longitude, // X / lon
          params.latitude,  // Y / lat
          speed,
          heading,
          vehicleId,
        ]);

        if (rows.length === 0) return null;
        const record = rows[0] as VehicleRecord;
        inMemoryVehicles.set(record.id, record);
        return record;
      } finally {
        client.release();
      }
    } catch {
      // Fallback in-memory
      let record = inMemoryVehicles.get(vehicleId);
      if (!record) {
        // Search by vehicle_code
        for (const v of inMemoryVehicles.values()) {
          if (v.vehicle_code === vehicleId) {
            record = v;
            break;
          }
        }
      }

      if (!record) return null;

      record.latitude = params.latitude;
      record.longitude = params.longitude;
      record.speed = speed;
      record.heading = heading;
      record.status = 'ACTIVE';
      record.updated_at = now;

      inMemoryVehicles.set(record.id, record);
      return record;
    }
  }
}

export const vehicleService = new VehicleService();
