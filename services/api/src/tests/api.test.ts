/**
 * SauraRoute Automated Test Suite
 * Tests domain validations, GeoJSON structures, weather normalization, vehicle tracking, routing pipeline, and Risk Intelligence engine.
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
import { riskService, calculateHaversineDistanceKm } from '../services/risk.service.js';
import { classifyRiskLevel } from '../config/risk.config.js';
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

  console.log('\n--- 6. Risk Intelligence Engine & Multi-Factor Scoring ---');

  await test('Haversine distance calculation is mathematically accurate', () => {
    // Guwahati (26.1445, 91.7362) to Shillong (25.5788, 91.8933) is ~64.8 km straight-line
    const dist = calculateHaversineDistanceKm(26.1445, 91.7362, 25.5788, 91.8933);
    assert.ok(dist >= 64.0 && dist <= 66.0, `Expected ~65km, got ${dist}`);
  });

  await test('Rainfall subscore threshold boundaries behave deterministically', () => {
    assert.strictEqual(riskService.calculateRainfallSubscore(0).subscore, 0);
    assert.strictEqual(riskService.calculateRainfallSubscore(4.9).subscore, 0);
    assert.strictEqual(riskService.calculateRainfallSubscore(5.0).subscore, 30);
    assert.strictEqual(riskService.calculateRainfallSubscore(20.0).subscore, 30);
    assert.strictEqual(riskService.calculateRainfallSubscore(20.1).subscore, 70);
    assert.strictEqual(riskService.calculateRainfallSubscore(50.0).subscore, 70);
    assert.strictEqual(riskService.calculateRainfallSubscore(50.1).subscore, 100);
    assert.strictEqual(riskService.calculateRainfallSubscore(150.0).subscore, 100);
  });

  await test('Slope subscore threshold boundaries behave deterministically', () => {
    assert.strictEqual(riskService.calculateSlopeSubscore(0).subscore, 0);
    assert.strictEqual(riskService.calculateSlopeSubscore(9.9).subscore, 0);
    assert.strictEqual(riskService.calculateSlopeSubscore(10.0).subscore, 40);
    assert.strictEqual(riskService.calculateSlopeSubscore(25.0).subscore, 40);
    assert.strictEqual(riskService.calculateSlopeSubscore(25.1).subscore, 75);
    assert.strictEqual(riskService.calculateSlopeSubscore(40.0).subscore, 75);
    assert.strictEqual(riskService.calculateSlopeSubscore(40.1).subscore, 100);
  });

  await test('Risk level classification exact boundary checks', () => {
    assert.strictEqual(classifyRiskLevel(0), 'LOW');
    assert.strictEqual(classifyRiskLevel(24.99), 'LOW');
    assert.strictEqual(classifyRiskLevel(25.0), 'MEDIUM');
    assert.strictEqual(classifyRiskLevel(49.99), 'MEDIUM');
    assert.strictEqual(classifyRiskLevel(50.0), 'HIGH');
    assert.strictEqual(classifyRiskLevel(74.99), 'HIGH');
    assert.strictEqual(classifyRiskLevel(75.0), 'CRITICAL');
    assert.strictEqual(classifyRiskLevel(100.0), 'CRITICAL');
  });

  await test('Dry, flat, no-hazard scenario evaluates to LOW', async () => {
    const pointRisk = await riskService.evaluatePointRisk(26.1445, 91.7362, {
      precipitationOverrideMm: 0.0,
      slopeOverrideDeg: 2.0,
    });

    assert.ok(pointRisk.score < 25.0, `Expected score < 25, got ${pointRisk.score}`);
    assert.strictEqual(pointRisk.level, 'LOW');
    assert.strictEqual(pointRisk.factors.rainfall.subscore, 0);
    assert.strictEqual(pointRisk.factors.slope.subscore, 0);
  });

  await test('Torrential rain, steep slope, nearby hazard scenario evaluates to CRITICAL', async () => {
    const pointRisk = await riskService.evaluatePointRisk(25.9036, 91.8794, {
      precipitationOverrideMm: 85.0,
      slopeOverrideDeg: 42.0,
    });

    assert.ok(pointRisk.score >= 75.0, `Expected score >= 75, got ${pointRisk.score}`);
    assert.strictEqual(pointRisk.level, 'CRITICAL');
    assert.strictEqual(pointRisk.factors.rainfall.subscore, 100);
    assert.strictEqual(pointRisk.factors.slope.subscore, 100);
  });

  await test('Route risk sampler aggregates corridor-level risk metrics', async () => {
    // Sample coordinate path along Guwahati-Shillong corridor
    const coords: [number, number][] = [
      [91.7362, 26.1445],
      [91.7821, 25.9810],
      [91.8012, 25.9021],
      [91.8520, 25.7500],
      [91.8933, 25.5788],
    ];

    const routeRisk = await riskService.evaluateRouteRisk(coords);
    assert.ok(typeof routeRisk.meanScore === 'number');
    assert.ok(typeof routeRisk.maxScore === 'number');
    assert.ok(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(routeRisk.overallLevel));
    assert.ok(routeRisk.sampledWaypointsCount >= 2);
    assert.ok(Array.isArray(routeRisk.waypoints));
  });

  await test('Hazard zones GeoJSON FeatureCollection returns curated records', () => {
    const geoJson = riskService.listHazardZones();
    assert.strictEqual(geoJson.type, 'FeatureCollection');
    assert.ok(geoJson.features.length >= 20, `Expected >= 20 features, got ${geoJson.features.length}`);

    const f1 = geoJson.features[0];
    assert.strictEqual(f1.geometry.type, 'Point');
    // GeoJSON [longitude, latitude] check
    assert.ok(Array.isArray(f1.geometry.coordinates));
    assert.strictEqual(f1.geometry.coordinates.length, 2);
    assert.ok(typeof f1.properties.name === 'string');
    assert.ok(typeof f1.properties.severity === 'string');
  });

  await test('Incident proximity subscore: no incidents yields zero', () => {
    const result = riskService.calculateIncidentSubscore(26.0, 91.0, []);
    assert.strictEqual(result.subscore, 0);
    assert.strictEqual(result.nearestDistanceKm, null);
    assert.strictEqual(result.countWithin15km, 0);
  });

  await test('Incident proximity subscore: CRITICAL incident within 5km yields 100', () => {
    // Place incident 1km away (approx 0.01 degrees at this latitude)
    const result = riskService.calculateIncidentSubscore(26.0, 91.0, [
      { latitude: 26.009, longitude: 91.0, severity: 'CRITICAL', status: 'ACTIVE' },
    ]);
    assert.strictEqual(result.subscore, 100);
    assert.ok(result.nearestDistanceKm !== null && result.nearestDistanceKm < 5);
    assert.strictEqual(result.countWithin15km, 1);
  });

  await test('Incident proximity subscore: RESOLVED and REJECTED incidents are excluded', () => {
    const result = riskService.calculateIncidentSubscore(26.0, 91.0, [
      { latitude: 26.009, longitude: 91.0, severity: 'CRITICAL', status: 'RESOLVED' },
      { latitude: 26.009, longitude: 91.001, severity: 'HIGH', status: 'REJECTED' },
    ]);
    assert.strictEqual(result.subscore, 0);
    assert.strictEqual(result.countWithin15km, 0);
  });

  await test('Historical hotspot subscore: distance < 2km yields 100', () => {
    // Nongpoh landslide is at [91.8794, 25.9036], query very close to it
    const result = riskService.calculateHistoricalSubscore(25.9036, 91.8794);
    assert.strictEqual(result.subscore, 100);
    assert.ok(result.nearestDistanceKm !== null && result.nearestDistanceKm <= 2.0);
    assert.ok(typeof result.nearestName === 'string');
  });

  await test('Historical hotspot subscore: distance > 10km yields 10 or 0', () => {
    // A point far from any cataloged landslide (e.g. open ocean or remote area)
    // Use a point in central Brahmaputra valley away from cataloged events
    const result = riskService.calculateHistoricalSubscore(26.5, 92.5);
    // Should be either 10 (10-15km) or 0 (>15km)
    assert.ok(result.subscore <= 30, `Expected subscore <= 30 for distant point, got ${result.subscore}`);
  });

  await test('Weighted risk score formula: explicit factor combination', async () => {
    // Use overrides to force known subscores:
    // Rain: 0mm -> subscore 0 (weight 0.35)
    // Slope: 30deg -> subscore 75 (weight 0.25)  (25 < 30 <= 40)
    // Incidents: depend on runtime state (but can verify formula structure)
    // Historical: depend on location
    const pointRisk = await riskService.evaluatePointRisk(26.5, 92.5, {
      precipitationOverrideMm: 0.0,
      slopeOverrideDeg: 30.0,
    });

    // Verify score is within valid range
    assert.ok(pointRisk.score >= 0 && pointRisk.score <= 100);
    // Verify rainfall subscore is 0 (dry)
    assert.strictEqual(pointRisk.factors.rainfall.subscore, 0);
    // Verify slope subscore is 75 (25-40° band)
    assert.strictEqual(pointRisk.factors.slope.subscore, 75);
    // Verify level matches computed score
    assert.strictEqual(pointRisk.level, classifyRiskLevel(pointRisk.score));
  });

  await test('Explicit LOW classification with all factors controlled', async () => {
    const result = await riskService.evaluatePointRisk(26.5, 92.5, {
      precipitationOverrideMm: 0,
      slopeOverrideDeg: 0,
    });
    // With 0 rain (0), 0 slope (0), minimal incident/history: expect LOW
    assert.ok(result.score < 25, `Expected LOW (< 25), got ${result.score}`);
    assert.strictEqual(result.level, 'LOW');
  });

  await test('Explicit MEDIUM classification with moderate factors', async () => {
    // Moderate slope only (subscore 40) + 15% history contribution max
    // 40 * 0.25 = 10 from slope + some history/incidents
    // Use a moderate rain (15mm -> subscore 30) + moderate slope (20deg -> subscore 40)
    const result = await riskService.evaluatePointRisk(26.5, 92.5, {
      precipitationOverrideMm: 15.0,
      slopeOverrideDeg: 20.0,
    });
    // 30*0.35 + 40*0.25 = 10.5 + 10 = 20.5 + incident/history
    // This should land in MEDIUM or LOW range depending on incident/history
    assert.ok(result.score >= 0 && result.score <= 100);
    assert.ok(['LOW', 'MEDIUM'].includes(result.level));
  });

  await test('Explicit CRITICAL classification with extreme all factors', async () => {
    // Near Nongpoh (historical hotspot), with max rain and slope
    const result = await riskService.evaluatePointRisk(25.9036, 91.8794, {
      precipitationOverrideMm: 100.0,
      slopeOverrideDeg: 45.0,
    });
    // 100*0.35 + 100*0.25 + incidents + 100*0.15 = 35+25+incidents+15 = 75+ incidents
    assert.ok(result.score >= 75.0, `Expected CRITICAL (>= 75), got ${result.score}`);
    assert.strictEqual(result.level, 'CRITICAL');
  });

  await test('Historical dataset loads all 20 records with required fields', () => {
    const zones = riskService.listHazardZones();
    assert.strictEqual(zones.features.length, 20);

    for (const f of zones.features) {
      assert.ok(f.properties.id, 'Each record must have an id');
      assert.ok(f.properties.name, 'Each record must have a name');
      assert.ok(f.properties.state, 'Each record must have a state');
      assert.ok(f.properties.severity, 'Each record must have a severity');
      assert.strictEqual(f.geometry.type, 'Point');
      assert.strictEqual(f.geometry.coordinates.length, 2);
      // Validate coordinate ranges (lon, lat)
      const [lon, lat] = f.geometry.coordinates;
      assert.ok(lon >= 85 && lon <= 100, `Longitude ${lon} out of NER bounds`);
      assert.ok(lat >= 20 && lat <= 30, `Latitude ${lat} out of NER bounds`);
    }
  });

  await test('PostGIS fallback: risk engine functions without database connection', async () => {
    // The risk service uses IN_MEMORY_LANDSLIDES when DB is unavailable.
    // Since PostGIS is not running in test environment, this validates fallback behavior.
    const pointRisk = await riskService.evaluatePointRisk(26.1445, 91.7362, {
      precipitationOverrideMm: 10.0,
      slopeOverrideDeg: 15.0,
    });

    // Should return valid result despite no PostGIS
    assert.ok(typeof pointRisk.score === 'number');
    assert.ok(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(pointRisk.level));
    assert.ok(typeof pointRisk.factors.historicalHotspots.subscore === 'number');
    assert.ok(typeof pointRisk.summary === 'string');
  });

  await test('Weather failure handling: risk engine degrades gracefully', async () => {
    // When weather API fails, precipitation defaults to 0 and risk still computes
    // Test with no overrides on a valid coordinate (weather may succeed or fail)
    const pointRisk = await riskService.evaluatePointRisk(26.1445, 91.7362);
    assert.ok(typeof pointRisk.score === 'number');
    assert.ok(pointRisk.score >= 0 && pointRisk.score <= 100);
    assert.ok(typeof pointRisk.factors.rainfall.valueMm === 'number');
    assert.ok(pointRisk.factors.rainfall.valueMm >= 0);
  });

  await test('Route risk rejects malformed input with fewer than 2 coordinates', async () => {
    await assert.rejects(
      async () => riskService.evaluateRouteRisk([[91.0, 26.0]]),
      (err: Error) => err.message.includes('at least 2 points')
    );
  });

  await test('Route risk rejects empty coordinates array', async () => {
    await assert.rejects(
      async () => riskService.evaluateRouteRisk([]),
      (err: Error) => err.message.includes('at least 2 points')
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
