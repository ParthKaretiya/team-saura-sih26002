import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, getDbAvailability } from '../db/connection.js';
import { weatherService } from './weather.service.js';
import { incidentService } from './incident.service.js';
import { RISK_CONFIG, classifyRiskLevel } from '../config/risk.config.js';
import type {
  PointRiskAssessment,
  RiskFactorBreakdown,
  HistoricalLandslideRecord,
  HazardZoneFeatureCollection,
  HazardZoneFeature,
  RouteRiskSummary,
  SampledWaypointRisk,
} from '../types/risk.types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load curated historical landslides into in-memory store
function loadHistoricalLandslides(): HistoricalLandslideRecord[] {
  try {
    const jsonPath = path.join(__dirname, '../data/historical-landslides.json');
    if (fs.existsSync(jsonPath)) {
      const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      return raw.map((r: any) => ({
        id: r.id,
        name: r.name,
        longitude: r.coordinates[0],
        latitude: r.coordinates[1],
        state: r.state,
        eventDate: r.eventDate,
        triggerType: r.triggerType,
        fatalities: r.fatalities ?? 0,
        severity: r.severity ?? 'HIGH',
        provenance: r.provenance,
        description: r.description,
      }));
    }
  } catch (err) {
    console.warn('[RiskService] Could not read historical landslides JSON:', err);
  }
  return [];
}

const IN_MEMORY_LANDSLIDES = loadHistoricalLandslides();

type RiskIncident = {
  latitude: number;
  longitude: number;
  severity: string;
  status: string;
};

/**
 * Request-scoped data shared by one or more route-risk evaluations.
 * It preserves the established scoring rules while avoiding repeated incident
 * lookups and duplicate weather requests for shared route coordinates.
 */
export interface RouteRiskEvaluationContext {
  incidents: RiskIncident[];
  precipitationByCoordinate: Map<string, number>;
}

/**
 * Calculates Great Circle (Haversine) distance in kilometers between two lat/lon points.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371.0; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Derives realistic terrain slope angle for a coordinate in the North Eastern Region.
 * In a full raster deployment, this queries SRTM GeoTIFF tiles.
 */
export function estimateTerrainSlopeDegrees(latitude: number, longitude: number): number {
  // Meghalaya Plateau / Khasi-Jaintia Escarpment (25.1°N - 25.9°N, 91.2°E - 92.8°E)
  if (latitude >= 25.1 && latitude <= 25.95 && longitude >= 91.2 && longitude <= 92.8) {
    return 32.5;
  }
  // Sikkim / Darjeeling Himalaya (27.0°N - 27.8°N, 88.0°E - 88.9°E)
  if (latitude >= 27.0 && latitude <= 27.8 && longitude >= 88.0 && longitude <= 88.9) {
    return 38.0;
  }
  // Arunachal Foothills / Patkai Range (26.8°N - 28.5°N, 92.5°E - 96.5°E)
  if (latitude >= 26.8 && latitude <= 28.5 && longitude >= 92.5 && longitude <= 96.5) {
    return 35.0;
  }
  // Dima Hasao / Barail Hills (25.0°N - 25.5°N, 92.8°E - 93.5°E)
  if (latitude >= 25.0 && latitude <= 25.5 && longitude >= 92.8 && longitude <= 93.5) {
    return 29.0;
  }
  // Brahmaputra Valley Plains (Assam Central Plain)
  if (latitude >= 26.0 && latitude <= 26.8 && longitude >= 91.0 && longitude <= 94.0) {
    return 4.5;
  }
  // Default regional undulating terrain
  return 18.0;
}

export class RiskService {
  async createRouteRiskEvaluationContext(): Promise<RouteRiskEvaluationContext> {
    let incidents: RiskIncident[] = [];

    try {
      const incGeoJson = await incidentService.listIncidents();
      incidents = incGeoJson.features.map((feature) => ({
        longitude: feature.geometry.coordinates[0],
        latitude: feature.geometry.coordinates[1],
        severity: feature.properties.severity,
        status: feature.properties.status,
      }));
    } catch {
      // Preserve the existing unavailable-incident fallback for this request.
      incidents = [];
    }

    return {
      incidents,
      precipitationByCoordinate: new Map<string, number>(),
    };
  }

  /**
   * Calculates explainable rainfall subscore [0, 100].
   */
  calculateRainfallSubscore(precipitationMm: number): { subscore: number; description: string } {
    const p = Math.max(0, precipitationMm);
    if (p < RISK_CONFIG.rainfall.lowMaxMm) {
      return { subscore: 0.0, description: `Dry / Minimal precipitation (${p.toFixed(1)}mm)` };
    }
    if (p <= RISK_CONFIG.rainfall.moderateMaxMm) {
      return { subscore: 30.0, description: `Moderate rainfall (${p.toFixed(1)}mm)` };
    }
    if (p <= RISK_CONFIG.rainfall.heavyMaxMm) {
      return { subscore: 70.0, description: `Heavy precipitation alert (${p.toFixed(1)}mm)` };
    }
    return { subscore: 100.0, description: `Torrential downpour hazard (${p.toFixed(1)}mm)` };
  }

