import { Request, Response } from 'express';
import { testConnection } from '../db/connection.js';
import { routingService } from '../services/routing.service.js';

export async function healthCheck(_req: Request, res: Response): Promise<void> {
  let dbStatus = 'disconnected';
  let postgisVersion: string | null = null;

  try {
    postgisVersion = await testConnection();
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  let routingStatus: { status: 'connected' | 'unreachable'; url: string; latencyMs?: number; error?: string };
  try {
    routingStatus = await routingService.checkHealth();
  } catch (err) {
    routingStatus = {
      status: 'unreachable',
      url: 'http://localhost:8989',
      error: (err as Error).message,
    };
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    postgis: postgisVersion,
    routing: routingStatus,
  });
}
