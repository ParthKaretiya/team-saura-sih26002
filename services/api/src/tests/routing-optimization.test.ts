/**
 * Step 8 routing optimization specification.
 *
 * These deterministic fixtures define the public selection and rerouting
 * behaviour before the implementation is added in subsequent commits.
 */
import assert from 'assert';
import { GraphHopperClient } from '../services/graphhopper.client.js';
import { RoutingService, routingService } from '../services/routing.service.js';
import { mlService } from '../services/ml.service.js';
import { riskService } from '../services/risk.service.js';
import type {
  CandidateRouteProfile,
  RerouteEvaluationResult,
  RoutingPreference,
  RouteOptimizationResult,
} from '../types/routing.types.js';

type OptimizationServiceContract = {
  optimizeCandidateProfiles: (
    candidates: CandidateRouteProfile[],
    preference: RoutingPreference,
  ) => RouteOptimizationResult;
  evaluateReroute: (
    currentRoute: CandidateRouteProfile,
    candidates: CandidateRouteProfile[],
  ) => RerouteEvaluationResult;
};

const optimizer = routingService as unknown as OptimizationServiceContract;

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (error) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${(error as Error).message}`);
    failed++;
  }
}

function makeCandidate(overrides: Partial<CandidateRouteProfile> = {}): CandidateRouteProfile {
  const distanceMeters = overrides.distanceMeters ?? 100_000;
  const durationSeconds = overrides.durationSeconds ?? 7_200;
  const meanScore = overrides.risk?.meanScore ?? 50;
  const maxScore = overrides.risk?.maxScore ?? meanScore;
  const hazardousSegmentCount = overrides.risk?.hazardousSegmentCount ?? 1;

  return {
    candidateId: 'candidate-baseline',
    name: 'Baseline highway route',
    isBaseline: true,
    distanceMeters,
    durationSeconds,
    geometry: {
      type: 'LineString',
      coordinates: [[91.7, 26.1], [91.9, 25.6]],
    },
    instructions: [],
    risk: {
      overallLevel: maxScore >= 75 ? 'CRITICAL' : maxScore >= 50 ? 'HIGH' : maxScore >= 25 ? 'MEDIUM' : 'LOW',
      meanScore,
      maxScore,
      hazardousSegmentCount,
      dominantTrigger: 'Steep Terrain',
      sampledWaypointsCount: 2,
      waypoints: [],
      ...overrides.risk,
    },
    compositeCost: 0,
    normalizedCost: {
      durationScore: 0,
      distanceScore: 0,
      hazardScore: 0,
      totalCost: 0,
    },
    ...overrides,
  };
}

function optimize(candidates: CandidateRouteProfile[], preference: RoutingPreference): RouteOptimizationResult {
  return optimizer.optimizeCandidateProfiles(candidates, preference);
}

async function runTests(): Promise<void> {
  console.log('==================================================');
  console.log('SauraRoute Step 8 Routing Optimization Specification');
  console.log('==================================================\n');

  const fastest = makeCandidate({
    candidateId: 'fastest',
    name: 'Fastest route',
    isBaseline: true,
    distanceMeters: 100_000,
    durationSeconds: 7_200,
    risk: { ...makeCandidate().risk, meanScore: 70, maxScore: 70, hazardousSegmentCount: 3 },
  });
  const safer = makeCandidate({
    candidateId: 'safer',
    name: 'Safer corridor',
    isBaseline: false,
    distanceMeters: 115_000,
    durationSeconds: 8_100,
    risk: { ...makeCandidate().risk, meanScore: 20, maxScore: 30, hazardousSegmentCount: 0 },
  });

  await test('profiles every GraphHopper candidate with shared route-risk context and coordinate-level ML advice', async () => {
    const mockFetch = async () => new Response(JSON.stringify({
      paths: [
        {
          distance: 100_000,
          time: 7_200_000,
          points: { type: 'LineString', coordinates: [[91.7, 26.1], [91.8, 26.0]] },
        },
        {
          distance: 110_000,
          time: 7_900_000,
          points: { type: 'LineString', coordinates: [[91.7, 26.1], [91.9, 25.9]] },
        },
      ],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    const service = new RoutingService(new GraphHopperClient(
      { baseUrl: 'http://mock-gh:8989', timeoutMs: 2_000, profile: 'car' },
      mockFetch,
    ));
    const originalCreateContext = riskService.createRouteRiskEvaluationContext;
    const originalEvaluateRouteRisk = riskService.evaluateRouteRisk;
    const originalPredictForCoordinate = mlService.predictForCoordinate;
    const sharedContext = { incidents: [], precipitationByCoordinate: new Map<string, number>() };
    let contextCalls = 0;
    const observedContexts: unknown[] = [];
    const mlCoordinates: Array<[number, number]> = [];

    riskService.createRouteRiskEvaluationContext = async () => {
      contextCalls++;
      return sharedContext;
    };
    riskService.evaluateRouteRisk = async (_coordinates, context) => {
      observedContexts.push(context);
      return {
        overallLevel: 'HIGH',
        meanScore: 52,
        maxScore: 70,
        hazardousSegmentCount: 1,
        dominantTrigger: 'Rainfall',
        sampledWaypointsCount: 2,
        waypoints: [
          { coordinates: [91.7, 26.1], distanceAlongRouteKm: 0, score: 20, level: 'LOW', primaryFactor: 'Slope' },
          { coordinates: [91.8, 26.0], distanceAlongRouteKm: 10, score: 70, level: 'HIGH', primaryFactor: 'Rainfall' },
        ],
      };
    };
    mlService.predictForCoordinate = async (latitude, longitude) => {
      mlCoordinates.push([latitude, longitude]);
      return {
        prediction: 'LANDSLIDE_RISK',
        probability: 0.7,
        risk_tier: 'HIGH',
        confidence: 0.4,
        modelVersion: 'test-model',
        location: { latitude, longitude },
        features: {
          precipitation_24h_mm: 60,
          slope_degrees: 30,
          distance_to_hotspot_km: 2,
          active_incident_count_15km: 0,
          elevation_m: 750,
          soil_saturation_index: 0.7,
        },
        featureImportance: {},
      };
    };

    try {
      const profiles = await service.profileCandidateRoutes(
        { latitude: 26.1, longitude: 91.7 },
        { latitude: 25.9, longitude: 91.9 },
      );

      assert.strictEqual(profiles.length, 2);
      assert.strictEqual(profiles[0].candidateId, 'candidate_1');
      assert.strictEqual(profiles[0].isBaseline, true);
      assert.strictEqual(profiles[1].candidateId, 'candidate_2');
      assert.strictEqual(profiles[1].risk.meanScore, 52);
      assert.strictEqual(profiles[1].risk.hazardousSegmentCount, 1);
      assert.strictEqual(profiles[1].risk.dominantTrigger, 'Rainfall');
      assert.strictEqual(profiles[1].mlSummary?.maxProbability, 0.7);
      assert.strictEqual(contextCalls, 1);
      assert.deepStrictEqual(observedContexts, [sharedContext, sharedContext]);
      assert.deepStrictEqual(mlCoordinates, [[26.0, 91.8], [26.0, 91.8]]);
    } finally {
      riskService.createRouteRiskEvaluationContext = originalCreateContext;
      riskService.evaluateRouteRisk = originalEvaluateRouteRisk;
      mlService.predictForCoordinate = originalPredictForCoordinate;
    }
  });

  await test('profiles preserve candidate route metrics and explainable risk inputs', () => {
    const result = optimize([fastest, safer], 'BALANCED');
    const profiled = result.candidates.find((candidate) => candidate.candidateId === 'safer');

    assert.ok(profiled);
    assert.strictEqual(profiled.distanceMeters, 115_000);
    assert.strictEqual(profiled.durationSeconds, 8_100);
    assert.strictEqual(profiled.risk.meanScore, 20);
    assert.strictEqual(profiled.risk.hazardousSegmentCount, 0);
  });

  await test('composite scoring is deterministic for identical candidate inputs', () => {
    const first = optimize([fastest, safer], 'BALANCED');
    const second = optimize([fastest, safer], 'BALANCED');

    assert.deepStrictEqual(first.candidates.map((candidate) => candidate.normalizedCost), second.candidates.map((candidate) => candidate.normalizedCost));
    assert.strictEqual(first.selectedCandidateId, second.selectedCandidateId);
  });

  await test('FASTEST selects the baseline fastest candidate', () => {
    const result = optimize([fastest, safer], 'FASTEST');
    assert.strictEqual(result.selectedCandidateId, 'fastest');
    assert.strictEqual(result.optimization.strategy, 'SPEED_BASELINE');
  });

  await test('SAFEST selects a materially safer route within the allowed detour', () => {
    const result = optimize([fastest, safer], 'SAFEST');
    assert.strictEqual(result.selectedCandidateId, 'safer');
    assert.match(result.optimization.selectionReason, /hazard|safer|risk/i);
  });

  await test('BALANCED combines travel and hazard costs', () => {
    const result = optimize([fastest, safer], 'BALANCED');
    assert.strictEqual(result.selectedCandidateId, 'safer');
    assert.ok(result.selectedRoute.normalizedCost.totalCost < result.baselineRoute.normalizedCost.totalCost);
  });

  await test('detour constraints reject a low-risk route that exceeds the configured bound', () => {
    const excessiveDetour = makeCandidate({
      candidateId: 'excessive-detour',
      name: 'Excessive detour',
      isBaseline: false,
      distanceMeters: 145_000,
      durationSeconds: 10_500,
      risk: { ...makeCandidate().risk, meanScore: 0, maxScore: 0, hazardousSegmentCount: 0 },
    });

    const result = optimize([fastest, excessiveDetour], 'SAFEST');
    assert.strictEqual(result.selectedCandidateId, 'fastest');
  });

  await test('ties resolve deterministically by baseline, duration, distance, then candidate id', () => {
    const equalAlternative = makeCandidate({
      candidateId: 'alternative-z',
      name: 'Equal alternative',
      isBaseline: false,
      distanceMeters: fastest.distanceMeters,
      durationSeconds: fastest.durationSeconds,
      risk: fastest.risk,
    });

    const result = optimize([equalAlternative, fastest], 'BALANCED');
    assert.strictEqual(result.selectedCandidateId, 'fastest');
  });

  await test('a single candidate degrades gracefully without fabricating alternatives', () => {
    const result = optimize([fastest], 'SAFEST');
    assert.strictEqual(result.candidatesCount, 1);
    assert.strictEqual(result.selectedCandidateId, 'fastest');
    assert.strictEqual(result.baselineRoute.candidateId, 'fastest');
    assert.match(result.optimization.selectionReason, /only|alternative|baseline/i);
  });

  await test('missing risk intelligence retains a baseline route with an explicit degraded explanation', () => {
    const unknownRisk = makeCandidate({
      candidateId: 'unknown-risk',
      name: 'Risk unavailable',
      risk: {
        ...makeCandidate().risk,
        meanScore: Number.NaN,
        maxScore: Number.NaN,
        hazardousSegmentCount: 0,
      },
    });

    const result = optimize([unknownRisk], 'BALANCED');
    assert.strictEqual(result.selectedCandidateId, 'unknown-risk');
    assert.match(result.optimization.selectionReason, /degrad|unavailable|baseline/i);
  });

  await test('an active CRITICAL hazard receives exclusion or a strong enough penalty to avoid the candidate', () => {
    const critical = makeCandidate({
      candidateId: 'critical',
      name: 'Critical incident corridor',
      isBaseline: true,
      durationSeconds: 7_000,
      risk: { ...makeCandidate().risk, meanScore: 55, maxScore: 100, hazardousSegmentCount: 1, dominantTrigger: 'Active Incident' },
    });

    const result = optimize([critical, safer], 'SAFEST');
    assert.strictEqual(result.selectedCandidateId, 'safer');
  });

  await test('reroute is recommended when the current route crosses the configured risk threshold and a safer candidate qualifies', () => {
    const result = optimizer.evaluateReroute(fastest, [fastest, safer]);
    assert.strictEqual(result.rerouteRecommended, true);
    assert.strictEqual(result.recommendedRoute?.candidateId, 'safer');
  });

  await test('reroute is not recommended when the current route remains acceptable', () => {
    const acceptable = makeCandidate({
      candidateId: 'acceptable',
      risk: { ...makeCandidate().risk, meanScore: 20, maxScore: 20, hazardousSegmentCount: 0 },
    });

    const result = optimizer.evaluateReroute(acceptable, [acceptable, safer]);
    assert.strictEqual(result.rerouteRecommended, false);
    assert.strictEqual(result.recommendedRoute, undefined);
  });

  console.log('\n==================================================');
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log('==================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch((error) => {
  console.error('Fatal test runner failure:', error);
  process.exit(1);
});
