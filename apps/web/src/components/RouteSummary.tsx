import type { CandidateRouteProfile } from '../types/api';
import { RISK_LEVEL_THEME } from '../config/map-theme';

interface RouteSummaryProps {
  selectedRoute: CandidateRouteProfile;
  strategy: 'SAFETY_OPTIMIZED' | 'SPEED_BASELINE';
  preference: string;
}

export default function RouteSummary({ selectedRoute, strategy, preference }: RouteSummaryProps) {
  const distanceKm = (selectedRoute.distanceMeters / 1000).toFixed(1);
  const durationMin = Math.round(selectedRoute.durationSeconds / 60);
  const hours = Math.floor(durationMin / 60);
  const remainingMins = durationMin % 60;
  const durationText = hours > 0 ? `${hours}h ${remainingMins}m` : `${durationMin} min`;

  const risk = selectedRoute.risk;
  const riskTheme = RISK_LEVEL_THEME[risk.overallLevel] || RISK_LEVEL_THEME.MEDIUM;

  return (
    <div className="intel-card" style={{ borderLeft: '4px solid #2563EB' }}>
      <div className="intel-card-header">
        <span className="intel-card-title" style={{ color: '#60A5FA' }}>
          <span>📍</span>
          <span>SELECTED ROUTE INTELLIGENCE</span>
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            padding: '2px 7px',
            borderRadius: 4,
            backgroundColor: strategy === 'SAFETY_OPTIMIZED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
            color: strategy === 'SAFETY_OPTIMIZED' ? '#34D399' : '#93C5FD',
            border: `1px solid ${strategy === 'SAFETY_OPTIMIZED' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`,
          }}
        >
          {preference} · {strategy === 'SAFETY_OPTIMIZED' ? 'SAFER' : 'BASELINE'}
        </span>
      </div>

      {/* Primary Telemetry Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {/* Distance Card */}
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid #334155',
            borderRadius: 6,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>
            Distance
          </div>
          <div style={{ fontSize: 20, color: '#F8FAFC' }} className="metric-value">
            {distanceKm} <span style={{ fontSize: 13, fontWeight: 500, color: '#94A3B8' }}>km</span>
          </div>
        </div>

        {/* ETA Card */}
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid #334155',
            borderRadius: 6,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>
            Estimated Travel
          </div>
          <div style={{ fontSize: 20, color: '#F8FAFC' }} className="metric-value">
            {durationText}
          </div>
        </div>
      </div>

      {/* Safety Risk Highlight Card */}
      <div
        style={{
          padding: '10px 12px',
          backgroundColor: riskTheme.bg,
          border: `1px solid ${riskTheme.border}`,
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: riskTheme.text, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            SAFETY RISK ASSESSMENT
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: riskTheme.color, marginTop: 2 }}>
            {riskTheme.label} · Dominant: {risk.dominantTrigger}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: riskTheme.color,
              lineHeight: 1,
            }}
          >
            {risk.meanScore.toFixed(1)}
          </div>
          <div style={{ fontSize: 9, fontWeight: 600, color: riskTheme.text, marginTop: 2 }}>
            PEAK: {risk.maxScore.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Waypoint sampling detail */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: '#94A3B8' }}>
        <span>Sampled points: {risk.sampledWaypointsCount}</span>
        <span>
          Hazardous segments: <strong style={{ color: risk.hazardousSegmentCount > 0 ? '#F87171' : '#34D399' }}>{risk.hazardousSegmentCount}</strong>
        </span>
      </div>
    </div>
  );
}
