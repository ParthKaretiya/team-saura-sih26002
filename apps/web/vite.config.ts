import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // MapLibre GL processes all GeoJSON/vector data (routes, hazard zones,
    // incidents, vehicles) in a Web Worker (maplibre-gl-worker.mjs). Vite's
    // dependency pre-bundler does not emit the worker into .vite/deps, so the
    // worker fails to load and no GeoJSON renders — only the raster base map.
    // Excluding maplibre-gl from pre-bundling serves it directly from the
    // package, where the worker path resolves. Dev-only; the production build
    // (Rollup) resolves the worker URL natively.
    exclude: ['maplibre-gl'],
  },
})
