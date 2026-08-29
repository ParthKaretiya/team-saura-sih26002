import { fileURLToPath } from 'url';
import { pool } from './connection.js';

export async function seedDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    console.log('[Seed] Seeding database with baseline test data...');

    // 1. Seed Vehicles
    const vehicles = [
      {
        id: 'vh_saura_001',
        code: 'SAURA-001',
        lon: 91.7362,
        lat: 26.1445,
        speed: 45.0,
        heading: 145.0,
        status: 'ACTIVE',
      },
      {
        id: 'vh_saura_002',
        code: 'SAURA-002',
        lon: 91.8012,
        lat: 25.9021,
        speed: 38.0,
        heading: 160.0,
        status: 'ACTIVE',
      },
      {
        id: 'vh_saura_003',
        code: 'SAURA-003',
        lon: 91.8933,
        lat: 25.5788,
        speed: 0.0,
        heading: 0.0,
        status: 'IDLE',
      },
    ];

    for (const v of vehicles) {
      await client.query(`
        INSERT INTO vehicles (id, vehicle_code, location, speed, heading, status, updated_at)
        VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6, $7, NOW())
        ON CONFLICT (id) DO UPDATE SET
          location = ST_SetSRID(ST_MakePoint($3, $4), 4326),
          speed = $5,
          heading = $6,
          status = $7,
          updated_at = NOW();
      `, [v.id, v.code, v.lon, v.lat, v.speed, v.heading, v.status]);
      console.log(`[Seed] Vehicle seeded: ${v.code}`);
    }

    // 2. Seed Sample Incident
    await client.query(`
      INSERT INTO incidents (id, type, severity, description, location, status, created_at, updated_at)
      VALUES (
        'inc_sample_001',
        'LANDSLIDE',
        'HIGH',
        'Debris on GS Road highway corridor near Nongpoh',
        ST_SetSRID(ST_MakePoint(91.7821, 25.9810), 4326),
        'REPORTED',
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('[Seed] Sample incident seeded: inc_sample_001');

    console.log('[Seed] Database seeding completed.');
  } finally {
    client.release();
  }
}

// Execute directly if run from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed] Seeding error:', err);
      process.exit(1);
    });
}
