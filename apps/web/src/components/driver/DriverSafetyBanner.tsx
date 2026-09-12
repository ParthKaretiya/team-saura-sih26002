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
  let message = 'No active road warnings ahead';

  if (activeAlert) {
    tone = activeAlert.severity === 'CRITICAL' ? 'hazard' : 'warn';
    icon = '⚠';
    title = activeAlert.title.toUpperCase();
    message = activeAlert.message;
  } else if (accessibilityStatus === 'CLOSED') {
    tone = 'hazard';
    icon = '⛔';
    title = 'ROAD CLOSED AHEAD';
    message = 'A road segment on this route is currently closed to traffic.';
  } else if (accessibilityStatus === 'RESTRICTED') {
    tone = 'warn';
    icon = '⚠';
    title = 'RESTRICTED ROAD';
    message = 'Drive with caution — single-lane or slow traffic on this corridor.';
  } else if (risk.overallLevel === 'CRITICAL' || risk.overallLevel === 'HIGH') {
    tone = 'warn';
    icon = '⚠';
    title = risk.overallLevel === 'CRITICAL' ? 'HIGH RISK ROAD AHEAD' : 'ROAD AHEAD LOOKS RISKY';
    message = `Main concern: ${risk.dominantTrigger}`;
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
        <button type="button" className="driver-safety-btn" onClick={onViewSafety}>
          Safety Details
        </button>
        <button
          type="button"
          className="driver-safety-btn driver-safety-btn-primary"
          onClick={onCheckReroute}
          disabled={!canReroute}
        >
          Find a safer route
        </button>
      </div>
    </div>
  );
}