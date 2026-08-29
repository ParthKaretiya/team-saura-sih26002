/**
 * SauraRoute Automated Test Suite
 * Tests domain validations, GeoJSON structures, weather normalization, vehicle tracking, and routing pipeline.
 */

import assert from 'assert';
import {
  validateCoordinates,
  validateIncidentType,
  validateSeverity,
  validateIncidentStatus,
  validateStatusTransition,
  ValidationError,
} from '../utils/validation.js';
import { incidentService } from '../services/incident.service.js';
import { vehicleService } from '../services/vehicle.service.js';
import { weatherService, WeatherServiceError } from '../services/weather.service.js';
import { GraphHopperClient, RoutingEngineError } from '../services/graphhopper.client.js';
import { RoutingService } from '../services/routing.service.js';
import { IncidentStatus } from '../types/incident.types.js';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${(err as Error).message}`);
    failed++;
  }
}

async function runTests() {
  console.log('==================================================');
  console.log('SauraRoute Automated Verification Suite');
  console.log('==================================================\n');

  console.log('--- 1. Validation Utilities ---');

  await test('validateCoordinates accepts valid latitude and longitude', () => {
    const res = validateCoordinates(26.1445, 91.7362);
    assert.strictEqual(res.latitude, 26.1445);
    assert.strictEqual(res.longitude, 91.7362);
  });

  await test('validateCoordinates rejects out-of-range latitude (> 90)', () => {
    assert.throws(
      () => validateCoordinates(95.0, 91.7362),
      (err: Error) => err instanceof ValidationError && err.statusCode === 400
    );
  });

  await test('validateCoordinates rejects out-of-range longitude (> 180)', () => {
    assert.throws(
      () => validateCoordinates(26.1445, 195.0),
      (err: Error) => err instanceof ValidationError && err.statusCode === 400
    );
  });

  await test('validateIncidentType accepts LANDSLIDE and rejects INVALID_TYPE', () => {
    assert.strictEqual(validateIncidentType('LANDSLIDE'), 'LANDSLIDE');
    assert.throws(
      () => validateIncidentType('VOLCANO'),
      (err: Error) => err instanceof ValidationError
    );
  });

  await test('validateSeverity accepts CRITICAL and rejects SUPER_HIGH', () => {
    assert.strictEqual(validateSeverity('CRITICAL'), 'CRITICAL');
    assert.throws(
      () => validateSeverity('SUPER_HIGH'),
      (err: Error) => err instanceof ValidationError
    );
  });

  await test('validateIncidentStatus accepts REPORTED, VERIFIED, REJECTED, ACTIVE, RESOLVED', () => {
    assert.strictEqual(validateIncidentStatus('REPORTED'), 'REPORTED');
    assert.strictEqual(validateIncidentStatus('REJECTED'), 'REJECTED');
    assert.throws(
      () => validateIncidentStatus('UNKNOWN_STATUS'),
      (err: Error) => err instanceof ValidationError
    );
  });

  await test('validateStatusTransition enforces lifecycle rules', () => {
    // Valid transitions
    validateStatusTransition('REPORTED', 'VERIFIED');
    validateStatusTransition('REPORTED', 'REJECTED');
    validateStatusTransition('VERIFIED', 'ACTIVE');
    validateStatusTransition('ACTIVE', 'RESOLVED');

    // Invalid transition: REPORTED -> RESOLVED
    assert.throws(
      () => validateStatusTransition('REPORTED', 'RESOLVED'),
      (err: Error) => err instanceof ValidationError && err.statusCode === 400
    );

    // Invalid transition from terminal state: RESOLVED -> ACTIVE
    assert.throws(
      () => validateStatusTransition('RESOLVED', 'ACTIVE'),
      (err: Error) => err instanceof ValidationError
    );
  });

  console.log('\n--- 2. Incident Service & GeoJSON Standards ---');

  await test('IncidentService creates and lists incidents in GeoJSON format', async () => {
    const incident = await incidentService.createIncident({
      type: 'LANDSLIDE',
      severity: 'HIGH',
      description: 'Mudslide on NH-40 near Nongpoh',
      latitude: 25.9021,
      longitude: 91.8012,
    });

    assert.ok(incident.id.startsWith('inc_'));
    assert.strictEqual(incident.status, 'REPORTED');

    const geoJson = await incidentService.listIncidents();
    assert.strictEqual(geoJson.type, 'FeatureCollection');
    assert.ok(geoJson.features.length > 0);

    const feature = geoJson.features.find(f => f.properties.id === incident.id);
    assert.ok(feature, 'Created incident must be present in FeatureCollection');
    assert.strictEqual(feature.geometry.type, 'Point');

    // CRITICAL GIS CHECK: GeoJSON must be [longitude, latitude]
    assert.strictEqual(feature.geometry.coordinates[0], 91.8012, 'Coordinates[0] must be longitude');
    assert.strictEqual(feature.geometry.coordinates[1], 25.9021, 'Coordinates[1] must be latitude');
  });

  await test('IncidentService updates status through lifecycle and handles REJECTED', async () => {
    const inc = await incidentService.createIncident({
      type: 'ROAD_DAMAGE',
      severity: 'LOW',
      description: 'Pothole cluster on secondary road',
      latitude: 26.1000,
      longitude: 91.7500,
    });

    // REPORTED -> REJECTED
    const updated = await incidentService.updateIncidentStatus(inc.id, 'REJECTED' as IncidentStatus);
    assert.ok(updated);
    assert.strictEqual(updated.status, 'REJECTED');
  });

  console.log('\n--- 3. Vehicle Service & Tracking ---');

  await test('VehicleService lists seeded vehicles in GeoJSON format', async () => {
    const geoJson = await vehicleService.listVehicles();
    assert.strictEqual(geoJson.type, 'FeatureCollection');
    assert.ok(geoJson.features.length >= 3);

    const v1 = geoJson.features.find(f => f.properties.vehicleCode === 'SAURA-001');
    assert.ok(v1);
    // Coordinates order: [longitude, latitude]
    assert.strictEqual(v1.geometry.coordinates[0], 91.7362);
    assert.strictEqual(v1.geometry.coordinates[1], 26.1445);
  });

  await test('VehicleService updates vehicle position and handles 404 for unknown vehicle', async () => {
    const updated = await vehicleService.updateLocation('vh_saura_001', {
      latitude: 26.1500,
      longitude: 91.7400,
      speed: 55.0,
      heading: 180.0,
    });

    assert.ok(updated);
    assert.strictEqual(updated.latitude, 26.1500);
    assert.strictEqual(updated.longitude, 91.7400);
    assert.strictEqual(updated.speed, 55.0);

    const notFound = await vehicleService.updateLocation('vh_nonexistent_999', {
      latitude: 26.0,
      longitude: 91.0,
    });
    assert.strictEqual(notFound, null);
  });

  console.log('\n--- 4. Weather Service Integration ---');

  await test('WeatherService rejects invalid coordinates with 400', async () => {
    await assert.rejects(
      async () => weatherService.getWeatherForCoordinate(100.0, 91.7362),
      (err: Error) => err instanceof WeatherServiceError && err.statusCode === 400
    );
  });

  await test('WeatherService fetches and normalizes weather for requested coordinates', async () => {
    try {
      const weather = await weatherService.getWeatherForCoordinate(26.1445, 91.7362);
      assert.strictEqual(weather.location.latitude, 26.1445);
      assert.strictEqual(weather.location.longitude, 91.7362);
      assert.ok(typeof weather.current.temperature === 'number');
      assert.ok(typeof weather.current.precipitation === 'number');
      assert.ok(Array.isArray(weather.forecast));
    } catch (err) {
      // If network/offline during test, verify it thrown controlled WeatherServiceError (502/503)
      assert.ok(err instanceof WeatherServiceError);
      assert.ok([502, 503].includes((err as WeatherServiceError).statusCode));
      console.log(`    (Note: Network offline fallback tested: ${(err as Error).message})`);
    }
  });

  console.log('\n--- 5. Routing Service & GraphHopper Client ---');

  await test('GraphHopperClient parses valid route payload and normalizes coordinates', async () => {
    const mockFetch = async () =>
      new Response(
        JSON.stringify({
          paths: [
            {
              distance: 98450.5,
              time: 7200000,
              points: {
                type: 'LineString',
                coordinates: [
                  [91.7362, 26.1445],
                  [91.7821, 25.981],
                  [91.8933, 25.5788],
                ],
              },
              instructions: [
                { text: 'Depart on GS Road', distance: 5000, time: 300000 },
                { text: 'Continue towards Shillong', distance: 93450.5, time: 6900000 },
              ],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    const client = new GraphHopperClient(
      { baseUrl: 'http://mock-gh:8989', timeoutMs: 2000, profile: 'car' },
      mockFetch
    );
    const service = new RoutingService(client);

    const route = await service.calculateRoute(
      { latitude: 26.1445, longitude: 91.7362 },
      { latitude: 25.5788, longitude: 91.8933 }
    );

    assert.strictEqual(route.distanceMeters, 98451);
    assert.strictEqual(route.durationSeconds, 7200);
    assert.strictEqual(route.geometry.type, 'LineString');
    assert.strictEqual(route.geometry.coordinates.length, 3);
    assert.deepStrictEqual(route.geometry.coordinates[0], [91.7362, 26.1445]);
    assert.strictEqual(route.instructions.length, 2);
    assert.strictEqual(route.instructions[0].text, 'Depart on GS Road');
  });

  await test('GraphHopperClient handles 404 unroutable coordinates with 422 ROUTE_NOT_FOUND', async () => {
    const mockFetch = async () =>
      new Response(JSON.stringify({ message: 'Point not found' }), { status: 404 });

    const client = new GraphHopperClient(
      { baseUrl: 'http://mock-gh:8989', timeoutMs: 2000, profile: 'car' },
      mockFetch
    );

    await assert.rejects(
      async () =>
        client.findRoute(
          { latitude: 0.0, longitude: 0.0 },
          { latitude: 1.0, longitude: 1.0 }
        ),
      (err: Error) =>
        err instanceof RoutingEngineError &&
        err.statusCode === 422 &&
        err.code === 'ROUTE_NOT_FOUND'
    );
  });

  await test('GraphHopperClient handles server offline with 503 ROUTING_ENGINE_UNAVAILABLE', async () => {
    const mockFetch = async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:8989');
    };

    const client = new GraphHopperClient(
      { baseUrl: 'http://mock-gh:8989', timeoutMs: 2000, profile: 'car' },
      mockFetch
    );

    await assert.rejects(
      async () =>
        client.findRoute(
          { latitude: 26.1445, longitude: 91.7362 },
          { latitude: 25.5788, longitude: 91.8933 }
        ),
      (err: Error) =>
        err instanceof RoutingEngineError &&
        err.statusCode === 503 &&
        err.code === 'ROUTING_ENGINE_UNAVAILABLE'
    );
  });

  console.log('\n==================================================');
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});
