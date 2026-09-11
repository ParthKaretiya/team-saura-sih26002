/**
 * Comprehensive Routing Reliability, Explanation & Decision Engine Specification.
 *
 * Covers:
 *   1. GraphHopper availability, connectivity, and failure modes
 *   2. Guwahati -> Shillong benchmark pipeline audit
 *   3. Route selection explanation contract & factor breakdown
 *   4. Rerouting reliability, triggers, and detour constraints
 *   5. Edge cases: validation, unroutable points, closed corridors, degraded ML
 */
import assert from 'assert';
import { GraphHopperClient, RoutingEngineError } from '../services/graphhopper.client.js';
import { RoutingService } from '../services/routing.service.js';
import { validateCoordinates, ValidationError } from '../utils/validation.js';
import type {
  CandidateRouteProfile,
  RouteResponse,
  RoutingPreference,
} from '../types/routing.types.js';

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

function makeMockPath(distance = 95_992, timeMs = 5_274_000, points = [[91.7362, 26.1445], [91.8012, 25.9021], [91.8933, 25.5788]]) {
  return {
    distance,
    time: timeMs,
    points: {
      type: 'LineString' as const,
      coordinates: points as [number, number][],
    },
    instructions: [
      { text: 'Depart on GS Road / NH-40', distance: 5000, time: 300000 },
      { text: 'Continue towards Shillong', distance: distance - 5000, time: timeMs - 300000 },
    ],
  };
}

