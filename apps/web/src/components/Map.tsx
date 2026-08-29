import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { SEVERITY_THEME } from '../config/map-theme';
import type { IncidentFeatureCollection, VehicleFeatureCollection } from '../types/api';

const API_BASE_URL = 'http://localhost:3000/api';

export default function Map() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [incidentCount, setIncidentCount] = useState<number>(0);
  const [vehicleCount, setVehicleCount] = useState<number>(0);
  const [isLive, setIsLive] = useState<boolean>(false);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [93.5, 26.0], // NER approximate center (lon, lat)
      zoom: 6.5,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    map.on('load', () => {
      // 1. Incidents GeoJSON Source & Layers
      map.addSource('incidents-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Circle layer with color match on severity
      map.addLayer({
        id: 'incidents-circles',
        type: 'circle',
        source: 'incidents-source',
        paint: {
          'circle-radius': [
            'match',
            ['get', 'severity'],
            'CRITICAL', 10,
            'HIGH', 8,
            'MEDIUM', 7,
            'LOW', 6,
            6,
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
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
        },
      });

      // 2. Vehicles GeoJSON Source & Layers
      map.addSource('vehicles-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'vehicles-circles',
        type: 'circle',
        source: 'vehicles-source',
        paint: {
          'circle-radius': 8,
          'circle-color': '#10B981', // Emerald green
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#FFFFFF',
        },
      });

      // 3. Interactive Popups
      map.on('click', 'incidents-circles', (e) => {
        if (!e.features || e.features.length === 0) return;
        const f = e.features[0];
        const props = f.properties;
        const geom = f.geometry as { type: string; coordinates: [number, number] };
        const coordinates = geom.coordinates.slice() as [number, number];

        new maplibregl.Popup({ offset: 12 })
          .setLngLat(coordinates)
          .setHTML(`
            <div style="font-family: sans-serif; font-size: 13px; min-width: 180px;">
              <strong style="color: ${SEVERITY_THEME[props.severity]?.color || '#333'};">
                [${props.severity}] ${props.type}
              </strong>
              <p style="margin: 4px 0; color: #4B5563;">${props.description}</p>
              <div style="font-size: 11px; color: #9CA3AF; margin-top: 4px;">
                Status: <strong>${props.status}</strong><br/>
                ID: ${props.id}
              </div>
            </div>
          `)
          .addTo(map);
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
            <div style="font-family: sans-serif; font-size: 13px; min-width: 160px;">
              <strong style="color: #059669;">🚛 ${props.vehicleCode}</strong>
              <p style="margin: 4px 0; color: #4B5563;">
                Speed: <strong>${props.speed} km/h</strong><br/>
                Heading: <strong>${props.heading}°</strong><br/>
                Status: <span style="color: #10B981; font-weight: bold;">${props.status}</span>
              </p>
            </div>
          `)
          .addTo(map);
      });

      // Pointer cursor on hover
      map.on('mouseenter', 'incidents-circles', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'incidents-circles', () => { map.getCanvas().style.cursor = ''; });
      map.on('mouseenter', 'vehicles-circles', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'vehicles-circles', () => { map.getCanvas().style.cursor = ''; });

      mapRef.current = map;
      setIsLive(true);
    });

    // Polling Loop (3 seconds)
    const pollInterval = setInterval(async () => {
      if (!mapRef.current) return;
      const currentMap = mapRef.current;

      try {
        // Fetch incidents
        const incRes = await fetch(`${API_BASE_URL}/incidents`);
        if (incRes.ok) {
          const incData = (await incRes.json()) as IncidentFeatureCollection;
          const incSource = currentMap.getSource('incidents-source') as maplibregl.GeoJSONSource;
          if (incSource) {
            incSource.setData(incData);
            setIncidentCount(incData.features.length);
          }
        }

        // Fetch vehicles
        const vhRes = await fetch(`${API_BASE_URL}/vehicles`);
        if (vhRes.ok) {
          const vhData = (await vhRes.json()) as VehicleFeatureCollection;
          const vhSource = currentMap.getSource('vehicles-source') as maplibregl.GeoJSONSource;
          if (vhSource) {
            vhSource.setData(vhData);
            setVehicleCount(vhData.features.length);
          }
        }
      } catch {
        // Backend not currently reachable
      }
    }, 3000);

    return () => {
      clearInterval(pollInterval);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {/* Map Container */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Operations Legend & Live Status Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '12px 16px',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          zIndex: 10,
          minWidth: 220,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>SauraRoute Operations</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: isLive ? '#10B981' : '#9CA3AF' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: isLive ? '#10B981' : '#9CA3AF', display: 'inline-block' }} />
            {isLive ? 'Live (3s)' : 'Connecting'}
          </div>
        </div>

        <div style={{ fontSize: 12, color: '#4B5563', borderTop: '1px solid #E5E7EB', paddingTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span>Active Vehicles:</span>
            <strong>{vehicleCount}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>Reported Hazards:</span>
            <strong>{incidentCount}</strong>
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginTop: 8, marginBottom: 4 }}>
            HAZARD SEVERITY
          </div>
          {Object.entries(SEVERITY_THEME).map(([key, cfg]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, fontSize: 11 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: cfg.color }} />
              <span>{cfg.label}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10B981' }} />
            <span>Active Logistics Vehicle</span>
          </div>
        </div>
      </div>
    </div>
  );
}
