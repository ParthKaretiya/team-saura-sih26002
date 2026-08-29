/**
 * Generic Telemetry Simulator for SauraRoute
 *
 * Emits GPS coordinates along any arbitrary sequence of waypoints [[lon, lat], ...].
 * Calculates heading and speed dynamically, pushing updates to the API.
 */

export interface VehicleRouteSimulation {
  vehicleId: string;
  vehicleCode: string;
  speedKmh: number;
  waypoints: Array<[number, number]>; // [[lon, lat], ...]
}

/**
 * Calculates compass heading (0° = North, 90° = East, 180° = South, 270° = West)
 * between two [longitude, latitude] coordinates.
 */
export function calculateHeading(
  from: [number, number],
  to: [number, number]
): number {
  const [lon1, lat1] = from;
  const [lon2, lat2] = to;

  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  brng = (brng + 360) % 360;
  return Math.round(brng * 10) / 10;
}

// Sample generic waypoint sequences (can be swapped with GraphHopper route coordinates later)
export const DEFAULT_SIMULATION_ROUTES: VehicleRouteSimulation[] = [
  {
    vehicleId: 'vh_saura_001',
    vehicleCode: 'SAURA-001',
    speedKmh: 45.0,
    waypoints: [
      [91.7362, 26.1445], // Guwahati
      [91.7510, 26.1020],
      [91.7730, 26.0450],
      [91.7821, 25.9810], // Near Nongpoh
      [91.8150, 25.8950],
      [91.8520, 25.7500],
      [91.8933, 25.5788], // Shillong
    ],
  },
  {
    vehicleId: 'vh_saura_002',
    vehicleCode: 'SAURA-002',
    speedKmh: 40.0,
    waypoints: [
      [91.8933, 25.5788], // Shillong
      [91.8520, 25.7500],
      [91.8150, 25.8950],
      [91.7821, 25.9810],
      [91.7730, 26.0450],
      [91.7362, 26.1445], // Guwahati
    ],
  },
  {
    vehicleId: 'vh_saura_003',
    vehicleCode: 'SAURA-003',
    speedKmh: 50.0,
    waypoints: [
      [91.7362, 26.1445], // Guwahati
      [92.1000, 26.2000],
      [92.5000, 26.3000],
      [92.8000, 26.5000], // Tezpur
    ],
  },
];

export async function runSimulationStep(
  apiBaseUrl: string,
  routes: VehicleRouteSimulation[],
  stepIndex: number
): Promise<void> {
  for (const route of routes) {
    const totalPoints = route.waypoints.length;
    const currentIdx = stepIndex % totalPoints;
    const nextIdx = (stepIndex + 1) % totalPoints;

    const currentCoord = route.waypoints[currentIdx];
    const nextCoord = route.waypoints[nextIdx];

    const heading = calculateHeading(currentCoord, nextCoord);
    const [longitude, latitude] = currentCoord;

    const payload = {
      latitude,
      longitude,
      speed: route.speedKmh,
      heading,
    };

    try {
      const res = await fetch(`${apiBaseUrl}/api/vehicles/${route.vehicleId}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.warn(`[Simulator] Failed to update ${route.vehicleCode}: HTTP ${res.status}`);
      } else {
        console.log(`[Simulator] ${route.vehicleCode} -> [${longitude.toFixed(4)}, ${latitude.toFixed(4)}] | ${route.speedKmh} km/h | ${heading}°`);
      }
    } catch (err) {
      console.warn(`[Simulator] Network error updating ${route.vehicleCode}: ${(err as Error).message}`);
    }
  }
}

// Standalone runner
if (process.argv[1]?.endsWith('simulate-telematics.ts')) {
  const PORT = process.env.API_PORT || '3000';
  const API_URL = `http://localhost:${PORT}`;
  const intervalMs = 3000;

  console.log(`[Simulator] Starting telemetry simulator against ${API_URL} (Interval: ${intervalMs}ms)...`);
  let step = 0;

  setInterval(async () => {
    await runSimulationStep(API_URL, DEFAULT_SIMULATION_ROUTES, step);
    step++;
  }, intervalMs);
}
