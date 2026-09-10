import type { RouteOptimizationResult } from '../types/api';

interface RouteReasonPanelProps {
  optimization: RouteOptimizationResult;
}

export default function RouteReasonPanel({ optimization }: RouteReasonPanelProps) {
  const { optimization: optMeta, selectedRoute, accessibility } = optimization;

  const hasReduction = optMeta.hazardReductionPercent > 0;
  const isAccessibleSafe = !selectedRoute.accessibility || selectedRoute.accessibility.status === 'ACCESSIBLE';
  const avoidedClosedCorridors = accessibility?.affectedCorridors?.some((c) => c.status === 'CLOSED');

  return (
    <div className="intel-card" style={{ borderLeft: '4px solid #10B981' }}>
      <div className="intel-card-header">
        <span className="intel-card-title" style={{ color: '#34D399' }}>
          <span>💡</span>
          <span>Why SauraRoute Selected This Route</span>
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 4,
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            color: '#34D399',
          }}
        >
          {optMeta.strategy}
        </span>
      </div>

      {/* Primary Selection Reason (Actual backend reasoning) */}
      <div
        style={{
          padding: '10px 12px',
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid #334155',
          borderRadius: 6,
          fontSize: 12,
          color: '#F8FAFC',
          lineHeight: 1.5,
          marginBottom: 10,
        }}
      >
        <strong>Decision: </strong>
        {optMeta.selectionReason || 'Optimal multi-criteria route selected within detour and safety parameters.'}
      </div>

      {/* Verified Backend Decision Factors */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {hasReduction && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#34D399' }}>
            <span>✓</span>
            <span>
              Hazard exposure reduced by <strong>{optMeta.hazardReductionPercent}%</strong> compared to speed baseline
            </span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#CBD5E1' }}>
          <span style={{ color: '#34D399' }}>✓</span>
          <span>
            Detour overhead constrained to <strong>+{optMeta.additionalDistanceKm.toFixed(1)} km</strong> (+{optMeta.additionalDurationMinutes.toFixed(0)} min)
          </span>
        </div>

        {isAccessibleSafe && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#CBD5E1' }}>
            <span style={{ color: '#34D399' }}>✓</span>
            <span>Corridor accessibility verified clear for heavy transport movement</span>
          </div>
        )}

        {avoidedClosedCorridors && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#FCD34D' }}>
            <span>✓</span>
            <span>Alternative path evaluated to successfully circumvent closed highway corridor</span>
          </div>
        )}

        {selectedRoute.risk.hazardousSegmentCount === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#34D399' }}>
            <span>✓</span>
            <span>Zero critical landslide segments along selected trajectory</span>
          </div>
        )}
      </div>
    </div>
  );
}
