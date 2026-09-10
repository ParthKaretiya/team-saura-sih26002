import type { Dispatch, SetStateAction } from 'react';

interface HeaderProps {
  isLive: boolean;
  vehicleCount: number;
  incidentCount: number;
  hazardZoneCount: number;
  accessibilityCount: number;
  lastUpdated: string;
  showLeftPanel: boolean;
  setShowLeftPanel: Dispatch<SetStateAction<boolean>>;
  showRightPanel: boolean;
  setShowRightPanel: Dispatch<SetStateAction<boolean>>;
  showLegend: boolean;
  setShowLegend: Dispatch<SetStateAction<boolean>>;
}

export default function Header({
  isLive,
  vehicleCount,
  incidentCount,
  hazardZoneCount,
  accessibilityCount,
  lastUpdated,
  showLeftPanel,
  setShowLeftPanel,
  showRightPanel,
  setShowRightPanel,
  showLegend,
  setShowLegend,
}: HeaderProps) {
  return (
    <header className="command-header">
      {/* Brand / Logo */}
      <div className="brand-badge">
        <div className="brand-icon" aria-label="SauraRoute Logo">
          SR
        </div>
        <div>
          <div className="brand-title">SAURAROUTE</div>
          <div className="brand-subtitle">AI Logistics &amp; Resilience Intelligence</div>
        </div>
      </div>

      {/* Center Operational Telemetry (Desktop / Tablet) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
        className="desktop-telemetry"
      >
        <div className="tag-badge" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#94A3B8', fontSize: 10 }}>REGION</span>
          <span style={{ fontWeight: 700, color: '#38BDF8' }}>NER CORRIDOR</span>
        </div>

        <div className="tag-badge" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#94A3B8', fontSize: 10 }}>FLEET</span>
          <span style={{ fontWeight: 700, color: '#10B981' }}>{vehicleCount} Active</span>
        </div>

        <div className="tag-badge" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#94A3B8', fontSize: 10 }}>HAZARDS</span>
          <span style={{ fontWeight: 700, color: incidentCount > 0 ? '#F87171' : '#94A3B8' }}>
            {incidentCount} Live
          </span>
        </div>

        <div className="tag-badge" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#94A3B8', fontSize: 10 }}>CATALOG</span>
          <span style={{ fontWeight: 700, color: '#C084FC' }}>{hazardZoneCount} Zones</span>
        </div>

        <div className="tag-badge" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#94A3B8', fontSize: 10 }}>CORRIDORS</span>
          <span style={{ fontWeight: 700, color: '#A78BFA' }}>{accessibilityCount} Monitored</span>
        </div>
      </div>

      {/* Right Actions & Live Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Toggle Panel Buttons for Quick Visibility */}
        <button
          onClick={() => setShowLeftPanel(!showLeftPanel)}
          title={showLeftPanel ? 'Hide Route Planner' : 'Show Route Planner'}
          style={{
            padding: '5px 9px',
            background: showLeftPanel ? 'rgba(37, 99, 235, 0.2)' : 'rgba(30, 41, 59, 0.8)',
            border: `1px solid ${showLeftPanel ? '#3B82F6' : '#334155'}`,
            color: showLeftPanel ? '#93C5FD' : '#94A3B8',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          Planner
        </button>

        <button
          onClick={() => setShowRightPanel(!showRightPanel)}
          title={showRightPanel ? 'Hide Risk & Intelligence' : 'Show Risk & Intelligence'}
          style={{
            padding: '5px 9px',
            background: showRightPanel ? 'rgba(37, 99, 235, 0.2)' : 'rgba(30, 41, 59, 0.8)',
            border: `1px solid ${showRightPanel ? '#3B82F6' : '#334155'}`,
            color: showRightPanel ? '#93C5FD' : '#94A3B8',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          Intelligence
        </button>

        <button
          onClick={() => setShowLegend(!showLegend)}
          title={showLegend ? 'Hide Map Legend' : 'Show Map Legend'}
          style={{
            padding: '5px 9px',
            background: showLegend ? 'rgba(139, 92, 246, 0.2)' : 'rgba(30, 41, 59, 0.8)',
            border: `1px solid ${showLegend ? '#8B5CF6' : '#334155'}`,
            color: showLegend ? '#C4B5FD' : '#94A3B8',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          Legend
        </button>

        <div className={`status-pill ${isLive ? 'live' : 'disconnected'}`} title={`Last refreshed: ${lastUpdated}`}>
          <span className="status-pulse" />
          <span>{isLive ? 'LIVE' : 'OFFLINE'}</span>
        </div>
      </div>
    </header>
  );
}
