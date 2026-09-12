import type { CandidateRouteProfile } from '../../types/api';
import { RISK_LEVEL_FILL, ACCESSIBILITY_THEME } from '../../config/map-theme';

interface DriverSafetyStatusProps {
  selectedRoute: CandidateRouteProfile;
  safetyStatus: {
    status: 'AVAILABLE' | 'DEGRADED';
    reason?: string;
  };
}

export default function DriverSafetyStatus({ selectedRoute, safetyStatus }: DriverSafetyStatusProps) {
  const risk = selectedRoute.risk;
  const riskFill = RISK_LEVEL_FILL[risk.overallLevel] ?? RISK_LEVEL_FILL.MEDIUM;
  const ml = selectedRoute.mlSummary;
  const accessibilityStatus = selectedRoute.accessibility?.status ?? 'UNKNOWN';
  const accessibilityTheme =
    accessibilityStatus === 'ACCESSIBLE'
      ? ACCESSIBILITY_THEME.OPEN
      : ACCESSIBILITY_THEME[accessibilityStatus as keyof typeof ACCESSIBILITY_THEME];

  // Friendly plain-language risk assessment
  const isHighRisk = risk.overallLevel === 'CRITICAL' || risk.overallLevel === 'HIGH';
  const isMedRisk = risk.overallLevel === 'MEDIUM';
  const riskHeadline = isHighRisk
    ? 'Road ahead looks risky'
    : isMedRisk
    ? 'Moderate caution advised'
    : 'Road conditions look good';

  const highwayStatusLabel =
    accessibilityStatus === 'ACCESSIBLE'
      ? 'Open to traffic'
      : accessibilityStatus === 'RESTRICTED'
      ? 'Restricted / Single lane'
      : accessibilityStatus === 'CLOSED'
      ? 'Closed ahead'
      : 'Open to traffic';

  return (
    <div className="driver-card">
      <div className="driver-nav-header">
        <span className="driver-nav-title">ROAD SAFETY AHEAD</span>
        <span
          className={`driver-pill ${safetyStatus.status === 'AVAILABLE' ? 'driver-pill-ok' : 'driver-pill-warn'}`}
        >
          {safetyStatus.status === 'AVAILABLE' ? 'Safety Active' : 'Limited Data'}
        </span>
      </div>

      {/* Plain language indicator banner with secondary score */}
      <div
        className="driver-risk-banner"
        style={{ backgroundColor: `${riskFill}1F`, borderColor: `${riskFill}59` }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{isHighRisk ? '⚠️' : isMedRisk ? 'ℹ️' : '✓'}</span>
          <span style={{ color: riskFill, fontWeight: 800, fontSize: 13 }}>{riskHeadline}</span>
        </div>
        <span style={{ color: riskFill, fontWeight: 700, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
          Score: {risk.meanScore.toFixed(0)} / 100
        </span>
      </div>

      <div className="driver-safety-grid">
        <div className="driver-safety-item">
          <span className="driver-metric-label">Highest risk spot</span>
          <span className="driver-metric-value">{risk.maxScore.toFixed(0)} / 100</span>
        </div>
        <div className="driver-safety-item">
          <span className="driver-metric-label">Caution zones</span>
          <span className="driver-metric-value">{risk.hazardousSegmentCount}</span>
        </div>
        <div className="driver-safety-item" style={{ gridColumn: 'span 2' }}>
          <span className="driver-metric-label">Main concern</span>
          <span className="driver-metric-value driver-metric-value-sm" style={{ fontWeight: 700 }}>
            {risk.dominantTrigger}
          </span>
        </div>
      </div>

      {ml && (
        <div className="driver-safety-item" style={{ marginBottom: 8 }}>
          <span className="driver-metric-label">AI Landslide Alert</span>
          <span className="driver-metric-value driver-metric-value-sm">
            {ml.prediction === 'LANDSLIDE_RISK' ? 'Landslide caution' : 'Clear terrain'} ·{' '}
            {(ml.maxProbability * 100).toFixed(0)}% likelihood
          </span>
        </div>
      )}

      <div className="driver-safety-item">
        <span className="driver-metric-label">Highway Status</span>
        <span
          className="driver-metric-value driver-metric-value-sm"
          style={{ color: accessibilityTheme?.color || '#34D399', fontWeight: 700 }}
        >
          {highwayStatusLabel}
        </span>
      </div>

      {safetyStatus.status === 'DEGRADED' && (
        <div className="driver-advisory">
          {safetyStatus.reason || 'Weather or radar feeds are partially unavailable; drive with usual care.'}
        </div>
      )}
    </div>
  );
}