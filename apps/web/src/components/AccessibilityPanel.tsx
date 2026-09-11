import type { AccessibilitySummary, CandidateAccessibility, AccessibilityFeatureCollection } from '../types/api';
import { ACCESSIBILITY_THEME } from '../config/map-theme';

interface AccessibilityPanelProps {
  accessibilitySummary?: AccessibilitySummary;
  candidateAccessibility?: CandidateAccessibility;
  corridorData?: AccessibilityFeatureCollection;
  isUnavailable?: boolean;
}

export default function AccessibilityPanel({
  accessibilitySummary,
  candidateAccessibility,
  corridorData,
  isUnavailable = false,
}: AccessibilityPanelProps) {
  const corridorCount = corridorData?.features?.length || 0;
  const hasRouteContext = Boolean(accessibilitySummary || candidateAccessibility);
  const isRestricted = candidateAccessibility?.status === 'RESTRICTED' || accessibilitySummary?.status === 'RESTRICTED';
  const isAllClosed = accessibilitySummary?.status === 'ALL_CANDIDATES_CLOSED';
  const hasClosedCorridor = accessibilitySummary?.affectedCorridors?.some((c) => c.status === 'CLOSED');

  return (
    <div className="intel-card">
      <div className="intel-card-header">
        <span className="intel-card-title">
          <span>🚧</span>
          <span>Road Accessibility Intelligence</span>
        </span>
        <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
          {isUnavailable ? 'OFFLINE' : `SYSTEM: ${corridorCount} Monitored`}
        </span>
      </div>

      {/* Corridor Status Legend */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 6,
          marginBottom: 10,
        }}
      >
        {(Object.entries(ACCESSIBILITY_THEME) as [keyof typeof ACCESSIBILITY_THEME, typeof ACCESSIBILITY_THEME.OPEN][]).map(
          ([status, cfg]) => (
            <div
              key={status}
              style={{
                padding: '6px 8px',
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                border: `1px solid ${status === 'RESTRICTED' ? 'rgba(245, 158, 11, 0.4)' : status === 'CLOSED' ? 'rgba(220, 38, 38, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                borderRadius: 6,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: cfg.color,
                    display: 'inline-block',
                  }}
                />
                <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color }}>{status}</span>
              </div>
              <span style={{ fontSize: 9, color: '#94A3B8' }}>{cfg.description}</span>
            </div>
          )
        )}
      </div>

      {/* Real Route-Level Accessibility Warnings */}
      {!hasRouteContext ? (
        <div
          style={{
            padding: '8px 10px',
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid #334155',
            borderRadius: 6,
            fontSize: 11,
            color: '#CBD5E1',
          }}
        >
          <strong style={{ color: '#94A3B8' }}>Awaiting route</strong>
          <div style={{ marginTop: 2, fontSize: 10, color: '#94A3B8' }}>
            Calculate a route to evaluate corridor accessibility along the selected path. Regional corridor
            monitoring stays active below.
          </div>
        </div>
      ) : isAllClosed ? (
        <div
          style={{
            padding: '8px 10px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 6,
            fontSize: 11,
            color: '#FCA5A5',
          }}
        >
          <strong>🚫 CRITICAL: All Highway Candidates Closed</strong>
          <div style={{ marginTop: 2, fontSize: 10 }}>
            {accessibilitySummary?.reason || 'Every candidate corridor between origin and destination is currently marked CLOSED.'}
          </div>
        </div>
      ) : isRestricted ? (
        <div
          style={{
            padding: '8px 10px',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: 6,
            fontSize: 11,
            color: '#FCD34D',
          }}
        >
          <strong>⚠️ Restricted Corridor Detected on Route</strong>
          <div style={{ marginTop: 2, fontSize: 10 }}>
            Travel is possible with caution. Speed reductions or payload weight advisories may apply.
          </div>
          {candidateAccessibility?.affectedCorridors?.length ? (
            <div style={{ marginTop: 4, fontSize: 10, color: '#FDE68A' }}>
              Corridor: {candidateAccessibility.affectedCorridors.map((c) => c.name).join(', ')}
            </div>
          ) : null}
        </div>
      ) : hasClosedCorridor ? (
        <div
          style={{
            padding: '8px 10px',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: 6,
            fontSize: 11,
            color: '#34D399',
          }}
        >
          <strong>✅ Closed Corridor Bypassed</strong>
          <div style={{ marginTop: 2, fontSize: 10 }}>
            SauraRoute evaluated candidate routes and excluded closed road segments to select an accessible path.
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '8px 10px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 6,
            fontSize: 11,
            color: '#34D399',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>●</span>
          <span>
            <strong>SELECTED ROUTE:</strong> 100% Accessible (0 closed/restricted corridors intersected).
          </span>
        </div>
      )}

      {isUnavailable && (
        <div style={{ marginTop: 6, fontSize: 10, color: '#FCD34D' }}>
          ⚠️ Corridor accessibility feed is temporarily unavailable.
        </div>
      )}
    </div>
  );
}
