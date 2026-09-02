import { routingConfig } from '../config/routing.js';
import { OPTIMIZATION_CONFIG, type OptimizationWeights } from '../config/optimization.config.js';
import { RISK_CONFIG } from '../config/risk.config.js';
import { GraphHopperClient, RoutingEngineError } from './graphhopper.client.js';
import { riskService, type RouteRiskEvaluationContext } from './risk.service.js';
import { mlService } from './ml.service.js';
import type {
  Coordinate,
  RouteResponse,
  RouteNavigationInstruction,
  RoutingOptions,
  CandidateRouteProfile,
  RerouteEvaluationResult,
  RouteOptimizationResult,
  RoutingPreference,
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

  async optimizeRoute(
    origin: Coordinate,
    destination: Coordinate,
    preference: RoutingPreference = 'BALANCED',
    options?: RoutingOptions,
  ): Promise<RouteOptimizationResult> {
    const candidates = await this.profileCandidateRoutes(origin, destination, options);
    return this.optimizeCandidateProfiles(candidates, preference);
  }

  /**
   * Re-evaluates an explicitly supplied current route against freshly acquired
   * candidates. It uses only the application risk inputs already available to
   * SauraRoute; it does not assume live GPS tracking or external hazard feeds.
   */
  async evaluateRerouteForRoute(
    currentRoute: RouteResponse,
    origin: Coordinate,
    destination: Coordinate,
    options?: RoutingOptions,
  ): Promise<RerouteEvaluationResult> {
    const riskContext = await riskService.createRouteRiskEvaluationContext();
    const currentProfile = await this.profileCandidateRoute(currentRoute, 0, true, riskContext);
    const candidateRoutes = await this.calculateCandidateRoutes(origin, destination, options);
    const candidates = await Promise.all(candidateRoutes.map((route, index) =>
      this.profileCandidateRoute(route, index, index === 0, riskContext),
    ));

    return this.evaluateReroute(currentProfile, candidates);
  }

  evaluateReroute(
    currentRoute: CandidateRouteProfile,
    candidates: CandidateRouteProfile[],
  ): RerouteEvaluationResult {
    const safetyIntelligence = this.safetyIntelligenceFor([currentRoute, ...candidates]);
    const currentRouteSummary = {
      riskLevel: currentRoute.risk.overallLevel,
      meanRiskScore: currentRoute.risk.meanScore,
      maxRiskScore: currentRoute.risk.maxScore,
      hazardousSegmentCount: currentRoute.risk.hazardousSegmentCount,
    };

    if (!this.hasUsableRisk(currentRoute) || safetyIntelligence.status === 'DEGRADED') {
      return {
        rerouteRecommended: false,
        reason: 'Rerouting is not recommended because safety intelligence is incomplete.',
        currentRoute: currentRouteSummary,
        evaluatedCandidatesCount: candidates.length,
        safetyIntelligence,
      };
    }

    const currentExposure = this.hazardExposure(currentRoute);
    const currentHasCriticalIncident = this.hasCriticalActiveIncident(currentRoute);
    if (!currentHasCriticalIncident && currentExposure < OPTIMIZATION_CONFIG.rerouting.triggerScore) {
      return {
        rerouteRecommended: false,
        reason: 'Rerouting is not recommended because the current route remains below the configured risk threshold.',
        currentRoute: currentRouteSummary,
        evaluatedCandidatesCount: candidates.length,
        safetyIntelligence,
      };
    }

    const optimization = this.optimizeCandidateProfiles(candidates, 'SAFEST');
    const recommendedRoute = optimization.selectedRoute;
    const improvement = this.riskReductionRatio(currentRoute, recommendedRoute);
    const qualifies = recommendedRoute.candidateId !== currentRoute.candidateId
      && improvement >= OPTIMIZATION_CONFIG.rerouting.minRerouteImprovement
      && optimization.safetyIntelligence.status === 'AVAILABLE';

    if (!qualifies) {
      return {
        rerouteRecommended: false,
        reason: 'Rerouting is not recommended because no candidate provides the configured safety improvement within the allowed detour.',
        currentRoute: currentRouteSummary,
        evaluatedCandidatesCount: candidates.length,
        safetyIntelligence,
      };
    }

    return {
      rerouteRecommended: true,
      reason: currentHasCriticalIncident
        ? 'Rerouting is recommended because the current route has a critical active-incident hazard and a safer detour is available.'
        : 'Rerouting is recommended because a candidate provides the configured safety improvement within the allowed detour.',
      currentRoute: currentRouteSummary,
      recommendedRoute,
      metrics: {
        hazardReductionPercent: Math.round(improvement * 1_000) / 10,
        additionalDistanceMeters: Math.max(0, recommendedRoute.distanceMeters - currentRoute.distanceMeters),
        additionalDurationSeconds: Math.max(0, recommendedRoute.durationSeconds - currentRoute.durationSeconds),
      },
      evaluatedCandidatesCount: candidates.length,
      safetyIntelligence,
    };
  }

  /**
   * Selects a candidate using normalized travel cost and the existing Step 6
   * route-risk aggregate. ML remains advisory and does not affect selection.
   */
  optimizeCandidateProfiles(
    candidates: CandidateRouteProfile[],
    preference: RoutingPreference,
  ): RouteOptimizationResult {
    if (candidates.length === 0) {
      throw new Error('At least one candidate route is required for optimization.');
    }

    const baseline = candidates.find((candidate) => candidate.isBaseline)
      ?? this.sortByTravelCost(candidates)[0];
    const baselineHasRisk = this.hasUsableRisk(baseline);
    const weights = this.getWeights(preference);
    const scoredCandidates = candidates.map((candidate) => this.withNormalizedCost(candidate, baseline, weights));
    const scoredBaseline = scoredCandidates.find((candidate) => candidate.candidateId === baseline.candidateId)!;

    if (!baselineHasRisk) {
      return this.buildOptimizationResult(
        scoredBaseline,
        scoredBaseline,
        scoredCandidates,
        'SPEED_BASELINE',
        'Fastest baseline selected because safety intelligence is unavailable.',
        preference,
      );
    }

    if (preference === 'FASTEST') {
      const selected = this.sortByTravelCost(scoredCandidates)[0];
      const reason = candidates.length === 1
        ? 'Fastest baseline selected because GraphHopper returned only one candidate route.'
        : selected.candidateId === scoredBaseline.candidateId
          ? 'Fastest route selected because it has the shortest estimated duration.'
          : 'Fastest route selected because it has the shortest estimated duration among the returned candidates.';

      return this.buildOptimizationResult(
        selected,
        scoredBaseline,
        scoredCandidates,
        'SPEED_BASELINE',
        reason,
        preference,
      );
    }

    if (candidates.length === 1) {
      return this.buildOptimizationResult(
        scoredBaseline,
        scoredBaseline,
        scoredCandidates,
        'SPEED_BASELINE',
        'Fastest baseline selected because GraphHopper returned only one candidate route.',
        preference,
      );
    }

    const detourEligible = scoredCandidates.filter((candidate) => this.isWithinDetourLimit(candidate, scoredBaseline));
    const riskEligible = detourEligible.filter((candidate) => this.hasUsableRisk(candidate));
    const nonCriticalCandidates = riskEligible.filter((candidate) => !this.hasCriticalActiveIncident(candidate));
    const eligible = nonCriticalCandidates.length > 0 ? nonCriticalCandidates : riskEligible;
    const allEligibleAreCritical = eligible.length > 0 && nonCriticalCandidates.length === 0;

    if (eligible.length === 0) {
      return this.buildOptimizationResult(
        scoredBaseline,
        scoredBaseline,
        scoredCandidates,
        'SPEED_BASELINE',
        'Fastest baseline selected because no alternative remained within the configured detour limit with usable safety intelligence.',
        preference,
      );
    }

    if (preference === 'SAFEST') {
      if (this.hazardExposure(scoredBaseline) < OPTIMIZATION_CONFIG.constraints.highRiskThresholdScore) {
        return this.buildOptimizationResult(
          scoredBaseline,
          scoredBaseline,
          scoredCandidates,
          'SPEED_BASELINE',
          'Fastest baseline selected because its hazard exposure does not meet the configured detour-evaluation threshold.',
          preference,
        );
      }

      const materiallySafer = eligible.filter((candidate) =>
        candidate.candidateId === scoredBaseline.candidateId
        || this.riskReductionRatio(scoredBaseline, candidate) >= OPTIMIZATION_CONFIG.constraints.minRiskReductionRatio,
      );
      const selected = this.sortByOptimizationCost(materiallySafer.length > 0 ? materiallySafer : [scoredBaseline])[0];

      if (selected.candidateId === scoredBaseline.candidateId) {
        return this.buildOptimizationResult(
          selected,
          scoredBaseline,
          scoredCandidates,
          'SPEED_BASELINE',
          allEligibleAreCritical
            ? 'Fastest baseline selected because every detour-eligible candidate has a critical active-incident hazard.'
            : 'Fastest route selected because alternatives did not provide sufficient risk reduction within the allowed detour.',
          preference,
        );
      }

      return this.buildOptimizationResult(
        selected,
        scoredBaseline,
        scoredCandidates,
        'SAFETY_OPTIMIZED',
        'Safer route selected because it materially reduced hazard exposure while remaining within the allowed detour.',
        preference,
      );
    }

    const selected = this.sortByOptimizationCost(eligible)[0];
    if (selected.candidateId === scoredBaseline.candidateId) {
      return this.buildOptimizationResult(
        selected,
        scoredBaseline,
        scoredCandidates,
        'SPEED_BASELINE',
        allEligibleAreCritical
          ? 'Fastest baseline selected because every detour-eligible candidate has a critical active-incident hazard.'
          : 'Fastest route selected because alternatives did not provide a better configured time-risk tradeoff within the allowed detour.',
        preference,
      );
    }

    return this.buildOptimizationResult(
      selected,
      scoredBaseline,
      scoredCandidates,
      'SAFETY_OPTIMIZED',
      'Balanced route selected because it provided the best configured time-risk tradeoff within the allowed detour.',
      preference,
    );
  }

  private getWeights(preference: RoutingPreference): OptimizationWeights {
    if (preference === 'FASTEST') return OPTIMIZATION_CONFIG.speedOnlyWeights;
    if (preference === 'SAFEST') return OPTIMIZATION_CONFIG.safetyFirstWeights;
    return OPTIMIZATION_CONFIG.defaultWeights;
  }

  private withNormalizedCost(
    candidate: CandidateRouteProfile,
    baseline: CandidateRouteProfile,
    weights: OptimizationWeights,
  ): CandidateRouteProfile {
    if (!this.hasUsableRisk(candidate) || !this.hasUsableRisk(baseline)) {
      return candidate;
    }

    const durationScore = candidate.durationSeconds / baseline.durationSeconds;
    const distanceScore = candidate.distanceMeters / baseline.distanceMeters;
    const hazardScore = this.hazardExposure(candidate) / 100;
    const totalCost = weights.duration * durationScore
      + weights.distance * distanceScore
      + weights.hazard * hazardScore;

    return {
      ...candidate,
      compositeCost: Math.round(totalCost * 10_000) / 10_000,
      normalizedCost: {
        durationScore: Math.round(durationScore * 10_000) / 10_000,
        distanceScore: Math.round(distanceScore * 10_000) / 10_000,
        hazardScore: Math.round(hazardScore * 10_000) / 10_000,
        totalCost: Math.round(totalCost * 10_000) / 10_000,
      },
    };
  }

  private hasUsableRisk(candidate: CandidateRouteProfile): boolean {
    return Number.isFinite(candidate.risk.meanScore)
      && Number.isFinite(candidate.risk.maxScore)
      && Number.isFinite(candidate.risk.hazardousSegmentCount);
  }

  private hazardExposure(candidate: CandidateRouteProfile): number {
    // Matches the existing route-level risk classification aggregate.
    return candidate.risk.maxScore * 0.6 + candidate.risk.meanScore * 0.4;
  }

  private isWithinDetourLimit(candidate: CandidateRouteProfile, baseline: CandidateRouteProfile): boolean {
    return candidate.durationSeconds / baseline.durationSeconds <= OPTIMIZATION_CONFIG.constraints.maxDetourRatio
      && candidate.distanceMeters / baseline.distanceMeters <= OPTIMIZATION_CONFIG.constraints.maxDetourRatio;
  }

  private hasCriticalActiveIncident(candidate: CandidateRouteProfile): boolean {
    return candidate.risk.dominantTrigger === 'Active Incident'
      && candidate.risk.maxScore >= RISK_CONFIG.boundaries.criticalMin;
  }

  private riskReductionRatio(baseline: CandidateRouteProfile, candidate: CandidateRouteProfile): number {
    const baselineExposure = this.hazardExposure(baseline);
    if (baselineExposure <= 0) return 0;
    return (baselineExposure - this.hazardExposure(candidate)) / baselineExposure;
  }

  private sortByTravelCost(candidates: CandidateRouteProfile[]): CandidateRouteProfile[] {
    return [...candidates].sort((left, right) =>
      left.durationSeconds - right.durationSeconds
      || left.distanceMeters - right.distanceMeters
      || left.candidateId.localeCompare(right.candidateId),
    );
  }

  private sortByOptimizationCost(candidates: CandidateRouteProfile[]): CandidateRouteProfile[] {
    const epsilon = 0.0001;
    return [...candidates].sort((left, right) => {
      const costDifference = left.normalizedCost.totalCost - right.normalizedCost.totalCost;
      if (Math.abs(costDifference) > epsilon) return costDifference;

      return this.hazardExposure(left) - this.hazardExposure(right)
        || Number(right.isBaseline) - Number(left.isBaseline)
        || left.durationSeconds - right.durationSeconds
        || left.distanceMeters - right.distanceMeters
        || left.candidateId.localeCompare(right.candidateId);
    });
  }

  private buildOptimizationResult(
    selectedRoute: CandidateRouteProfile,
    baselineRoute: CandidateRouteProfile,
    candidates: CandidateRouteProfile[],
    strategy: RouteOptimizationResult['optimization']['strategy'],
    selectionReason: string,
    preference: RoutingPreference = 'BALANCED',
  ): RouteOptimizationResult {
    const [originLongitude, originLatitude] = baselineRoute.geometry.coordinates[0];
    const [destinationLongitude, destinationLatitude] = baselineRoute.geometry.coordinates.at(-1)!;
    const riskReduction = this.hasUsableRisk(selectedRoute) && this.hasUsableRisk(baselineRoute)
      ? Math.max(0, this.riskReductionRatio(baselineRoute, selectedRoute) * 100)
      : 0;

    return {
      origin: { latitude: originLatitude, longitude: originLongitude },
      destination: { latitude: destinationLatitude, longitude: destinationLongitude },
      selectedCandidateId: selectedRoute.candidateId,
      selectedRoute,
      baselineRoute,
      candidatesCount: candidates.length,
      candidates,
      preference,
      safetyIntelligence: this.safetyIntelligenceFor(candidates),
      optimization: {
        strategy,
        selectionReason,
        hazardReductionPercent: Math.round(riskReduction * 10) / 10,
        additionalDistanceKm: Math.max(0, Math.round((selectedRoute.distanceMeters - baselineRoute.distanceMeters) / 100) / 10),
        additionalDurationMinutes: Math.max(0, Math.round((selectedRoute.durationSeconds - baselineRoute.durationSeconds) / 6) / 10),
      },
    };
  }

  private safetyIntelligenceFor(candidates: CandidateRouteProfile[]): RouteOptimizationResult['safetyIntelligence'] {
    if (candidates.some((candidate) => !this.hasUsableRisk(candidate))) {
      return {
        status: 'DEGRADED',
        reason: 'One or more route risk assessments were incomplete.',
      };
    }

    return { status: 'AVAILABLE' };
  }
}

export const routingService = new RoutingService();