  /**
   * Calculates terrain slope subscore [0, 100].
   */
  calculateSlopeSubscore(slopeDegrees: number): { subscore: number; description: string } {
    const s = Math.max(0, slopeDegrees);
    if (s < RISK_CONFIG.slope.flatMaxDeg) {
      return { subscore: 0.0, description: `Gentle valley / plain terrain (${s.toFixed(1)}°)` };
    }
    if (s <= RISK_CONFIG.slope.gentleMaxDeg) {
      return { subscore: 40.0, description: `Moderate hilly incline (${s.toFixed(1)}°)` };
    }
    if (s <= RISK_CONFIG.slope.steepMaxDeg) {
      return { subscore: 75.0, description: `Steep mountain escarpment (${s.toFixed(1)}°)` };
    }
    return { subscore: 100.0, description: `Extreme sheer cliff slope (${s.toFixed(1)}°)` };
  }

  /**
   * Calculates active incident proximity subscore [0, 100].
   */
  calculateIncidentSubscore(
    latitude: number,
    longitude: number,
    incidents: Array<{ latitude: number; longitude: number; severity: string; status: string }>
  ): { subscore: number; nearestDistanceKm: number | null; countWithin15km: number; description: string } {
    const active = incidents.filter(i => i.status !== 'RESOLVED' && i.status !== 'REJECTED');
    if (active.length === 0) {
      return { subscore: 0, nearestDistanceKm: null, countWithin15km: 0, description: 'No active road disruptions within corridor' };
    }

    let minDistance = Infinity;
    let mostSevere = 'LOW';
    let count15km = 0;

    for (const inc of active) {
      const dist = calculateHaversineDistanceKm(latitude, longitude, inc.latitude, inc.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        mostSevere = inc.severity;
      }
      if (dist <= RISK_CONFIG.incidents.localDistanceKm) {
        count15km++;
      }
    }

    if (minDistance === Infinity || minDistance > RISK_CONFIG.incidents.maxSearchRadiusKm) {
      return { subscore: 0, nearestDistanceKm: null, countWithin15km: 0, description: 'No active incidents within 25km' };
    }

    let base = 0;
    if (minDistance <= RISK_CONFIG.incidents.immediateDistanceKm) {
      base = mostSevere === 'CRITICAL' ? 100 : mostSevere === 'HIGH' ? 80 : 50;
    } else if (minDistance <= RISK_CONFIG.incidents.localDistanceKm) {
      base = mostSevere === 'CRITICAL' ? 60 : mostSevere === 'HIGH' ? 40 : 25;
    } else {
      base = 15;
    }

    return {
      subscore: base,
      nearestDistanceKm: minDistance,
      countWithin15km: count15km,
      description: `Active ${mostSevere} incident ${minDistance.toFixed(1)}km away (${count15km} within 15km)`,
    };
  }

  /**
   * Calculates historical landslide hotspot subscore [0, 100].
   */
  calculateHistoricalSubscore(
    latitude: number,
    longitude: number
  ): { subscore: number; nearestDistanceKm: number | null; nearestName?: string; description: string } {
    let minDistance = Infinity;
    let nearestRecord: HistoricalLandslideRecord | undefined;

    for (const ls of IN_MEMORY_LANDSLIDES) {
      const dist = calculateHaversineDistanceKm(latitude, longitude, ls.latitude, ls.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        nearestRecord = ls;
      }
    }

    if (minDistance === Infinity || minDistance > RISK_CONFIG.history.maxSearchRadiusKm) {
      return { subscore: 0, nearestDistanceKm: null, description: 'No historical landslide hotspots within 15km' };
    }

    let subscore = 0;
    if (minDistance <= RISK_CONFIG.history.directHotspotKm) {
      subscore = 100;
    } else if (minDistance <= RISK_CONFIG.history.adjacentHotspotKm) {
      subscore = 60;
    } else if (minDistance <= RISK_CONFIG.history.regionalHotspotKm) {
      subscore = 30;
    } else {
      subscore = 10;
    }

    return {
      subscore,
      nearestDistanceKm: minDistance,
      nearestName: nearestRecord?.name,
      description: `Known historical landslide zone: "${nearestRecord?.name}" ${minDistance.toFixed(1)}km away`,
    };
  }

