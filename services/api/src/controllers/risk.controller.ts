import { Request, Response, NextFunction } from 'express';
import { riskService } from '../services/risk.service.js';
import { validateCoordinates, ValidationError } from '../utils/validation.js';

export async function getPointRisk(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const lat = req.query.lat ?? req.query.latitude;
    const lon = req.query.lon ?? req.query.longitude;

    if (!lat || !lon) {
      res.status(400).json({
        status: 'error',
        message: 'Latitude and longitude (lat, lon) query parameters are required.',
      });
      return;
    }

    const { latitude, longitude } = validateCoordinates(lat, lon);
    const assessment = await riskService.evaluatePointRisk(latitude, longitude);

    res.json({
      status: 'success',
      data: assessment,
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

export async function evaluateRouteRisk(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { coordinates } = req.body;

    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      res.status(400).json({
        status: 'error',
        message: 'A valid coordinates array with at least 2 [longitude, latitude] pairs is required.',
      });
      return;
    }

    // Validate each coordinate pair in RFC 7946 GeoJSON format: [longitude, latitude]
    for (let i = 0; i < coordinates.length; i++) {
      const pt = coordinates[i];
      if (!Array.isArray(pt) || pt.length < 2 || typeof pt[0] !== 'number' || typeof pt[1] !== 'number') {
        res.status(400).json({
          status: 'error',
          message: `Coordinate at index ${i} is invalid. Expected [longitude, latitude] numbers.`,
        });
        return;
      }
      const lon = pt[0];
      const lat = pt[1];
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        res.status(400).json({
          status: 'error',
          message: `Coordinate at index ${i} has out-of-range bounds: [${lon}, ${lat}].`,
        });
        return;
      }
    }

    const summary = await riskService.evaluateRouteRisk(coordinates);

    res.json({
      status: 'success',
      data: summary,
    });
  } catch (err) {
    next(err);
  }
}

export function getHazardZones(req: Request, res: Response): void {
  const geoJson = riskService.listHazardZones();
  res.json(geoJson);
}
