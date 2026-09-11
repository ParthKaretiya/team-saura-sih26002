import type { AlertRecord, CandidateRouteProfile } from '../../types/api';

interface DriverSafetyBannerProps {
  selectedRoute: CandidateRouteProfile;
  alerts: AlertRecord[];
  onViewSafety: () => void;
  onCheckReroute: () => void;
  canReroute: boolean;
}

export default function DriverSafetyBanner({
  selectedRoute,
  alerts,
  onViewSafety,
  onCheckReroute,
  canReroute,
}: DriverSafetyBannerProps) {
  const routeAlerts = alerts.filter((a) => a.routeCandidateId || a.severity === 'CRITICAL');
  const activeAlert = routeAlerts[0];
  const risk = selectedRoute.risk;
  const accessibilityStatus = selectedRoute.accessibility?.status;

  let tone: 'hazard' | 'warn' | 'safe' = 'safe';
  let icon = '✓';
  let title = 'SAFE TO PROCEED';
  let message = 'No active route warnings';

  if (activeAlert) {
    tone = activeAlert.severity === 'CRITICAL' ? 'hazard' : 'warn';
    icon = '⚠';
    title = activeAlert.title.toUpperCase();
    message = activeAlert.message;
  } else if (accessibilityStatus === 'CLOSED') {
    tone = 'hazard';
    icon = '⛔';
    title = 'ROAD CLOSED';
    message = 'A monitored corridor on this route is closed.';
  } else if (accessibilityStatus === 'RESTRICTED') {
    tone = 'warn';
    icon = '⚠';
    title = 'RESTRICTED CORRIDOR';
    message = 'Travel possible with caution on this route.';
  } else if (risk.overallLevel === 'CRITICAL' || risk.overallLevel === 'HIGH') {
    tone = 'warn';
    icon = '⚠';
    title = `${risk.overallLevel} RISK`;
    message = `Dominant trigger: ${risk.dominantTrigger}`;
  }

  const className = `driver-safety-banner driver-safety-${tone}`;

  return (
    <div className={className}>
      <div className="driver-safety-main">
        <span className="driver-safety-icon" aria-hidden="true">
          {icon}
        </span>
        <div className="driver-safety-body">
          <div className="driver-safety-title">{title}</div>
          <div className="driver-safety-message">{message}</div>
        </div>
      </div>

      <div className="driver-safety-actions">
        <button className="driver-safety-btn" onClick={onViewSafety}>
          View
        </button>
        <button
          className="driver-safety-btn driver-safety-btn-primary"
          onClick={onCheckReroute}
          disabled={!canReroute}
        >
          Safer Route
        </button>
      </div>
    </div>
  );
}