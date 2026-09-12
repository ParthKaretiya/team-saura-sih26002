import type { RerouteEvaluationResult } from '../types/api';

interface ReroutePanelProps {
  onCheckReroute: () => void;
  isChecking: boolean;
  rerouteResult: RerouteEvaluationResult | null;
  rerouteError: string | null;
  hasCalculatedRoute: boolean;
  driverMode?: boolean;
}

export default function ReroutePanel({
  onCheckReroute,
  isChecking,
  rerouteResult,
  rerouteError,
  hasCalculatedRoute,
  driverMode = false,
}: ReroutePanelProps) {
  return (
    <div className="intel-card">
      <div className="intel-card-header">
        <span className="intel-card-title">
          <span>🔄</span>
          <span>{driverMode ? 'Safer Reroute Advisor' : 'Dynamic Reroute Advisor'}</span>
        </span>
        <span style={{ fontSize: 10, color: '#94A3B8' }}>{driverMode ? 'Safety Scan' : 'Contingency Scan'}</span>
      </div>

      <button
        onClick={onCheckReroute}
        disabled={isChecking || !hasCalculatedRoute}
        style={{
          width: '100%',
          padding: '9px 12px',
          backgroundColor: !hasCalculatedRoute
            ? 'rgba(51, 65, 85, 0.4)'
            : isChecking
            ? 'rgba(16, 185, 129, 0.4)'
            : '#059669',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: 6,
          fontWeight: 700,
          fontSize: 12,
          cursor: isChecking || !hasCalculatedRoute ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'all 0.15s',
          boxShadow: hasCalculatedRoute ? '0 2px 6px rgba(5, 150, 105, 0.3)' : 'none',
        }}
      >
        {isChecking ? (
          <>
            <span
              style={{
                width: 12,
                height: 12,
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderTopColor: '#FFFFFF',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span>{driverMode ? 'CHECKING FOR SAFER ROUTE...' : 'EVALUATING CONTINGENCY CANDIDATES...'}</span>
          </>
        ) : (
          <span>{driverMode ? 'FIND A SAFER ROUTE' : 'CHECK FOR SAFER REROUTE'}</span>
        )}
      </button>

      {!hasCalculatedRoute && (
        <div style={{ marginTop: 6, fontSize: 10, color: '#64748B', textAlign: 'center' }}>
          {driverMode
            ? 'Start a route to check for safer alternatives.'
            : 'Calculate an active route to enable dynamic rerouting analysis.'}
        </div>
      )}

      {rerouteError && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 10px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 6,
            fontSize: 11,
            color: '#FCA5A5',
          }}
        >
          {rerouteError}
        </div>
      )}

      {rerouteResult && (
        <div
          style={{
            marginTop: 10,
            padding: '10px 12px',
            borderRadius: 6,
            border: `1px solid ${rerouteResult.rerouteRecommended ? 'rgba(16, 185, 129, 0.4)' : 'rgba(51, 65, 85, 0.6)'}`,
            backgroundColor: rerouteResult.rerouteRecommended ? 'rgba(16, 185, 129, 0.12)' : 'rgba(15, 23, 42, 0.6)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: rerouteResult.rerouteRecommended ? '#34D399' : '#CBD5E1',
                textTransform: 'uppercase',
              }}
            >
              {rerouteResult.rerouteRecommended ? '✅ REROUTE RECOMMENDED' : 'ℹ️ CURRENT ROUTE OPTIMAL'}
            </span>
            <span style={{ fontSize: 10, color: '#94A3B8' }}>
              {rerouteResult.evaluatedCandidatesCount} candidates scanned
            </span>
          </div>

          <div style={{ fontSize: 11, color: '#F8FAFC', lineHeight: 1.4, marginBottom: 6 }}>
            {rerouteResult.reason}
          </div>

          {rerouteResult.rerouteRecommended && rerouteResult.recommendedRoute && (
            <div
              style={{
                padding: '8px 10px',
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 4,
                fontSize: 11,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8' }}>Alternative Path:</span>
                <strong style={{ color: '#34D399' }}>
                  {(rerouteResult.recommendedRoute.distanceMeters / 1000).toFixed(1)} km ·{' '}
                  {Math.round(rerouteResult.recommendedRoute.durationSeconds / 60)} min
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8' }}>Risk Transition:</span>
                <strong style={{ color: '#34D399', fontFamily: 'var(--font-mono)' }}>
                  {rerouteResult.currentRoute.meanRiskScore.toFixed(1)} →{' '}
                  {rerouteResult.recommendedRoute.risk.meanScore.toFixed(1)} (
                  {rerouteResult.recommendedRoute.risk.overallLevel})
                </strong>
              </div>

              {rerouteResult.metrics && rerouteResult.metrics.hazardReductionPercent > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94A3B8' }}>Hazard Mitigation:</span>
                  <strong style={{ color: '#34D399' }}>
                    -{rerouteResult.metrics.hazardReductionPercent}% Risk Exposure
                  </strong>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
