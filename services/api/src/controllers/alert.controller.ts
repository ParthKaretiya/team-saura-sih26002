import type { NextFunction, Request, Response } from 'express';
import { alertService } from '../services/alert.service.js';

export async function listAlerts(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ status: 'success', data: await alertService.listAlerts() });
  } catch (error) {
    next(error);
  }
}
