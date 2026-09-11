import type { CandidateRouteProfile, RiskLevel, RiskWaypoint } from '../types/api';
import { RISK_LEVEL_FILL } from '../config/map-theme';

interface RouteRiskProfileProps {
  selectedRoute: CandidateRouteProfile;
}

const CHART_HEIGHT = 68;

const LEVEL_RANK: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

const FACTOR_ICONS: Record<string, string> = {
  'Steep Terrain': '⛰️',
  'Landslide Hotspot': '⚠️',
  'Active Incident': '🚧',
  'Rainfall': '🌧️',
  'Flood Risk': '🌊',
};

function factorIcon(name: string): string {
  return FACTOR_ICONS[name] ?? '•';
}

function fillFor(level: RiskLevel): string {
  return RISK_LEVEL_FILL[level] ?? '#64748B';
}

interface FactorAggregate {
  factor: string;
  count: number;
  maxLevel: RiskLevel;
}

function aggregateFactors(waypoints: RiskWaypoint[]): FactorAggregate[] {
  const map = new Map<string, FactorAggregate>();
  for (const wp of waypoints) {
    const existing = map.get(wp.primaryFactor);
    if (existing) {
      existing.count += 1;
      if (LEVEL_RANK[wp.level] > LEVEL_RANK[existing.maxLevel]) {
        existing.maxLevel = wp.level;
      }
    } else {
      map.set(wp.primaryFactor, { factor: wp.primaryFactor, count: 1, maxLevel: wp.level });
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => b.count - a.count || LEVEL_RANK[b.maxLevel] - LEVEL_RANK[a.maxLevel],
  );
}

export default function RouteRiskProfile({ selectedRoute }: RouteRiskProfileProps) {
  const waypoints = selectedRoute.risk.waypoints;

  // Honest degraded state: no per-waypoint telemetry means no profile to show.
  // The aggregate figures (mean/peak/hazard count) are still rendered by the
  // parent RiskPanel; we do not synthesise a breakdown here.
  if (!waypoints || waypoints.length === 0) {
    return (
      <div style={{ marginTop: 12 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#94A3B8',
            textTransform: 'uppercase',
            marginBottom: 8,
            letterSpacing: 0.5,
          }}
        >
          Risk Profile Along Route
        </div>
        <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.4 }}>
          Per-waypoint risk profile is not available for this route.
        </div>
      </div>
    );
  }

  const ordered = [...waypoints].sort((a, b) => a.distanceAlongRouteKm - b.distanceAlongRouteKm);
  const totalKm = ordered[ordered.length - 1]?.distanceAlongRouteKm ?? 0;
  const peak = ordered.reduce((acc, wp) => (wp.score > acc.score ? wp : acc), ordered[0]);
  const factors = aggregateFactors(ordered);
  const gridLines = [25, 50, 75];

  return (
    <div style={{ marginTop: 12 }}>
      {/* Section: per-waypoint risk profile along the corridor */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#94A3B8',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          Risk Profile Along Route
        </span>
        <span style={{ fontSize: 10, color: '#64748B', fontFamily: 'var(--font-mono)' }}>
          {ordered.length} sampled points
        </span>
      </div>

      <div
        style={{ position: 'relative', height: CHART_HEIGHT }}
        role="img"
        aria-label={`Risk score sampled at ${ordered.length} points along the route, peaking at ${peak.score.toFixed(0)} of 100 near kilometre ${peak.distanceAlongRouteKm.toFixed(0)}.`}
      >
        {/* Reference gridlines at 25 / 50 / 75 of the 0–100 risk scale */}
        {gridLines.map((value) => (
          <div
            key={value}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: (value / 100) * CHART_HEIGHT,
              height: 1,
              backgroundColor: 'rgba(51, 65, 85, 0.35)',
            }}
          />
        ))}

        {/* Waypoint bars — height is the real score on a fixed 0–100 scale */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
          {ordered.map((wp, index) => {
            const isPeak = wp === peak;
            return (
              <div
                key={`${index}-${wp.distanceAlongRouteKm}`}
                title={`${wp.score.toFixed(1)} / 100 · ${wp.level} · ${wp.primaryFactor} · ${wp.distanceAlongRouteKm.toFixed(1)} km`}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: Math.max(3, (Math.min(100, wp.score) / 100) * CHART_HEIGHT),
                  backgroundColor: fillFor(wp.level),
                  borderRadius: 2,
                  outline: isPeak ? '1px solid #F8FAFC' : 'none',
                  outlineOffset: isPeak ? 1 : 0,
                  opacity: 0.92,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* X-axis: origin -> destination with real corridor length and peak call-out */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 5,
          fontSize: 9,
          color: '#64748B',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <span>0 km · origin</span>
        <span>{totalKm.toFixed(0)} km · destination</span>
      </div>
      <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 6, lineHeight: 1.4 }}>
        Peak exposure <strong style={{ color: fillFor(peak.level) }}>{peak.score.toFixed(1)}/100</strong> ({peak.level}) at{' '}
        {peak.distanceAlongRouteKm.toFixed(1)} km — {peak.primaryFactor.toLowerCase()}.
      </div>

      {/* Section: dominant risk factors, counted from the sampled waypoints */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: '#94A3B8',
          textTransform: 'uppercase',
          margin: '14px 0 8px',
          letterSpacing: 0.5,
        }}
      >
        Dominant Risk Factors (Sampled)
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {factors.map((item) => {
          const pct = (item.count / ordered.length) * 100;
          const color = fillFor(item.maxLevel);
          return (
            <div key={item.factor} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#F8FAFC', fontWeight: 600 }}>
                  <span>{factorIcon(item.factor)}</span>
                  <span>{item.factor}</span>
                </span>
                <span style={{ color: '#94A3B8', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                  {item.count} pt{item.count === 1 ? '' : 's'} · up to {item.maxLevel}
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: 6,
                  backgroundColor: 'rgba(51, 65, 85, 0.4)',
                  borderRadius: 3,
                  overflow: 'hidden',
                }}
                role="progressbar"
                aria-valuenow={Math.round(pct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${item.factor}: primary factor at ${Math.round(pct)}% of sampled points`}
              >
                <div
                  style={{
                    width: `${Math.max(4, pct)}%`,
                    height: '100%',
                    backgroundColor: color,
                    borderRadius: 3,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 9, color: '#64748B', marginTop: 8, lineHeight: 1.4 }}>
        Share of {ordered.length} sampled waypoints where each factor is the primary risk driver. Colour marks the
        highest risk level classified for that factor along this route.
      </div>
    </div>
  );
}
