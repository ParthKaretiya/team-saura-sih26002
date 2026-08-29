import { Request, Response } from 'express';
import { testConnection } from '../db/connection.js';

export async function healthCheck(_req: Request, res: Response): Promise<void> {
  let dbStatus = 'disconnected';
  let postgisVersion: string | null = null;

  try {
    postgisVersion = await testConnection();
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    postgis: postgisVersion,
  });
}
