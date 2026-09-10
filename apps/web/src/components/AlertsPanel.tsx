import type { AlertRecord } from '../types/api';

interface AlertsPanelProps {
  alerts: AlertRecord[];
  isUnavailable?: boolean;
  hasCalculatedRoute?: boolean;
  onRecalculateSaferRoute?: () => void;
  onViewAffectedSegment?: () => void;
}

export default function AlertsPanel({
  alerts,
  isUnavailable = false,
  hasCalculatedRoute = false,
  onRecalculateSaferRoute,
  onViewAffectedSegment,
}: AlertsPanelProps) {
  // Check if any alert affects the current route
  const routeAlerts = alerts.filter((a) => a.routeCandidateId || a.severity === 'CRITICAL');
  const hasRouteAlert = hasCalculatedRoute && routeAlerts.length > 0;

  return (
    <div className="intel-card">
      {/* Route-Specific Alert / Status Banner */}
      {hasRouteAlert ? (
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 6,
            marginBottom: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#EF4444', fontWeight: 800, fontSize: 12, marginBottom: 4 }}>
            <span>⚠️</span>
            <span>LIVE ROUTE ALERT</span>
          </div>
          <div style={{ fontSize: 11, color: '#FCA5A5', lineHeight: 1.4, marginBottom: 8 }}>
            Hazard or obstruction detected on current route ({routeAlerts[0]?.title || 'Active Corridor Warning'}).
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {onViewAffectedSegment && (
              <button
                onClick={onViewAffectedSegment}
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.25)',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  borderRadius: 4,
                  color: '#FFFFFF',
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                View Affected Segment
              </button>
            )}
            {onRecalculateSaferRoute && (
              <button
                onClick={onRecalculateSaferRoute}
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  backgroundColor: '#059669',
                  border: 'none',
                  borderRadius: 4,
                  color: '#FFFFFF',
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Recalculate Safer Route
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 6,
            marginBottom: 10,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 800, color: '#34D399', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            ROUTE STATUS
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#34D399', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span>✓</span>
            <span>No active route alerts</span>
          </div>
          <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
            Route currently operating normally without active closures or critical disruptions.
          </div>
        </div>
      )}

      {/* Regional Alerts Section */}
      <div className="intel-card-header" style={{ marginBottom: 6 }}>
        <span className="intel-card-title">
          <span>🔔</span>
          <span>Regional Highway Advisories</span>
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 4,
            backgroundColor: alerts.length > 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            color: alerts.length > 0 ? '#FCD34D' : '#34D399',
          }}
        >
          {alerts.length} REGION ADVISORIES
        </span>
      </div>

      {isUnavailable && (
        <div style={{ padding: '6px 8px', fontSize: 10, color: '#FCD34D' }}>
          ⚠️ Regional alerts service is temporarily offline.
        </div>
      )}

      {alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
          {alerts.map((alert) => {
            const isCritical = alert.severity === 'CRITICAL';
            const isWarning = alert.severity === 'WARNING';
            const accentColor = isCritical ? '#EF4444' : isWarning ? '#F59E0B' : '#3B82F6';
            const bgColor = isCritical ? 'rgba(239, 68, 68, 0.12)' : isWarning ? 'rgba(245, 158, 11, 0.12)' : 'rgba(59, 130, 246, 0.12)';

            return (
              <div
                key={alert.id}
                style={{
                  padding: '8px 10px',
                  backgroundColor: bgColor,
                  border: `1px solid ${accentColor}44`,
                  borderLeft: `3px solid ${accentColor}`,
                  borderRadius: 6,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: accentColor, textTransform: 'uppercase' }}>
                    {alert.severity} · {alert.category.replace('_', ' ')}
                  </span>
                  {alert.routeCandidateId && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#93C5FD', backgroundColor: 'rgba(37, 99, 235, 0.3)', padding: '1px 4px', borderRadius: 3 }}>
                      ON ROUTE
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#F8FAFC' }}>{alert.title}</div>
                <div style={{ fontSize: 10, color: '#CBD5E1', lineHeight: 1.3 }}>{alert.message}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
