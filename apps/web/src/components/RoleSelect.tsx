interface RoleSelectProps {
  onSelectMode: (mode: 'driver' | 'operations') => void;
}

export default function RoleSelect({ onSelectMode }: RoleSelectProps) {
  return (
    <div className="role-select-backdrop" role="dialog" aria-modal="true" aria-labelledby="role-select-title">
      <div className="role-select-card">
        <div className="role-select-header">
          <div className="brand-badge" style={{ marginBottom: 12 }}>
            <div className="brand-icon" aria-hidden="true">
              SR
            </div>
            <div>
              <div className="brand-title">SAURAROUTE</div>
              <div className="brand-subtitle">AI Logistics &amp; Accessibility Intelligence</div>
            </div>
          </div>
          <h2 id="role-select-title" className="role-select-title">
            Choose Your Experience
          </h2>
          <p className="role-select-subtitle">
            Select how you want to use SauraRoute today. You can switch modes at any time.
          </p>
        </div>

        <div className="role-select-options">
          {/* Driver Mode Choice */}
          <button
            type="button"
            className="role-option-btn role-option-driver"
            onClick={() => onSelectMode('driver')}
            aria-label="Enter Driver Mode"
          >
            <div className="role-option-icon" aria-hidden="true">
              🚚
            </div>
            <div className="role-option-content">
              <div className="role-option-headline">
                <span className="role-option-name">I'm Driving</span>
                <span className="role-option-badge">Quick &amp; Hands-Free</span>
              </div>
              <p className="role-option-desc">
                One-tap trips using your current location, turn-by-turn guidance, and real-time road hazard alerts.
                No coordinates required.
              </p>
            </div>
            <span className="role-option-arrow" aria-hidden="true">
              →
            </span>
          </button>

          {/* Operations Command Center Choice */}
          <button
            type="button"
            className="role-option-btn role-option-operations"
            onClick={() => onSelectMode('operations')}
            aria-label="Open Operations Command Center"
          >
            <div className="role-option-icon" aria-hidden="true">
              🖥️
            </div>
            <div className="role-option-content">
              <div className="role-option-headline">
                <span className="role-option-name">Operations Center</span>
                <span className="role-option-badge role-badge-ops">Dispatcher Hub</span>
              </div>
              <p className="role-option-desc">
                Full logistics intelligence platform: multi-corridor monitoring, fleet telemetry, hazard catalogs, and
                detailed GIS risk analysis.
              </p>
            </div>
            <span className="role-option-arrow" aria-hidden="true">
              →
            </span>
          </button>
        </div>

        <div className="role-select-footer">
          <span>Your selection will be remembered on this device.</span>
        </div>
      </div>
    </div>
  );
}
