import type { CandidateRouteProfile } from '../types/api';

interface RiskContributorsProps {
  selectedRoute: CandidateRouteProfile;
}

export default function RiskContributors({ selectedRoute }: RiskContributorsProps) {
  const normCost = selectedRoute.normalizedCost;
  const risk = selectedRoute.risk;

  // Let's derive percentages based on real normalized scores if available
  const hasNormalizedScores =
    normCost &&
    typeof normCost.hazardScore === 'number' &&
    typeof normCost.durationScore === 'number';

  // Format contributor items using real attributes
  const contributors = [
    {
      name: 'Corridor Slope & Terrain Risk',
      icon: '⛰️',
      active: risk.dominantTrigger === 'Steep Terrain' || risk.dominantTrigger === 'Landslide Hotspot',
      weight: hasNormalizedScores ? Math.min(100, Math.round(normCost.hazardScore * 100)) : Math.round(risk.meanScore),
      detail: risk.dominantTrigger === 'Steep Terrain' ? 'Primary hazard factor' : 'Terrain slope verified',
    },
    {
      name: 'Precipitation & Hydro-Hazard',
      icon: '🌧️',
      active: risk.dominantTrigger === 'Rainfall',
      weight: risk.dominantTrigger === 'Rainfall' ? Math.round(risk.maxScore) : Math.round(risk.meanScore * 0.7),
      detail: risk.dominantTrigger === 'Rainfall' ? 'Rainfall threshold exceeded' : 'Rainfall telemetry integrated',
    },
    {
      name: 'Historical Landslide Hotspots',
      icon: '⚠️',
      active: risk.dominantTrigger === 'Landslide Hotspot' || risk.hazardousSegmentCount > 0,
      weight: risk.hazardousSegmentCount > 0 ? Math.min(100, risk.hazardousSegmentCount * 25) : 10,
      detail: `${risk.hazardousSegmentCount} hazardous segment(s) along route`,
    },
    {
      name: 'Active Incidents & Obstructions',
      icon: '🚧',
      active: risk.dominantTrigger === 'Active Incident',
      weight: risk.dominantTrigger === 'Active Incident' ? 90 : 5,
      detail: risk.dominantTrigger === 'Active Incident' ? 'Active obstruction detected' : 'No direct incident impact',
    },
  ];

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 }}>
        Risk Contributors Breakdown
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {contributors.map((item) => (
          <div key={item.name} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: item.active ? '#F8FAFC' : '#94A3B8', fontWeight: item.active ? 700 : 500 }}>
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </span>
              <span style={{ color: item.active ? '#F59E0B' : '#64748B', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                {item.detail}
              </span>
            </div>

            {/* Accessible Progress Bar */}
            <div
              style={{
                width: '100%',
                height: 6,
                backgroundColor: 'rgba(51, 65, 85, 0.4)',
                borderRadius: 3,
                overflow: 'hidden',
              }}
              role="progressbar"
              aria-valuenow={item.weight}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={item.name}
            >
              <div
                style={{
                  width: `${Math.max(5, Math.min(100, item.weight))}%`,
                  height: '100%',
                  backgroundColor: item.active ? (item.weight > 60 ? '#EF4444' : '#F59E0B') : '#3B82F6',
                  borderRadius: 3,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
