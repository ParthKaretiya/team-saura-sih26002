import { useState } from 'react';
import type {
  RouteOptimizationResult,
  AlertRecord,
  RerouteEvaluationResult,
} from '../../types/api';
import type { LiveTripProgress } from '../../utils/eta';
import DriverHeader from './DriverHeader';
import DriverManeuverCard from './DriverManeuverCard';
import DriverNavigationCard from './DriverNavigationCard';
import DriverEtaBar from './DriverEtaBar';
import DriverSafetyBanner from './DriverSafetyBanner';
import DriverRouteSummary from './DriverRouteSummary';
import DriverSafetyStatus from './DriverSafetyStatus';
import DriverBottomNav from './DriverBottomNav';
import type { DriverTab } from './DriverBottomNav';
import DriverTripStart from './DriverTripStart';
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
  onCalculate: (origin: string, dest: string, destLabel?: string) => Promise<void> | void;
  isRouting: boolean;
  routingError: string | null;
  destinationLabel?: string;
  onNewTrip?: () => void;
  liveProgress?: LiveTripProgress | null;
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
  onCalculate,
  isRouting,
  routingError,
  destinationLabel,
  onNewTrip,
  liveProgress,
}: DriverModeProps) {
  const [activeTab, setActiveTab] = useState<DriverTab>('navigate');

  const showMapOverlay = Boolean(optimization) && activeTab === 'navigate';

  return (
    <div className="driver-shell">
      <DriverHeader isLive={isLive} onExit={onExit} />

      {showMapOverlay && optimization ? (
        <>
          <div className="driver-map-top">
            <DriverManeuverCard
              selectedRoute={optimization.selectedRoute}
              destination={optimization.destination}
              destinationLabel={destinationLabel}
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
            <DriverEtaBar selectedRoute={optimization.selectedRoute} liveProgress={liveProgress} />
          </div>
        </>
      ) : (
        <div className="driver-sheet">
          {!optimization ? (
            <DriverTripStart
              onCalculate={onCalculate}
              isRouting={isRouting}
              routingError={routingError}
              onExit={onExit}
            />
          ) : activeTab === 'route' ? (
            <div className="driver-stack">
              <DriverRouteSummary
                selectedRoute={optimization.selectedRoute}
                preference={optimization.preference}
                strategy={optimization.optimization.strategy}
                liveProgress={liveProgress}
              />
              <DriverNavigationCard selectedRoute={optimization.selectedRoute} />
              {onNewTrip && (
                <button
                  type="button"
                  className="driver-empty-btn"
                  onClick={onNewTrip}
                  style={{
                    backgroundColor: 'rgba(30, 41, 59, 0.9)',
                    border: '1px solid #334155',
                    minHeight: 44,
                  }}
                >
                  Change Destination / New Trip
                </button>
              )}
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
                driverMode={true}
              />
            </div>
          ) : activeTab === 'alerts' ? (
            <AlertsPanel
              alerts={alerts}
              isUnavailable={alertsUnavailable}
              hasCalculatedRoute
              onRecalculateSaferRoute={onCheckReroute}
              driverMode={true}
            />
          ) : (
            <div className="driver-stack">
              <div className="driver-card">
                <div className="driver-nav-header">
                  <span className="driver-nav-title">DRIVER SESSION</span>
                </div>
                <p className="driver-route-foot" style={{ marginBottom: 16 }}>
                  Active trip monitoring is running. You can start a new trip, adjust routing, or switch to the Command Center.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {onNewTrip && (
                    <button
                      type="button"
                      className="driver-empty-btn"
                      onClick={() => {
                        onNewTrip();
                        setActiveTab('navigate');
                      }}
                      style={{ minHeight: 46, background: '#2563EB' }}
                    >
                      🎯 Change Destination / New Trip
                    </button>
                  )}
                  <button
                    type="button"
                    className="driver-empty-btn"
                    onClick={onExit}
                    style={{ minHeight: 46, background: 'rgba(30, 41, 59, 0.9)', border: '1px solid #475569' }}
                  >
                    🖥️ Switch to Operations Command Center
                  </button>
                </div>
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