import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { SEVERITY_THEME, ROUTE_THEME, RISK_LEVEL_THEME, HAZARD_ZONE_THEME } from '../config/map-theme';
import type {
  IncidentFeatureCollection,
  VehicleFeatureCollection,
  RouteResponse,
  RouteRiskSummary,
  HazardZoneFeatureCollection,
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

  const [incidentCount, setIncidentCount] = useState<number>(0);
  const [vehicleCount, setVehicleCount] = useState<number>(0);
  const [hazardZoneCount, setHazardZoneCount] = useState<number>(0);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('Never');

  // Layer Toggles
  const [showHazardZones, setShowHazardZones] = useState<boolean>(true);

  // Routing & Risk State
  const [originInput, setOriginInput] = useState<string>('26.1445, 91.7362');
  const [destInput, setDestInput] = useState<string>('25.5788, 91.8933');
  const [calculatedRoute, setCalculatedRoute] = useState<RouteResponse | null>(null);
  const [routeRisk, setRouteRisk] = useState<RouteRiskSummary | null>(null);
  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [routingError, setRoutingError] = useState<string | null>(null);

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

      // 2. Historical Hazard Zones Layer
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

  // Handle Route Calculation and Corridor Risk Assessment
  const handleCalculateRoute = async (customOrigin?: string, customDest?: string) => {
    const origStr = customOrigin || originInput;
    const destStr = customDest || destInput;
    setRoutingError(null);
    setIsRouting(true);
    setRouteRisk(null);

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
      return;
    }

    const [originLat, originLon] = origParts;
    const [destinationLat, destinationLon] = destParts;

    try {
      // 1. Calculate Road Geometry via Routing API
      const url = `${API_BASE_URL}/routes?originLat=${originLat}&originLon=${originLon}&destinationLat=${destinationLat}&destinationLon=${destinationLon}`;
      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok) {
        setRoutingError(json.message || `Routing failed: HTTP ${res.status}`);
        setIsRouting(false);
        return;
      }

      const routeData = json.data as RouteResponse;
      setCalculatedRoute(routeData);

      if (mapRef.current) {
        const map = mapRef.current;
        const routeSrc = map.getSource('route-source') as maplibregl.GeoJSONSource;
        if (routeSrc) {
          routeSrc.setData({
            type: 'Feature',
            geometry: routeData.geometry,
            properties: {},
          });
        }

        // Fit bounds to route
        const coords = routeData.geometry.coordinates;
        if (coords.length > 0) {
          const bounds = coords.reduce(
            (b, c) => b.extend(c as [number, number]),
            new maplibregl.LngLatBounds(coords[0], coords[0])
          );
          map.fitBounds(bounds, { padding: 60, duration: 1000 });
        }
      }

      // 2. Evaluate Corridor Risk Profile via Risk Engine API
      try {
        const riskRes = await fetch(`${API_BASE_URL}/risk/route`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coordinates: routeData.geometry.coordinates }),
        });
        if (riskRes.ok) {
          const riskJson = await riskRes.json();
          setRouteRisk(riskJson.data as RouteRiskSummary);
        }
      } catch (riskErr) {
        console.warn('Corridor risk evaluation error:', riskErr);
      }
    } catch (err) {
      setRoutingError(`Network error: ${(err as Error).message}`);
    } finally {
      setIsRouting(false);
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
          {isRouting ? 'Evaluating Route & Risk...' : 'Calculate Route & Assess Risk'}
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

        {/* Route Metrics & Risk Summary */}
        {calculatedRoute && (
          <div
            style={{
              marginTop: 10,
              padding: '10px 12px',
              backgroundColor: '#F8FAFC',
              borderRadius: 6,
              border: '1px solid #E2E8F0',
            }}
          >
            {/* Route Stats */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>Highway Distance:</span>
              <strong style={{ fontSize: 13, color: '#0F172A' }}>
                {(calculatedRoute.distanceMeters / 1000).toFixed(1)} km
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>Estimated Travel Time:</span>
              <strong style={{ fontSize: 13, color: '#0F172A' }}>
                {Math.floor(calculatedRoute.durationSeconds / 3600) > 0
                  ? `${Math.floor(calculatedRoute.durationSeconds / 3600)}h ${Math.round(
                      (calculatedRoute.durationSeconds % 3600) / 60
                    )}m`
                  : `${Math.round(calculatedRoute.durationSeconds / 60)} min`}
              </strong>
            </div>

            {/* Risk Intelligence Banner */}
            {routeRisk && (
              <div
                style={{
                  marginTop: 8,
                  padding: '8px 10px',
                  backgroundColor: RISK_LEVEL_THEME[routeRisk.overallLevel]?.bg || '#F3F4F6',
                  borderRadius: 6,
                  border: `1px solid ${RISK_LEVEL_THEME[routeRisk.overallLevel]?.color || '#9CA3AF'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: RISK_LEVEL_THEME[routeRisk.overallLevel]?.text }}>
                    CORRIDOR RISK LEVEL:
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: '#FFFFFF',
                      backgroundColor: RISK_LEVEL_THEME[routeRisk.overallLevel]?.color,
                      padding: '2px 6px',
                      borderRadius: 4,
                    }}
                  >
                    {routeRisk.overallLevel} ({routeRisk.meanScore}/100)
                  </span>
                </div>

                <div style={{ fontSize: 11, color: RISK_LEVEL_THEME[routeRisk.overallLevel]?.text }}>
                  Primary Trigger: <strong>{routeRisk.dominantTrigger}</strong>
                </div>

                {routeRisk.hazardousSegmentCount > 0 && (
                  <div style={{ fontSize: 10, color: '#DC2626', fontWeight: 600, marginTop: 4 }}>
                    ⚠️ {routeRisk.hazardousSegmentCount} high-risk warning segments on corridor
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
