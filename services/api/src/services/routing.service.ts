import { routingConfig } from '../config/routing.js';
import { OPTIMIZATION_CONFIG, type OptimizationWeights } from '../config/optimization.config.js';
import { RISK_CONFIG } from '../config/risk.config.js';
import { ACCESSIBILITY_CONFIG } from '../config/accessibility.config.js';
import { GraphHopperClient, RoutingEngineError } from './graphhopper.client.js';
import { riskService, type RouteRiskEvaluationContext } from './risk.service.js';
import { mlService } from './ml.service.js';
import { accessibilityService, routeToCorridorDistanceMeters } from './accessibility.service.js';
import type { AccessibilityRecord } from '../types/accessibility.types.js';
import type {
  Coordinate,
  RouteGeometry,
  RouteResponse,
  RouteNavigationInstruction,
  RoutingOptions,
  CandidateRouteProfile,
  RerouteEvaluationResult,
  RerouteExplanation,
  RouteOptimizationResult,
  RouteSelectionExplanation,
  RoutingPreference,
  CandidateAccessibility,
  RouteAccessibilitySummary,
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

  async checkHealth(): Promise<{
    status: 'connected' | 'unreachable';
    url: string;
    latencyMs?: number;
    error?: string;
  }> {
    return this.client.checkHealth();
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
    const candidateRoutes = await this.calculateCandidateRoutes(origin, destination, options);
    const corridors = await accessibilityService.listAccessibility();
    const accessibility = this.evaluateRouteAccessibility(candidateRoutes, corridors);
    const riskContext = await riskService.createRouteRiskEvaluationContext();
    const candidates = await Promise.all(candidateRoutes.map(async (route, index) => ({
      ...(await this.profileCandidateRoute(route, index, index === 0, riskContext)),
      accessibility: accessibility[index],
    })));
    const result = this.optimizeCandidateProfiles(candidates, preference);

    return {
      ...result,
      accessibility: this.accessibilitySummaryFor(candidates),
    };
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

    // Read corridor data once for this reroute request and reuse it for the
    // current route and every alternative.
    const corridors = await accessibilityService.listAccessibility();
    const [annotatedCurrentRoute] = this.annotateAccessibility([currentProfile], corridors);
    const annotatedCandidates = this.annotateAccessibility(candidates, corridors);
    return this.evaluateReroute(
      annotatedCurrentRoute,
      this.eligibleAccessibilityCandidates(annotatedCandidates),
      this.accessibilitySummaryFor([annotatedCurrentRoute, ...annotatedCandidates]),
    );
  }

  /**
   * Evaluates corridor accessibility for each candidate and returns the subset
   * that is eligible for normal optimization. CLOSED corridors hard-exclude a
   * candidate (when a usable alternative exists); RESTRICTED and OPEN corridors
   * do not exclude. Each candidate is annotated with its accessibility state.
   */
  async evaluateAccessibility(
    candidates: CandidateRouteProfile[],
    corridors?: AccessibilityRecord[],
  ): Promise<CandidateRouteProfile[]> {
    return this.annotateAccessibility(candidates, corridors ?? await accessibilityService.listAccessibility());
  }

  async filterAccessibilityEligible(
    candidates: CandidateRouteProfile[],
    corridors?: AccessibilityRecord[],
  ): Promise<CandidateRouteProfile[]> {
    const annotated = await this.evaluateAccessibility(candidates, corridors);
    return this.eligibleAccessibilityCandidates(annotated);
  }

  /**
   * Annotates a single candidate with its corridor accessibility state.
   * CLOSED intersections mark the candidate ineligible; RESTRICTED is recorded
   * for surfacing but does not exclude.
   */
  private annotateAccessibility(
    candidates: CandidateRouteProfile[],
    corridors: AccessibilityRecord[],
  ): CandidateRouteProfile[] {
    return candidates.map((candidate) => {
      return { ...candidate, accessibility: this.accessibilityForGeometry(candidate.geometry, corridors) };
    });
  }

  private evaluateRouteAccessibility(
    routes: RouteResponse[],
    corridors: AccessibilityRecord[],
  ): CandidateAccessibility[] {
    return routes.map((route) => this.accessibilityForGeometry(route.geometry, corridors));
  }

  private accessibilityForGeometry(
    geometry: RouteGeometry,
    corridors: AccessibilityRecord[],
  ): CandidateAccessibility {
    const affectedCorridors = corridors.filter((corridor) =>
      routeToCorridorDistanceMeters(geometry, corridor.geometry)
        <= ACCESSIBILITY_CONFIG.routing.intersectionToleranceMeters,
    );
    const hasClosedCorridor = affectedCorridors.some((corridor) => corridor.status === 'CLOSED');
    const hasRestrictedCorridor = affectedCorridors.some((corridor) => corridor.status === 'RESTRICTED');

    return {
      status: hasClosedCorridor ? 'CLOSED' : hasRestrictedCorridor ? 'RESTRICTED' : 'ACCESSIBLE',
      isEligible: !hasClosedCorridor,
      affectedCorridors,
      exclusionReason: hasClosedCorridor
        ? 'Candidate intersects one or more CLOSED corridors.'
        : undefined,
    };
  }

  private eligibleAccessibilityCandidates(candidates: CandidateRouteProfile[]): CandidateRouteProfile[] {
    const eligible = candidates.filter((candidate) => candidate.accessibility?.isEligible !== false);
    // A best-effort route is retained only when no closure-free candidate was
    // returned by GraphHopper. Its CLOSED state remains explicit in the result.
    return eligible.length > 0 ? eligible : candidates;
  }

  /**
   * Builds an overall accessibility summary for a set of annotated candidates.
   */
  private accessibilitySummaryFor(
    candidates: Array<Pick<CandidateRouteProfile, 'accessibility'>>,
  ): RouteAccessibilitySummary | undefined {
    const accessibility = candidates.map((candidate) => candidate.accessibility);
    const affectedCorridors = Array.from(
      new Map(accessibility.flatMap((item) => item?.affectedCorridors ?? []).map((corridor) => [corridor.id, corridor])).values(),
    );
    const anyEligible = accessibility.some((item) => item?.isEligible !== false);
    const hasClosedCorridor = affectedCorridors.some((corridor) => corridor.status === 'CLOSED');
    const hasRestrictedCorridor = affectedCorridors.some((corridor) => corridor.status === 'RESTRICTED');
    if (!hasClosedCorridor && !hasRestrictedCorridor) {
      return undefined;
    }

    if (hasClosedCorridor && !anyEligible) {
      return {
        status: 'ALL_CANDIDATES_CLOSED',
        affectedCorridors,
        reason: 'All available candidates intersect CLOSED corridors; no closure-free alternative was found.',
      };
    }

    if (hasRestrictedCorridor) {
      return {
        status: 'RESTRICTED',
        affectedCorridors,
      };
    }

    return {
      status: 'ACCESSIBLE',
      affectedCorridors,
    };
  }

  evaluateReroute(
    currentRoute: CandidateRouteProfile,
    candidates: CandidateRouteProfile[],
    accessibility?: RouteAccessibilitySummary,
  ): RerouteEvaluationResult {
    const safetyIntelligence = this.safetyIntelligenceFor([currentRoute, ...candidates]);
    const routeAccessibility = accessibility ?? this.accessibilitySummaryFor([currentRoute, ...candidates]);
    const currentRouteSummary = {
      riskLevel: currentRoute.risk.overallLevel,
      meanRiskScore: currentRoute.risk.meanScore,
      maxRiskScore: currentRoute.risk.maxScore,
      hazardousSegmentCount: currentRoute.risk.hazardousSegmentCount,
      ...(currentRoute.accessibility ? { accessibility: currentRoute.accessibility } : {}),
    };

    if (currentRoute.accessibility?.status === 'CLOSED'
      && routeAccessibility?.status === 'ALL_CANDIDATES_CLOSED') {
      return {
        rerouteRecommended: false,
        reason: 'Rerouting is unavailable because the current route and all available candidates intersect CLOSED corridors; no closure-free alternative was found.',
        currentRoute: currentRouteSummary,
        evaluatedCandidatesCount: candidates.length,
        safetyIntelligence,
        accessibility: routeAccessibility,
      };
    }

    if (!this.hasUsableRisk(currentRoute) || safetyIntelligence.status === 'DEGRADED') {
      return {
        rerouteRecommended: false,
        reason: 'Rerouting is not recommended because safety intelligence is incomplete.',
        currentRoute: currentRouteSummary,
        evaluatedCandidatesCount: candidates.length,
        safetyIntelligence,
        ...(routeAccessibility ? { accessibility: routeAccessibility } : {}),
      };
    }

    const currentExposure = this.hazardExposure(currentRoute);
    const currentHasCriticalIncident = this.hasCriticalActiveIncident(currentRoute);
    if (currentRoute.accessibility?.status !== 'CLOSED'
      && !currentHasCriticalIncident
      && currentExposure < OPTIMIZATION_CONFIG.rerouting.triggerScore) {
      return {
        rerouteRecommended: false,
        reason: 'Rerouting is not recommended because the current route remains below the configured risk threshold.',
        currentRoute: currentRouteSummary,
        evaluatedCandidatesCount: candidates.length,
        safetyIntelligence,
        ...(routeAccessibility ? { accessibility: routeAccessibility } : {}),
        explanation: {
          summary: 'Rerouting is not recommended because the current route remains below the configured risk threshold.',
          currentRiskScore: Math.round(currentExposure * 10) / 10,
          currentRiskLevel: currentRoute.risk.overallLevel,
          triggerReason: `Current route hazard exposure (${Math.round(currentExposure * 10) / 10}/100) is below the trigger score of ${OPTIMIZATION_CONFIG.rerouting.triggerScore}.`,
        },
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
        ...(routeAccessibility ? { accessibility: routeAccessibility } : {}),
        explanation: {
          summary: 'Rerouting is not recommended because no candidate provides the configured safety improvement within the allowed detour.',
          currentRiskScore: Math.round(currentExposure * 10) / 10,
          currentRiskLevel: currentRoute.risk.overallLevel,
          triggerReason: 'Alternative routes did not achieve the required safety improvement ratio or exceeded the detour bound.',
        },
      };
    }

    const additionalDistanceMeters = Math.max(0, recommendedRoute.distanceMeters - currentRoute.distanceMeters);
    const additionalDurationSeconds = Math.max(0, recommendedRoute.durationSeconds - currentRoute.durationSeconds);
    const additionalDistanceKm = Math.round((additionalDistanceMeters / 1000) * 10) / 10;
    const additionalDurationMinutes = Math.round((additionalDurationSeconds / 60) * 10) / 10;
    const detourRatio = currentRoute.durationSeconds > 0
      ? Math.round((recommendedRoute.durationSeconds / currentRoute.durationSeconds) * 100) / 100
      : 1.0;
    const hazardReductionPercent = Math.round(improvement * 1_000) / 10;
    const recommendedExposure = this.hazardExposure(recommendedRoute);

    const triggerReason = currentHasCriticalIncident
      ? 'Critical active incident detected along current route.'
      : currentRoute.accessibility?.status === 'CLOSED'
        ? 'Current route intersects a CLOSED road corridor.'
        : `Current route hazard exposure (${Math.round(currentExposure * 10) / 10}/100) exceeded trigger threshold (${OPTIMIZATION_CONFIG.rerouting.triggerScore}).`;

    const summary = currentHasCriticalIncident
      ? 'Rerouting is recommended because the current route has a critical active-incident hazard and a safer detour is available.'
      : 'Rerouting is recommended because a candidate provides the configured safety improvement within the allowed detour.';

    return {
      rerouteRecommended: true,
      reason: summary,
      currentRoute: currentRouteSummary,
      recommendedRoute,
      metrics: {
        hazardReductionPercent,
        additionalDistanceMeters,
        additionalDurationSeconds,
        additionalDistanceKm,
        additionalDurationMinutes,
        detourRatio,
      },
      evaluatedCandidatesCount: candidates.length,
      safetyIntelligence,
      ...(routeAccessibility ? { accessibility: routeAccessibility } : {}),
      explanation: {
        summary,
        currentRiskScore: Math.round(currentExposure * 10) / 10,
        currentRiskLevel: currentRoute.risk.overallLevel,
        recommendedRiskScore: Math.round(recommendedExposure * 10) / 10,
        recommendedRiskLevel: recommendedRoute.risk.overallLevel,
        hazardReductionPercent,
        additionalDistanceKm,
        additionalDurationMinutes,
        detourRatio,
        triggerReason,
      },
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

    if (scoredCandidates.every((candidate) => candidate.accessibility?.status === 'CLOSED')) {
      const selected = this.sortByTravelCost(scoredCandidates)[0];
      return this.buildOptimizationResult(
        selected,
        scoredBaseline,
        scoredCandidates,
        'SPEED_BASELINE',
        'Best-effort route selected because all available candidates intersect CLOSED corridors; no closure-free alternative was found.',
        preference,
      );
    }

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

    const explanation = this.buildSelectionExplanation(
      selectedRoute,
      baselineRoute,
      strategy,
      selectionReason,
      preference,
    );

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
        explanation,
      },
      accessibility: this.accessibilitySummaryFor(candidates),
    };
  }

  private buildSelectionExplanation(
    selectedRoute: CandidateRouteProfile,
    baselineRoute: CandidateRouteProfile,
    strategy: RouteOptimizationResult['optimization']['strategy'],
    selectionReason: string,
    preference: RoutingPreference,
  ): RouteSelectionExplanation {
    const hasRisk = this.hasUsableRisk(selectedRoute) && this.hasUsableRisk(baselineRoute);
    const baselineExposure = hasRisk ? this.hazardExposure(baselineRoute) : 0;
    const selectedExposure = hasRisk ? this.hazardExposure(selectedRoute) : 0;
    const riskReduction = hasRisk && baselineExposure > 0
      ? Math.max(0, Math.round(((baselineExposure - selectedExposure) / baselineExposure) * 1000) / 10)
      : 0;

    const detourMeters = Math.max(0, selectedRoute.distanceMeters - baselineRoute.distanceMeters);
    const detourSeconds = Math.max(0, selectedRoute.durationSeconds - baselineRoute.durationSeconds);
    const detourKm = Math.round((detourMeters / 1000) * 10) / 10;
    const detourMinutes = Math.round((detourSeconds / 60) * 10) / 10;
    const detourRatio = baselineRoute.durationSeconds > 0
      ? Math.round((selectedRoute.durationSeconds / baselineRoute.durationSeconds) * 100) / 100
      : 1.0;

    const accessibilityStatus = selectedRoute.accessibility?.status ?? 'ACCESSIBLE';
    const factors: string[] = [];

    if (selectedRoute.isBaseline) {
      factors.push(`Baseline route maintains direct highway travel (${(selectedRoute.distanceMeters / 1000).toFixed(1)} km, ${Math.round(selectedRoute.durationSeconds / 60)} min).`);
      if (hasRisk) {
        factors.push(`Baseline hazard exposure is ${Math.round(selectedExposure * 10) / 10}/100 (${selectedRoute.risk.overallLevel}).`);
      }
    } else {
      if (riskReduction > 0) {
        factors.push(`Reduces hazard exposure from ${Math.round(baselineExposure * 10) / 10} to ${Math.round(selectedExposure * 10) / 10} (-${riskReduction}%).`);
      }
      factors.push(`Detour is +${detourKm} km (+${detourMinutes} min), detour ratio ${detourRatio}x (within ${OPTIMIZATION_CONFIG.constraints.maxDetourRatio}x limit).`);
    }

    if (selectedRoute.accessibility?.status === 'RESTRICTED') {
      factors.push('Traverses RESTRICTED corridor with active travel advisory.');
    } else if (selectedRoute.accessibility?.status === 'CLOSED') {
      factors.push('Traverses CLOSED corridor under best-effort routing (no open alternative available).');
    } else if (baselineRoute.accessibility?.status === 'CLOSED' && !selectedRoute.isBaseline) {
      factors.push('Bypasses CLOSED baseline highway corridor.');
    }

    const corridorSummary = selectedRoute.accessibility?.affectedCorridors?.length
      ? selectedRoute.accessibility.affectedCorridors.map((c) => `${c.name} (${c.status})`).join(', ')
      : undefined;

    return {
      summary: selectionReason,
      selectedRouteName: selectedRoute.name,
      isBaseline: selectedRoute.isBaseline,
      baselineRiskScore: Math.round(baselineExposure * 10) / 10,
      baselineRiskLevel: baselineRoute.risk.overallLevel,
      selectedRiskScore: Math.round(selectedExposure * 10) / 10,
      selectedRiskLevel: selectedRoute.risk.overallLevel,
      hazardReductionPercent: riskReduction,
      detourKm,
      detourMinutes,
      detourRatio,
      accessibilityStatus,
      corridorStatusSummary: corridorSummary,
      factors,
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
