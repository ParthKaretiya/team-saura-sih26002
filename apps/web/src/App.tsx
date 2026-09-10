import { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import MapComponent from './components/Map';
import type { MapHandle } from './components/Map';
import RoutePlanner from './components/RoutePlanner';
import RouteSummary from './components/RouteSummary';
import RouteComparison from './components/RouteComparison';
import RiskPanel from './components/RiskPanel';
import RouteReasonPanel from './components/RouteReasonPanel';
import AccessibilityPanel from './components/AccessibilityPanel';
import AlertsPanel from './components/AlertsPanel';
import ReroutePanel from './components/ReroutePanel';
import MapLegend from './components/MapLegend';
import LoadingIndicator from './components/LoadingIndicator';
import ErrorMessage from './components/ErrorMessage';
import type {
  IncidentFeatureCollection,
  VehicleFeatureCollection,
  HazardZoneFeatureCollection,
  AccessibilityFeatureCollection,
  AlertRecord,
  AlertCollection,
  RouteOptimizationResult,
  RerouteEvaluationResult,
  RoutingPreference,
} from './types/api';

const API_BASE_URL = 'http://localhost:3000/api';

type MobileTab = 'planner' | 'map' | 'risk' | 'corridors';

export default function App() {
  const mapHandleRef = useRef<MapHandle>(null);

  // Live Telemetry Data States
  const [incidents, setIncidents] = useState<IncidentFeatureCollection>({ type: 'FeatureCollection', features: [] });
  const [vehicles, setVehicles] = useState<VehicleFeatureCollection>({ type: 'FeatureCollection', features: [] });
  const [hazardZones, setHazardZones] = useState<HazardZoneFeatureCollection>({ type: 'FeatureCollection', features: [] });
  const [accessibility, setAccessibility] = useState<AccessibilityFeatureCollection>({ type: 'FeatureCollection', features: [] });
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);

  const [isLive, setIsLive] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('Never');
  const [accessibilityUnavailable, setAccessibilityUnavailable] = useState<boolean>(false);
  const [alertsUnavailable, setAlertsUnavailable] = useState<boolean>(false);

  // Deck Visibility Toggles
  const [showLeftPanel, setShowLeftPanel] = useState<boolean>(true);
  const [showRightPanel, setShowRightPanel] = useState<boolean>(true);
  const [showLegend, setShowLegend] = useState<boolean>(true);
  const [showHazardZones, setShowHazardZones] = useState<boolean>(true);

  // Mobile navigation tab
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>('map');

  // Route Planning States (Default to Guwahati -> Shillong)
  const [originInput, setOriginInput] = useState<string>('26.1445, 91.7362');
  const [destInput, setDestInput] = useState<string>('25.5788, 91.8933');
  const [preference, setPreference] = useState<RoutingPreference>('BALANCED');

  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [optimization, setOptimization] = useState<RouteOptimizationResult | null>(null);

  // Reroute Evaluation States
  const [isCheckingReroute, setIsCheckingReroute] = useState<boolean>(false);
  const [rerouteError, setRerouteError] = useState<string | null>(null);
  const [rerouteResult, setRerouteResult] = useState<RerouteEvaluationResult | null>(null);

  // Fetch Hazard Zones (Initial)
  useEffect(() => {
    const fetchHazardZones = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/risk/zones`);
        if (res.ok) {
          const data = (await res.json()) as HazardZoneFeatureCollection;
          setHazardZones(data);
        }
      } catch (err) {
        console.warn('Could not connect to hazard zones API:', err);
      }
    };
    fetchHazardZones();
  }, []);

  // Fetch Accessibility & Alerts Polling (10s)
  useEffect(() => {
    const fetchAccessibilityData = async () => {
      try {
        const accRes = await fetch(`${API_BASE_URL}/accessibility`);
        if (accRes.ok) {
          const accData = (await accRes.json()) as AccessibilityFeatureCollection;
          setAccessibility(accData);
          setAccessibilityUnavailable(false);
        } else {
          setAccessibilityUnavailable(true);
        }
      } catch {
        setAccessibilityUnavailable(true);
      }

      try {
        const alertRes = await fetch(`${API_BASE_URL}/alerts`);
        if (alertRes.ok) {
          const payload = (await alertRes.json()) as { data?: AlertCollection };
          setAlerts(payload.data?.items ?? []);
          setAlertsUnavailable(false);
        } else {
          setAlertsUnavailable(true);
        }
      } catch {
        setAlertsUnavailable(true);
      }
    };

    fetchAccessibilityData();
    const interval = setInterval(fetchAccessibilityData, 10_000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Incidents & Vehicles Polling (2.5s)
  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const [incRes, vhRes] = await Promise.all([
          fetch(`${API_BASE_URL}/incidents`),
          fetch(`${API_BASE_URL}/vehicles`),
        ]);

        if (incRes.ok) {
          const incData = (await incRes.json()) as IncidentFeatureCollection;
          setIncidents(incData);
        }

        if (vhRes.ok) {
          const vhData = (await vhRes.json()) as VehicleFeatureCollection;
          setVehicles(vhData);
        }

        setIsLive(true);
        setLastUpdated(new Date().toLocaleTimeString());
      } catch {
        setIsLive(false);
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 2500);
    return () => clearInterval(interval);
  }, []);

  // Handle Route Calculation
  const handleCalculateRoute = async (customOrigin?: string, customDest?: string) => {
    const origStr = customOrigin || originInput;
    const destStr = customDest || destInput;
    setRoutingError(null);
    setIsRouting(true);
    setRerouteResult(null);
    setRerouteError(null);

    const origParts = origStr.split(',').map((s) => parseFloat(s.trim()));
    const destParts = destStr.split(',').map((s) => parseFloat(s.trim()));

    if (
      origParts.length !== 2 ||
      destParts.length !== 2 ||
      isNaN(origParts[0]) ||
      isNaN(origParts[1]) ||
      isNaN(destParts[0]) ||
      isNaN(destParts[1])
    ) {
      setRoutingError('Please provide coordinates formatted as: latitude, longitude (e.g. 26.1445, 91.7362)');
      setIsRouting(false);
      return;
    }

    const [originLat, originLon] = origParts;
    const [destinationLat, destinationLon] = destParts;

    try {
      const res = await fetch(`${API_BASE_URL}/routes/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: { latitude: originLat, longitude: originLon },
          destination: { latitude: destinationLat, longitude: destinationLon },
          routingPreference: preference,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setRoutingError(json.message || `Route optimization failed (HTTP ${res.status}).`);
        setIsRouting(false);
        return;
      }

      const result = json.data as RouteOptimizationResult;
      setOptimization(result);

      if (mapHandleRef.current) {
        mapHandleRef.current.updateRoutesOnMap(result.selectedRoute, result.baselineRoute);
        mapHandleRef.current.fitRouteBounds(result.selectedRoute.geometry.coordinates);
      }
    } catch (err) {
      setRoutingError(`Route service unavailable: ${(err as Error).message}. Ensure backend is active on port 3000.`);
    } finally {
      setIsRouting(false);
    }
  };

  // Handle Safer Reroute Evaluation
  const handleCheckReroute = async () => {
    if (!optimization) {
      setRerouteError('Please calculate an active route before running a reroute check.');
      return;
    }

    setRerouteError(null);
    setRerouteResult(null);
    setIsCheckingReroute(true);

    const currentRoute = {
      origin: optimization.origin,
      destination: optimization.destination,
      distanceMeters: optimization.selectedRoute.distanceMeters,
      durationSeconds: optimization.selectedRoute.durationSeconds,
      geometry: optimization.selectedRoute.geometry,
      instructions: optimization.selectedRoute.instructions,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/routes/reroute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: optimization.origin,
          destination: optimization.destination,
          currentRoute,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setRerouteError(json.message || `Reroute evaluation failed (HTTP ${res.status}).`);
        return;
      }

      const result = json.data as RerouteEvaluationResult;
      setRerouteResult(result);

      // If a recommended alternative route is returned, highlight it on map
      if (result.rerouteRecommended && result.recommendedRoute && mapHandleRef.current) {
        mapHandleRef.current.updateRoutesOnMap(result.recommendedRoute, optimization.selectedRoute);
        mapHandleRef.current.fitRouteBounds(result.recommendedRoute.geometry.coordinates);
      }
    } catch (err) {
      setRerouteError(`Reroute service network error: ${(err as Error).message}`);
    } finally {
      setIsCheckingReroute(false);
    }
  };

  return (
    <div className="app-container">
      {/* 1. Header Command Bar */}
      <Header
        isLive={isLive}
        vehicleCount={vehicles.features.length}
        incidentCount={incidents.features.length}
        hazardZoneCount={hazardZones.features.length}
        accessibilityCount={accessibility.features.length}
        lastUpdated={lastUpdated}
        showLeftPanel={showLeftPanel}
        setShowLeftPanel={setShowLeftPanel}
        showRightPanel={showRightPanel}
        setShowRightPanel={setShowRightPanel}
        showLegend={showLegend}
        setShowLegend={setShowLegend}
      />

      {/* 2. MapLibre Hero Viewport */}
      <div className="map-viewport">
        <MapComponent
          ref={mapHandleRef}
          incidentsData={incidents}
          vehiclesData={vehicles}
          hazardZonesData={hazardZones}
          accessibilityData={accessibility}
          showHazardZones={showHazardZones}
          selectedRoute={optimization?.selectedRoute ?? null}
          baselineRoute={optimization?.baselineRoute ?? null}
        />

        {/* 3. Floating Operational Map Legend */}
        {showLegend && (
          <MapLegend
            showHazardZones={showHazardZones}
            setShowHazardZones={setShowHazardZones}
            hazardZoneCount={hazardZones.features.length}
            incidentCount={incidents.features.length}
            vehicleCount={vehicles.features.length}
            accessibilityCount={accessibility.features.length}
          />
        )}
      </div>

      {/* 4. Left Intelligence Dock (Route Planning, Summary, Comparison & Rationale) */}
      {showLeftPanel && (
        <aside
          className="dock-panel left"
          style={{
            display:
              typeof window !== 'undefined' && window.innerWidth <= 820 && activeMobileTab !== 'planner'
                ? 'none'
                : 'flex',
          }}
          aria-label="Route Planning and Comparison Panel"
        >
          <div className="dock-panel-body">
            {/* Route Planner */}
            <RoutePlanner
              originInput={originInput}
              setOriginInput={setOriginInput}
              destInput={destInput}
              setDestInput={setDestInput}
              preference={preference}
              setPreference={setPreference}
              onCalculate={handleCalculateRoute}
              isRouting={isRouting}
            />

            {/* In-Flight Pipeline Loading State */}
            {isRouting && <LoadingIndicator label="Calculating Optimal Resilient Route..." />}

            {/* Error Message */}
            {routingError && (
              <ErrorMessage
                title="Route Calculation Error"
                message={routingError}
                onRetry={() => handleCalculateRoute()}
              />
            )}

            {/* Route Summary */}
            {optimization && (
              <RouteSummary
                selectedRoute={optimization.selectedRoute}
                strategy={optimization.optimization.strategy}
                preference={optimization.preference}
              />
            )}

            {/* Route Comparison Matrix */}
            {optimization && <RouteComparison optimization={optimization} />}

            {/* Why SauraRoute Selected This Route */}
            {optimization && <RouteReasonPanel optimization={optimization} />}
          </div>
        </aside>
      )}

      {/* 5. Right Intelligence Dock (AI Risk, Accessibility, Alerts, Reroute Advisor) */}
      {showRightPanel && (
        <aside
          className="dock-panel right"
          style={{
            display:
              typeof window !== 'undefined' && window.innerWidth <= 820 && activeMobileTab !== 'risk' && activeMobileTab !== 'corridors'
                ? 'none'
                : 'flex',
          }}
          aria-label="Risk and Corridor Intelligence Panel"
        >
          <div className="dock-panel-body">
            {/* AI Route Risk Gauge & Contributors */}
            {optimization ? (
              <RiskPanel
                selectedRoute={optimization.selectedRoute}
                safetyStatus={optimization.safetyIntelligence}
              />
            ) : (
              <div className="intel-card">
                <div className="intel-card-header">
                  <span className="intel-card-title">
                    <span>🛡️</span>
                    <span>AI Risk Engine</span>
                  </span>
                  <span style={{ fontSize: 10, color: '#38BDF8' }}>STANDBY</span>
                </div>
                <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.5 }}>
                  Select an origin and destination in the Route Planner to compute multi-factor hazard risk scores, terrain slopes, and landslide ML predictions.
                </div>
              </div>
            )}

            {/* Road Accessibility Corridors */}
            <AccessibilityPanel
              accessibilitySummary={optimization?.accessibility}
              candidateAccessibility={optimization?.selectedRoute?.accessibility}
              corridorData={accessibility}
              isUnavailable={accessibilityUnavailable}
            />

            {/* Active Alerts */}
            <AlertsPanel alerts={alerts} isUnavailable={alertsUnavailable} />

            {/* Dynamic Reroute Advisor */}
            <ReroutePanel
              onCheckReroute={handleCheckReroute}
              isChecking={isCheckingReroute}
              rerouteResult={rerouteResult}
              rerouteError={rerouteError}
              hasCalculatedRoute={Boolean(optimization)}
            />
          </div>
        </aside>
      )}

      {/* 6. Mobile Tab Navigation Bar */}
      <nav className="mobile-nav-bar" aria-label="Mobile Navigation">
        <button
          onClick={() => setActiveMobileTab('planner')}
          className={`mobile-nav-btn ${activeMobileTab === 'planner' ? 'active' : ''}`}
        >
          <span>🧭</span>
          <span>Planner</span>
        </button>

        <button
          onClick={() => setActiveMobileTab('map')}
          className={`mobile-nav-btn ${activeMobileTab === 'map' ? 'active' : ''}`}
        >
          <span>🗺️</span>
          <span>Map</span>
        </button>

        <button
          onClick={() => setActiveMobileTab('risk')}
          className={`mobile-nav-btn ${activeMobileTab === 'risk' ? 'active' : ''}`}
        >
          <span>🛡️</span>
          <span>Risk &amp; Intel</span>
        </button>

        <button
          onClick={() => setActiveMobileTab('corridors')}
          className={`mobile-nav-btn ${activeMobileTab === 'corridors' ? 'active' : ''}`}
        >
          <span>🚧</span>
          <span>Corridors</span>
        </button>
      </nav>
    </div>
  );
}
