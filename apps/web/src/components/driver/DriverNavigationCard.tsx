import type { CandidateRouteProfile } from '../../types/api';

interface DriverNavigationCardProps {
  selectedRoute: CandidateRouteProfile;
}

function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${totalMinutes} min`;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

function maneuverGlyph(text: string | undefined): string {
  if (!text) return '↑';
  const t = text.toLowerCase();
  if (t.includes('u-turn') || t.includes('u turn')) return '↺';
  if (t.includes('roundabout') || t.includes('rotary')) return '↻';
  if (t.includes('slight left') || t.includes('keep left')) return '↖';
  if (t.includes('slight right') || t.includes('keep right')) return '↗';
  if (t.includes('left')) return '←';
  if (t.includes('right')) return '→';
  if (t.includes('exit') || t.includes('ramp')) return '↗';
  if (t.includes('arrive') || t.includes('destination')) return '⚑';
  return '↑';
}

export default function DriverNavigationCard({ selectedRoute }: DriverNavigationCardProps) {
  const instructions = selectedRoute.instructions ?? [];
  const primary = instructions[0];
  const coords = selectedRoute.geometry.coordinates;
  const destination = coords.length > 0 ? coords[coords.length - 1] : undefined;

  if (!primary) {
    return (
      <div className="driver-card driver-navigation-card">
        <div className="driver-nav-empty">No turn-by-turn guidance available for this route.</div>
      </div>
    );
  }

  return (
    <div className="driver-card driver-navigation-card">
      <div className="driver-maneuver">
        <div className="driver-maneuver-arrow" aria-hidden="true">
          {maneuverGlyph(primary.text)}
        </div>
        <div className="driver-maneuver-body">
          <div className="driver-maneuver-distance">{formatDistance(primary.distanceMeters)}</div>
          <div className="driver-maneuver-text">{primary.text}</div>
          <div className="driver-maneuver-eta">
            {formatDuration(primary.durationSeconds)} to maneuver
            {destination ? ` · destination ${destination[1].toFixed(3)}, ${destination[0].toFixed(3)}` : ''}
          </div>
        </div>
      </div>

      {instructions.length > 1 && (
        <ol className="driver-nav-steps-list">
          {instructions.slice(1).map((step, index) => (
            <li key={`${index}-${step.text}`} className="driver-nav-step">
              <span className="driver-nav-step-glyph">{maneuverGlyph(step.text)}</span>
              <span className="driver-nav-step-text">{step.text}</span>
              <span className="driver-nav-step-meta">{formatDistance(step.distanceMeters)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}