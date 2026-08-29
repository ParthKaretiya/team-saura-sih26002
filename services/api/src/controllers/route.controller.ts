import { Request, Response, NextFunction } from 'express';
import { routingService, RoutingEngineError } from '../services/routing.service.js';
import { validateCoordinates, ValidationError } from '../utils/validation.js';

export async function getRoute(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const originLat = req.query.originLat ?? req.query.origin_lat ?? req.query.originLatitude;
    const originLon = req.query.originLon ?? req.query.origin_lon ?? req.query.originLongitude;
    const destLat = req.query.destinationLat ?? req.query.dest_lat ?? req.query.destinationLatitude;
    const destLon = req.query.destinationLon ?? req.query.dest_lon ?? req.query.destinationLongitude;

    if (!originLat || !originLon || !destLat || !destLon) {
      res.status(400).json({
        status: 'error',
        message: 'Origin and destination coordinates (originLat, originLon, destinationLat, destinationLon) are all required.',
      });
      return;
    }

    const origin = validateCoordinates(originLat, originLon);
    const destination = validateCoordinates(destLat, destLon);

    const route = await routingService.calculateRoute(origin, destination);

    res.json({
      status: 'success',
      data: route,
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(err.statusCode).json({
        status: 'error',
        message: err.message,
      });
      return;
    }
    if (err instanceof RoutingEngineError) {
      res.status(err.statusCode).json({
        status: 'error',
        code: err.code,
        message: err.message,
      });
      return;
    }
    next(err);
  }
}
