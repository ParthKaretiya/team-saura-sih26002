import type { RouteOptimizationResult, CandidateRouteProfile, RoutingPreference } from '../types/api';
import { RISK_LEVEL_THEME } from '../config/map-theme';

interface RouteComparisonProps {
  optimization: RouteOptimizationResult;
}

interface ObjectiveSlot {
  key: RoutingPreference;
  title: string;
  icon: string;
}

const OBJECTIVES: ObjectiveSlot[] = [
  { key: 'FASTEST', title: 'FASTEST', icon: '⚡' },
  { key: 'BALANCED', title: 'BALANCED', icon: '⚖️' },
  { key: 'SAFEST', title: 'SAFEST', icon: '🛡️' },
];

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
}

export default function RouteComparison({ optimization }: RouteComparisonProps) {
  const { selectedRoute, baselineRoute, candidates, preference, optimization: optMeta } = optimization;

  const findCandidateForObjective = (obj: RoutingPreference): CandidateRouteProfile | undefined => {
    // 1. If current preference matches this objective, selectedRoute is the candidate
    if (preference === obj) {
      return selectedRoute;
    }

    // 2. Search candidates list by candidateId or name
    if (candidates && candidates.length > 0) {
      const match = candidates.find((c) => {
        const idLower = c.candidateId.toLowerCase();
        const nameLower = c.name.toLowerCase();
        if (obj === 'FASTEST') {
          return c.isBaseline || idLower.includes('fast') || idLower.includes('base') || nameLower.includes('fast');
        }
        if (obj === 'BALANCED') {
          return idLower.includes('balance') || nameLower.includes('balance');
        }
        if (obj === 'SAFEST') {
          return idLower.includes('safe') || nameLower.includes('safe');
        }
        return false;
      });
      if (match) return match;
    }

    // 3. If obj is FASTEST and baselineRoute is defined, baselineRoute represents fastest baseline
    if (obj === 'FASTEST' && baselineRoute) {
      return baselineRoute;
    }

    return undefined;
  };

  return (
    <div className="intel-card">
      <div className="intel-card-header">
        <span className="intel-card-title">
          <span>⚖️</span>
          <span>Route Comparison Matrix</span>
        </span>
        {optMeta.hazardReductionPercent > 0 && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 4,
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              color: '#34D399',
              border: '1px solid rgba(16, 185, 129, 0.4)',
            }}
          >
            -{optMeta.hazardReductionPercent}% HAZARD
          </span>
        )}
      </div>

      {/* 3-Objective Comparative Cards (FASTEST / BALANCED / SAFEST) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        {OBJECTIVES.map(({ key, title, icon }) => {
          const candidate = findCandidateForObjective(key);
          const isSelected = preference === key || candidate?.candidateId === selectedRoute.candidateId;
          const riskTheme = candidate?.risk ? (RISK_LEVEL_THEME[candidate.risk.overallLevel] || RISK_LEVEL_THEME.MEDIUM) : null;

          return (
            <div
              key={key}
              style={{
                backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.18)' : 'rgba(15, 23, 42, 0.7)',
                border: isSelected ? '1.5px solid #38BDF8' : '1px solid #334155',
                borderRadius: 6,
                padding: '8px 8px',
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
                boxShadow: isSelected ? '0 0 10px rgba(56, 189, 248, 0.25)' : 'none',
                position: 'relative',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: isSelected ? '#38BDF8' : '#94A3B8', letterSpacing: 0.5 }}>
                  {icon} {title}
                </span>
                {isSelected && (
                  <span
                    style={{
                      fontSize: 8,
                      fontWeight: 800,
                      backgroundColor: '#38BDF8',
                      color: '#0F172A',
                      padding: '1px 4px',
                      borderRadius: 3,
                      textTransform: 'uppercase',
                    }}
                  >
                    Selected
                  </span>
                )}
              </div>

              {/* Data fields */}
              {candidate ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 10, marginTop: 2 }}>
                  <div>
                    <span style={{ color: '#64748B' }}>Dist: </span>
                    <strong style={{ color: '#F8FAFC', fontFamily: 'var(--font-mono)' }}>
                      {(candidate.distanceMeters / 1000).toFixed(1)} km
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>Time: </span>
                    <strong style={{ color: '#F8FAFC', fontFamily: 'var(--font-mono)' }}>
                      {formatDuration(candidate.durationSeconds)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>Risk: </span>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '0 4px',
                        borderRadius: 3,
                        backgroundColor: riskTheme?.bg ?? 'rgba(100, 116, 139, 0.2)',
                        color: riskTheme?.color ?? '#94A3B8',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {candidate.risk.meanScore.toFixed(1)}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 10, marginTop: 2 }}>
                  <div>
                    <span style={{ color: '#64748B' }}>Dist: </span>
                    <span style={{ color: '#64748B', fontStyle: 'italic', fontSize: 9 }}>Data unavailable</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>Time: </span>
                    <span style={{ color: '#64748B', fontStyle: 'italic', fontSize: 9 }}>Data unavailable</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>Risk: </span>
                    <span style={{ color: '#64748B', fontStyle: 'italic', fontSize: 9 }}>Data unavailable</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected vs Baseline Comparison Table */}
      <div
        style={{
          width: '100%',
          overflowX: 'auto',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          borderRadius: 6,
          border: '1px solid #334155',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155', color: '#94A3B8' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 600 }}>METRIC</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 600, color: '#94A3B8' }}>
                BASELINE
              </th>
              <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: '#38BDF8' }}>
                SELECTED ROUTE
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Distance Row */}
            <tr style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.5)' }}>
              <td style={{ padding: '6px 8px', color: '#CBD5E1', fontWeight: 500 }}>Distance</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                {(baselineRoute.distanceMeters / 1000).toFixed(1)} km
              </td>
              <td style={{ padding: '6px 8px', textAlign: 'right', color: '#F8FAFC', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {(selectedRoute.distanceMeters / 1000).toFixed(1)} km
              </td>
            </tr>

            {/* Travel Time Row */}
            <tr style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.5)' }}>
              <td style={{ padding: '6px 8px', color: '#CBD5E1', fontWeight: 500 }}>Duration (ETA)</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                {formatDuration(baselineRoute.durationSeconds)}
              </td>
              <td style={{ padding: '6px 8px', textAlign: 'right', color: '#F8FAFC', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {formatDuration(selectedRoute.durationSeconds)}
              </td>
            </tr>

            {/* Safety Risk Level Row */}
            <tr style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.5)' }}>
              <td style={{ padding: '6px 8px', color: '#CBD5E1', fontWeight: 500 }}>Risk Level</td>
              <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: 3,
                    backgroundColor: (RISK_LEVEL_THEME[baselineRoute.risk.overallLevel] || RISK_LEVEL_THEME.MEDIUM).bg,
                    color: (RISK_LEVEL_THEME[baselineRoute.risk.overallLevel] || RISK_LEVEL_THEME.MEDIUM).color,
                  }}
                >
                  {baselineRoute.risk.overallLevel}
                </span>
              </td>
              <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: 3,
                    backgroundColor: (RISK_LEVEL_THEME[selectedRoute.risk.overallLevel] || RISK_LEVEL_THEME.MEDIUM).bg,
                    color: (RISK_LEVEL_THEME[selectedRoute.risk.overallLevel] || RISK_LEVEL_THEME.MEDIUM).color,
                  }}
                >
                  {selectedRoute.risk.overallLevel}
                </span>
              </td>
            </tr>

            {/* Risk Score Row */}
            <tr style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.5)' }}>
              <td style={{ padding: '6px 8px', color: '#CBD5E1', fontWeight: 500 }}>Mean Risk Score</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                {baselineRoute.risk.meanScore.toFixed(1)}
              </td>
              <td style={{ padding: '6px 8px', textAlign: 'right', color: '#38BDF8', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {selectedRoute.risk.meanScore.toFixed(1)}
              </td>
            </tr>

            {/* Hazardous Segments Row */}
            <tr>
              <td style={{ padding: '6px 8px', color: '#CBD5E1', fontWeight: 500 }}>Hazard Segments</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', color: baselineRoute.risk.hazardousSegmentCount > 0 ? '#F87171' : '#94A3B8' }}>
                {baselineRoute.risk.hazardousSegmentCount}
              </td>
              <td style={{ padding: '6px 8px', textAlign: 'right', color: selectedRoute.risk.hazardousSegmentCount > 0 ? '#F87171' : '#34D399', fontWeight: 700 }}>
                {selectedRoute.risk.hazardousSegmentCount}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Detour & Overhead Insight */}
      {(selectedRoute.candidateId !== baselineRoute.candidateId || selectedRoute.distanceMeters !== baselineRoute.distanceMeters) && (
        <div
          style={{
            marginTop: 8,
            padding: '6px 8px',
            backgroundColor: 'rgba(30, 41, 59, 0.6)',
            borderRadius: 6,
            fontSize: 10,
            color: '#94A3B8',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>
            Detour: <strong style={{ color: '#F8FAFC' }}>+{optMeta.additionalDistanceKm.toFixed(1)} km</strong> ({optMeta.additionalDurationMinutes > 0 ? `+${optMeta.additionalDurationMinutes.toFixed(0)} min` : 'same time'})
          </span>
          <span style={{ color: '#34D399', fontWeight: 700 }}>
            {optMeta.hazardReductionPercent > 0 ? `Safer by ${optMeta.hazardReductionPercent}%` : 'Optimal Trade-off'}
          </span>
        </div>
      )}
    </div>
  );
}
