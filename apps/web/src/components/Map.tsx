import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  SEVERITY_THEME,
  ROUTE_THEME,
  HAZARD_ZONE_THEME,
  BASELINE_ROUTE_THEME,
  SELECTED_ROUTE_THEME,
  ACCESSIBILITY_THEME,
} from '../config/map-theme';
import type {
  IncidentFeatureCollection,
  VehicleFeatureCollection,
  RouteResponse,
  HazardZoneFeatureCollection,
  RoutingPreference,
  RouteOptimizationResult,
  RerouteEvaluationResult,
  AccessibilityFeatureCollection,
  AlertCollection,
  AlertRecord,
} from '../types/api';

const API_BASE_URL = 'http://localhost:3000/api';

// Reliable OpenStreetMap raster style
const OSM_RASTER_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

const PRESET_CORRIDORS = [
  {
    name: 'Guwahati → Shillong',
    origin: '26.1445, 91.7362',
    destination: '25.5788, 91.8933',
  },
  {
    name: 'Guwahati → Tezpur',
    origin: '26.1445, 91.7362',
    destination: '26.6338, 92.7926',
  },
  {
    name: 'Shillong → Cherrapunji',
    origin: '25.5788, 91.8933',
    destination: '25.2702, 91.7323',
  },
];

export default function Map() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const incidentsRef = useRef<IncidentFeatureCollection>({ type: 'FeatureCollection', features: [] });
  const vehiclesRef = useRef<VehicleFeatureCollection>({ type: 'FeatureCollection', features: [] });
  const hazardZonesRef = useRef<HazardZoneFeatureCollection>({ type: 'FeatureCollection', features: [] });
  const accessibilityRef = useRef<AccessibilityFeatureCollection>({ type: 'FeatureCollection', features: [] });

  const [incidentCount, setIncidentCount] = useState<number>(0);
  const [vehicleCount, setVehicleCount] = useState<number>(0);
  const [hazardZoneCount, setHazardZoneCount] = useState<number>(0);
  const [accessibilityCount, setAccessibilityCount] = useState<number>(0);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [accessibilityUnavailable, setAccessibilityUnavailable] = useState<boolean>(false);
  const [alertsUnavailable, setAlertsUnavailable] = useState<boolean>(false);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('Never');

  // Layer Toggles
  const [showHazardZones, setShowHazardZones] = useState<boolean>(true);

  // Routing & Risk State
  const [originInput, setOriginInput] = useState<string>('26.1445, 91.7362');
  const [destInput, setDestInput] = useState<string>('25.5788, 91.8933');
  const [calculatedRoute, setCalculatedRoute] = useState<RouteResponse | null>(null);
  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [routingError, setRoutingError] = useState<string | null>(null);

  // Route Optimization & Rerouting State
  const [preference, setPreference] = useState<RoutingPreference>('BALANCED');
  const [optimization, setOptimization] = useState<RouteOptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [rerouteResult, setRerouteResult] = useState<RerouteEvaluationResult | null>(null);
  const [isCheckingReroute, setIsCheckingReroute] = useState<boolean>(false);
  const [rerouteError, setRerouteError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: OSM_RASTER_STYLE,
      center: [92.2, 26.0], // NER corridor center
      zoom: 7.2,
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    const setupLayers = () => {
      if (!map.isStyleLoaded()) return;

      // 1. Route Geometry Layer
      if (!map.getSource('route-source')) {
        map.addSource('route-source', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [] },
            properties: {},
          },
        });

        map.addLayer({
          id: 'route-line-casing',
          type: 'line',
          source: 'route-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#1E3A8A',
            'line-width': 8,
            'line-opacity': 0.7,
          },
        });

        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': ROUTE_THEME.lineColor,
            'line-width': ROUTE_THEME.lineWidth,
            'line-opacity': ROUTE_THEME.lineOpacity,
          },
        });
      }

      // 1b. Baseline Route Layer (comparison)
      if (!map.getSource('baseline-route-source')) {
        map.addSource('baseline-route-source', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [] },
            properties: {},
          },
        });

        map.addLayer({
          id: 'baseline-route-casing',
          type: 'line',
          source: 'baseline-route-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': BASELINE_ROUTE_THEME.casingColor,
            'line-width': BASELINE_ROUTE_THEME.lineWidth + 3,
            'line-opacity': BASELINE_ROUTE_THEME.lineOpacity,
          },
        });

        map.addLayer({
          id: 'baseline-route-line',
          type: 'line',
          source: 'baseline-route-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': BASELINE_ROUTE_THEME.lineColor,
            'line-width': BASELINE_ROUTE_THEME.lineWidth,
            'line-opacity': BASELINE_ROUTE_THEME.lineOpacity,
          },
        });
      }

      // 1c. Selected/Optimized Route Layer (emphasized)
      if (!map.getSource('selected-route-source')) {
        map.addSource('selected-route-source', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [] },
            properties: {},
          },
        });

        map.addLayer({
          id: 'selected-route-casing',
          type: 'line',
          source: 'selected-route-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': SELECTED_ROUTE_THEME.casingColor,
            'line-width': SELECTED_ROUTE_THEME.lineWidth + 3,
            'line-opacity': SELECTED_ROUTE_THEME.lineOpacity,
          },
        });

        map.addLayer({
          id: 'selected-route-line',
          type: 'line',
          source: 'selected-route-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': SELECTED_ROUTE_THEME.lineColor,
            'line-width': SELECTED_ROUTE_THEME.lineWidth,
            'line-opacity': SELECTED_ROUTE_THEME.lineOpacity,
          },
        });
      }

      // 2. Road Accessibility Layer
      if (!map.getSource('accessibility-source')) {
        map.addSource('accessibility-source', {
          type: 'geojson',
          data: accessibilityRef.current,
        });

        (Object.keys(ACCESSIBILITY_THEME) as Array<keyof typeof ACCESSIBILITY_THEME>).forEach((status) => {
          map.addLayer({
            id: `accessibility-${status.toLowerCase()}-line`,
            type: 'line',
            source: 'accessibility-source',
            filter: ['==', ['get', 'status'], status],
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': ACCESSIBILITY_THEME[status].color,
              'line-width': status === 'CLOSED' ? 7 : 5,
              'line-opacity': status === 'OPEN' ? 0.7 : 0.95,
              ...(status === 'RESTRICTED' ? { 'line-dasharray': [2, 1.5] } : {}),
            },
          });

          const layerId = `accessibility-${status.toLowerCase()}-line`;
          map.on('click', layerId, (event) => {
            const feature = event.features?.[0];
            if (!feature) return;
            const properties = feature.properties as Record<string, string | undefined>;
            const coordinates = (feature.geometry as { coordinates: [number, number][] }).coordinates;
            const anchor = coordinates[0];
            if (!anchor) return;
            new maplibregl.Popup({ offset: 12 })
              .setLngLat(anchor)
              .setHTML(`
                <div style="font-family: sans-serif; font-size: 12px; min-width: 210px; padding: 4px;">
                  <div style="font-size: 11px; font-weight: 700; color: ${ACCESSIBILITY_THEME[status].color}; margin-bottom: 3px;">
                    ROAD ${status}
                  </div>
                  <div style="font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 4px;">${properties.name ?? 'Unnamed corridor'}</div>
                  <div style="font-size: 12px; color: #374151;">${properties.reason ?? 'No additional reason supplied.'}</div>
                  <div style="font-size: 10px; color: #6B7280; border-top: 1px solid #E5E7EB; margin-top: 5px; padding-top: 4px;">Source: ${properties.source ?? 'Unknown'}</div>
                </div>
              `)
              .addTo(map);
          });
          map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
        });
      }

      // 3. Historical Hazard Zones Layer
      if (!map.getSource('hazard-zones-source')) {
        map.addSource('hazard-zones-source', {
          type: 'geojson',
          data: hazardZonesRef.current,
        });

        map.addLayer({
          id: 'hazard-zones-circles',
          type: 'circle',
          source: 'hazard-zones-source',
          paint: {
            'circle-radius': HAZARD_ZONE_THEME.radius,
            'circle-color': HAZARD_ZONE_THEME.color,
            'circle-stroke-width': HAZARD_ZONE_THEME.strokeWidth,
            'circle-stroke-color': HAZARD_ZONE_THEME.strokeColor,
            'circle-opacity': 0.85,
          },
        });

        map.on('click', 'hazard-zones-circles', (e) => {
          if (!e.features || e.features.length === 0) return;
          const f = e.features[0];
          const props = f.properties;
          const geom = f.geometry as { type: string; coordinates: [number, number] };
          const coordinates = geom.coordinates.slice() as [number, number];

          new maplibregl.Popup({ offset: 12 })
            .setLngLat(coordinates)
            .setHTML(`
              <div style="font-family: sans-serif; font-size: 13px; min-width: 210px; padding: 4px;">
                <div style="font-size: 11px; font-weight: 700; color: #8B5CF6; margin-bottom: 2px;">
                  ⛰️ HISTORICAL HAZARD ZONE
                </div>
                <div style="font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 4px;">
                  ${props.name}
                </div>
                <div style="font-size: 12px; color: #374151; margin-bottom: 4px;">
                  ${props.description || 'Verified historical slope displacement'}
                </div>
                <div style="font-size: 11px; color: #6B7280; border-top: 1px solid #E5E7EB; padding-top: 4px;">
                  State: <strong>${props.state}</strong> | Severity: <strong>${props.severity}</strong><br/>
                  Trigger: <strong>${props.triggerType || 'Rainfall'}</strong><br/>
                  Source: <span style="font-size: 10px; color: #9CA3AF;">${props.provenanceSource || 'Verified Catalog'}</span>
                </div>
              </div>
            `)
            .addTo(map);
        });

        map.on('mouseenter', 'hazard-zones-circles', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'hazard-zones-circles', () => { map.getCanvas().style.cursor = ''; });
      }

      // 3. Active Incidents Layer
      if (!map.getSource('incidents-source')) {
        map.addSource('incidents-source', {
          type: 'geojson',
          data: incidentsRef.current,
        });

        map.addLayer({
          id: 'incidents-circles',
          type: 'circle',
          source: 'incidents-source',
          paint: {
            'circle-radius': [
              'match',
              ['get', 'severity'],
              'CRITICAL', 12,
              'HIGH', 10,
              'MEDIUM', 8,
              'LOW', 7,
              7,
            ],
            'circle-color': [
              'match',
              ['get', 'severity'],
              'CRITICAL', SEVERITY_THEME.CRITICAL.color,
              'HIGH', SEVERITY_THEME.HIGH.color,
              'MEDIUM', SEVERITY_THEME.MEDIUM.color,
              'LOW', SEVERITY_THEME.LOW.color,
              '#6B7280',
            ],
            'circle-stroke-width': 2.5,
            'circle-stroke-color': '#FFFFFF',
          },
        });

        map.on('click', 'incidents-circles', (e) => {
          if (!e.features || e.features.length === 0) return;
          const f = e.features[0];
          const props = f.properties;
          const geom = f.geometry as { type: string; coordinates: [number, number] };
          const coordinates = geom.coordinates.slice() as [number, number];

          new maplibregl.Popup({ offset: 12 })
            .setLngLat(coordinates)
            .setHTML(`
              <div style="font-family: sans-serif; font-size: 13px; min-width: 200px; padding: 4px;">
                <div style="font-size: 11px; font-weight: 700; color: ${SEVERITY_THEME[props.severity]?.color || '#EF4444'}; margin-bottom: 2px;">
                  ⚠️ ${props.severity} ${props.type}
                </div>
                <div style="font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 4px;">
                  ${props.description}
                </div>
                <div style="font-size: 11px; color: #6B7280; border-top: 1px solid #E5E7EB; padding-top: 4px;">
                  Status: <strong>${props.status}</strong><br/>
                  ID: <span style="font-family: monospace;">${props.id}</span>
                </div>
              </div>
            `)
            .addTo(map);
        });

        map.on('mouseenter', 'incidents-circles', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'incidents-circles', () => { map.getCanvas().style.cursor = ''; });
      }

      // 4. Vehicles Layer
      if (!map.getSource('vehicles-source')) {
        map.addSource('vehicles-source', {
          type: 'geojson',
          data: vehiclesRef.current,
        });

        map.addLayer({
          id: 'vehicles-circles',
          type: 'circle',
          source: 'vehicles-source',
          paint: {
            'circle-radius': 9,
            'circle-color': '#10B981',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#FFFFFF',
          },
        });

        map.on('click', 'vehicles-circles', (e) => {
          if (!e.features || e.features.length === 0) return;
          const f = e.features[0];
          const props = f.properties;
          const geom = f.geometry as { type: string; coordinates: [number, number] };
          const coordinates = geom.coordinates.slice() as [number, number];

          new maplibregl.Popup({ offset: 12 })
            .setLngLat(coordinates)
            .setHTML(`
              <div style="font-family: sans-serif; font-size: 13px; min-width: 180px; padding: 4px;">
                <div style="font-size: 13px; font-weight: 700; color: #059669; margin-bottom: 4px;">
                  🚛 Vehicle: ${props.vehicleCode}
                </div>
                <div style="font-size: 12px; color: #374151; margin-bottom: 4px;">
                  Speed: <strong>${props.speed} km/h</strong><br/>
                  Heading: <strong>${props.heading}°</strong><br/>
                  Status: <span style="color: #10B981; font-weight: bold;">${props.status}</span>
                </div>
                <div style="font-size: 10px; color: #9CA3AF; border-top: 1px solid #E5E7EB; padding-top: 2px;">
                  Updated: ${new Date(props.updatedAt).toLocaleTimeString()}
                </div>
              </div>
            `)
            .addTo(map);
        });

        map.on('mouseenter', 'vehicles-circles', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'vehicles-circles', () => { map.getCanvas().style.cursor = ''; });
      }
    };

    map.on('load', setupLayers);

    // Initial Fetch for Hazard Zones
    const fetchHazardZones = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/risk/zones`);
        if (res.ok) {
          const data = (await res.json()) as HazardZoneFeatureCollection;
          hazardZonesRef.current = data;
          setHazardZoneCount(data.features.length);
          if (map.isStyleLoaded()) {
            const src = map.getSource('hazard-zones-source') as maplibregl.GeoJSONSource;
            if (src) src.setData(data);
          }
        }
      } catch (err) {
        console.warn('Failed to load hazard zones:', err);
      }
    };
    fetchHazardZones();

    const fetchAccessibilityIntelligence = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/accessibility`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as AccessibilityFeatureCollection;
        accessibilityRef.current = data;
        setAccessibilityCount(data.features.length);
        setAccessibilityUnavailable(false);
        if (map.isStyleLoaded()) {
          const source = map.getSource('accessibility-source') as maplibregl.GeoJSONSource;
          if (source) source.setData(data);
          else setupLayers();
        }
      } catch (error) {
        console.warn('Failed to load accessibility corridors:', error);
        setAccessibilityUnavailable(true);
      }

      try {
        const response = await fetch(`${API_BASE_URL}/alerts`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as { data?: AlertCollection };
        setAlerts(payload.data?.items ?? []);
        setAlertsUnavailable(false);
      } catch (error) {
        console.warn('Failed to load accessibility alerts:', error);
        setAlertsUnavailable(true);
      }
    };
    fetchAccessibilityIntelligence();
    const accessibilityInterval = setInterval(fetchAccessibilityIntelligence, 10_000);

    // Polling Loop for Incidents & Vehicles
    const fetchData = async () => {
      try {
        const incRes = await fetch(`${API_BASE_URL}/incidents`);
        if (incRes.ok) {
          const incData = (await incRes.json()) as IncidentFeatureCollection;
          incidentsRef.current = incData;
          setIncidentCount(incData.features.length);
          if (map.isStyleLoaded()) {
            const src = map.getSource('incidents-source') as maplibregl.GeoJSONSource;
            if (src) src.setData(incData);
            else setupLayers();
          }
        }

        const vhRes = await fetch(`${API_BASE_URL}/vehicles`);
        if (vhRes.ok) {
          const vhData = (await vhRes.json()) as VehicleFeatureCollection;
          vehiclesRef.current = vhData;
          setVehicleCount(vhData.features.length);
          if (map.isStyleLoaded()) {
            const src = map.getSource('vehicles-source') as maplibregl.GeoJSONSource;
            if (src) src.setData(vhData);
            else setupLayers();
          }
        }

        setIsLive(true);
        setLastUpdated(new Date().toLocaleTimeString());
      } catch {
        setIsLive(false);
      }
    };

    fetchData();
    const pollInterval = setInterval(fetchData, 2500);

    return () => {
      clearInterval(pollInterval);
      clearInterval(accessibilityInterval);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle Hazard Zones Layer Visibility Toggle
  useEffect(() => {
    if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;
    const layer = mapRef.current.getLayer('hazard-zones-circles');
    if (layer) {
      mapRef.current.setLayoutProperty(
        'hazard-zones-circles',
        'visibility',
        showHazardZones ? 'visible' : 'none'
      );
    }
  }, [showHazardZones]);

  // Handle Route Calculation via Optimization API
  const handleCalculateRoute = async (customOrigin?: string, customDest?: string) => {
    const origStr = customOrigin || originInput;
    const destStr = customDest || destInput;
    setRoutingError(null);
    setIsRouting(true);
    setIsOptimizing(true);

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
      setRoutingError('Please provide coordinates in format: latitude, longitude');
      setIsRouting(false);
      setIsOptimizing(false);
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
        setRoutingError(json.message || `Routing failed: HTTP ${res.status}`);
        setIsRouting(false);
        setIsOptimizing(false);
        return;
      }

      const result = json.data as RouteOptimizationResult;
      setOptimization(result);

      const selected = result.selectedRoute;
      const baseline = result.baselineRoute;
      setCalculatedRoute({
        origin: result.origin,
        destination: result.destination,
        distanceMeters: selected.distanceMeters,
        durationSeconds: selected.durationSeconds,
        geometry: selected.geometry,
        instructions: selected.instructions,
      });

      if (mapRef.current) {
        const map = mapRef.current;

        const selectedSrc = map.getSource('selected-route-source') as maplibregl.GeoJSONSource;
        if (selectedSrc) {
          selectedSrc.setData({
            type: 'Feature',
            geometry: selected.geometry,
            properties: {},
          });
        }

        const baselineSrc = map.getSource('baseline-route-source') as maplibregl.GeoJSONSource;
        if (baselineSrc) {
          baselineSrc.setData({
            type: 'Feature',
            geometry: baseline.geometry,
            properties: {},
          });
        }

        const coords = selected.geometry.coordinates;
        if (coords.length > 0) {
          const bounds = coords.reduce(
            (b, c) => b.extend(c as [number, number]),
            new maplibregl.LngLatBounds(coords[0], coords[0])
          );
          map.fitBounds(bounds, { padding: 60, duration: 1000 });
        }
      }
    } catch (err) {
      setRoutingError(`Network error: ${(err as Error).message}`);
    } finally {
      setIsRouting(false);
      setIsOptimizing(false);
    }
  };

  const handleCheckReroute = async () => {
    if (!calculatedRoute || !optimization) {
      setRerouteError('Calculate a route before checking for a safer reroute.');
      return;
    }

    setRerouteError(null);
    setRerouteResult(null);
    setIsCheckingReroute(true);

    const currentRoute: RouteResponse = {
      origin: optimization.origin,
      destination: optimization.destination,
      distanceMeters: calculatedRoute.distanceMeters,
      durationSeconds: calculatedRoute.durationSeconds,
      geometry: calculatedRoute.geometry,
      instructions: calculatedRoute.instructions,
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
        setRerouteError(json.message || `Reroute evaluation failed: HTTP ${res.status}`);
        return;
      }

      const result = json.data as RerouteEvaluationResult;
      setRerouteResult(result);
    } catch (err) {
      setRerouteError(`Reroute network error: ${(err as Error).message}`);
    } finally {
      setIsCheckingReroute(false);
    }
  };

  const handleApplyPreset = (preset: typeof PRESET_CORRIDORS[0]) => {
    setOriginInput(preset.origin);
    setDestInput(preset.destination);
    handleCalculateRoute(preset.origin, preset.destination);
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Map Container */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Top-Left: Operations Legend & Live Status */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          backgroundColor: 'rgba(255, 255, 255, 0.96)',
          padding: '14px 18px',
          borderRadius: 10,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          zIndex: 10,
          minWidth: 230,
          border: '1px solid #E5E7EB',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>SauraRoute Operations</h3>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 600,
              color: isLive ? '#059669' : '#EF4444',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: isLive ? '#10B981' : '#EF4444',
                display: 'inline-block',
                boxShadow: isLive ? '0 0 8px #10B981' : 'none',
              }}
            />
            {isLive ? 'LIVE' : 'DISCONNECTED'}
          </div>
        </div>

        <div style={{ fontSize: 12, color: '#4B5563', borderTop: '1px solid #E5E7EB', paddingTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span>Active Fleet:</span>
            <strong style={{ color: '#059669', fontSize: 13 }}>{vehicleCount} trucks</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span>Active Road Hazards:</span>
            <strong style={{ color: '#DC2626', fontSize: 13 }}>{incidentCount} incidents</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>Historical Hazard Zones:</span>
            <strong style={{ color: '#8B5CF6', fontSize: 13 }}>{hazardZoneCount} cataloged</strong>
          </div>

          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#6B7280',
              marginTop: 10,
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Hazard Severity
          </div>
          {Object.entries(SEVERITY_THEME).map(([key, cfg]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 11 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: cfg.color,
                  border: '1px solid #FFFFFF',
                  display: 'inline-block',
                }}
              />
              <span>{cfg.label}</span>
            </div>
          ))}

          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed #E5E7EB' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Road Accessibility {accessibilityUnavailable ? '· Unavailable' : `(${accessibilityCount})`}
            </div>
            {(Object.keys(ACCESSIBILITY_THEME) as Array<keyof typeof ACCESSIBILITY_THEME>).map((status) => (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 11 }}>
                <span style={{ width: 16, height: status === 'RESTRICTED' ? 3 : 5, backgroundColor: ACCESSIBILITY_THEME[status].color, display: 'inline-block', borderRadius: 2 }} />
                <span>{ACCESSIBILITY_THEME[status].label}</span>
              </div>
            ))}
            {accessibilityUnavailable && <div style={{ color: '#92400E', fontSize: 10 }}>Corridor layer is temporarily unavailable.</div>}
          </div>

          {/* Layer Controls */}
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed #E5E7EB' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, cursor: 'pointer', color: '#374151' }}>
              <input
                type="checkbox"
                checked={showHazardZones}
                onChange={(e) => setShowHazardZones(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: '#8B5CF6',
                  display: 'inline-block',
                }}
              />
              <span>Show Hazard Zones ({hazardZoneCount})</span>
            </label>
          </div>

          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed #E5E7EB' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Active Road Alerts {alertsUnavailable ? '· Unavailable' : `(${alerts.length})`}
            </div>
            {alerts.slice(0, 3).map((alert) => {
              const critical = alert.severity === 'CRITICAL';
              return (
                <div key={alert.id} style={{ marginBottom: 5, padding: '5px 6px', borderRadius: 4, backgroundColor: critical ? '#FEF2F2' : '#FFFBEB', border: `1px solid ${critical ? '#FCA5A5' : '#FCD34D'}` }}>
                  <div style={{ color: critical ? '#B91C1C' : '#92400E', fontWeight: 700, fontSize: 10 }}>
                    {alert.severity} · {alert.category}
                    {alert.routeCandidateId ? ' · ACTIVE ROUTE' : ''}
                  </div>
                  <div style={{ color: '#374151', fontSize: 10 }}>{alert.title}: {alert.message}</div>
                </div>
              );
            })}
            {!alertsUnavailable && alerts.length === 0 && <div style={{ color: '#6B7280', fontSize: 10 }}>No active accessibility alerts.</div>}
            {alertsUnavailable && <div style={{ color: '#92400E', fontSize: 10 }}>Alerts are temporarily unavailable.</div>}
          </div>

          <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 10, textAlign: 'right' }}>
            Refreshed: {lastUpdated}
          </div>
        </div>
      </div>

      {/* Top-Right: Route Optimization & Risk Intelligence Panel */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 60,
          backgroundColor: 'rgba(255, 255, 255, 0.96)',
          padding: '14px 18px',
          borderRadius: 10,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          zIndex: 10,
          width: 330,
          border: '1px solid #E5E7EB',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 18 }}>🧭</span>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>
            Logistics Route & Risk Calculator
          </h3>
        </div>

        {/* Preset Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {PRESET_CORRIDORS.map((p) => (
            <button
              key={p.name}
              onClick={() => handleApplyPreset(p)}
              style={{
                fontSize: 11,
                padding: '4px 8px',
                backgroundColor: '#F3F4F6',
                border: '1px solid #D1D5DB',
                borderRadius: 4,
                cursor: 'pointer',
                color: '#374151',
                fontWeight: 500,
              }}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 2 }}>
              Origin (Lat, Lon):
            </label>
            <input
              type="text"
              value={originInput}
              onChange={(e) => setOriginInput(e.target.value)}
              placeholder="26.1445, 91.7362"
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: 12,
                borderRadius: 4,
                border: '1px solid #D1D5DB',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 2 }}>
              Destination (Lat, Lon):
            </label>
            <input
              type="text"
              value={destInput}
              onChange={(e) => setDestInput(e.target.value)}
              placeholder="25.5788, 91.8933"
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: 12,
                borderRadius: 4,
                border: '1px solid #D1D5DB',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Routing Preference Control */}
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 4 }}>
            Routing Preference:
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['FASTEST', 'BALANCED', 'SAFEST'] as RoutingPreference[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setPreference(mode)}
                disabled={isRouting}
                style={{
                  flex: 1,
                  padding: '5px 4px',
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 4,
                  cursor: isRouting ? 'not-allowed' : 'pointer',
                  border: '1px solid',
                  backgroundColor: preference === mode ? '#2563EB' : '#FFFFFF',
                  color: preference === mode ? '#FFFFFF' : '#4B5563',
                  borderColor: preference === mode ? '#2563EB' : '#D1D5DB',
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Calculate Button */}
        <button
          onClick={() => handleCalculateRoute()}
          disabled={isRouting}
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: isRouting ? '#93C5FD' : '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 13,
            cursor: isRouting ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          {isOptimizing ? 'Optimizing Route...' : 'Calculate Optimized Route'}
        </button>

        {/* Error Display */}
        {routingError && (
          <div
            style={{
              marginTop: 8,
              padding: '6px 8px',
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              fontSize: 11,
              borderRadius: 4,
              border: '1px solid #FCA5A5',
            }}
          >
            {routingError}
          </div>
        )}

        {/* Optimization Summary */}
        {optimization && (
          <div
            style={{
              marginTop: 10,
              padding: '10px 12px',
              backgroundColor: '#F8FAFC',
              borderRadius: 6,
              border: '1px solid #E2E8F0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>Optimization Summary</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: 4,
                  color: '#FFFFFF',
                  backgroundColor: optimization.optimization.strategy === 'SAFETY_OPTIMIZED' ? '#059669' : '#6B7280',
                }}
              >
                {optimization.preference} · {optimization.optimization.strategy === 'SAFETY_OPTIMIZED' ? 'SAFER' : 'BASELINE'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: '#6B7280' }}>Baseline (Fastest):</span>
              <strong style={{ fontSize: 12, color: '#374151' }}>
                {(optimization.baselineRoute.distanceMeters / 1000).toFixed(1)} km · {Math.round(optimization.baselineRoute.durationSeconds / 60)} min
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>Selected:</span>
              <strong style={{ fontSize: 12, color: '#059669' }}>
                {(optimization.selectedRoute.distanceMeters / 1000).toFixed(1)} km · {Math.round(optimization.selectedRoute.durationSeconds / 60)} min
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: '#6B7280' }}>Detour:</span>
              <strong style={{ fontSize: 12, color: '#374151' }}>
                +{optimization.optimization.additionalDistanceKm.toFixed(1)} km · +{optimization.optimization.additionalDurationMinutes.toFixed(0)} min
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: '#6B7280' }}>Hazard (Baseline → Selected):</span>
              <strong style={{ fontSize: 12, color: '#374151' }}>
                {optimization.baselineRoute.risk.overallLevel} ({optimization.baselineRoute.risk.meanScore}) → {optimization.selectedRoute.risk.overallLevel} ({optimization.selectedRoute.risk.meanScore})
              </strong>
            </div>

            {optimization.optimization.hazardReductionPercent > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>Risk improvement:</span>
                <strong style={{ fontSize: 12, color: '#059669' }}>
                  -{optimization.optimization.hazardReductionPercent}% hazard
                </strong>
              </div>
            )}

            <div style={{ fontSize: 10, color: '#6B7280', marginTop: 6, paddingTop: 6, borderTop: '1px dashed #E5E7EB' }}>
              <strong>Why:</strong> {optimization.optimization.selectionReason}
            </div>

            {optimization.accessibility && (
              <div
                style={{
                  marginTop: 6,
                  padding: '6px 8px',
                  borderRadius: 4,
                  backgroundColor: optimization.accessibility.status === 'ALL_CANDIDATES_CLOSED' ? '#FEF2F2' : optimization.accessibility.status === 'RESTRICTED' ? '#FFFBEB' : '#ECFDF5',
                  border: `1px solid ${optimization.accessibility.status === 'ALL_CANDIDATES_CLOSED' ? '#FCA5A5' : optimization.accessibility.status === 'RESTRICTED' ? '#FCD34D' : '#A7F3D0'}`,
                  color: optimization.accessibility.status === 'ALL_CANDIDATES_CLOSED' ? '#B91C1C' : optimization.accessibility.status === 'RESTRICTED' ? '#92400E' : '#065F46',
                  fontSize: 11,
                }}
              >
                <strong>
                  {optimization.accessibility.status === 'ALL_CANDIDATES_CLOSED'
                    ? 'Accessibility degraded: all candidates closed'
                    : optimization.selectedRoute.accessibility?.status === 'RESTRICTED'
                      ? 'Selected route has a restricted corridor'
                      : optimization.accessibility.affectedCorridors.some((corridor) => corridor.status === 'CLOSED')
                        ? 'Closure-free route selected; closed candidate excluded'
                        : 'Selected route is accessibility-safe'}
                </strong>
                {optimization.accessibility.reason && <div style={{ marginTop: 2 }}>{optimization.accessibility.reason}</div>}
                {optimization.selectedRoute.accessibility?.affectedCorridors.length ? (
                  <div style={{ marginTop: 2 }}>Affected: {optimization.selectedRoute.accessibility.affectedCorridors.map((corridor) => corridor.name).join(', ')}</div>
                ) : null}
              </div>
            )}

            {optimization.safetyIntelligence.status === 'DEGRADED' && (
              <div
                style={{
                  marginTop: 6,
                  padding: '6px 8px',
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  fontSize: 11,
                  borderRadius: 4,
                  border: '1px solid #FDE68A',
                }}
              >
                ⚠️ Degraded safety data: {optimization.safetyIntelligence.reason || 'risk information is incomplete.'}
              </div>
            )}
          </div>
        )}

        {/* Candidate Comparison */}
        {optimization && optimization.candidates.length > 1 && (
          <div
            style={{
              marginTop: 8,
              padding: '8px 10px',
              backgroundColor: '#FFFFFF',
              borderRadius: 6,
              border: '1px solid #E5E7EB',
              maxHeight: 140,
              overflowY: 'auto',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Candidate Routes
            </div>
            {optimization.candidates.map((c) => {
              const isSelected = c.candidateId === optimization.selectedCandidateId;
              const isBaseline = c.isBaseline;
              return (
                <div
                  key={c.candidateId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 10,
                    padding: '3px 0',
                    borderBottom: '1px solid #F3F4F6',
                    color: isSelected ? '#059669' : '#6B7280',
                  }}
                >
                  <span style={{ fontWeight: isSelected ? 700 : 500 }}>
                    {c.name || c.candidateId}
                    {isBaseline ? ' (Baseline)' : ''}
                    {isSelected ? ' ✓' : ''}
                  </span>
                  <span>
                    {(c.distanceMeters / 1000).toFixed(1)} km · {c.risk.overallLevel} ({c.risk.meanScore})
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Reroute Intelligence */}
        {optimization && (
          <div style={{ marginTop: 8 }}>
            <button
              onClick={handleCheckReroute}
              disabled={isCheckingReroute}
              style={{
                width: '100%',
                padding: '7px',
                backgroundColor: isCheckingReroute ? '#A7F3D0' : '#059669',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 12,
                cursor: isCheckingReroute ? 'not-allowed' : 'pointer',
              }}
            >
              {isCheckingReroute ? 'Checking for safer reroute...' : 'Check for Safer Reroute'}
            </button>

            {rerouteError && (
              <div
                style={{
                  marginTop: 6,
                  padding: '6px 8px',
                  backgroundColor: '#FEE2E2',
                  color: '#DC2626',
                  fontSize: 11,
                  borderRadius: 4,
                  border: '1px solid #FCA5A5',
                }}
              >
                {rerouteError}
              </div>
            )}

            {rerouteResult && (
              <div
                style={{
                  marginTop: 6,
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: `1px solid ${rerouteResult.rerouteRecommended ? '#6EE7B7' : '#E5E7EB'}`,
                  backgroundColor: rerouteResult.rerouteRecommended ? '#ECFDF5' : '#F9FAFB',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: rerouteResult.rerouteRecommended ? '#065F46' : '#374151', marginBottom: 3 }}>
                  {rerouteResult.rerouteRecommended ? '✅ Reroute Recommended' : 'ℹ️ No Reroute Needed'}
                </div>
                <div style={{ fontSize: 11, color: '#374151' }}>{rerouteResult.reason}</div>

                {rerouteResult.accessibility && (
                  <div style={{ fontSize: 10, color: rerouteResult.accessibility.status === 'ALL_CANDIDATES_CLOSED' ? '#B91C1C' : '#92400E', marginTop: 3 }}>
                    {rerouteResult.accessibility.status === 'ALL_CANDIDATES_CLOSED'
                      ? 'Accessibility degraded: no closure-free alternative is available.'
                      : rerouteResult.currentRoute.accessibility?.status === 'CLOSED'
                        ? 'Current route is affected by a closed corridor.'
                        : 'Accessibility evaluated for current route and alternatives.'}
                  </div>
                )}

                {rerouteResult.safetyIntelligence.status === 'DEGRADED' && (
                  <div style={{ fontSize: 10, color: '#92400E', marginTop: 3 }}>
                    Rerouting limited by degraded risk data.
                  </div>
                )}

                {rerouteResult.rerouteRecommended && rerouteResult.recommendedRoute && (
                  <div style={{ fontSize: 10, color: '#059669', marginTop: 3 }}>
                    Recommended: {(rerouteResult.recommendedRoute.distanceMeters / 1000).toFixed(1)} km · {rerouteResult.recommendedRoute.risk.overallLevel} ({rerouteResult.recommendedRoute.risk.meanScore})
                    {rerouteResult.metrics && ` · -${rerouteResult.metrics.hazardReductionPercent}% hazard`}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
