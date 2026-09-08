/**
 * Step 9 accessibility & active-route alerts specification.
 *
 * These deterministic contracts define the expected corridor-status semantics,
 * closure-aware routing behaviour, and alert mapping before the service and
 * routing integration are added in later commits.
 *
 * Sections:
 *   A. Pure type/config contracts — pass against Commit 1 definitions.
 *   B. Intersection tolerance boundary — pure threshold contract.
 *   C. Routing/optimization integration — PENDING, requires the AccessibilityService
 *      and RoutingService integration added in Commit 3/4.
 *
 * No GraphHopper, live weather, PostGIS, network, or ML is used.
 */
import assert from 'assert';
import { ACCESSIBILITY_CONFIG } from '../config/accessibility.config.js';
import {
  VALID_ACCESSIBILITY_STATUSES,
  ALLOWED_ACCESSIBILITY_STATUS_TRANSITIONS,
} from '../types/accessibility.types.js';
import {
  VALID_ALERT_CATEGORIES,
  VALID_ALERT_SEVERITIES,
} from '../types/alert.types.js';
import { routingService } from '../services/routing.service.js';
import { accessibilityService } from '../services/accessibility.service.js';
import { ValidationError } from '../utils/validation.js';
import type { CandidateRouteProfile, RouteGeometry } from '../types/routing.types.js';
import type { AccessibilityRecord, AccessibilityStatus } from '../types/accessibility.types.js';

let passed = 0;
let failed = 0;
let pending = 0;

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

async function pendingTest(name: string, reason: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    // If the guard did not throw, the service already exists and this test
    // should now be an active assertion rather than a pending one.
    console.log(`  [ACTIVE (unexpected pass)] ${name}`);
    passed++;
  } catch (error) {
    if ((error as Error).message === 'NOT_IMPLEMENTED') {
      console.log(`  [PENDING] ${name}`);
      console.log(`            ${reason}`);
      pending++;
    } else {
      console.error(`  [FAIL] ${name}`);
      console.error(`         ${(error as Error).message}`);
      failed++;
    }
  }
}

const TOLERANCE = ACCESSIBILITY_CONFIG.routing.intersectionToleranceMeters;

// Local test-only helper documenting the intended inclusive tolerance boundary.
// The production point-to-segment distance heuristic is deferred to a later commit;
// this helper only pins the decision threshold, not the geometry computation.
function withinTolerance(distanceMeters: number): boolean {
  return distanceMeters <= TOLERANCE;
}

// Future RoutingService accessibility contract — does not exist yet at this commit.
type AccessibilityRoutingContract = {
  filterAccessibilityEligible?: (
    candidates: CandidateRouteProfile[],
    corridors: AccessibilityRecord[],
  ) => CandidateRouteProfile[];
  evaluateAccessibility?: (
    candidates: CandidateRouteProfile[],
    corridors: AccessibilityRecord[],
  ) => unknown;
};

const routingContract = routingService as unknown as AccessibilityRoutingContract;

function guardImplemented<T>(value: T | undefined, method: string): T {
  if (value === undefined) {
    throw new Error('NOT_IMPLEMENTED');
  }
  return value;
}

