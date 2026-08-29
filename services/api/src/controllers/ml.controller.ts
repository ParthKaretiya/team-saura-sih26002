import { Request, Response, NextFunction } from 'express';
import { mlService } from '../services/ml.service.js';
import { validateCoordinates, ValidationError } from '../utils/validation.js';

export async function getMLPrediction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const lat = req.query.lat ?? req.query.latitude;
    const lon = req.query.lon ?? req.query.longitude;

    if (!lat || !lon) {
      res.status(400).json({
        status: 'error',
        message: 'Query parameters lat and lon are required.',
      });
      return;
    }

    const { latitude, longitude } = validateCoordinates(lat, lon);
    const prediction = await mlService.predictForCoordinate(latitude, longitude);

    res.json({
      status: 'success',
      data: prediction,
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

export async function postMLPrediction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { latitude, longitude, features } = req.body;

    if (features) {
      // Direct raw feature evaluation
      if (
        typeof features.precipitation_24h_mm !== 'number' ||
        typeof features.slope_degrees !== 'number' ||
        typeof features.distance_to_hotspot_km !== 'number'
      ) {
        res.status(400).json({
          status: 'error',
          message: 'features object must include precipitation_24h_mm, slope_degrees, and distance_to_hotspot_km as numbers.',
        });
        return;
      }

      const prediction = await mlService.predictFromFeatures({
        precipitation_24h_mm: features.precipitation_24h_mm,
        slope_degrees: features.slope_degrees,
        distance_to_hotspot_km: features.distance_to_hotspot_km,
        active_incident_count_15km: features.active_incident_count_15km ?? 0,
        elevation_m: features.elevation_m ?? 500.0,
        soil_saturation_index: features.soil_saturation_index ?? 0.5,
      });

      res.json({
        status: 'success',
        data: prediction,
      });
      return;
    }

    if (latitude !== undefined && longitude !== undefined) {
      const coords = validateCoordinates(latitude, longitude);
      const prediction = await mlService.predictForCoordinate(coords.latitude, coords.longitude);
      res.json({
        status: 'success',
        data: prediction,
      });
      return;
    }

    res.status(400).json({
      status: 'error',
      message: 'Request body must contain either coordinates (latitude, longitude) or a features object.',
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

export function getMLModelInfo(req: Request, res: Response): void {
  const info = mlService.getModelInfo();
  res.json({
    status: 'success',
    data: info,
  });
}
