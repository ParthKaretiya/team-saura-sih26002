import type { RouteOptimizationResult } from '../types/api';
import { RISK_LEVEL_THEME } from '../config/map-theme';

interface RouteComparisonProps {
  optimization: RouteOptimizationResult;
}

export default function RouteComparison({ optimization }: RouteComparisonProps) {
  const { selectedRoute, baselineRoute, optimization: optMeta } = optimization;

  const selectedDistKm = (selectedRoute.distanceMeters / 1000).toFixed(1);
  const baselineDistKm = (baselineRoute.distanceMeters / 1000).toFixed(1);

  const selectedDurationMin = Math.round(selectedRoute.durationSeconds / 60);
  const baselineDurationMin = Math.round(baselineRoute.durationSeconds / 60);

  const selectedRiskTheme = RISK_LEVEL_THEME[selectedRoute.risk.overallLevel] || RISK_LEVEL_THEME.MEDIUM;
  const baselineRiskTheme = RISK_LEVEL_THEME[baselineRoute.risk.overallLevel] || RISK_LEVEL_THEME.MEDIUM;

  const isDifferentRoute = selectedRoute.candidateId !== baselineRoute.candidateId ||
    selectedRoute.distanceMeters !== baselineRoute.distanceMeters;

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
              fontSize: 11,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 4,
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              color: '#34D399',
              border: '1px solid rgba(16, 185, 129, 0.4)',
            }}
          >
            -{optMeta.hazardReductionPercent}% HAZARD REDUCTION
          </span>
        )}
      </div>

      {/* Comparison Table */}
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
              <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600 }}>METRIC</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: '#94A3B8' }}>
                BASELINE
              </th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 700, color: '#60A5FA' }}>
                SELECTED ROUTE
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Distance Row */}
            <tr style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.5)' }}>
              <td style={{ padding: '7px 10px', color: '#CBD5E1', fontWeight: 500 }}>Distance</td>
              <td style={{ padding: '7px 10px', textAlign: 'right', color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                {baselineDistKm} km
              </td>
              <td style={{ padding: '7px 10px', textAlign: 'right', color: '#F8FAFC', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {selectedDistKm} km
              </td>
            </tr>

            {/* Travel Time Row */}
            <tr style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.5)' }}>
              <td style={{ padding: '7px 10px', color: '#CBD5E1', fontWeight: 500 }}>Duration (ETA)</td>
              <td style={{ padding: '7px 10px', textAlign: 'right', color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                {baselineDurationMin} min
              </td>
              <td style={{ padding: '7px 10px', textAlign: 'right', color: '#F8FAFC', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {selectedDurationMin} min
              </td>
            </tr>

            {/* Safety Risk Level Row */}
            <tr style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.5)' }}>
              <td style={{ padding: '7px 10px', color: '#CBD5E1', fontWeight: 500 }}>Risk Level</td>
              <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: 3,
                    backgroundColor: baselineRiskTheme.bg,
                    color: baselineRiskTheme.color,
                  }}
                >
                  {baselineRoute.risk.overallLevel}
                </span>
              </td>
              <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: 3,
                    backgroundColor: selectedRiskTheme.bg,
                    color: selectedRiskTheme.color,
                  }}
                >
                  {selectedRoute.risk.overallLevel}
                </span>
              </td>
            </tr>

            {/* Risk Score Row */}
            <tr style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.5)' }}>
              <td style={{ padding: '7px 10px', color: '#CBD5E1', fontWeight: 500 }}>Mean Risk Score</td>
              <td style={{ padding: '7px 10px', textAlign: 'right', color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                {baselineRoute.risk.meanScore.toFixed(1)}
              </td>
              <td style={{ padding: '7px 10px', textAlign: 'right', color: '#34D399', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {selectedRoute.risk.meanScore.toFixed(1)}
              </td>
            </tr>

            {/* Hazardous Segments Row */}
            <tr>
              <td style={{ padding: '7px 10px', color: '#CBD5E1', fontWeight: 500 }}>Hazard Segments</td>
              <td style={{ padding: '7px 10px', textAlign: 'right', color: baselineRoute.risk.hazardousSegmentCount > 0 ? '#F87171' : '#94A3B8' }}>
                {baselineRoute.risk.hazardousSegmentCount}
              </td>
              <td style={{ padding: '7px 10px', textAlign: 'right', color: selectedRoute.risk.hazardousSegmentCount > 0 ? '#F87171' : '#34D399', fontWeight: 700 }}>
                {selectedRoute.risk.hazardousSegmentCount}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Detour & Overhead Insight */}
      {isDifferentRoute && (
        <div
          style={{
            marginTop: 10,
            padding: '8px 10px',
            backgroundColor: 'rgba(30, 41, 59, 0.6)',
            borderRadius: 6,
            fontSize: 11,
            color: '#94A3B8',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>
            Detour Overhead: <strong style={{ color: '#F8FAFC' }}>+{optMeta.additionalDistanceKm.toFixed(1)} km</strong> ({optMeta.additionalDurationMinutes > 0 ? `+${optMeta.additionalDurationMinutes.toFixed(0)} min` : 'same time'})
          </span>
          <span style={{ color: '#34D399', fontWeight: 700 }}>
            {optMeta.hazardReductionPercent > 0 ? `Safer by ${optMeta.hazardReductionPercent}%` : 'Optimal Trade-off'}
          </span>
        </div>
      )}
    </div>
  );
}
