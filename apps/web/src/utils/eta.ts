/**
 * Live trip progress and dynamic ETA calculations for drivers.
 * Simulates real-time advancement along the planned route based on elapsed time.
 */

export interface LiveTripProgress {
  elapsedSeconds: number;
  remainingSeconds: number;
  remainingDistanceMeters: number;
  completedDistanceMeters: number;
  progressFraction: number; // 0.0 to 1.0
  projectedArrival: Date;
  formattedRemainingDuration: string;
  formattedArrivalTime: string;
  formattedRemainingDistanceKm: string;
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return 'Arrived';
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${totalMinutes} min`;
}

export function formatArrival(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function computeLiveTripProgress(
  totalDistanceMeters: number,
  totalDurationSeconds: number,
  tripStartTimeMs: number,
  currentTimeMs: number = Date.now()
): LiveTripProgress {
  const elapsedSeconds = Math.max(0, Math.floor((currentTimeMs - tripStartTimeMs) / 1000));
  const progressFraction =
    totalDurationSeconds > 0
      ? Math.min(1, Math.max(0, elapsedSeconds / totalDurationSeconds))
      : 1;

  const remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds);
  const completedDistanceMeters = Math.min(
    totalDistanceMeters,
    Math.round(totalDistanceMeters * progressFraction)
  );
  const remainingDistanceMeters = Math.max(0, totalDistanceMeters - completedDistanceMeters);
  const projectedArrival = new Date(currentTimeMs + remainingSeconds * 1000);

  const remainingKm = remainingDistanceMeters / 1000;
  const formattedRemainingDistanceKm =
    remainingKm < 10 ? remainingKm.toFixed(1) : remainingKm.toFixed(0);

  return {
    elapsedSeconds,
    remainingSeconds,
    remainingDistanceMeters,
    completedDistanceMeters,
    progressFraction,
    projectedArrival,
    formattedRemainingDuration: formatDuration(remainingSeconds),
    formattedArrivalTime: formatArrival(projectedArrival),
    formattedRemainingDistanceKm,
  };
}
