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

export default function DriverNavigationCard({ selectedRoute }: DriverNavigationCardProps) {
  const instructions = selectedRoute.instructions ?? [];
  const primary = instructions[0];
  const coords = selectedRoute.geometry.coordinates;
  const destination = coords.length > 0 ? coords[coords.length - 1] : undefined;

  return (
    <div className="driver-card driver-navigation-card">
      <div className="driver-nav-header">
        <span className="driver-nav-title">TURN-BY-TURN GUIDANCE</span>
        <span className="driver-nav-steps">{instructions.length} steps</span>
      </div>

      <div className="driver-nav-primary">
        <div className="driver-nav-maneuver">
          {primary ? primary.text : 'Proceed to destination'}
        </div>
        <div className="driver-nav-primary-meta">
          <span>{formatDistance(primary ? primary.distanceMeters : selectedRoute.distanceMeters)}</span>
          <span>·</span>
          <span>{formatDuration(primary ? primary.durationSeconds : selectedRoute.durationSeconds)}</span>
        </div>
      </div>

      {instructions.length > 1 && (
        <ol className="driver-nav-steps-list">
          {instructions.slice(1).map((step, index) => (
            <li key={`${index}-${step.text}`} className="driver-nav-step">
              <span className="driver-nav-step-index">{index + 2}</span>
              <span className="driver-nav-step-text">{step.text}</span>
              <span className="driver-nav-step-meta">{formatDistance(step.distanceMeters)}</span>
            </li>
          ))}
        </ol>
      )}

      {destination && (
        <div className="driver-nav-destination">
          Destination: {destination[1].toFixed(4)}, {destination[0].toFixed(4)}
        </div>
      )}
    </div>
  );
}