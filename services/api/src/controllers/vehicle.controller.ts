import { Request, Response, NextFunction } from 'express';
import { vehicleService } from '../services/vehicle.service.js';
import { validateCoordinates, ValidationError } from '../utils/validation.js';

export async function listVehicles(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const geoJson = await vehicleService.listVehicles();
    res.json(geoJson);
  } catch (err) {
    next(err);
  }
}

export async function updateVehicleLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { latitude, longitude, speed, heading } = req.body;

    const { latitude: validLat, longitude: validLon } = validateCoordinates(latitude, longitude);

    let validSpeed = 0.0;
    if (speed !== undefined) {
      validSpeed = typeof speed === 'number' ? speed : parseFloat(String(speed));
      if (isNaN(validSpeed) || validSpeed < 0) {
        res.status(400).json({
          status: 'error',
          message: 'Speed must be a non-negative number.',
        });
        return;
      }
    }

    let validHeading = 0.0;
    if (heading !== undefined) {
      validHeading = typeof heading === 'number' ? heading : parseFloat(String(heading));
      if (isNaN(validHeading) || validHeading < 0 || validHeading > 360) {
        res.status(400).json({
          status: 'error',
          message: 'Heading must be a number between 0 and 360 degrees.',
        });
        return;
      }
    }

    const updated = await vehicleService.updateLocation(id, {
      latitude: validLat,
      longitude: validLon,
      speed: validSpeed,
      heading: validHeading,
    });

    if (!updated) {
      res.status(404).json({
        status: 'error',
        message: `Vehicle with ID or code "${id}" was not found.`,
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
