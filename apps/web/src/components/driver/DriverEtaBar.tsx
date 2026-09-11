import type { CandidateRouteProfile } from '../../types/api';

interface DriverEtaBarProps {
  selectedRoute: CandidateRouteProfile;
}

function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${totalMinutes} min`;
}

function formatArrival(seconds: number): string {
  const arrival = new Date(Date.now() + seconds * 1000);
  return arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function DriverEtaBar({ selectedRoute }: DriverEtaBarProps) {
  const distanceKm = (selectedRoute.distanceMeters / 1000).toFixed(0);

  return (
    <div className="driver-eta-bar">
      <div className="driver-eta-cell">
        <span className="driver-eta-value">{distanceKm}</span>
        <span className="driver-eta-unit">km</span>
      </div>
      <div className="driver-eta-divider" />
      <div className="driver-eta-cell">
        <span className="driver-eta-value">{formatDuration(selectedRoute.durationSeconds)}</span>
      </div>
      <div className="driver-eta-divider" />
      <div className="driver-eta-cell">
        <span className="driver-eta-label">ETA</span>
        <span className="driver-eta-value">{formatArrival(selectedRoute.durationSeconds)}</span>
      </div>
    </div>
  );
}