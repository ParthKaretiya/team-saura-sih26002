import type { RouteOptimizationResult } from '../types/api';

interface RouteReasonPanelProps {
  optimization: RouteOptimizationResult;
}

export default function RouteReasonPanel({ optimization }: RouteReasonPanelProps) {
  const { optimization: optMeta, selectedRoute, accessibility, preference } = optimization;

  const distanceKm = typeof selectedRoute?.distanceMeters === 'number'
    ? `${(selectedRoute.distanceMeters / 1000).toFixed(0)} km`
    : 'Not available';

  const durationMin = typeof selectedRoute?.durationSeconds === 'number'
    ? Math.round(selectedRoute.durationSeconds / 60)
    : null;
  const hours = durationMin !== null ? Math.floor(durationMin / 60) : 0;
  const remainingMins = durationMin !== null ? durationMin % 60 : 0;
  const durationText = durationMin !== null
    ? hours > 0 ? `${hours}h ${remainingMins}m` : `${durationMin} min`
    : 'Not available';

  const riskScore = typeof selectedRoute?.risk?.meanScore === 'number'
    ? selectedRoute.risk.meanScore.toFixed(1)
    : 'Not available';

  const dominantDriver = selectedRoute?.risk?.dominantTrigger || 'Not available';
  const hasReduction = optMeta?.hazardReductionPercent > 0;
  const isAccessibleSafe = !selectedRoute.accessibility || selectedRoute.accessibility.status === 'ACCESSIBLE';
  const avoidedClosedCorridors = accessibility?.affectedCorridors?.some((c) => c.status === 'CLOSED');
  const hazardousCount = selectedRoute?.risk?.hazardousSegmentCount;

  const prefLabel = preference === 'FASTEST'
    ? 'Fastest'
    : preference === 'SAFEST'
    ? 'Safest'
    : 'Balanced';

  return (
    <div className="intel-card" style={{ borderLeft: '4px solid #10B981' }}>
      <div className="intel-card-header" style={{ marginBottom: 6 }}>
        <span className="intel-card-title" style={{ color: '#34D399', fontWeight: 800 }}>
          <span>💡</span>
          <span>ROUTE RECOMMENDATION</span>
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            padding: '2px 7px',
            borderRadius: 4,
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            color: '#34D399',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            textTransform: 'uppercase',
          }}
        >
          {prefLabel} route selected
        </span>
      </div>

      {/* 3-Metric Summary Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8,
          padding: '8px 10px',
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid #334155',
          borderRadius: 6,
          marginBottom: 10,
          textAlign: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>DISTANCE</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC', fontFamily: 'var(--font-mono)' }}>
            {distanceKm}
          </div>
        </div>
        <div style={{ borderLeft: '1px solid #334155', borderRight: '1px solid #334155' }}>
          <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>TRAVEL TIME</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC', fontFamily: 'var(--font-mono)' }}>
            {durationText}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>RISK SCORE</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#38BDF8', fontFamily: 'var(--font-mono)' }}>
            {riskScore !== 'Not available' ? `Risk ${riskScore}` : 'Not available'}
          </div>
        </div>
      </div>

      {/* "Why this route?" Section */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#CBD5E1', marginBottom: 6 }}>
          Why this route?
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {hasReduction ? (
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, color: '#34D399' }}>
              <span>•</span>
              <span>Lower overall risk (-{optMeta.hazardReductionPercent}%) compared with the baseline</span>
            </li>
          ) : (
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, color: '#CBD5E1' }}>
              <span>•</span>
              <span>Direct baseline travel trajectory optimized for {prefLabel.toLowerCase()} objective</span>
            </li>
          )}

          {typeof optMeta?.additionalDistanceKm === 'number' && (
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, color: '#CBD5E1' }}>
              <span>•</span>
              <span>
                Reasonable travel time (detour overhead +{optMeta.additionalDistanceKm.toFixed(1)} km, +{optMeta.additionalDurationMinutes.toFixed(0)} min)
              </span>
            </li>
          )}

          {typeof hazardousCount === 'number' && (
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, color: hazardousCount === 0 ? '#34D399' : '#FCD34D' }}>
              <span>•</span>
              <span>
                {hazardousCount === 0
                  ? 'No hazardous route segments detected'
                  : `${hazardousCount} hazardous route segment(s) detected with caution advisory`}
              </span>
            </li>
          )}

          <li style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, color: '#CBD5E1' }}>
            <span>•</span>
            <span>
              Primary risk driver: <strong>{dominantDriver}</strong>
            </span>
          </li>

          {avoidedClosedCorridors && (
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, color: '#FCD34D' }}>
              <span>•</span>
              <span>Closed highway corridor successfully avoided</span>
            </li>
          )}

          {isAccessibleSafe && !avoidedClosedCorridors && (
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, color: '#34D399' }}>
              <span>•</span>
              <span>Monitored corridor accessibility verified open for transport</span>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
