import type { CandidateRouteProfile } from '../../types/api';

interface DriverManeuverCardProps {
  selectedRoute: CandidateRouteProfile;
  destination: { latitude: number; longitude: number };
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

export default function DriverManeuverCard({ selectedRoute, destination }: DriverManeuverCardProps) {
  const instructions = selectedRoute.instructions ?? [];
  const primary = instructions[0];
  const next = instructions[1];

  if (!primary) {
    return (
      <div className="driver-maneuver-card">
        <div className="driver-nav-empty">No turn-by-turn guidance available for this route.</div>
      </div>
    );
  }

  return (
    <div className="driver-maneuver-card">
      <div className="driver-maneuver-arrow" aria-hidden="true">
        {maneuverGlyph(primary.text)}
      </div>

      <div className="driver-maneuver-body">
        <div className="driver-maneuver-distance">{formatDistance(primary.distanceMeters)}</div>
        <div className="driver-maneuver-text">{primary.text}</div>
        <div className="driver-maneuver-context">
          towards {destination.latitude.toFixed(3)}, {destination.longitude.toFixed(3)} ·{' '}
          {formatDuration(primary.durationSeconds)}
        </div>

        {next && (
          <div className="driver-maneuver-then">
            <span className="driver-then-label">Then</span>
            <span className="driver-then-glyph" aria-hidden="true">
              {maneuverGlyph(next.text)}
            </span>
            <span className="driver-then-text">{next.text}</span>
            <span className="driver-then-meta">{formatDistance(next.distanceMeters)}</span>
          </div>
        )}
      </div>
    </div>
  );
}