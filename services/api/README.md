# SauraRoute Backend API Service

This is the central Node.js REST API service for SauraRoute, built with Express, TypeScript, and node-postgres (`pg`).

## Current Status
* **Foundation Spike**: Minimal Express + TypeScript server with health checking and PostgreSQL/PostGIS connection testing.

## Endpoints (Current)
* `GET /api/health`: Returns server status, timestamp, database connectivity status (`connected` | `disconnected`), and PostGIS version if connected.

## Scripts
* `npm run dev`: Run development server with auto-reload using `tsx watch`
* `npm start`: Run server using `tsx`
* `npm run build`: Compile TypeScript into `dist/`

## Environment Variables
Configured via root `.env` or system environment variables:
* `API_PORT`: Port to listen on (default `3000`)
* `DB_HOST`: PostgreSQL host (default `localhost`)
* `DB_PORT`: PostgreSQL port (default `5432`)
* `DB_NAME`: Database name (default `sauraroute_db`)
* `DB_USER`: Database user (default `postgres`)
* `DB_PASSWORD`: Database password (default `sauraroute_dev_2026`)
