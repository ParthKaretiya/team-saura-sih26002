import { useState } from 'react';
import type {
  RouteOptimizationResult,
  AlertRecord,
  RerouteEvaluationResult,
} from '../../types/api';
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
  isCheckingReroute,
  rerouteResult,
  rerouteError,
  onCheckReroute,
  onExit,
}: DriverModeProps) {
  const [activeTab, setActiveTab] = useState<DriverTab>('navigate');

  return (
    <div className="driver-shell">
      <div className="driver-content-panel">
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
          <DriverNavigationCard selectedRoute={optimization.selectedRoute} />
        ) : activeTab === 'route' ? (
          <DriverRouteSummary
            selectedRoute={optimization.selectedRoute}
            preference={optimization.preference}
            strategy={optimization.optimization.strategy}
          />
        ) : activeTab === 'safety' ? (
          <>
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
          </>
        ) : (
          <AlertsPanel
            alerts={alerts}
            isUnavailable={alertsUnavailable}
            hasCalculatedRoute
            onRecalculateSaferRoute={onCheckReroute}
          />
        )}
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