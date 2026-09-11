import type { CandidateRouteProfile } from '../../types/api';
import { RISK_LEVEL_THEME, ACCESSIBILITY_THEME } from '../../config/map-theme';

interface DriverSafetyStatusProps {
  selectedRoute: CandidateRouteProfile;
  safetyStatus: {
    status: 'AVAILABLE' | 'DEGRADED';
    reason?: string;
  };
}

export default function DriverSafetyStatus({ selectedRoute, safetyStatus }: DriverSafetyStatusProps) {
  const risk = selectedRoute.risk;
  const riskTheme = RISK_LEVEL_THEME[risk.overallLevel] || RISK_LEVEL_THEME.MEDIUM;
  const ml = selectedRoute.mlSummary;
  const accessibilityStatus = selectedRoute.accessibility?.status ?? 'UNKNOWN';
  const accessibilityTheme = ACCESSIBILITY_THEME[accessibilityStatus as keyof typeof ACCESSIBILITY_THEME];

  return (
    <div className="driver-card">
      <div className="driver-nav-header">
        <span className="driver-nav-title">SAFETY STATUS</span>
        <span
          className={`driver-pill ${safetyStatus.status === 'AVAILABLE' ? 'driver-pill-ok' : 'driver-pill-warn'}`}
        >
          {safetyStatus.status}
        </span>
      </div>

      <div
        className="driver-risk-banner"
        style={{ backgroundColor: riskTheme.bg, borderColor: riskTheme.border }}
      >
        <span style={{ color: riskTheme.text, fontWeight: 800, fontSize: 11 }}>{riskTheme.label}</span>
        <span style={{ color: riskTheme.color, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
          {risk.meanScore.toFixed(1)} / 100
        </span>
      </div>

      <div className="driver-safety-grid">
        <div className="driver-safety-item">
          <span className="driver-metric-label">Peak Exposure</span>
          <span className="driver-metric-value">{risk.maxScore.toFixed(1)}</span>
        </div>
        <div className="driver-safety-item">
          <span className="driver-metric-label">Hazard Segments</span>
          <span className="driver-metric-value">{risk.hazardousSegmentCount}</span>
        </div>
        <div className="driver-safety-item">
          <span className="driver-metric-label">Dominant Trigger</span>
          <span className="driver-metric-value driver-metric-value-sm">{risk.dominantTrigger}</span>
        </div>
      </div>

      {ml && (
        <div className="driver-safety-item" style={{ marginBottom: 8 }}>
          <span className="driver-metric-label">ML Hazard Prediction</span>
          <span className="driver-metric-value driver-metric-value-sm">
            {ml.prediction === 'LANDSLIDE_RISK' ? 'Landslide Risk' : 'No Hazard'} ·{' '}
            {(ml.maxProbability * 100).toFixed(1)}%
          </span>
        </div>
      )}

      <div className="driver-safety-item">
        <span className="driver-metric-label">Corridor Accessibility</span>
        <span
          className="driver-metric-value driver-metric-value-sm"
          style={{ color: accessibilityTheme?.color }}
        >
          {accessibilityStatus}
        </span>
      </div>

      {safetyStatus.status === 'DEGRADED' && (
        <div className="driver-advisory">
          {safetyStatus.reason || 'Safety telemetry is partial.'}
        </div>
      )}
    </div>
  );
}