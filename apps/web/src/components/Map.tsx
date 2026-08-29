import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

/**
 * Minimal MapLibre GL JS component centered on the North Eastern Region of India.
 * Uses free MapLibre demo tiles (no API key required).
 */
export default function Map() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      // Free demo tiles from MapLibre — no API key needed
      style: 'https://demotiles.maplibre.org/style.json',
      center: [93.5, 26.0], // NER approximate center (lon, lat)
      zoom: 6,
    });

    // Add zoom and rotation controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Add scale bar
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={mapContainerRef}
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}