function makeTestCandidate(overrides: Partial<CandidateRouteProfile> = {}): CandidateRouteProfile {
  const distanceMeters = overrides.distanceMeters ?? 96_000;
  const durationSeconds = overrides.durationSeconds ?? 5_400;
  const meanScore = overrides.risk?.meanScore ?? 35;
  const maxScore = overrides.risk?.maxScore ?? meanScore;

  return {
    candidateId: overrides.candidateId ?? 'candidate_1',
    name: overrides.name ?? 'Baseline Highway Route (Fastest)',
    isBaseline: overrides.isBaseline ?? true,
    distanceMeters,
    durationSeconds,
    geometry: overrides.geometry ?? {
      type: 'LineString',
      coordinates: [[91.7362, 26.1445], [91.8933, 25.5788]],
    },
    instructions: overrides.instructions ?? [],
    risk: {
      overallLevel: maxScore >= 75 ? 'CRITICAL' : maxScore >= 50 ? 'HIGH' : maxScore >= 25 ? 'MEDIUM' : 'LOW',
      meanScore,
      maxScore,
      hazardousSegmentCount: overrides.risk?.hazardousSegmentCount ?? 0,
      dominantTrigger: overrides.risk?.dominantTrigger ?? 'Slope',
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

async function runReliabilityTests(): Promise<void> {
  console.log('==================================================');
  console.log('SauraRoute Routing Reliability & Decision Engine Tests');
  console.log('==================================================\n');

  // -------------------------------------------------------------------------
  // 1. GraphHopper Availability & Failure Modes
  // -------------------------------------------------------------------------
  console.log('--- 1. GraphHopper Availability & Failure Modes ---');

  await test('GraphHopperClient: offline server throws 503 ROUTING_ENGINE_UNAVAILABLE with start script hint', async () => {
    const mockFetch = async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:8989');
    };
    const client = new GraphHopperClient(
      { baseUrl: 'http://localhost:8989', timeoutMs: 2000, profile: 'car' },
      mockFetch,
    );

    await assert.rejects(
      async () => client.findCandidateRoutes({ latitude: 26.1445, longitude: 91.7362 }, { latitude: 25.5788, longitude: 91.8933 }),
      (err: Error) => {
        return err instanceof RoutingEngineError
          && err.statusCode === 503
          && err.code === 'ROUTING_ENGINE_UNAVAILABLE'
          && err.message.includes('http://localhost:8989')
          && err.message.includes('start-graphhopper.ps1');
      },
    );
  });

  await test('GraphHopperClient: timeout throws 504 ROUTING_ENGINE_TIMEOUT', async () => {
    const mockFetch = async () => {
      const err = new Error('The operation was aborted.');
      err.name = 'AbortError';
      throw err;
    };
    const client = new GraphHopperClient(
      { baseUrl: 'http://localhost:8989', timeoutMs: 1000, profile: 'car' },
      mockFetch,
    );

    await assert.rejects(
      async () => client.findCandidateRoutes({ latitude: 26.1445, longitude: 91.7362 }, { latitude: 25.5788, longitude: 91.8933 }),
      (err: Error) => {
        return err instanceof RoutingEngineError
          && err.statusCode === 504
          && err.code === 'ROUTING_ENGINE_TIMEOUT';
      },
    );
  });

  await test('GraphHopperClient: invalid JSON throws 502 ROUTING_ENGINE_INVALID_RESPONSE', async () => {
    const mockFetch = async () => new Response('<html>502 Bad Gateway</html>', { status: 200 });
    const client = new GraphHopperClient(
      { baseUrl: 'http://localhost:8989', timeoutMs: 2000, profile: 'car' },
      mockFetch,
    );

    await assert.rejects(
      async () => client.findCandidateRoutes({ latitude: 26.1445, longitude: 91.7362 }, { latitude: 25.5788, longitude: 91.8933 }),
      (err: Error) => {
        return err instanceof RoutingEngineError
          && err.statusCode === 502
          && err.code === 'ROUTING_ENGINE_INVALID_RESPONSE';
      },
    );
  });

  await test('GraphHopperClient: 404 unroutable coordinates throws 422 ROUTE_NOT_FOUND', async () => {
    const mockFetch = async () => new Response(JSON.stringify({ message: 'Point 0 not found' }), { status: 404 });
    const client = new GraphHopperClient(
      { baseUrl: 'http://localhost:8989', timeoutMs: 2000, profile: 'car' },
      mockFetch,
    );

    await assert.rejects(
      async () => client.findCandidateRoutes({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 1 }),
      (err: Error) => {
        return err instanceof RoutingEngineError
          && err.statusCode === 422
          && err.code === 'ROUTE_NOT_FOUND';
      },
    );
  });

  await test('GraphHopperClient: checkHealth probes endpoint and reports connected status', async () => {
    const mockFetch = async () => new Response(JSON.stringify({ status: 'OK' }), { status: 200 });
    const client = new GraphHopperClient(
      { baseUrl: 'http://localhost:8989', timeoutMs: 2000, profile: 'car' },
      mockFetch,
    );

    const health = await client.checkHealth();
    assert.strictEqual(health.status, 'connected');
    assert.strictEqual(health.url, 'http://localhost:8989');
    assert.ok(typeof health.latencyMs === 'number');
  });

  await test('GraphHopperClient: checkHealth handles offline gracefully with unreachable status', async () => {
    const mockFetch = async () => { throw new Error('ECONNREFUSED'); };
    const client = new GraphHopperClient(
      { baseUrl: 'http://localhost:8989', timeoutMs: 2000, profile: 'car' },
      mockFetch,
    );

    const health = await client.checkHealth();
    assert.strictEqual(health.status, 'unreachable');
    assert.strictEqual(health.url, 'http://localhost:8989');
    assert.ok(health.error);
  });

  // -------------------------------------------------------------------------
  // 2. Guwahati -> Shillong Benchmark Pipeline Audit
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Benchmark Pipeline Audit (Guwahati → Shillong) ---');

  await test('Pipeline: calculateRoute produces valid GeoJSON LineString and instructions', async () => {
    const mockPath = makeMockPath();
    const mockFetch = async () => new Response(JSON.stringify({ paths: [mockPath] }), { status: 200 });
    const client = new GraphHopperClient(
      { baseUrl: 'http://localhost:8989', timeoutMs: 2000, profile: 'car' },
      mockFetch,
    );
    const service = new RoutingService(client);

    const origin = { latitude: 26.1445, longitude: 91.7362 };
    const destination = { latitude: 25.5788, longitude: 91.8933 };
    const route: RouteResponse = await service.calculateRoute(origin, destination);

    assert.strictEqual(route.distanceMeters, 95992);
    assert.strictEqual(route.durationSeconds, 5274);
    assert.strictEqual(route.geometry.type, 'LineString');
    assert.deepStrictEqual(route.geometry.coordinates[0], [91.7362, 26.1445]);
    assert.deepStrictEqual(route.geometry.coordinates.at(-1), [91.8933, 25.5788]);
    assert.strictEqual(route.instructions.length, 2);
    assert.strictEqual(route.instructions[0].text, 'Depart on GS Road / NH-40');
  });

  // -------------------------------------------------------------------------
  // 3. Route Explanation & Intelligence Breakdown (Priority 3)
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Route Explanation & Decision Intelligence ---');

  await test('Explanation: SAFEST selection provides complete explanation structure with factors', () => {
    const baseline = makeTestCandidate({
      candidateId: 'baseline',
      name: 'Baseline Highway Route (Fastest)',
      isBaseline: true,
      distanceMeters: 96_000,
      durationSeconds: 5_274,
      risk: { ...makeTestCandidate().risk, meanScore: 55, maxScore: 68 },
    });
    const safer = makeTestCandidate({
      candidateId: 'safer_alt',
      name: 'Alternative Corridor 2',
      isBaseline: false,
      distanceMeters: 104_000,
      durationSeconds: 5_900,
      risk: { ...makeTestCandidate().risk, meanScore: 22, maxScore: 28 },
    });

    const service = new RoutingService();
    const result = service.optimizeCandidateProfiles([baseline, safer], 'SAFEST');

    assert.strictEqual(result.selectedCandidateId, 'safer_alt');
    assert.strictEqual(result.optimization.strategy, 'SAFETY_OPTIMIZED');
    assert.ok(result.optimization.explanation, 'explanation must be populated');

    const exp = result.optimization.explanation;
    assert.strictEqual(exp.selectedRouteName, 'Alternative Corridor 2');
    assert.strictEqual(exp.isBaseline, false);
    assert.ok(exp.baselineRiskScore > exp.selectedRiskScore);
    assert.ok(exp.hazardReductionPercent > 0);
    assert.ok(exp.detourKm > 0);
    assert.ok(exp.detourMinutes > 0);
    assert.ok(exp.detourRatio > 1.0 && exp.detourRatio <= 1.35);
    assert.strictEqual(exp.accessibilityStatus, 'ACCESSIBLE');
    assert.ok(Array.isArray(exp.factors) && exp.factors.length >= 2);
  });

  await test('Explanation: FASTEST baseline retains direct travel factors', () => {
    const baseline = makeTestCandidate({
      candidateId: 'baseline',
      name: 'Baseline Highway Route (Fastest)',
      isBaseline: true,
      distanceMeters: 96_000,
      durationSeconds: 5_274,
      risk: { ...makeTestCandidate().risk, meanScore: 20, maxScore: 25 },
    });
    const alternative = makeTestCandidate({
      candidateId: 'alt',
      name: 'Alternative Corridor',
      isBaseline: false,
      distanceMeters: 110_000,
      durationSeconds: 6_200,
      risk: { ...makeTestCandidate().risk, meanScore: 18, maxScore: 22 },
    });

    const service = new RoutingService();
    const result = service.optimizeCandidateProfiles([baseline, alternative], 'FASTEST');

    assert.strictEqual(result.selectedCandidateId, 'baseline');
    assert.strictEqual(result.optimization.strategy, 'SPEED_BASELINE');
    assert.ok(result.optimization.explanation);
    assert.strictEqual(result.optimization.explanation.isBaseline, true);
    assert.strictEqual(result.optimization.explanation.detourKm, 0);
    assert.strictEqual(result.optimization.explanation.detourMinutes, 0);
    assert.strictEqual(result.optimization.explanation.detourRatio, 1.0);
  });

  // -------------------------------------------------------------------------
  // 4. Rerouting Reliability & Triggers (Priority 4)
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Rerouting Reliability & Triggers ---');

  await test('Reroute: recommends reroute with structured metrics when hazard increases above trigger', () => {
    const currentHighRisk = makeTestCandidate({
      candidateId: 'current',
      name: 'Current Highway Corridor',
      isBaseline: true,
      distanceMeters: 96_000,
      durationSeconds: 5_274,
      risk: { ...makeTestCandidate().risk, meanScore: 60, maxScore: 75, overallLevel: 'HIGH' },
    });
    const saferAlternative = makeTestCandidate({
      candidateId: 'safer_bypass',
      name: 'Alternative Bypass Corridor',
      isBaseline: false,
      distanceMeters: 106_000,
      durationSeconds: 5_800,
      risk: { ...makeTestCandidate().risk, meanScore: 18, maxScore: 22, overallLevel: 'LOW' },
    });

    const service = new RoutingService();
    const result = service.evaluateReroute(currentHighRisk, [currentHighRisk, saferAlternative]);

    assert.strictEqual(result.rerouteRecommended, true);
    assert.strictEqual(result.recommendedRoute?.candidateId, 'safer_bypass');
    assert.ok(result.metrics);
    assert.ok(result.metrics.hazardReductionPercent > 50);
    assert.ok(result.metrics.additionalDistanceKm! > 0);
    assert.ok(result.metrics.additionalDurationMinutes! > 0);
    assert.ok(result.metrics.detourRatio! <= 1.35);

    assert.ok(result.explanation);
    assert.strictEqual(result.explanation.recommendedRiskLevel, 'LOW');
    assert.strictEqual(result.explanation.currentRiskLevel, 'HIGH');
    assert.ok(result.explanation.triggerReason.includes('hazard exposure'));
  });

  await test('Reroute: critical active incident triggers reroute even with small detour', () => {
    const incidentRoute = makeTestCandidate({
      candidateId: 'current_incident',
      name: 'Current Corridor with Landslide',
      isBaseline: true,
      distanceMeters: 96_000,
      durationSeconds: 5_274,
      risk: {
        ...makeTestCandidate().risk,
        meanScore: 50,
        maxScore: 90,
        dominantTrigger: 'Active Incident',
        overallLevel: 'CRITICAL',
      },
    });
    const cleanRoute = makeTestCandidate({
      candidateId: 'clean_alt',
      name: 'Clear Corridor',
      isBaseline: false,
      distanceMeters: 102_000,
      durationSeconds: 5_600,
      risk: {
        ...makeTestCandidate().risk,
        meanScore: 25,
        maxScore: 30,
        dominantTrigger: 'Slope',
        overallLevel: 'MEDIUM',
      },
    });

    const service = new RoutingService();
    const result = service.evaluateReroute(incidentRoute, [incidentRoute, cleanRoute]);

    assert.strictEqual(result.rerouteRecommended, true);
    assert.strictEqual(result.recommendedRoute?.candidateId, 'clean_alt');
    assert.ok(result.reason.includes('critical active-incident hazard'));
    assert.ok(result.explanation?.triggerReason.includes('Critical active incident'));
  });

  await test('Reroute: does NOT recommend reroute when current route hazard is acceptable', () => {
    const safeRoute = makeTestCandidate({
      candidateId: 'current_safe',
      risk: { ...makeTestCandidate().risk, meanScore: 20, maxScore: 25 },
    });
    const alternative = makeTestCandidate({
      candidateId: 'alt',
      risk: { ...makeTestCandidate().risk, meanScore: 15, maxScore: 20 },
    });

    const service = new RoutingService();
    const result = service.evaluateReroute(safeRoute, [safeRoute, alternative]);

    assert.strictEqual(result.rerouteRecommended, false);
    assert.strictEqual(result.recommendedRoute, undefined);
    assert.ok(result.explanation);
    assert.ok(result.explanation.triggerReason.includes('below the trigger'));
  });

  // -------------------------------------------------------------------------
  // 5. Edge Cases & Boundary Handling (Priority 5)
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Edge Cases & Boundary Handling ---');

  await test('Validation: rejects latitude out of bounds (> 90)', () => {
    assert.throws(
      () => validateCoordinates(95.0, 91.7362),
      (err) => err instanceof ValidationError && (err as ValidationError).message.includes('Invalid latitude'),
    );
  });

  await test('Validation: rejects longitude out of bounds (> 180)', () => {
    assert.throws(
      () => validateCoordinates(26.1445, 185.0),
      (err) => err instanceof ValidationError && (err as ValidationError).message.includes('Invalid longitude'),
    );
  });

  await test('Validation: rejects NaN or non-numeric coordinates', () => {
    assert.throws(
      () => validateCoordinates('invalid', 91.7362),
      (err) => err instanceof ValidationError,
    );
  });

  await test('Detour constraint: rejects alternative that exceeds 1.35x detour limit', () => {
    const baseline = makeTestCandidate({
      candidateId: 'baseline',
      durationSeconds: 5_000,
      distanceMeters: 90_000,
      risk: { ...makeTestCandidate().risk, meanScore: 70, maxScore: 80 },
    });
    // Exceeds 1.35x: 5000 * 1.35 = 6750, candidate is 7500
    const excessiveDetour = makeTestCandidate({
      candidateId: 'long_alt',
      durationSeconds: 7_500,
      distanceMeters: 140_000,
      risk: { ...makeTestCandidate().risk, meanScore: 10, maxScore: 15 },
    });

    const service = new RoutingService();
    const result = service.optimizeCandidateProfiles([baseline, excessiveDetour], 'SAFEST');

    assert.strictEqual(result.selectedCandidateId, 'baseline');
    assert.strictEqual(result.optimization.strategy, 'SPEED_BASELINE');
  });

  await test('Accessibility: closed corridor excluded when open alternative exists', () => {
    const closedCandidate = makeTestCandidate({
      candidateId: 'closed_route',
      isBaseline: true,
      accessibility: {
        status: 'CLOSED',
        isEligible: false,
        affectedCorridors: [{
          id: 'acc_001',
          name: 'NH-40 Nongpoh Section',
          road_code: 'NH-40',
          status: 'CLOSED',
          source: 'test',
          geometry: { type: 'LineString', coordinates: [[91.7, 26.1], [91.9, 25.6]] },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }],
        exclusionReason: 'Candidate intersects one or more CLOSED corridors.',
      },
    });
    const openCandidate = makeTestCandidate({
      candidateId: 'open_route',
      isBaseline: false,
      distanceMeters: 102_000,
      durationSeconds: 5_800,
      accessibility: {
        status: 'ACCESSIBLE',
        isEligible: true,
        affectedCorridors: [],
      },
    });

    const service = new RoutingService();
    const result = service.optimizeCandidateProfiles([closedCandidate, openCandidate], 'FASTEST');

    assert.strictEqual(result.selectedCandidateId, 'open_route');
    assert.strictEqual(result.baselineRoute.candidateId, 'closed_route');
  });

  await test('Accessibility: all candidates closed selects best-effort route with ALL_CANDIDATES_CLOSED', () => {
    const closed1 = makeTestCandidate({
      candidateId: 'closed_1',
      isBaseline: true,
      distanceMeters: 90_000,
      accessibility: {
        status: 'CLOSED',
        isEligible: false,
        affectedCorridors: [],
      },
    });
    const closed2 = makeTestCandidate({
      candidateId: 'closed_2',
      isBaseline: false,
      distanceMeters: 100_000,
      accessibility: {
        status: 'CLOSED',
        isEligible: false,
        affectedCorridors: [],
      },
    });

    const service = new RoutingService();
    const result = service.optimizeCandidateProfiles([closed1, closed2], 'FASTEST');

    assert.strictEqual(result.selectedCandidateId, 'closed_1');
    assert.strictEqual(result.selectedRoute.accessibility?.status, 'CLOSED');
    assert.match(result.optimization.selectionReason, /CLOSED|best-effort/i);
  });

  await test('Degraded intelligence: missing risk retains baseline with explicit degraded note', () => {
    const degradedCandidate = makeTestCandidate({
      candidateId: 'degraded',
      risk: {
        ...makeTestCandidate().risk,
        meanScore: Number.NaN,
        maxScore: Number.NaN,
      },
    });

    const service = new RoutingService();
    const result = service.optimizeCandidateProfiles([degradedCandidate], 'BALANCED');

    assert.strictEqual(result.selectedCandidateId, 'degraded');
    assert.strictEqual(result.safetyIntelligence.status, 'DEGRADED');
    assert.match(result.optimization.selectionReason, /unavailable|baseline/i);
  });

  console.log('\n==================================================');
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log('==================================================');

  if (failed > 0) process.exit(1);
}

runReliabilityTests().catch((err) => {
  console.error('Fatal error in reliability test runner:', err);
  process.exit(1);
});
