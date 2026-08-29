export interface NormalizedWeather {
  location: {
    latitude: number;
    longitude: number;
  };
  current: {
    temperature: number;
    precipitation: number;
    weatherCode: number;
  };
  forecast: Array<{
    time: string;
    temperature: number;
    precipitation: number;
  }>;
}

export interface OpenMeteoRawResponse {
  latitude: number;
  longitude: number;
  current?: {
    time: string;
    temperature_2m: number;
    precipitation: number;
    weather_code: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    precipitation: number[];
  };
}
