import type { RoutingPreference } from '../types/api';
import { PRESET_CORRIDORS } from '../config/map-theme';

interface RoutePlannerProps {
  originInput: string;
  setOriginInput: (val: string) => void;
  destInput: string;
  setDestInput: (val: string) => void;
  preference: RoutingPreference;
  setPreference: (pref: RoutingPreference) => void;
  onCalculate: (customOrig?: string, customDest?: string) => void;
  isRouting: boolean;
}

export default function RoutePlanner({
  originInput,
  setOriginInput,
  destInput,
  setDestInput,
  preference,
  setPreference,
  onCalculate,
  isRouting,
}: RoutePlannerProps) {
  const activePreset = PRESET_CORRIDORS.find(
    (p) => p.origin === originInput && p.destination === destInput
  );

  const handleApplyPreset = (preset: typeof PRESET_CORRIDORS[0]) => {
    setOriginInput(preset.origin);
    setDestInput(preset.destination);
    onCalculate(preset.origin, preset.destination);
  };

  return (
    <div className="intel-card">
      <div className="intel-card-header">
        <span className="intel-card-title">
          <span>🧭</span>
          <span>Route Planner</span>
        </span>
        {activePreset && (
          <span style={{ fontSize: 10, color: '#38BDF8', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
            {activePreset.highway}
          </span>
        )}
      </div>

      {/* Preset Corridor Buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {PRESET_CORRIDORS.map((p) => {
          const isSelected = p.origin === originInput && p.destination === destInput;
          return (
            <button
              key={p.name}
              onClick={() => handleApplyPreset(p)}
              disabled={isRouting}
              className={`btn-preset ${isSelected ? 'active' : ''}`}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      {/* Inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <span style={{ color: '#10B981' }}>●</span> FROM (Origin Lat, Lon):
          </label>
          <input
            type="text"
            value={originInput}
            onChange={(e) => setOriginInput(e.target.value)}
            placeholder="26.1445, 91.7362"
            disabled={isRouting}
            className="coord-input"
            aria-label="Origin coordinates"
          />
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <span style={{ color: '#EF4444' }}>●</span> TO (Destination Lat, Lon):
          </label>
          <input
            type="text"
            value={destInput}
            onChange={(e) => setDestInput(e.target.value)}
            placeholder="25.5788, 91.8933"
            disabled={isRouting}
            className="coord-input"
            aria-label="Destination coordinates"
          />
        </div>
      </div>

      {/* Routing Preference Selector */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: 6 }}>
          ROUTING OBJECTIVE:
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['FASTEST', 'BALANCED', 'SAFEST'] as RoutingPreference[]).map((mode) => {
            const isSelected = preference === mode;
            return (
              <button
                key={mode}
                onClick={() => setPreference(mode)}
                disabled={isRouting}
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 6,
                  cursor: isRouting ? 'not-allowed' : 'pointer',
                  border: `1px solid ${isSelected ? '#3B82F6' : '#334155'}`,
                  backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.25)' : 'rgba(30, 41, 59, 0.6)',
                  color: isSelected ? '#93C5FD' : '#94A3B8',
                  transition: 'all 0.15s',
                }}
              >
                {mode === 'FASTEST' ? '⚡ FASTEST' : mode === 'BALANCED' ? '⚖️ BALANCED' : '🛡️ SAFEST'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Calculate Button */}
      <button
        onClick={() => onCalculate()}
        disabled={isRouting}
        className="btn-primary"
        aria-busy={isRouting}
      >
        {isRouting ? (
          <>
            <span
              style={{
                width: 14,
                height: 14,
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderTopColor: '#FFFFFF',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span>CALCULATING ROUTE...</span>
          </>
        ) : (
          <span>CALCULATE ROUTE</span>
        )}
      </button>
    </div>
  );
}
