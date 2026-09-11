import { useState } from 'react';
import type {
  RouteOptimizationResult,
  AlertRecord,
  RerouteEvaluationResult,
} from '../../types/api';
import DriverHeader from './DriverHeader';
import DriverManeuverCard from './DriverManeuverCard';
import DriverNavigationCard from './DriverNavigationCard';
import DriverEtaBar from './DriverEtaBar';
import DriverSafetyBanner from './DriverSafetyBanner';
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

  const showMapOverlay = Boolean(optimization) && activeTab === 'navigate';

  return (
    <div className="driver-shell">
      <DriverHeader isLive={isLive} />

      {showMapOverlay && optimization ? (
        <>
          <div className="driver-map-top">
            <DriverManeuverCard
              selectedRoute={optimization.selectedRoute}
              destination={optimization.destination}
            />
          </div>

          <div className="driver-map-bottom">
            <DriverSafetyBanner
              selectedRoute={optimization.selectedRoute}
              alerts={alerts}
              onViewSafety={() => setActiveTab('safety')}
              onCheckReroute={onCheckReroute}
              canReroute={!isCheckingReroute}
            />
            <DriverEtaBar selectedRoute={optimization.selectedRoute} />
          </div>
        </>
      ) : (
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
          ) : activeTab === 'route' ? (
            <div className="driver-stack">
              <DriverRouteSummary
                selectedRoute={optimization.selectedRoute}
                preference={optimization.preference}
                strategy={optimization.optimization.strategy}
              />
              <DriverNavigationCard selectedRoute={optimization.selectedRoute} />
            </div>
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
          ) : activeTab === 'alerts' ? (
            <AlertsPanel
              alerts={alerts}
              isUnavailable={alertsUnavailable}
              hasCalculatedRoute
              onRecalculateSaferRoute={onCheckReroute}
            />
          ) : (
            <div className="driver-stack">
              <div className="driver-card">
                <div className="driver-nav-header">
                  <span className="driver-nav-title">DRIVER SESSION</span>
                </div>
                <div className="driver-route-foot" style={{ marginBottom: 12 }}>
                  <span>Switch back to the Command Center to adjust routes or settings.</span>
                </div>
                <button className="driver-empty-btn" onClick={onExit}>
                  Exit Driver Mode
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <DriverBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        alertCount={alerts.length}
      />
    </div>
  );
}