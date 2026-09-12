/**
 * Truck routing and weather-adjusted ETA specification tests.
 */
import assert from 'assert';
import { RISK_CONFIG } from '../config/risk.config.js';
import { riskService } from '../services/risk.service.js';
import { RoutingService } from '../services/routing.service.js';
import type { RouteResponse } from '../types/routing.types.js';

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

async function runTests(): Promise<void> {
  console.log('\n--- Truck Routing & Live Weather ETA Tests ---');

  // Test 1: Configuration verifies 3.0 km spatial sampling and weather multipliers
  await test('RISK_CONFIG defines 3.0 km sampling interval and weather multipliers', () => {
    assert.strictEqual(RISK_CONFIG.samplingIntervalKm, 3.0);
    assert.strictEqual(RISK_CONFIG.weatherDelayMultipliers.HIGH, 1.30);
    assert.strictEqual(RISK_CONFIG.weatherDelayMultipliers.CRITICAL, 1.60);
  });

  // Test 2: Spatial sampling along a route samples ~3km intervals
  await test('evaluateRouteRisk samples route at ~3.0 km intervals', async () => {
    // Generate ~15 km line from Guwahati (26.1445, 91.7362) southward
    // 0.01 deg lat is approx 1.11 km
    const coordinates: Array<[number, number]> = [];
    for (let i = 0; i <= 15; i++) {
      // Step ~1 km each
      coordinates.push([91.7362, 26.1445 - (i * 0.009)]);
    }

    const summary = await riskService.evaluateRouteRisk(coordinates);
    assert.ok(summary.waypoints.length >= 5, `Expected >= 5 sampled points for ~15km route, got ${summary.waypoints.length}`);
    
    // Check distances between sampled points
    for (let i = 1; i < summary.waypoints.length - 1; i++) {
      const prev = summary.waypoints[i - 1].distanceAlongRouteKm;
      const curr = summary.waypoints[i].distanceAlongRouteKm;
      const diff = curr - prev;
      assert.ok(diff >= 2.5 && diff <= 4.0, `Expected sample spacing ~3.0km, got ${diff}`);
    }
  });

  // Test 3: Weather delay adds duration when HIGH or CRITICAL rainfall is present
  await test('profileCandidateRoute adds weatherDelaySeconds for high/critical rainfall zones', async () => {
    const mockClient = {
      findCandidateRoutes: async () => [],
      checkHealth: async () => ({ status: 'connected' as const, url: 'mock' }),
    };

    const routingSvc = new RoutingService(mockClient as any);

    // Mock route: 100 km, 7200 seconds (2 hours)
    const mockRoute: RouteResponse = {
      origin: { latitude: 26.1445, longitude: 91.7362 },
      destination: { latitude: 25.5788, longitude: 91.8933 },
      distanceMeters: 100_000,
      durationSeconds: 7200,
      geometry: {
        type: 'LineString',
        coordinates: [
          [91.7362, 26.1445],
          [91.7500, 26.0000],
          [91.8000, 25.8000],
          [91.8933, 25.5788],
        ],
      },
      instructions: [],
    };

    // Override evaluateRouteRisk to return controlled waypoints
    const originalEval = riskService.evaluateRouteRisk.bind(riskService);
    try {
      (riskService as any).evaluateRouteRisk = async () => ({
        overallScore: 65,
        overallLevel: 'HIGH',
        dominantTrigger: 'Rainfall',
        hazardousSegmentCount: 2,
        meanScore: 60,
        maxScore: 85,
        waypoints: [
          {
            coordinates: [91.7362, 26.1445],
            distAlongKm: 0,
            score: 20,
            level: 'LOW',
            primaryFactor: 'Rainfall',
            precipitationMm: 2,
            slopeDegrees: 5,
            activeIncidentsCount: 0,
            summary: 'Low risk',
          },
          {
            coordinates: [91.7500, 26.0000],
            distAlongKm: 33,
            score: 65,
            level: 'HIGH',
            primaryFactor: 'Rainfall', // +30% on this 1/4 segment
            precipitationMm: 35,
            slopeDegrees: 15,
            activeIncidentsCount: 0,
            summary: 'High rainfall',
          },
          {
            coordinates: [91.8000, 25.8000],
            distAlongKm: 66,
            score: 85,
            level: 'CRITICAL',
            primaryFactor: 'Rainfall', // +60% on this 1/4 segment
            precipitationMm: 65,
            slopeDegrees: 20,
            activeIncidentsCount: 0,
            summary: 'Torrential rainfall',
          },
          {
            coordinates: [91.8933, 25.5788],
            distAlongKm: 100,
            score: 20,
            level: 'LOW',
            primaryFactor: 'Slope',
            precipitationMm: 1,
            slopeDegrees: 8,
            activeIncidentsCount: 0,
            summary: 'Low risk',
          },
        ],
      });

      const profile = await routingSvc.profileCandidateRoute(mockRoute, 0, true);

      // Expected calculation:
      // 4 waypoints -> segmentDuration = 7200 / 4 = 1800s
      // HIGH rainfall: 1800 * 0.30 = 540s
      // CRITICAL rainfall: 1800 * 0.60 = 1080s
      // Total weather delay: 540 + 1080 = 1620s
      // Adjusted duration: 7200 + 1620 = 8820s
      assert.strictEqual(profile.weatherDelaySeconds, 1620);
      assert.strictEqual(profile.durationSeconds, 8820);
    } finally {
      (riskService as any).evaluateRouteRisk = originalEval;
    }
  });

  // Test 4: Live GraphHopper cargo_truck profile routing
  await test('GraphHopper cargo_truck profile calculates realistic truck routing', async () => {
    const routingSvc = new RoutingService();
    const origin = { latitude: 26.1445, longitude: 91.7362 }; // Guwahati
    const destination = { latitude: 25.5788, longitude: 91.8933 }; // Shillong

    const carRoute = await routingSvc.calculateRoute(origin, destination, { profile: 'car' });
    const truckRoute = await routingSvc.calculateRoute(origin, destination, { profile: 'cargo_truck' });

    assert.ok(carRoute.distanceMeters > 90_000, 'Car route distance reasonable');
    assert.ok(truckRoute.distanceMeters > 90_000, 'Truck route distance reasonable');

    // Truck duration must be significantly longer than car duration
    console.log(`         Car: ${(carRoute.distanceMeters / 1000).toFixed(1)} km, ${Math.round(carRoute.durationSeconds / 60)} min`);
    console.log(`         Truck: ${(truckRoute.distanceMeters / 1000).toFixed(1)} km, ${Math.round(truckRoute.durationSeconds / 60)} min`);
    
    assert.ok(
      truckRoute.durationSeconds > carRoute.durationSeconds * 1.25,
      `Expected truck duration (${truckRoute.durationSeconds}s) to be > 1.25x car duration (${carRoute.durationSeconds}s)`
    );
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
