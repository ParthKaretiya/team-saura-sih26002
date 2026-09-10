import type { AlertRecord } from '../types/api';

interface AlertsPanelProps {
  alerts: AlertRecord[];
  isUnavailable?: boolean;
}

export default function AlertsPanel({ alerts, isUnavailable = false }: AlertsPanelProps) {
  return (
    <div className="intel-card">
      <div className="intel-card-header">
        <span className="intel-card-title">
          <span>🔔</span>
          <span>Active Route &amp; Regional Alerts</span>
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 4,
            backgroundColor: alerts.length > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            color: alerts.length > 0 ? '#F87171' : '#34D399',
          }}
        >
          {alerts.length} ACTIVE
        </span>
      </div>

      {alerts.length === 0 && !isUnavailable && (
        <div
          style={{
            padding: '12px',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid #334155',
            borderRadius: 6,
            textAlign: 'center',
            color: '#94A3B8',
            fontSize: 11,
          }}
        >
          <div style={{ color: '#34D399', fontWeight: 700, marginBottom: 2 }}>
            ✓ NO ACTIVE ROUTE ALERTS
          </div>
          <div>All monitored NER corridors report normal operating conditions.</div>
        </div>
      )}

      {isUnavailable && (
        <div style={{ padding: '8px', fontSize: 11, color: '#FCD34D' }}>
          ⚠️ Regional alerts service is temporarily offline.
        </div>
      )}

      {alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
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
                  gap: 3,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: accentColor, textTransform: 'uppercase' }}>
                    {alert.severity} · {alert.category.replace('_', ' ')}
                  </span>
                  {alert.routeCandidateId && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#93C5FD', backgroundColor: 'rgba(37, 99, 235, 0.3)', padding: '1px 4px', borderRadius: 3 }}>
                      ON ROUTE
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#F8FAFC' }}>{alert.title}</div>
                <div style={{ fontSize: 11, color: '#CBD5E1', lineHeight: 1.3 }}>{alert.message}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
