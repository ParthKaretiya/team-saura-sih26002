import pg from 'pg';
import { dbConfig } from '../config/database.js';

const { Pool } = pg;

export const pool = new Pool(dbConfig);

let isDbAvailable = false;

export function getDbAvailability(): boolean {
  return isDbAvailable;
}

export function setDbAvailability(available: boolean): void {
  isDbAvailable = available;
}

/**
 * Tests the database connection by verifying PostGIS is available.
 * Returns the PostGIS version string on success, or throws on failure.
 */
export async function testConnection(): Promise<string> {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT PostGIS_Version() AS version');
    isDbAvailable = true;
    return result.rows[0].version as string;
  } catch (err) {
    isDbAvailable = false;
    throw err;
  } finally {
    client.release();
  }
}
