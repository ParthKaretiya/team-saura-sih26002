/**
 * All GeoJSON positions use [longitude, latitude] ordering (RFC 7946).
 * API request coordinates remain named latitude/longitude objects to avoid
 * positional ambiguity at the HTTP boundary.
 */
export type GeoJsonPosition = [longitude: number, latitude: number];

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RouteRequest {
  origin: Coordinate;
  destination: Coordinate;
}

export interface RouteGeometry {
  type: 'LineString';
  coordinates: GeoJsonPosition[];
}

export interface RouteNavigationInstruction {
  text: string;
  distanceMeters: number;
  durationSeconds: number;
}

export interface RouteResponse {
  origin: Coordinate;
  destination: Coordinate;
  distanceMeters: number;
  durationSeconds: number;
  geometry: RouteGeometry;
  instructions: RouteNavigationInstruction[];
}

/**
 * Reserved service-level extension point for a later approved risk-aware
 * routing phase. The Step 5 HTTP API exposes only the standard route.
 */
export interface RoutingOptions {
  profile?: string;
  customModel?: Record<string, unknown>;
}
