import { Request, Response, NextFunction } from 'express';
import { incidentService } from '../services/incident.service.js';
import {
  validateCoordinates,
  validateIncidentType,
  validateSeverity,
  validateIncidentStatus,
  ValidationError,
} from '../utils/validation.js';

export async function createIncident(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { type, severity, description, latitude, longitude } = req.body;

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'A non-empty "description" string is required.',
      });
      return;
    }

    const validatedType = validateIncidentType(type);
    const validatedSeverity = validateSeverity(severity);
    const { latitude: validLat, longitude: validLon } = validateCoordinates(latitude, longitude);

    const record = await incidentService.createIncident({
      type: validatedType,
      severity: validatedSeverity,
      description: description.trim(),
      latitude: validLat,
      longitude: validLon,
    });

    res.status(201).json({
      status: 'success',
      data: record,
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(err.statusCode).json({
        status: 'error',
        message: err.message,
      });
      return;
    }
    next(err);
  }
}

export async function listIncidents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, severity, type } = req.query;

    const filters: { status?: string; severity?: string; type?: string } = {};
    if (status) filters.status = validateIncidentStatus(status);
    if (severity) filters.severity = validateSeverity(severity);
    if (type) filters.type = validateIncidentType(type);

    const geoJson = await incidentService.listIncidents(filters);
    res.json(geoJson);
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(err.statusCode).json({
        status: 'error',
        message: err.message,
      });
      return;
    }
    next(err);
  }
}

export async function updateIncidentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({
        status: 'error',
        message: 'A "status" field is required in request body.',
      });
      return;
    }

    const validStatus = validateIncidentStatus(status);
    const updated = await incidentService.updateIncidentStatus(id, validStatus);

    if (!updated) {
      res.status(404).json({
        status: 'error',
        message: `Incident with ID "${id}" was not found.`,
      });
      return;
    }

    res.json({
      status: 'success',
      data: updated,
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(err.statusCode).json({
        status: 'error',
        message: err.message,
      });
      return;
    }
    next(err);
  }
}
