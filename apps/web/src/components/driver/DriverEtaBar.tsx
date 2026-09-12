import type { CandidateRouteProfile } from '../../types/api';
import type { LiveTripProgress } from '../../utils/eta';
import { formatDuration } from '../../utils/eta';

interface DriverEtaBarProps {
  selectedRoute: CandidateRouteProfile;
  liveProgress?: LiveTripProgress | null;
}

export default function DriverEtaBar({ selectedRoute, liveProgress }: DriverEtaBarProps) {
  const distanceKm = liveProgress
    ? liveProgress.formattedRemainingDistanceKm
    : (selectedRoute.distanceMeters / 1000).toFixed(0);

  const durationStr = liveProgress
    ? liveProgress.formattedRemainingDuration
    : formatDuration(selectedRoute.durationSeconds);

  const etaStr = liveProgress
    ? liveProgress.formattedArrivalTime
    : '--:--';

  const weatherDelayMinutes = selectedRoute.weatherDelaySeconds
    ? Math.round(selectedRoute.weatherDelaySeconds / 60)
    : 0;

  return (
    <div className="driver-eta-container">
      {weatherDelayMinutes > 0 && (
        <div className="driver-eta-delay-badge">
          <span>🌧️</span>
          <span>Includes +{weatherDelayMinutes} min weather delay for heavy rain zones</span>
        </div>
      )}
      <div className="driver-eta-bar">
        <div className="driver-eta-cell">
          <span className="driver-eta-value">{distanceKm}</span>
          <span className="driver-eta-unit">km</span>
        </div>
        <div className="driver-eta-divider" />
        <div className="driver-eta-cell">
          <span className="driver-eta-value">{durationStr}</span>
        </div>
        <div className="driver-eta-divider" />
        <div className="driver-eta-cell">
          <span className="driver-eta-label">ETA</span>
          <span className="driver-eta-value">{etaStr}</span>
        </div>
      </div>
    </div>
  );
}