import { useState } from 'react';
import type {
  RouteOptimizationResult,
  AlertRecord,
  RerouteEvaluationResult,
} from '../../types/api';
import DriverHeader from './DriverHeader';
import DriverNavigationCard from './DriverNavigationCard';
import DriverRouteSummary from './DriverRouteSummary';
import DriverSafetyStatus from './DriverSafetyStatus';
import DriverBottomNav from './DriverBottomNav';
import type { DriverTab } from './DriverBottomNav';
import AlertsPanel from '../AlertsPanel';
import ReroutePanel from '../ReroutePanel';

interface DriverModeProps {
  optimization: RouteOptimizationResult | null;
  alerts: AlertRecord[];
  alertsUnavailable: boolean;
  isLive: boolean;
  isCheckingReroute: boolean;
  rerouteResult: RerouteEvaluationResult | null;
  rerouteError: string | null;
  onCheckReroute: () => void;
  onExit: () => void;
}

export default function DriverMode({
  optimization,
  alerts,
  alertsUnavailable,
  isLive,
  isCheckingReroute,
  rerouteResult,
  rerouteError,
  onCheckReroute,
  onExit,
}: DriverModeProps) {
  const [activeTab, setActiveTab] = useState<DriverTab>('navigate');

  const hasRoute = Boolean(optimization);

  return (
    <div className="driver-shell">
      <DriverHeader isLive={isLive} />

      <div className="driver-stage">
        {hasRoute && optimization && activeTab === 'navigate' && (
          <div className="driver-maneuver-overlay">
            <DriverNavigationCard selectedRoute={optimization.selectedRoute} />
          </div>
        )}

        <div className="driver-sheet">
          {!optimization ? (
            <div className="driver-card driver-empty">
              <div className="driver-empty-title">No active route</div>
              <div className="driver-empty-text">
                Calculate a route in the Command Center to start driver navigation.
              </div>
              <button className="driver-empty-btn" onClick={onExit}>
                Go to Route Planner
              </button>
            </div>
          ) : activeTab === 'navigate' ? (
            <div className="driver-stack">
              <DriverRouteSummary
                selectedRoute={optimization.selectedRoute}
                preference={optimization.preference}
                strategy={optimization.optimization.strategy}
              />
              <DriverSafetyStatus
                selectedRoute={optimization.selectedRoute}
                safetyStatus={optimization.safetyIntelligence}
              />
            </div>
          ) : activeTab === 'route' ? (
            <DriverRouteSummary
              selectedRoute={optimization.selectedRoute}
              preference={optimization.preference}
              strategy={optimization.optimization.strategy}
            />
          ) : activeTab === 'safety' ? (
            <div className="driver-stack">
              <DriverSafetyStatus
                selectedRoute={optimization.selectedRoute}
                safetyStatus={optimization.safetyIntelligence}
              />
              <ReroutePanel
                onCheckReroute={onCheckReroute}
                isChecking={isCheckingReroute}
                rerouteResult={rerouteResult}
                rerouteError={rerouteError}
                hasCalculatedRoute
              />
            </div>
          ) : (
            <AlertsPanel
              alerts={alerts}
              isUnavailable={alertsUnavailable}
              hasCalculatedRoute
              onRecalculateSaferRoute={onCheckReroute}
            />
          )}
        </div>
      </div>

      <DriverBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onExit={onExit}
        alertCount={alerts.length}
      />
    </div>
  );
}