import { useState } from 'react';
import { PRESET_CORRIDORS } from '../../config/map-theme';

interface DriverTripStartProps {
  onCalculate: (origin: string, dest: string, destLabel?: string) => Promise<void> | void;
  isRouting: boolean;
  routingError: string | null;
  onExit: () => void;
}

// Preset origin hubs for fallback or manual selection
const ORIGIN_HUBS = [
  { id: 'guwahati', label: 'Guwahati Hub', coords: '26.1445, 91.7362', state: 'Assam' },
  { id: 'shillong', label: 'Shillong Hub', coords: '25.5788, 91.8933', state: 'Meghalaya' },
  { id: 'tezpur', label: 'Tezpur Hub', coords: '26.6338, 92.7926', state: 'Assam' },
];

export default function DriverTripStart({
  onCalculate,
  isRouting,
  routingError,
  onExit,
}: DriverTripStartProps) {
  const [originCoords, setOriginCoords] = useState<string | null>(null);
  const [originLabel, setOriginLabel] = useState<string>('Not set (using hub default)');
  const [isUsingGps, setIsUsingGps] = useState<boolean>(false);
  const [geoState, setGeoState] = useState<'idle' | 'locating' | 'success' | 'error'>('idle');
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [selectedHubId, setSelectedHubId] = useState<string | null>(null);

  // Big "Use My Current Location" action
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoState('error');
      setGeoMessage('GPS is not supported on this device. Please tap a starting hub below.');
      return;
    }

    setGeoState('locating');
    setGeoMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(4);
        const lon = position.coords.longitude.toFixed(4);
        const coords = `${lat}, ${lon}`;
        setOriginCoords(coords);
        setOriginLabel('Your Current Location');
        setIsUsingGps(true);
        setSelectedHubId(null);
        setGeoState('success');
      },
      (err) => {
        setGeoState('error');
        setIsUsingGps(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoMessage('Location permission denied. Please choose a starting hub below to continue:');
        } else if (err.code === err.TIMEOUT) {
          setGeoMessage('Location request timed out. Please choose a starting hub below:');
        } else {
          setGeoMessage('Could not retrieve current location. Please choose a starting hub below:');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const handleSelectHub = (hub: (typeof ORIGIN_HUBS)[0]) => {
    setOriginCoords(hub.coords);
    setOriginLabel(hub.label);
    setSelectedHubId(hub.id);
    setIsUsingGps(false);
    setGeoState('idle');
    setGeoMessage(null);
  };

  const handleStartTrip = (corridor: (typeof PRESET_CORRIDORS)[0]) => {
    // If driver has selected an origin (GPS or hub), use it; otherwise use the corridor's default origin
    const effectiveOrigin = originCoords || corridor.origin;
    onCalculate(effectiveOrigin, corridor.destination, corridor.toLabel);
  };

  return (
    <div className="driver-trip-start">
      {/* Title & Status */}
      <div className="driver-trip-hero">
        <div className="driver-trip-badge">DRIVER DISPATCH</div>
        <h1 className="driver-trip-title">Start a Trip</h1>
        <p className="driver-trip-lead">
          Select your destination below to receive safe, turn-by-turn guidance and live road hazard alerts.
        </p>
      </div>

      {/* Origin Selection Section */}
      <div className="driver-trip-section">
        <div className="driver-section-header">
          <span className="driver-section-number">1</span>
          <span className="driver-section-title">STARTING LOCATION</span>
          {isUsingGps && <span className="driver-badge-gps">✓ GPS Active</span>}
          {selectedHubId && <span className="driver-badge-hub">Hub Selected</span>}
        </div>

        {/* Primary Action: Use My Current Location */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isRouting || geoState === 'locating'}
          className={`driver-gps-btn ${isUsingGps ? 'driver-gps-active' : ''}`}
          aria-label="Use My Current Location"
        >
          <span className="driver-gps-icon" aria-hidden="true">
            {geoState === 'locating' ? '⏳' : '📍'}
          </span>
          <div className="driver-gps-content">
            <span className="driver-gps-title">
              {geoState === 'locating'
                ? 'Finding your GPS position...'
                : isUsingGps
                ? 'Using Your Current GPS Location'
                : 'Use My Current Location'}
            </span>
            <span className="driver-gps-subtitle">
              {isUsingGps
                ? 'Tap any destination below to route from here'
                : 'Automatically detects your position via device GPS'}
            </span>
          </div>
          {isUsingGps && (
            <span className="driver-gps-check" aria-hidden="true">
              ✓
            </span>
          )}
        </button>

        {/* Geolocation Feedback / Denial Message */}
        {geoMessage && (
          <div className="driver-geo-feedback" role="alert">
            <span className="driver-geo-icon" aria-hidden="true">
              ⚠️
            </span>
            <span>{geoMessage}</span>
          </div>
        )}

        {/* Fallback Origin Hubs */}
        <div className="driver-hubs-container">
          <span className="driver-hubs-label">Or choose a starting depot / terminal:</span>
          <div className="driver-hubs-grid">
            {ORIGIN_HUBS.map((hub) => {
              const isSelected = selectedHubId === hub.id;
              return (
                <button
                  key={hub.id}
                  type="button"
                  onClick={() => handleSelectHub(hub)}
                  disabled={isRouting}
                  className={`driver-hub-chip ${isSelected ? 'driver-hub-chip-active' : ''}`}
                >
                  <span className="driver-hub-name">{hub.label}</span>
                  <span className="driver-hub-state">{hub.state}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Destination Options Section */}
      <div className="driver-trip-section">
        <div className="driver-section-header">
          <span className="driver-section-number">2</span>
          <span className="driver-section-title">WHERE ARE YOU HEADING?</span>
        </div>

        {/* In-flight routing spinner */}
        {isRouting && (
          <div className="driver-routing-loader" role="status">
            <span className="driver-spinner" aria-hidden="true" />
            <div className="driver-loader-text">
              <strong>Finding safest route...</strong>
              <span>Checking road closures, landslides, and weather hazards ahead.</span>
            </div>
          </div>
        )}

        {/* Error message */}
        {routingError && (
          <div className="driver-routing-error" role="alert">
            <span className="driver-error-icon" aria-hidden="true">
              ⚠️
            </span>
            <div className="driver-error-body">
              <strong>Could not calculate route</strong>
              <span>{routingError}</span>
            </div>
          </div>
        )}

        {/* Destination Cards List */}
        <div className="driver-destinations-list">
          {PRESET_CORRIDORS.map((corridor) => (
            <button
              key={corridor.name}
              type="button"
              onClick={() => handleStartTrip(corridor)}
              disabled={isRouting}
              className="driver-destination-card"
              aria-label={`Route to ${corridor.toLabel} via ${corridor.highway}`}
            >
              <div className="driver-dest-icon" aria-hidden="true">
                🎯
              </div>
              <div className="driver-dest-info">
                <div className="driver-dest-title">{corridor.toLabel}</div>
                <div className="driver-dest-meta">
                  <span className="driver-dest-highway">{corridor.highway}</span>
                  <span className="driver-dest-dot">·</span>
                  <span className="driver-dest-from">
                    From: {originCoords ? originLabel : corridor.fromLabel}
                  </span>
                </div>
              </div>
              <div className="driver-dest-action">
                <span className="driver-dest-go">Start →</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Switch to Operations Center Option */}
      <div className="driver-trip-footer">
        <button
          type="button"
          onClick={onExit}
          className="driver-switch-ops-btn"
          title="Switch to Logistics Planner Command Center"
        >
          <span>Dispatcher or Logistics Planner?</span>
          <strong>Open Command Center →</strong>
        </button>
      </div>
    </div>
  );
}
