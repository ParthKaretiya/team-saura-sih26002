import type { Dispatch, SetStateAction } from 'react';
import {
  SEVERITY_THEME,
  ACCESSIBILITY_THEME,
  HAZARD_ZONE_THEME,
  SELECTED_ROUTE_THEME,
  BASELINE_ROUTE_THEME,
} from '../config/map-theme';

interface MapLegendProps {
  showHazardZones: boolean;
  setShowHazardZones: Dispatch<SetStateAction<boolean>>;
  hazardZoneCount: number;
  incidentCount: number;
  vehicleCount: number;
  accessibilityCount: number;
}

export default function MapLegend({
  showHazardZones,
  setShowHazardZones,
  hazardZoneCount,
  accessibilityCount,
}: MapLegendProps) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 24,
        left: 20,
        zIndex: 10,
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(51, 65, 85, 0.6)',
        borderRadius: 10,
        padding: '12px 14px',
        width: 250,
        boxShadow: 'var(--shadow-lg)',
        fontSize: 11,
      }}
      className="map-legend-box"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          🗺️ Operational Legend
        </span>
        <span style={{ fontSize: 10, color: '#38BDF8', fontWeight: 600 }}>NER Fleet Grid</span>
      </div>

      {/* Routes Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 20, height: 4, backgroundColor: SELECTED_ROUTE_THEME.lineColor, borderRadius: 2 }} />
          <span style={{ color: '#F8FAFC', fontWeight: 600 }}>Selected Route (Dominant)</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 20, height: 3, backgroundColor: BASELINE_ROUTE_THEME.lineColor, borderRadius: 2 }} />
          <span style={{ color: '#94A3B8' }}>Baseline Route (Secondary)</span>
        </div>
      </div>

      {/* Corridors Legend */}
      <div style={{ borderTop: '1px solid #334155', paddingTop: 6, marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>
          Accessibility Corridors ({accessibilityCount})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 16, height: 4, backgroundColor: ACCESSIBILITY_THEME.OPEN.color, borderRadius: 2 }} />
            <span style={{ color: '#CBD5E1' }}>Open Corridor</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 16,
                height: 3,
                borderBottom: `2px dashed ${ACCESSIBILITY_THEME.RESTRICTED.color}`,
                display: 'inline-block',
              }}
            />
            <span style={{ color: '#CBD5E1' }}>Restricted Corridor (Dashed)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 16, height: 4, backgroundColor: ACCESSIBILITY_THEME.CLOSED.color, borderRadius: 2 }} />
            <span style={{ color: '#CBD5E1' }}>Closed Corridor (Excluded)</span>
          </div>
        </div>
      </div>

      {/* Hazard Zones Toggle & Severity Scale */}
      <div style={{ borderTop: '1px solid #334155', paddingTop: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#F8FAFC' }}>
            <input
              type="checkbox"
              checked={showHazardZones}
              onChange={(e) => setShowHazardZones(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: HAZARD_ZONE_THEME.color,
                display: 'inline-block',
              }}
            />
            <span>Historical Zones ({hazardZoneCount})</span>
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {Object.entries(SEVERITY_THEME).map(([key, cfg]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: '#94A3B8' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: cfg.color }} />
              <span>{key[0]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
