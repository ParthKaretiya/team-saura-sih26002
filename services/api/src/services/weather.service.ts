import { NormalizedWeather, OpenMeteoRawResponse } from '../types/weather.types.js';

export class WeatherServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 502) {
    super(message);
    this.name = 'WeatherServiceError';
    this.statusCode = statusCode;
  }
}

export class WeatherService {
  /**
   * Fetches weather from Open-Meteo for the requested coordinate and normalizes it.
   */
  async getWeatherForCoordinate(latitude: number, longitude: number): Promise<NormalizedWeather> {
    // 1. Coordinate Validation
    if (typeof latitude !== 'number' || isNaN(latitude) || latitude < -90 || latitude > 90) {
      throw new WeatherServiceError(`Invalid latitude: must be between -90 and 90, got ${latitude}`, 400);
    }
    if (typeof longitude !== 'number' || isNaN(longitude) || longitude < -180 || longitude > 180) {
      throw new WeatherServiceError(`Invalid longitude: must be between -180 and 180, got ${longitude}`, 400);
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,precipitation,weather_code&hourly=precipitation,temperature_2m&forecast_days=1`;

    let response: Response;
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(6000), // 6 second timeout
      });
    } catch (err) {
      throw new WeatherServiceError(
        `External weather service unreachable: ${(err as Error).message}`,
        503
      );
    }

    if (!response.ok) {
      throw new WeatherServiceError(
        `External weather service responded with HTTP ${response.status}`,
        502
      );
    }

    let data: OpenMeteoRawResponse;
    try {
      data = await response.json() as OpenMeteoRawResponse;
    } catch (err) {
      throw new WeatherServiceError(
        `Failed to parse weather service response: ${(err as Error).message}`,
        502
      );
    }

    // Normalize hourly forecast items
    const forecast: Array<{ time: string; temperature: number; precipitation: number }> = [];
    if (data.hourly && Array.isArray(data.hourly.time)) {
      const times = data.hourly.time;
      const temps = data.hourly.temperature_2m || [];
      const rains = data.hourly.precipitation || [];

      for (let i = 0; i < Math.min(times.length, 24); i++) {
        forecast.push({
          time: times[i],
          temperature: temps[i] ?? 0.0,
          precipitation: rains[i] ?? 0.0,
        });
      }
    }

    // Return clean normalized response strictly using requested coordinates
    return {
      location: {
        latitude,
        longitude,
      },
      current: {
        temperature: data.current?.temperature_2m ?? 0.0,
        precipitation: data.current?.precipitation ?? 0.0,
        weatherCode: data.current?.weather_code ?? 0,
      },
      forecast,
    };
  }
}

export const weatherService = new WeatherService();