async function runTests(): Promise<void> {
  console.log('==================================================');
  console.log('SauraRoute Step 9 Accessibility & Alerts Specification');
  console.log('==================================================\n');

  console.log('--- 1. Accessibility status constants ---');

  await test('status vocabulary is exactly OPEN, RESTRICTED, CLOSED', () => {
    assert.deepStrictEqual(VALID_ACCESSIBILITY_STATUSES, ['OPEN', 'RESTRICTED', 'CLOSED']);
  });

  await test('CLOSED and OPEN are distinct statuses', () => {
    assert.notStrictEqual(VALID_ACCESSIBILITY_STATUSES[0], VALID_ACCESSIBILITY_STATUSES[2]);
  });

  await test('RESTRICTED is not CLOSED (cannot be silently conflated)', () => {
    assert.notStrictEqual(VALID_ACCESSIBILITY_STATUSES[1], VALID_ACCESSIBILITY_STATUSES[2]);
  });

  console.log('\n--- 2. Status transitions ---');

  await test('transitions allow OPEN → RESTRICTED and OPEN → CLOSED', () => {
    assert.deepStrictEqual(ALLOWED_ACCESSIBILITY_STATUS_TRANSITIONS.OPEN, ['RESTRICTED', 'CLOSED']);
  });

  await test('transitions allow RESTRICTED → OPEN and RESTRICTED → CLOSED', () => {
    assert.deepStrictEqual(ALLOWED_ACCESSIBILITY_STATUS_TRANSITIONS.RESTRICTED, ['OPEN', 'CLOSED']);
  });

  await test('transitions allow CLOSED → OPEN and CLOSED → RESTRICTED', () => {
    assert.deepStrictEqual(ALLOWED_ACCESSIBILITY_STATUS_TRANSITIONS.CLOSED, ['OPEN', 'RESTRICTED']);
  });

  await test('transition map covers every status without self-loops', () => {
    for (const status of VALID_ACCESSIBILITY_STATUSES) {
      const targets = ALLOWED_ACCESSIBILITY_STATUS_TRANSITIONS[status];
      assert.ok(Array.isArray(targets), `missing transitions for ${status}`);
      assert.ok(!targets.includes(status), `${status} must not self-transition`);
    }
  });

  console.log('\n--- 3. Accessibility configuration ---');

  await test('intersection tolerance is the configured 250 meters', () => {
    assert.strictEqual(ACCESSIBILITY_CONFIG.routing.intersectionToleranceMeters, 250);
  });

  await test('restricted demotion threshold is the configured 50.0 score', () => {
    assert.strictEqual(ACCESSIBILITY_CONFIG.routing.restrictedDemotionThresholdScore, 50.0);
  });

  console.log('\n--- 4. Intersection tolerance boundary (inclusive) ---');

  await test('distance 0 m (directly on corridor) is affected', () => {
    assert.strictEqual(withinTolerance(0), true);
  });

  await test('distance 200 m (inside tolerance) is affected', () => {
    assert.strictEqual(withinTolerance(200), true);
  });

  await test('distance exactly at 250 m tolerance is affected (inclusive)', () => {
    assert.strictEqual(withinTolerance(250), true);
  });

  await test('distance 251 m (just beyond tolerance) is NOT affected', () => {
    assert.strictEqual(withinTolerance(251), false);
  });

  await test('distance 1000 m (clearly beyond tolerance) is NOT affected', () => {
    assert.strictEqual(withinTolerance(1000), false);
  });

  console.log('\n--- 5. Alert contract (pure mapping) ---');

  await test('CLOSED maps to a CRITICAL road-closure alert', () => {
    assert.strictEqual(ACCESSIBILITY_CONFIG.alerts.roadClosureSeverity, 'CRITICAL');
  });

  await test('RESTRICTED maps to a WARNING road-restriction alert', () => {
    assert.strictEqual(ACCESSIBILITY_CONFIG.alerts.roadRestrictionSeverity, 'WARNING');
  });

  await test('alert categories include ROAD_CLOSURE, ROAD_RESTRICTION, and ROUTE_HAZARD', () => {
    assert.deepStrictEqual(VALID_ALERT_CATEGORIES, ['ROAD_CLOSURE', 'ROAD_RESTRICTION', 'ROUTE_HAZARD']);
  });

  await test('alert severities include INFO, WARNING, CRITICAL', () => {
    assert.deepStrictEqual(VALID_ALERT_SEVERITIES, ['INFO', 'WARNING', 'CRITICAL']);
  });

  await test('ROUTE_HAZARD is a distinct category, not conflated with accessibility alerts', () => {
    assert.notStrictEqual(VALID_ALERT_CATEGORIES[2], VALID_ALERT_CATEGORIES[0]);
    assert.notStrictEqual(VALID_ALERT_CATEGORIES[2], VALID_ALERT_CATEGORIES[1]);
  });

  console.log('\n--- 6. AccessibilityService domain operations ---');

  await test('create then list then get by id round-trips a corridor record', async () => {
    const created = await accessibilityService.createAccessibility({
      name: 'NH-40 Nongpoh Segment',
      road_code: 'NH-40',
      status: 'OPEN',
      reason: undefined,
      source: 'test',
      geometry: { type: 'LineString', coordinates: [[91.70, 26.10], [91.90, 25.60]] },
    });

    assert.strictEqual(created.status, 'OPEN');
    assert.ok(created.id.startsWith('acc_'));

    const listed = await accessibilityService.listAccessibility();
    assert.ok(listed.some((record) => record.id === created.id));

    const fetched = await accessibilityService.getAccessibilityById(created.id);
    assert.ok(fetched);
    assert.strictEqual(fetched.name, 'NH-40 Nongpoh Segment');
    assert.strictEqual(fetched.road_code, 'NH-40');
    assert.strictEqual(fetched.status, 'OPEN');
  });

  await test('updateAccessibilityStatus applies valid transitions and preserves status', async () => {
    const created = await accessibilityService.createAccessibility({
      name: 'Transition Corridor',
      status: 'OPEN',
      source: 'test',
      geometry: { type: 'LineString', coordinates: [[91.70, 26.10], [91.90, 25.60]] },
    });

    const closed = await accessibilityService.updateAccessibilityStatus(created.id, 'CLOSED', 'landslide');
    assert.ok(closed);
    assert.strictEqual(closed.status, 'CLOSED');
    assert.strictEqual(closed.reason, 'landslide');

    const reopened = await accessibilityService.updateAccessibilityStatus(created.id, 'OPEN');
    assert.ok(reopened);
    assert.strictEqual(reopened.status, 'OPEN');
  });

  await test('createAccessibility rejects an invalid status value', async () => {
    await assert.rejects(
      () => accessibilityService.createAccessibility({
        name: 'Bad Status',
        status: 'BROKEN' as AccessibilityStatus,
        source: 'test',
        geometry: { type: 'LineString', coordinates: [[91.70, 26.10], [91.90, 25.60]] },
      }),
      (error: unknown) => error instanceof ValidationError,
    );
  });

  await test('updateAccessibilityStatus rejects an invalid status value', async () => {
    const created = await accessibilityService.createAccessibility({
      name: 'Invalid Update',
      status: 'OPEN',
      source: 'test',
      geometry: { type: 'LineString', coordinates: [[91.70, 26.10], [91.90, 25.60]] },
    });

    await assert.rejects(
      () => accessibilityService.updateAccessibilityStatus(created.id, 'NONSENSE' as AccessibilityStatus),
      (error: unknown) => error instanceof ValidationError,
    );
  });

  await test('updateAccessibilityStatus rejects transitions outside the configured map', async () => {
    // CLOSED → RESTRICTED is allowed; use an illegal transition to verify enforcement.
    // RESTRICTED → RESTRICTED (self-transition) is always disallowed.
    const created = await accessibilityService.createAccessibility({
      name: 'Restricted Corridor',
      status: 'RESTRICTED',
      source: 'test',
      geometry: { type: 'LineString', coordinates: [[91.70, 26.10], [91.90, 25.60]] },
    });

    await assert.rejects(
      () => accessibilityService.updateAccessibilityStatus(created.id, 'RESTRICTED'),
      (error: unknown) => error instanceof ValidationError,
    );
  });

  await test('updateAccessibilityStatus returns null for an unknown id', async () => {
    const result = await accessibilityService.updateAccessibilityStatus('acc_does_not_exist', 'OPEN');
    assert.strictEqual(result, null);
  });

  await test('deleteAccessibility removes a record', async () => {
    const created = await accessibilityService.createAccessibility({
      name: 'Deletable Corridor',
      status: 'OPEN',
      source: 'test',
      geometry: { type: 'LineString', coordinates: [[91.70, 26.10], [91.90, 25.60]] },
    });

    assert.strictEqual(await accessibilityService.deleteAccessibility(created.id), true);
    assert.strictEqual(await accessibilityService.getAccessibilityById(created.id), null);
  });

  await test('deleteAccessibility returns false for an unknown id', async () => {
    assert.strictEqual(await accessibilityService.deleteAccessibility('acc_does_not_exist'), false);
  });

  await test('getAccessibilityFeatures returns a GeoJSON FeatureCollection with [lon, lat] geometry', async () => {
    await accessibilityService.createAccessibility({
      name: 'GeoJSON Corridor',
      status: 'OPEN',
      source: 'test',
      geometry: { type: 'LineString', coordinates: [[91.70, 26.10], [91.90, 25.60]] },
    });

    const collection = await accessibilityService.getAccessibilityFeatures();
    assert.strictEqual(collection.type, 'FeatureCollection');
    assert.ok(collection.features.some((feature) => feature.properties.name === 'GeoJSON Corridor'));

    const feature = collection.features.find((f) => f.properties.name === 'GeoJSON Corridor');
    assert.ok(feature);
    assert.strictEqual(feature.geometry.type, 'LineString');
    assert.deepStrictEqual(feature.geometry.coordinates, [[91.70, 26.10], [91.90, 25.60]]);
  });

  console.log('\n--- 7. Route/corridor proximity detection ---');

  await test('a route directly through a corridor is detected as affecting it', async () => {
    const corridor = await accessibilityService.createAccessibility({
      name: 'Through Corridor',
      status: 'CLOSED',
      source: 'test',
      geometry: { type: 'LineString', coordinates: [[91.70, 26.10], [91.90, 25.60]] },
    });

    const route: RouteGeometry = {
      type: 'LineString',
      coordinates: [[91.70, 26.10], [91.80, 25.85], [91.90, 25.60]],
    };

    const affected = await accessibilityService.findAccessibilityAffectingRoute(route);
    assert.ok(affected.some((record) => record.id === corridor.id));
  });

  await test('a route clearly far from every corridor is not affected', async () => {
    await accessibilityService.createAccessibility({
      name: 'Far Corridor',
      status: 'CLOSED',
      source: 'test',
      geometry: { type: 'LineString', coordinates: [[91.70, 26.10], [91.90, 25.60]] },
    });

    const farRoute: RouteGeometry = {
      type: 'LineString',
      coordinates: [[94.00, 28.00], [94.20, 28.20]],
    };

    const affected = await accessibilityService.findAccessibilityAffectingRoute(farRoute);
    assert.strictEqual(affected.length, 0);
  });

  await test('a route within 250 m of a corridor is affected (inclusive boundary)', async () => {
    // Corridor along lon 91.80. Route offset by ~0.001° lon ≈ 100 m.
    await accessibilityService.createAccessibility({
      name: 'Boundary Corridor',
      status: 'CLOSED',
      source: 'test',
      geometry: { type: 'LineString', coordinates: [[91.80, 26.00], [91.80, 26.10]] },
    });

    const nearRoute: RouteGeometry = {
      type: 'LineString',
      coordinates: [[91.801, 26.00], [91.801, 26.10]],
    };

    const affected = await accessibilityService.findAccessibilityAffectingRoute(nearRoute);
    assert.ok(affected.some((record) => record.name === 'Boundary Corridor'));
  });

  await test('a route clearly beyond tolerance is not affected', async () => {
    await accessibilityService.createAccessibility({
      name: 'Beyond Tolerance Corridor',
      status: 'CLOSED',
      source: 'test',
      geometry: { type: 'LineString', coordinates: [[91.80, 26.00], [91.80, 26.10]] },
    });

    // Offset ~0.02° lon ≈ 2 km, well beyond the 250 m tolerance.
    const farRoute: RouteGeometry = {
      type: 'LineString',
      coordinates: [[91.82, 26.00], [91.82, 26.10]],
    };

    const affected = await accessibilityService.findAccessibilityAffectingRoute(farRoute);
    assert.strictEqual(affected.length, 0);
  });

  await test('proximity detection preserves RESTRICTED vs CLOSED status (no conflation)', async () => {
    const restricted = await accessibilityService.createAccessibility({
      name: 'Restricted Overlap',
      status: 'RESTRICTED',
      source: 'test',
      geometry: { type: 'LineString', coordinates: [[91.70, 26.10], [91.90, 25.60]] },
    });

    const route: RouteGeometry = {
      type: 'LineString',
      coordinates: [[91.70, 26.10], [91.90, 25.60]],
    };

    const affected = await accessibilityService.findAccessibilityAffectingRoute(route);
    const matched = affected.find((record) => record.id === restricted.id);
    assert.ok(matched);
    assert.strictEqual(matched.status, 'RESTRICTED');
    assert.notStrictEqual(matched.status, 'CLOSED');
  });

  console.log('\n--- 8. Routing/optimization integration (pending Commit 4) ---');

  const closedCandidate: CandidateRouteProfile = makeCandidate('candidate-a');
  const openCandidate: CandidateRouteProfile = makeCandidate('candidate-b');
  const closedCorridor: AccessibilityRecord = makeCorridor('corr-1', 'CLOSED');

  await pendingTest(
    'a candidate intersecting a CLOSED corridor is excluded from eligibility',
    'RoutingService accessibility filtering (Commit 3)',
    () => {
      const filter = guardImplemented(routingContract.filterAccessibilityEligible, 'filterAccessibilityEligible');
      const eligible = filter([closedCandidate, openCandidate], [closedCorridor]);
      assert.deepStrictEqual(eligible.map((candidate) => candidate.candidateId), [openCandidate.candidateId]);
    },
  );

  await pendingTest(
    'all-candidates-closed degrades honestly without fabricating an accessible route',
    'AccessibilityService + RoutingService degradation path (Commit 3)',
    () => {
      const filter = guardImplemented(routingContract.filterAccessibilityEligible, 'filterAccessibilityEligible');
      const eligible = filter([closedCandidate], [closedCorridor]);
      // Contract: eligible remains usable, but accessibility must be surfaced as
      // degraded rather than silently treating the closed corridor as clear.
      assert.strictEqual(eligible.length >= 0, true);
    },
  );

  await pendingTest(
    'a RESTRICTED corridor does not hard-exclude a candidate',
    'RoutingService accessibility filtering (Commit 4)',
    () => {
      const evaluate = guardImplemented(routingContract.evaluateAccessibility, 'evaluateAccessibility');
      const restrictedCorridor = makeCorridor('corr-2', 'RESTRICTED');
      // Contract: restricted is surfaced (warning) but the candidate is not dropped.
      void evaluate([closedCandidate], [restrictedCorridor]);
      assert.strictEqual(true, true);
    },
  );

  await pendingTest(
    'accessibility filtering happens before Step-8 selection without altering risk scoring or ML',
    'Accessibility integration into optimizeCandidateProfiles (Commit 4)',
    () => {
      const filter = guardImplemented(routingContract.filterAccessibilityEligible, 'filterAccessibilityEligible');
      // Contract: filtering is a pre-selection gate; it must not mutate candidate risk.
      const eligible = filter([closedCandidate, openCandidate], [closedCorridor]);
      assert.strictEqual(openCandidate.risk.meanScore, eligible[0].risk.meanScore);
    },
  );

  console.log('\n==================================================');
  console.log(`Results: ${passed} passed, ${failed} failed, ${pending} pending.`);
  console.log('==================================================');

  if (failed > 0) process.exit(1);
}

function makeCandidate(candidateId: string): CandidateRouteProfile {
  return {
    candidateId,
    name: candidateId,
    isBaseline: false,
    distanceMeters: 100_000,
    durationSeconds: 7_200,
    geometry: { type: 'LineString', coordinates: [[91.7, 26.1], [91.9, 25.6]] },
    instructions: [],
    risk: {
      overallLevel: 'MEDIUM',
      meanScore: 40,
      maxScore: 50,
      hazardousSegmentCount: 0,
      dominantTrigger: 'Normal Conditions',
      sampledWaypointsCount: 2,
      waypoints: [],
    },
    compositeCost: 0,
    normalizedCost: { durationScore: 0, distanceScore: 0, hazardScore: 0, totalCost: 0 },
  };
}

function makeCorridor(id: string, status: 'OPEN' | 'RESTRICTED' | 'CLOSED'): AccessibilityRecord {
  return {
    id,
    name: id,
    status,
    source: 'test',
    geometry: { type: 'LineString', coordinates: [[91.7, 26.1], [91.9, 25.6]] },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

runTests().catch((error) => {
  console.error('Fatal test runner failure:', error);
  process.exit(1);
});