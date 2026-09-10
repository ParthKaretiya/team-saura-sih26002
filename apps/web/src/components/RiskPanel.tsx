import type { CandidateRouteProfile } from '../types/api';
import { RISK_LEVEL_THEME } from '../config/map-theme';
import RiskContributors from './RiskContributors';

interface RiskPanelProps {
  selectedRoute: CandidateRouteProfile;
  safetyStatus?: {
    status: 'AVAILABLE' | 'DEGRADED';
    reason?: string;
  };
}

export default function RiskPanel({ selectedRoute, safetyStatus }: RiskPanelProps) {
  const risk = selectedRoute.risk;
  const riskTheme = RISK_LEVEL_THEME[risk.overallLevel] || RISK_LEVEL_THEME.MEDIUM;
  const ml = selectedRoute.mlSummary;

  return (
    <div className="intel-card">
      <div className="intel-card-header">
        <span className="intel-card-title">
          <span>🛡️</span>
          <span>AI Route Risk Intelligence</span>
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            padding: '2px 7px',
            borderRadius: 4,
            backgroundColor: riskTheme.bg,
            color: riskTheme.color,
            border: `1px solid ${riskTheme.border}`,
          }}
        >
          {risk.overallLevel} RISK TIER
        </span>
      </div>

      {/* Main Score Display Box */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid #334155',
          borderRadius: 8,
          marginBottom: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>
            Overall Risk Score (0–100)
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
            <span
              style={{
                fontSize: 28,
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                color: riskTheme.color,
                lineHeight: 1,
              }}
            >
              {risk.meanScore.toFixed(1)}
            </span>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>/ 100</span>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: '#94A3B8' }}>PEAK EXPOSURE</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC', fontFamily: 'var(--font-mono)' }}>
            {risk.maxScore.toFixed(1)}
          </div>
          <div style={{ fontSize: 10, color: risk.hazardousSegmentCount > 0 ? '#F87171' : '#34D399' }}>
            {risk.hazardousSegmentCount} hazard zone{risk.hazardousSegmentCount === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {/* Dominant Risk Driver */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '7px 10px',
          backgroundColor: 'rgba(30, 41, 59, 0.5)',
          borderRadius: 6,
          fontSize: 11,
          color: '#CBD5E1',
          marginBottom: 6,
        }}
      >
        <span style={{ color: '#94A3B8' }}>Dominant Risk Driver:</span>
        <strong style={{ color: '#F8FAFC' }}>{risk.dominantTrigger}</strong>
      </div>

      {/* ML Prediction Advisory (Real backend ML prediction if present) */}
      {ml && (
        <div
          style={{
            padding: '8px 10px',
            backgroundColor: ml.prediction === 'LANDSLIDE_RISK' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            border: `1px solid ${ml.prediction === 'LANDSLIDE_RISK' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            borderRadius: 6,
            fontSize: 11,
            marginTop: 8,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: ml.prediction === 'LANDSLIDE_RISK' ? '#F87171' : '#34D399' }}>
              🤖 ML Model Inference: {ml.prediction.replace('_', ' ')}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#F8FAFC' }}>
              {(ml.maxProbability * 100).toFixed(1)}% prob
            </span>
          </div>
          <div style={{ color: '#94A3B8', fontSize: 10, marginTop: 2 }}>
            Tier: {ml.riskTier} · Evaluated on sampled high-exposure route waypoints
          </div>
        </div>
      )}

      {/* Degraded Risk Advisory */}
      {safetyStatus?.status === 'DEGRADED' && (
        <div
          style={{
            marginTop: 8,
            padding: '6px 10px',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: 6,
            fontSize: 11,
            color: '#FCD34D',
          }}
        >
          ⚠️ <strong>Degraded telemetry:</strong> {safetyStatus.reason || 'Telemetry data is partial.'}
        </div>
      )}

      {/* Risk Contributors */}
      <RiskContributors selectedRoute={selectedRoute} />
    </div>
  );
}
