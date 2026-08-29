import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { SEVERITY_THEME } from '../config/map-theme';
import type { IncidentFeatureCollection, VehicleFeatureCollection } from '../types/api';

const API_BASE_URL = 'http://localhost:3000/api';

// Reliable, direct OpenStreetMap style specification that requires no external style.json fetch
const OSM_RASTER_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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

export default function Map() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const incidentsRef = useRef<IncidentFeatureCollection>({ type: 'FeatureCollection', features: [] });
  const vehiclesRef = useRef<VehicleFeatureCollection>({ type: 'FeatureCollection', features: [] });

  const [incidentCount, setIncidentCount] = useState<number>(0);
  const [vehicleCount, setVehicleCount] = useState<number>(0);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('Never');

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // 1. Initialize Map centered on North-East India (Guwahati / Shillong / NER corridor)
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: OSM_RASTER_STYLE,
      center: [92.5, 26.0], // Centered on Assam / Meghalaya / NER
      zoom: 7.2,
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    const setupLayers = () => {
      if (!map.isStyleLoaded()) return;

      // 1. Incidents GeoJSON Layer
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

        // Click popup for Incidents
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

      // 2. Vehicles GeoJSON Layer
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
            'circle-color': '#10B981', // Emerald green
            'circle-stroke-width': 3,
            'circle-stroke-color': '#FFFFFF',
          },
        });

        // Click popup for Vehicles
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

    // Fetch data immediately and then every 2.5 seconds
    const fetchData = async () => {
      try {
        // Fetch incidents
        const incRes = await fetch(`${API_BASE_URL}/incidents`);
        if (incRes.ok) {
          const incData = (await incRes.json()) as IncidentFeatureCollection;
          incidentsRef.current = incData;
          setIncidentCount(incData.features.length);

          if (map.isStyleLoaded()) {
            const incSource = map.getSource('incidents-source') as maplibregl.GeoJSONSource;
            if (incSource) {
              incSource.setData(incData);
            } else {
              setupLayers();
            }
          }
        }

        // Fetch vehicles
        const vhRes = await fetch(`${API_BASE_URL}/vehicles`);
        if (vhRes.ok) {
          const vhData = (await vhRes.json()) as VehicleFeatureCollection;
          vehiclesRef.current = vhData;
          setVehicleCount(vhData.features.length);

          if (map.isStyleLoaded()) {
            const vhSource = map.getSource('vehicles-source') as maplibregl.GeoJSONSource;
            if (vhSource) {
              vhSource.setData(vhData);
            } else {
              setupLayers();
            }
          }
        }

        setIsLive(true);
        setLastUpdated(new Date().toLocaleTimeString());
      } catch (err) {
        setIsLive(false);
        console.warn('[Dashboard] Backend connection error:', err);
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

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Map Container */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Operations Legend & Live Status Overlay */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: isLive ? '#059669' : '#EF4444' }}>
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
            <span>Active Logistics Fleet:</span>
            <strong style={{ color: '#059669', fontSize: 13 }}>{vehicleCount} trucks</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>Reported Road Hazards:</span>
            <strong style={{ color: '#DC2626', fontSize: 13 }}>{incidentCount} incidents</strong>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', marginTop: 10, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Hazard Severity
          </div>
          {Object.entries(SEVERITY_THEME).map(([key, cfg]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 11 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: cfg.color, border: '1px solid #FFFFFF', display: 'inline-block' }} />
              <span>{cfg.label}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, paddingTop: 6, borderTop: '1px dashed #E5E7EB', fontSize: 11 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#10B981', border: '1px solid #FFFFFF', display: 'inline-block' }} />
            <span>Active Logistics Vehicle</span>
          </div>

          <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 10, textAlign: 'right' }}>
            Refreshed: {lastUpdated}
          </div>
        </div>
      </div>
    </div>
  );
}