  /**
   * Evaluates composite multi-factor risk at a single geographic coordinate.
   */
  async evaluatePointRisk(
    latitude: number,
    longitude: number,
    options?: { precipitationOverrideMm?: number; slopeOverrideDeg?: number },
    context?: RouteRiskEvaluationContext,
  ): Promise<PointRiskAssessment> {
    // 1. Weather Factor
    let precipitationMm = options?.precipitationOverrideMm ?? 0.0;
    if (options?.precipitationOverrideMm === undefined) {
      const coordinateKey = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
      const cachedPrecipitation = context?.precipitationByCoordinate.get(coordinateKey);

      if (cachedPrecipitation !== undefined) {
        precipitationMm = cachedPrecipitation;
      } else {
        try {
          const weather = await weatherService.getWeatherForCoordinate(latitude, longitude);
          precipitationMm = weather.current.precipitation;
          if (Array.isArray(weather.forecast) && weather.forecast.length > 0) {
            const forecastSum = weather.forecast.slice(0, 12).reduce((sum, h) => sum + (h.precipitation || 0), 0);
            precipitationMm = Math.max(precipitationMm, forecastSum);
          }
        } catch {
          // Fallback to baseline
          precipitationMm = 0.0;
        }
        context?.precipitationByCoordinate.set(coordinateKey, precipitationMm);
      }
    }
    const rainResult = this.calculateRainfallSubscore(precipitationMm);

    // 2. Terrain Slope Factor
    const slopeDeg = options?.slopeOverrideDeg ?? estimateTerrainSlopeDegrees(latitude, longitude);
    const slopeResult = this.calculateSlopeSubscore(slopeDeg);

    // 3. Active Incident Proximity Factor
    let incidentsList: RiskIncident[] = context?.incidents ?? [];
    if (!context) {
      try {
        const incGeoJson = await incidentService.listIncidents();
        incidentsList = incGeoJson.features.map(f => ({
          longitude: f.geometry.coordinates[0],
          latitude: f.geometry.coordinates[1],
          severity: f.properties.severity,
          status: f.properties.status,
        }));
      } catch {
        incidentsList = [];
      }
    }
    const incidentResult = this.calculateIncidentSubscore(latitude, longitude, incidentsList);

    // 4. Historical Hotspot Proximity Factor
    const historyResult = this.calculateHistoricalSubscore(latitude, longitude);

    // 5. Composite Weighted Calculation
    const weightedScore =
      rainResult.subscore * RISK_CONFIG.weights.rainfall +
      slopeResult.subscore * RISK_CONFIG.weights.slope +
      incidentResult.subscore * RISK_CONFIG.weights.activeIncidents +
      historyResult.subscore * RISK_CONFIG.weights.historicalHotspots;

    const clampedScore = Math.max(0, Math.min(100, Math.round(weightedScore * 10) / 10));
    const level = classifyRiskLevel(clampedScore);

    // 6. Explainable summary
    const factorSummaries: string[] = [];
    if (rainResult.subscore >= 70) factorSummaries.push(`heavy precipitation (${precipitationMm.toFixed(1)}mm)`);
    if (slopeResult.subscore >= 75) factorSummaries.push(`steep escarpment (${slopeDeg.toFixed(1)}°)`);
    if (incidentResult.subscore >= 50) factorSummaries.push(incidentResult.description);
    if (historyResult.subscore >= 60) factorSummaries.push(`proximity to ${historyResult.nearestName}`);

    const summary =
      factorSummaries.length > 0
        ? `${level} risk driven by ${factorSummaries.join(', ')}.`
        : `${level} hazard risk — normal transit conditions.`;

    const factors: RiskFactorBreakdown = {
      rainfall: {
        subscore: rainResult.subscore,
        valueMm: precipitationMm,
        weight: RISK_CONFIG.weights.rainfall,
        description: rainResult.description,
      },
      slope: {
        subscore: slopeResult.subscore,
        degrees: slopeDeg,
        weight: RISK_CONFIG.weights.slope,
        description: slopeResult.description,
      },
      activeIncidents: {
        subscore: incidentResult.subscore,
        nearestDistanceKm: incidentResult.nearestDistanceKm,
        countWithin15km: incidentResult.countWithin15km,
        weight: RISK_CONFIG.weights.activeIncidents,
        description: incidentResult.description,
      },
      historicalHotspots: {
        subscore: historyResult.subscore,
        nearestDistanceKm: historyResult.nearestDistanceKm,
        nearestName: historyResult.nearestName,
        weight: RISK_CONFIG.weights.historicalHotspots,
        description: historyResult.description,
      },
    };

    return {
      location: { latitude, longitude },
      score: clampedScore,
      level,
      factors,
      summary,
    };
  }

