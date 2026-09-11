import type { CandidateRouteProfile, RoutingPreference } from '../../types/api';
import { RISK_LEVEL_THEME } from '../../config/map-theme';

interface DriverRouteSummaryProps {
  selectedRoute: CandidateRouteProfile;
  preference: RoutingPreference;
  strategy: 'SAFETY_OPTIMIZED' | 'SPEED_BASELINE';
}

function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${totalMinutes} min`;
}

function formatArrival(seconds: number): string {
  const arrival = new Date(Date.now() + seconds * 1000);
  return arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function DriverRouteSummary({
  selectedRoute,
  preference,
  strategy,
}: DriverRouteSummaryProps) {
  const distanceKm = (selectedRoute.distanceMeters / 1000).toFixed(1);
  const riskTheme = RISK_LEVEL_THEME[selectedRoute.risk.overallLevel] || RISK_LEVEL_THEME.MEDIUM;

  return (
    <div className="driver-card">
      <div className="driver-nav-header">
        <span className="driver-nav-title">ROUTE SUMMARY</span>
        <span className="driver-pill">
          {preference} · {strategy === 'SAFETY_OPTIMIZED' ? 'SAFER' : 'BASELINE'}
        </span>
      </div>

      <div className="driver-metrics">
        <div className="driver-metric">
          <span className="driver-metric-label">Distance</span>
          <span className="driver-metric-value">{distanceKm} km</span>
        </div>
        <div className="driver-metric">
          <span className="driver-metric-label">Travel Time</span>
          <span className="driver-metric-value">{formatDuration(selectedRoute.durationSeconds)}</span>
        </div>
        <div className="driver-metric">
          <span className="driver-metric-label">Est. Arrival</span>
          <span className="driver-metric-value">{formatArrival(selectedRoute.durationSeconds)}</span>
        </div>
      </div>

      <div
        className="driver-risk-banner"
        style={{ backgroundColor: riskTheme.bg, borderColor: riskTheme.border }}
      >
        <span style={{ color: riskTheme.text, fontWeight: 800, fontSize: 11 }}>{riskTheme.label}</span>
        <span style={{ color: riskTheme.color, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
          {selectedRoute.risk.meanScore.toFixed(1)}
        </span>
      </div>

      <div className="driver-route-foot">
        <span>
          Dominant trigger: <strong>{selectedRoute.risk.dominantTrigger}</strong>
        </span>
        <span>
          Hazard segments: <strong>{selectedRoute.risk.hazardousSegmentCount}</strong>
        </span>
      </div>
    </div>
  );
}