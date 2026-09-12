import type { CandidateRouteProfile, RoutingPreference } from '../../types/api';
import type { LiveTripProgress } from '../../utils/eta';
import { formatDuration } from '../../utils/eta';
import { RISK_LEVEL_THEME } from '../../config/map-theme';

interface DriverRouteSummaryProps {
  selectedRoute: CandidateRouteProfile;
  preference: RoutingPreference;
  strategy: 'SAFETY_OPTIMIZED' | 'SPEED_BASELINE';
  liveProgress?: LiveTripProgress | null;
}

export default function DriverRouteSummary({
  selectedRoute,
  strategy,
  liveProgress,
}: DriverRouteSummaryProps) {
  const distanceKm = liveProgress
    ? liveProgress.formattedRemainingDistanceKm
    : (selectedRoute.distanceMeters / 1000).toFixed(1);

  const durationStr = liveProgress
    ? liveProgress.formattedRemainingDuration
    : formatDuration(selectedRoute.durationSeconds);

  const etaStr = liveProgress
    ? liveProgress.formattedArrivalTime
    : '--:--';

  const riskTheme = RISK_LEVEL_THEME[selectedRoute.risk.overallLevel] || RISK_LEVEL_THEME.MEDIUM;

  const isHighRisk = selectedRoute.risk.overallLevel === 'CRITICAL' || selectedRoute.risk.overallLevel === 'HIGH';
  const riskLabel = isHighRisk
    ? 'Road ahead looks risky'
    : selectedRoute.risk.overallLevel === 'MEDIUM'
    ? 'Moderate caution needed'
    : 'Safe conditions';

  const weatherDelayMinutes = selectedRoute.weatherDelaySeconds
    ? Math.round(selectedRoute.weatherDelaySeconds / 60)
    : 0;

  return (
    <div className="driver-card">
      <div className="driver-nav-header">
        <span className="driver-nav-title">TRIP OVERVIEW</span>
        <span className="driver-pill">
          {strategy === 'SAFETY_OPTIMIZED' ? 'Safe Route' : 'Direct Route'}
        </span>
      </div>

      <div className="driver-metrics">
        <div className="driver-metric">
          <span className="driver-metric-label">Remaining</span>
          <span className="driver-metric-value">{distanceKm} km</span>
        </div>
        <div className="driver-metric">
          <span className="driver-metric-label">Travel Time</span>
          <span className="driver-metric-value">{durationStr}</span>
        </div>
        <div className="driver-metric">
          <span className="driver-metric-label">Est. Arrival</span>
          <span className="driver-metric-value">{etaStr}</span>
        </div>
      </div>

      <div
        className="driver-risk-banner"
        style={{ backgroundColor: riskTheme.bg, borderColor: riskTheme.border }}
      >
        <span style={{ color: riskTheme.text, fontWeight: 800, fontSize: 12 }}>{riskLabel}</span>
        <span style={{ color: riskTheme.color, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
          Risk score: {selectedRoute.risk.meanScore.toFixed(0)} / 100
        </span>
      </div>

      <div className="driver-route-foot">
        <span>
          Main concern: <strong>{selectedRoute.risk.dominantTrigger}</strong>
        </span>
        <span>
          Caution zones: <strong>{selectedRoute.risk.hazardousSegmentCount}</strong>
        </span>
        {weatherDelayMinutes > 0 && (
          <span>
            Rain delay: <strong>+{weatherDelayMinutes} min</strong>
          </span>
        )}
      </div>
    </div>
  );
}