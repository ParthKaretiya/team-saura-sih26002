import { routingConfig } from '../config/routing.js';
import { GraphHopperClient, RoutingEngineError } from './graphhopper.client.js';
import type {
  Coordinate,
  RouteResponse,
  RouteNavigationInstruction,
  RoutingOptions,
} from '../types/routing.types.js';

export { RoutingEngineError };

export class RoutingService {
  private readonly client: GraphHopperClient;

  constructor(client?: GraphHopperClient) {
    this.client =
      client ??
      new GraphHopperClient({
        baseUrl: routingConfig.graphHopperUrl,
        timeoutMs: routingConfig.graphHopperTimeoutMs,
        profile: routingConfig.profile,
      });
  }

  /**
   * Calculates a route between origin and destination.
   * Returns a normalized SauraRoute response regardless of the
   * underlying routing engine implementation.
   */
  async calculateRoute(
    origin: Coordinate,
    destination: Coordinate,
    options?: RoutingOptions,
  ): Promise<RouteResponse> {
    const path = await this.client.findRoute(origin, destination, options);

    // Normalize navigation instructions
    const instructions: RouteNavigationInstruction[] = [];
    if (Array.isArray(path.instructions)) {
      for (const inst of path.instructions) {
        instructions.push({
          text: typeof inst.text === 'string' ? inst.text : 'Continue',
          distanceMeters: typeof inst.distance === 'number' ? inst.distance : 0,
          durationSeconds: typeof inst.time === 'number' ? Math.round(inst.time / 1000) : 0,
        });
      }
    }

    return {
      origin,
      destination,
      distanceMeters: Math.round(path.distance),
      durationSeconds: Math.round(path.time / 1000), // GraphHopper returns ms
      geometry: {
        type: 'LineString',
        coordinates: path.points.coordinates.map(
          (coord) => [coord[0], coord[1]] as [number, number],
        ),
      },
      instructions,
    };
  }
}

export const routingService = new RoutingService();
