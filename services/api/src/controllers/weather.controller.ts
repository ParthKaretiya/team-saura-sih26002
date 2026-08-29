import { Request, Response, NextFunction } from 'express';
import { weatherService, WeatherServiceError } from '../services/weather.service.js';

export async function getWeather(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    res.status(400).json({
      status: 'error',
      message: 'Both "lat" and "lon" query parameters are required.',
    });
    return;
  }

  const latitude = parseFloat(lat as string);
  const longitude = parseFloat(lon as string);

  if (isNaN(latitude) || isNaN(longitude)) {
    res.status(400).json({
      status: 'error',
      message: '"lat" and "lon" query parameters must be valid decimal numbers.',
    });
    return;
  }

  try {
    const weather = await weatherService.getWeatherForCoordinate(latitude, longitude);
    res.json({
      status: 'success',
      data: weather,
    });
  } catch (err) {
    if (err instanceof WeatherServiceError) {
      res.status(err.statusCode).json({
        status: 'error',
        message: err.message,
      });
      return;
    }
    next(err);
  }
}
