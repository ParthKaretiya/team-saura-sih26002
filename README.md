# SauraRoute

[![Project Status: Planning](https://img.shields.io/badge/status-Planning%20%2F%20Foundation%20Phase-orange.svg)](#current-project-status)

* **Team Name:** Team Saura
* **Problem Statement Reference:** SIH26002
* **Problem Statement Title:** AI-Based Smart Logistics and Accessibility Intelligence Platform for North Eastern Region (NER)
* **Hackathon:** Smart India Hackathon 2026 (SIH 2026)

---

## Current Project Status
> [!IMPORTANT]
> **Status: Planning / Foundation Phase**
> This repository is currently in its initial setup phase. The project structure, configuration files, and initial architectural designs have been established. No code features, ML models, frontends, backends, or databases have been implemented yet. All designs are provisional and subject to change based on upcoming research.

---

## Problem Statement Summary
The North Eastern Region (NER) of India faces unique geographical, meteorological, and infrastructural challenges that severely disrupt supply chains and logistics operations. Landslides, heavy rainfall, flooding, rugged terrains, and limited transport connectivity make route planning highly unpredictable. There is a critical need for an intelligent logistics platform that leverages AI/ML and geospatial data to recommend optimal, safe, and accessible routes in real time, factoring in weather changes, terrains, incidents, and road blockages.

---

## Proposed High-Level Solution
**SauraRoute** is a planned AI-Based Smart Logistics and Accessibility Intelligence Platform designed specifically for the NER. It aims to integrate:
1. **GIS & Map Visualizations:** To display road conditions, terrains, and accessibility overlays.
2. **AI-Based Risk Prediction:** To predict accessibility issues and route vulnerability using weather, terrain, and historical landslide data.
3. **Route Optimization Engines:** To calculate dynamic, risk-aware logistics routes for transport and cargo vehicles.
4. **Field Reporting & Offline Intelligence:** An offline-capable field reporting application allowing drivers and local agencies to update road conditions when internet connectivity is spotty.
5. **Interactive Operations Dashboard:** For logistics planners to monitor fleets, review incident reports, and examine region-wide risk analyses.

---

## Initial MVP Scope (Planned)
The planned Minimum Viable Product (MVP) intends to cover:
* **Core API Service:** To serve route requests, vehicle registration, and incident logging.
* **Geospatial Road Network & GIS Integration:** Visualizing NER base maps and overlaying historical/predicted risk areas.
* **Provisional AI/ML Predictor:** Predicting blockages or delays based on incoming weather forecasts and historical incident files.
* **Route Optimizer:** Providing risk-avoiding routing alternatives compared to standard shortest-path algorithms.
* **Dynamic Incident & Alert Dashboard:** Allowing web admins to manually or automatically raise road alerts.
* **Field/Mobile Reporting Scaffolding:** Enabling manual reports from drivers, including a local sync mechanism for offline use.

---

## Planned Technology Stack
The technology stack below is provisional and selected to support monorepo scalability, high-performance geospatial querying, and robust machine learning capabilities:

* **Frontend (Web):** React / Next.js, TailwindCSS, Mapbox GL JS / OpenLayers (GIS mapping)
* **Mobile / Field App:** React Native (to share packages/shared logic)
* **Backend API Service:** Node.js (TypeScript) / Express or NestJS
* **Machine Learning Service:** Python (FastAPI / Flask, Scikit-learn, XGBoost, Pandas)
* **Database & GIS:** PostgreSQL with PostGIS extension (for spatial index & query support)
* **Containerization & Dev Env:** Docker, Docker Compose
* **Repository Architecture:** Monorepo using npm workspaces or Yarn workspaces

---

## Repository Structure
```text
team-saura-sih26002/
├── apps/
│   ├── web/                # Planned React/Next.js Operations Dashboard
│   └── mobile/             # Planned React Native Field Reporting App
├── services/
│   ├── api/                # Planned Node.js REST API
│   └── ml/                 # Planned Python ML Prediction Service
├── packages/
│   └── shared/             # Planned Shared types, constants, and utilities
├── data/
│   ├── raw/                # To store raw datasets (e.g., CSV, GeoJSON)
│   ├── processed/          # To store cleaned/feature-engineered datasets
│   └── README.md           # Dataset descriptions and licensing notes
├── docs/
│   ├── problem-understanding.md   # Domain research and user needs
│   ├── architecture.md            # System architecture and data flow diagram
│   ├── api-contract.md            # Draft endpoints and request/response shapes
│   ├── database-design.md         # Schema entities, fields, and relationships
│   ├── data-strategy.md           # Data requirements and fallback strategies
│   └── decisions.md               # Architectural Decision Log (ADL)
├── .env.example            # Example environment configurations
├── .gitignore              # Ignored files, local environment secrets, caches
├── docker-compose.yml      # Multi-container local orchestration configuration
└── README.md               # Main project documentation (this file)
```

---

## Development Principles
1. **Security & Privacy First:** No real API keys, environment credentials, or proprietary files should ever be committed to the repository. Use `.env` and `.gitignore`.
2. **Data Honesty:** We will clearly distinguish simulated, placeholder, and actual data. No simulated data will be presented as live production feeds.
3. **Modular Monorepo:** Build applications and services within their designated folders, sharing types and utility packages via the `packages/shared/` scope.
4. **Iterative Design:** Document decisions in `docs/decisions.md` before making significant, irreversible changes.
