import { Coordinate, RoutingOptions } from '../types/routing.types.js';
import { OPTIMIZATION_CONFIG } from '../config/optimization.config.js';

export interface GraphHopperInstruction {
  text?: unknown;
  distance?: unknown;
  time?: unknown;
}

export interface GraphHopperPath {
  distance: number;
  time: number;
  points: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  instructions?: GraphHopperInstruction[];
}

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export class RoutingEngineError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: 'ROUTING_ENGINE_UNAVAILABLE' | 'ROUTING_ENGINE_TIMEOUT' | 'ROUTE_NOT_FOUND' | 'ROUTING_ENGINE_INVALID_RESPONSE',
  ) {
    super(message);
    this.name = 'RoutingEngineError';
  }
}

export class GraphHopperClient {
  constructor(
    private readonly config: {
      baseUrl: string;
      timeoutMs: number;
      profile: string;
    },
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async findRoute(
    origin: Coordinate,
    destination: Coordinate,
    options: RoutingOptions = {},
  ): Promise<GraphHopperPath> {
    const paths = await this.findCandidateRoutes(origin, destination, options);
    return paths[0];
  }

  async findCandidateRoutes(
    origin: Coordinate,
    destination: Coordinate,
    options: RoutingOptions = {},
  ): Promise<GraphHopperPath[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    const profile = options.profile || this.config.profile;

    try {
      const response = await this.fetchImpl(
        ...this.createRequest(origin, destination, profile, options, controller.signal)
      );

      if (!response.ok) {
        if ([400, 404].includes(response.status)) {
          throw new RoutingEngineError(
            'No routable road path was found for the requested coordinates.',
            422,
            'ROUTE_NOT_FOUND',
          );
        }
        throw new RoutingEngineError(
          `GraphHopper returned HTTP ${response.status}.`,
          502,
          'ROUTING_ENGINE_UNAVAILABLE',
        );
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new RoutingEngineError(
          'GraphHopper returned invalid JSON.',
          502,
          'ROUTING_ENGINE_INVALID_RESPONSE',
        );
      }

      return this.parseCandidatePaths(payload);
    } catch (error) {
      if (error instanceof RoutingEngineError) throw error;
      if ((error as Error).name === 'AbortError') {
        throw new RoutingEngineError(
          `GraphHopper did not respond within ${this.config.timeoutMs}ms.`,
          504,
          'ROUTING_ENGINE_TIMEOUT',
        );
      }
      throw new RoutingEngineError(
        'GraphHopper is unavailable. Start the local routing service and try again.',
        503,
        'ROUTING_ENGINE_UNAVAILABLE',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private createRequest(
    origin: Coordinate,
    destination: Coordinate,
    profile: string,
    options: RoutingOptions,
    signal: AbortSignal,
  ): [string | URL, RequestInit] {
    if (options.customModel) {
      return [
        new URL('/route', this.config.baseUrl),
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            points: [
              [origin.longitude, origin.latitude],
              [destination.longitude, destination.latitude],
            ],
            profile,
            points_encoded: false,
            instructions: true,
            'ch.disable': true,
            custom_model: options.customModel,
          }),
          signal,
        },
      ];
    }

    const url = new URL('/route', this.config.baseUrl);
    url.searchParams.append('point', `${origin.latitude},${origin.longitude}`);
    url.searchParams.append('point', `${destination.latitude},${destination.longitude}`);
    url.searchParams.set('profile', profile);
    url.searchParams.set('points_encoded', 'false');
    url.searchParams.set('instructions', 'true');

    if (options.alternativeRoutes) {
      const maxPaths = options.maxPaths || OPTIMIZATION_CONFIG.graphHopperAlternatives.maxPaths;
      url.searchParams.set('algorithm', 'alternative_route');
      url.searchParams.set('alternative_route.max_paths', String(maxPaths));
      url.searchParams.set(
        'alternative_route.max_weight_factor',
        String(OPTIMIZATION_CONFIG.graphHopperAlternatives.maxWeightFactor)
      );
      url.searchParams.set(
        'alternative_route.max_share_factor',
        String(OPTIMIZATION_CONFIG.graphHopperAlternatives.maxShareFactor)
      );
    }

    return [url, { signal }];
  }

  private parseCandidatePaths(payload: unknown): GraphHopperPath[] {
    const rawPaths = (payload as { paths?: unknown[] })?.paths;
    if (!Array.isArray(rawPaths) || rawPaths.length === 0) {
      throw new RoutingEngineError(
        'GraphHopper returned an invalid route payload with no paths.',
        502,
        'ROUTING_ENGINE_INVALID_RESPONSE',
      );
    }

    const validatedPaths: GraphHopperPath[] = [];

    for (const raw of rawPaths) {
      const path = raw as Partial<GraphHopperPath>;
      const coordinates = path?.points?.coordinates;

      if (
        !path ||
        !Number.isFinite(path.distance) ||
        !Number.isFinite(path.time) ||
        path.distance! <= 0 ||
        path.time! <= 0 ||
        path.points?.type !== 'LineString' ||
        !Array.isArray(coordinates) ||
        coordinates.length < 2 ||
        !coordinates.every(point => Array.isArray(point) && point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]))
      ) {
        continue;
      }
      validatedPaths.push(path as GraphHopperPath);
    }

    if (validatedPaths.length === 0) {
      throw new RoutingEngineError(
        'GraphHopper returned no geometrically valid paths.',
        502,
        'ROUTING_ENGINE_INVALID_RESPONSE',
      );
    }

    return validatedPaths;
  }
}
