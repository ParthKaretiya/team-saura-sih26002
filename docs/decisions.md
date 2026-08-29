# Architectural Decision Log (ADL)

This document records the initial architecture and design decisions for **SauraRoute**. These decisions represent the baseline starting assumptions and are subject to revision as technical research progresses.

---

## ADR 1: Monorepo Architecture
* **Status:** PROPOSED / INITIAL DECISION
* **Context:** We need to manage web frontends, mobile applications, backend services, and machine learning scripts under one repository.
* **Why Considered:**
  * **Unified Codebase:** Makes it easy to share TypeScript types and utility packages between the API backend, web frontend, and mobile app.
  * **Simplified Dependency Management:** Allows updating shared dependencies, linting configs, and CI/CD pipelines in one place.
  * **Cohesive Deployments:** Simplifies matching client versions with API versions during development.
* **What Remains Undecided:**
  * The exact package manager (npm workspaces, Yarn workspaces, or pnpm) to handle monorepo orchestration.
  * The tooling to build/lint the monorepo (e.g., Turborepo, Nx, or standard workspaces).

---

## ADR 2: Web Dashboard
* **Status:** PROPOSED / INITIAL DECISION
* **Context:** Operators at logistics hubs need a visual command center to monitor trucks, review road risks, and dispatch vehicles.
* **Why Considered:**
  * **Rich GIS Visualization:** Browsers have powerful WebGL engines (via Mapbox GL JS, Deck.gl, or OpenLayers) capable of rendering complex maps and overlays.
  * **Low Friction:** Web-based control panels do not require local machine installation, making updates instant.
* **What Remains Undecided:**
  * React vs. Next.js (Next.js provides SSR/SSG, which may be useful, but standard React might be simpler for pure dashboard apps).
  * State management library (Redux Toolkit, Zustand, or standard React Context).

---

## ADR 3: Mobile Field Application
* **Status:** PROPOSED / INITIAL DECISION
* **Context:** Drivers and field spotters operating in remote NER districts need a portable app to read route alerts and report incidents.
* **Why Considered:**
  * **Sensor Access:** Mobile apps can directly capture hardware GPS coordinates, camera photos, and local storage databases.
  * **Offline Syncing:** Native mobile apps can support robust background sync services that retry failed requests once a connection becomes active.
* **What Remains Undecided:**
  * Framework choice: React Native is proposed to maximize code sharing, but Flutter or Native Android/Kotlin remains a viable alternative if specialized map components require native performance.

---

## ADR 4: Node.js Backend API
* **Status:** PROPOSED / INITIAL DECISION
* **Context:** A performant service is required to manage database transactions, user auth, field sync endpoints, and API gateways.
* **Why Considered:**
  * **Developer Velocity:** Quick setup for standard RESTful APIs and WebSocket handling.
  * **Geospatial Compatibility:** Node.js has great support for libraries like `turf.js` and drivers for PostgreSQL/PostGIS.
* **What Remains Undecided:**
  * Express (lightweight, simple) vs. NestJS (structured, enterprise-grade).
  * ORM choice: Prisma (excellent developer experience) vs. TypeORM/Sequelize (stronger legacy spatial database support).

---

## ADR 5: Python Machine Learning Service
* **Status:** PROPOSED / INITIAL DECISION
* **Context:** The platform requires GIS preprocessing, vulnerability classification, and heuristic route cost calculations.
* **Why Considered:**
  * **ML Ecosystem:** Python is the industry standard for AI/ML (Scikit-learn, PyTorch, XGBoost) and GIS processing (GeoPandas, Shapely, Fiona, Rasterio).
  * **Integration Ease:** Separating model execution from the Node API keeps API servers responsive.
* **What Remains Undecided:**
  * The interface choice (FastAPI vs. Flask). FastAPI is preferred for speed and automatic API documentation.
  * Model architecture (whether we use classical classification trees or deep learning structures for landslides).

---

## ADR 6: GIS Capability
* **Status:** PROPOSED / INITIAL DECISION
* **Context:** We need a way to store, index, and query road networks and geographic points of interest.
* **Why Considered:**
  * Spatial data cannot be efficiently handled with standard relational operations alone. We need spatial operators (e.g., `ST_Contains`, `ST_DWithin`, `ST_Distance`).
* **What Remains Undecided:**
  * PostgreSQL with **PostGIS** extension is the primary candidate. However, SpatiaLite (SQLite spatial extension) or pure MongoDB spatial indexes may be explored if constraints demand lightweight architectures.
  * Map rendering engine (Mapbox vs. Google Maps vs. OpenStreetMap base layer).

---

## ADR 7: Containerized Development (Docker Compose)
* **Status:** PROPOSED / INITIAL DECISION
* **Context:** Developers must be able to boot up the database, Node backend, Python ML service, and web UI locally with minimal configuration.
* **Why Considered:**
  * **Consistency:** Eliminates the "works on my machine" problem, particularly with complex GIS installations like PostGIS and Python GIS packages.
* **What Remains Undecided:**
  * Production deployment container details (Kubernetes, AWS ECS, or simple VPS docker hosts).
