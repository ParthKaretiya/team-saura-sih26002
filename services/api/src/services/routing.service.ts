import { routingConfig } from '../config/routing.js';
import { GraphHopperClient, RoutingEngineError } from './graphhopper.client.js';
import { riskService, type RouteRiskEvaluationContext } from './risk.service.js';
import { mlService } from './ml.service.js';
import type {
  Coordinate,
  RouteResponse,
  RouteNavigationInstruction,
  RoutingOptions,
  CandidateRouteProfile,
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
   * Calculates a single baseline route between origin and destination.
   * Preserves backward compatibility with Step 5.
   */
  async calculateRoute(
    origin: Coordinate,
    destination: Coordinate,
    options?: RoutingOptions,
  ): Promise<RouteResponse> {
    const candidates = await this.calculateCandidateRoutes(origin, destination, options);
    return candidates[0];
  }

  /**
   * Calculates all viable candidate highway paths between origin and destination.
   */
  async calculateCandidateRoutes(
    origin: Coordinate,
    destination: Coordinate,
    options?: RoutingOptions,
  ): Promise<RouteResponse[]> {
    const paths = await this.client.findCandidateRoutes(origin, destination, {
      ...options,
      alternativeRoutes: options?.alternativeRoutes ?? true,
    });

    return paths.map((path) => {
      const instructions: RouteNavigationInstruction[] = [];
      if (Array.isArray(path.instructions)) {
        for (const inst of path.instructions) {
          instructions.push({
            text: typeof inst.text === 'string' ? inst.text : 'Continue',
            distanceMeters: typeof inst.distance === 'number' ? Math.round(inst.distance) : 0,
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
    });
  }

  /**
   * Evaluates hazard risk and ML landslide predictions for a candidate route.
   */
  async profileCandidateRoute(
    route: RouteResponse,
    index: number,
    isBaseline: boolean,
    riskContext?: RouteRiskEvaluationContext,
  ): Promise<CandidateRouteProfile> {
    // 1. Step 6 Risk Intelligence Evaluation
    const riskSummary = await riskService.evaluateRouteRisk(route.geometry.coordinates, riskContext);

    // 2. Optionally enrich the route with one real coordinate-level ML result.
    // The highest-risk sampled waypoint is representative for this advisory and
    // limits ML weather/incident fetches to one per candidate route.
    let mlSummary: CandidateRouteProfile['mlSummary'];
    const highestRiskWaypoint = riskSummary.waypoints.reduce(
      (highest, waypoint) => waypoint.score > highest.score ? waypoint : highest,
      riskSummary.waypoints[0],
    );

    if (highestRiskWaypoint) {
      try {
        const [longitude, latitude] = highestRiskWaypoint.coordinates;
        const prediction = await mlService.predictForCoordinate(latitude, longitude);
        mlSummary = {
          maxProbability: prediction.probability,
          meanProbability: prediction.probability,
          riskTier: prediction.risk_tier,
          prediction: prediction.prediction,
        };
      } catch {
        // ML is advisory only; route risk remains available when inference fails.
      }
    }

    return {
      candidateId: `candidate_${index + 1}`,
      name: isBaseline ? 'Baseline Highway Route (Fastest)' : `Alternative Corridor ${index + 1}`,
      isBaseline,
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
      geometry: route.geometry,
      instructions: route.instructions,
      risk: riskSummary,
      ...(mlSummary ? { mlSummary } : {}),
      compositeCost: 0,
      normalizedCost: {
        durationScore: 0,
        distanceScore: 0,
        hazardScore: 0,
        totalCost: 0,
      },
    };
  }

  /**
   * Profiles all candidate routes and returns structured candidate profiles.
   */
  async profileCandidateRoutes(
    origin: Coordinate,
    destination: Coordinate,
    options?: RoutingOptions,
  ): Promise<CandidateRouteProfile[]> {
    const candidateRoutes = await this.calculateCandidateRoutes(origin, destination, options);
    const riskContext = await riskService.createRouteRiskEvaluationContext();
    const profiles: CandidateRouteProfile[] = [];

    for (let i = 0; i < candidateRoutes.length; i++) {
      const isBaseline = i === 0;
      const profile = await this.profileCandidateRoute(candidateRoutes[i], i, isBaseline, riskContext);
      profiles.push(profile);
    }

    return profiles;
  }
}

export const routingService = new RoutingService();