  /**
   * Samples a highway LineString along the route (configured interval, default 3km) and aggregates corridor risk profile.
   */
  async evaluateRouteRisk(
    coordinates: Array<[longitude: number, latitude: number]>,
    context?: RouteRiskEvaluationContext,
  ): Promise<RouteRiskSummary> {
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      throw new Error('Route coordinates must contain at least 2 points.');
    }

    const samplingIntervalKm = RISK_CONFIG.samplingIntervalKm ?? 3.0;

    // 1. Sample coordinates along route
    const sampledPoints: Array<{ coord: [number, number]; distAlongKm: number }> = [];
    let accumulatedDistKm = 0;
    sampledPoints.push({ coord: coordinates[0], distAlongKm: 0 });

    let lastSampledCoord = coordinates[0];
    for (let i = 1; i < coordinates.length; i++) {
      const prev = coordinates[i - 1];
      const curr = coordinates[i];
      const segmentDistKm = calculateHaversineDistanceKm(prev[1], prev[0], curr[1], curr[0]);
      accumulatedDistKm += segmentDistKm;

      const distFromLastSampleKm = calculateHaversineDistanceKm(
        lastSampledCoord[1],
        lastSampledCoord[0],
        curr[1],
        curr[0]
      );

      if (distFromLastSampleKm >= samplingIntervalKm || i === coordinates.length - 1) {
        sampledPoints.push({ coord: curr, distAlongKm: Math.round(accumulatedDistKm * 10) / 10 });
        lastSampledCoord = curr;
      }
    }

    // 2. Evaluate risk for sampled points
    const waypoints: SampledWaypointRisk[] = [];
    let totalScore = 0;
    let maxScore = 0;
    let hazardousCount = 0;
    const triggerCounts: Record<string, number> = {};

    for (const p of sampledPoints) {
      const [lon, lat] = p.coord;
      const pointRisk = await this.evaluatePointRisk(lat, lon, undefined, context);

      totalScore += pointRisk.score;
      if (pointRisk.score > maxScore) maxScore = pointRisk.score;
      if (pointRisk.level === 'HIGH' || pointRisk.level === 'CRITICAL') {
        hazardousCount++;
      }

      // Identify dominant factor for this waypoint
      let highestSubscore = -1;
      let dominant = 'Slope';
      if (pointRisk.factors.rainfall.subscore > highestSubscore) {
        highestSubscore = pointRisk.factors.rainfall.subscore;
        dominant = 'Rainfall';
      }
      if (pointRisk.factors.activeIncidents.subscore > highestSubscore) {
        highestSubscore = pointRisk.factors.activeIncidents.subscore;
        dominant = 'Active Incident';
      }
      if (pointRisk.factors.slope.subscore > highestSubscore) {
        highestSubscore = pointRisk.factors.slope.subscore;
        dominant = 'Steep Terrain';
      }
      if (pointRisk.factors.historicalHotspots.subscore > highestSubscore) {
        highestSubscore = pointRisk.factors.historicalHotspots.subscore;
        dominant = 'Landslide Hotspot';
      }

      triggerCounts[dominant] = (triggerCounts[dominant] || 0) + 1;

      waypoints.push({
        coordinates: p.coord,
        distanceAlongRouteKm: p.distAlongKm,
        score: pointRisk.score,
        level: pointRisk.level,
        primaryFactor: dominant,
      });
    }

    const meanScore = Math.round((totalScore / waypoints.length) * 10) / 10;
    const overallLevel = classifyRiskLevel(maxScore * 0.6 + meanScore * 0.4);

    let dominantTrigger = 'Normal Conditions';
    let maxTriggerCount = 0;
    for (const [trig, count] of Object.entries(triggerCounts)) {
      if (count > maxTriggerCount) {
        maxTriggerCount = count;
        dominantTrigger = trig;
      }
    }

    return {
      overallLevel,
      meanScore,
      maxScore,
      hazardousSegmentCount: hazardousCount,
      dominantTrigger,
      sampledWaypointsCount: waypoints.length,
      waypoints,
    };
  }

  /**
   * Returns GeoJSON FeatureCollection of historical hazard zones for map visualization.
   */
  listHazardZones(): HazardZoneFeatureCollection {
    const features: HazardZoneFeature[] = IN_MEMORY_LANDSLIDES.map(ls => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [ls.longitude, ls.latitude], // [lon, lat]
      },
      properties: {
        id: ls.id,
        name: ls.name,
        state: ls.state,
        severity: ls.severity || 'HIGH',
        eventDate: ls.eventDate,
        triggerType: ls.triggerType,
        fatalities: ls.fatalities,
        provenanceSource: typeof ls.provenance?.source === 'string' ? ls.provenance.source : undefined,
        description: ls.description,
      },
    }));

    return {
      type: 'FeatureCollection',
      features,
    };
  }
}

export const riskService = new RiskService();
