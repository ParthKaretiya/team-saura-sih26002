import type { CandidateRouteProfile } from '../types/api';
import { RISK_LEVEL_THEME } from '../config/map-theme';
import RouteRiskProfile from './RouteRiskProfile';

interface RiskPanelProps {
  selectedRoute: CandidateRouteProfile;
  safetyStatus?: {
    status: 'AVAILABLE' | 'DEGRADED';
    reason?: string;
  };
}

export default function RiskPanel({ selectedRoute, safetyStatus }: RiskPanelProps) {
  const risk = selectedRoute.risk;
  const ml = selectedRoute.mlSummary;
  const riskTheme = RISK_LEVEL_THEME[risk.overallLevel] || RISK_LEVEL_THEME.MEDIUM;
  const mlPredictionFormatted = ml?.prediction
    ? ml.prediction === 'LANDSLIDE_RISK'
      ? 'Landslide Risk'
      : 'No Hazard'
    : 'Not available';

  const mlProbFormatted = ml && typeof ml.maxProbability === 'number'
    ? `${(ml.maxProbability * 100).toFixed(1)}% probability`
    : 'Not available';


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
            textTransform: 'uppercase',
          }}
        >
          {risk.overallLevel} RISK TIER
        </span>
      </div>

      {/* 1. Primary Risk Driver Card */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          backgroundColor: 'rgba(30, 41, 59, 0.6)',
          border: '1px solid #334155',
          borderRadius: 6,
          fontSize: 11,
          marginBottom: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13 }}>⛰️</span>
          <div>
            <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              PRIMARY RISK DRIVER
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#F8FAFC' }}>
              {risk.dominantTrigger || 'Not available'}
            </div>
          </div>
        </div>
        <span style={{ fontSize: 10, color: '#38BDF8', fontWeight: 600 }}>Dominant</span>
      </div>

      {/* 2. ML Hazard Prediction Card */}
      {ml && (
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: ml.prediction === 'LANDSLIDE_RISK' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            border: `1px solid ${ml.prediction === 'LANDSLIDE_RISK' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
            borderRadius: 6,
            marginBottom: 8,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              ML HAZARD PREDICTION (WAYPOINT CLASSIFIER)
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: ml.prediction === 'LANDSLIDE_RISK' ? '#F87171' : '#34D399',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {mlProbFormatted}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: ml.prediction === 'LANDSLIDE_RISK' ? '#F87171' : '#34D399' }}>
              🤖 {mlPredictionFormatted}
            </div>
            <div style={{ fontSize: 10, color: '#94A3B8' }}>
              Tier: {ml.riskTier || 'LOW'}
            </div>
          </div>
        </div>
      )}

      {/* 3. Overall Route Risk (Cumulative Exposure) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          border: `1px solid ${riskTheme.border}`,
          borderRadius: 8,
          marginBottom: 8,
        }}
      >
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            OVERALL ROUTE RISK (CORRIDOR AGGREGATE)
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
            <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 600 }}>/ 100</span>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>PEAK EXPOSURE</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#F8FAFC', fontFamily: 'var(--font-mono)' }}>
            {risk.maxScore.toFixed(1)}
          </div>
          <div style={{ fontSize: 10, color: risk.hazardousSegmentCount > 0 ? '#F87171' : '#34D399', fontWeight: 600, marginTop: 2 }}>
            {risk.hazardousSegmentCount} On-Route Hazard Zone{risk.hazardousSegmentCount === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {/* Explanatory Concept Distinction Note */}
      <div
        style={{
          fontSize: 10,
          color: '#94A3B8',
          lineHeight: 1.4,
          padding: '6px 8px',
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          borderRadius: 4,
          borderLeft: '2px solid #3B82F6',
          marginBottom: 10,
        }}
      >
        <em>Note: ML Hazard Prediction classifies localized landslide risk at sampled waypoints, while Overall Route Risk is a cumulative composite score reflecting terrain slope, rainfall, and historical corridor hotspots.</em>
      </div>

      {/* Degraded Risk Advisory */}
      {safetyStatus?.status === 'DEGRADED' && (
        <div
          style={{
            marginBottom: 10,
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

      {/* Real per-waypoint risk profile + factor distribution */}
      <RouteRiskProfile selectedRoute={selectedRoute} />
    </div>
  );
}
