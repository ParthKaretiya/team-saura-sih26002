# Database Design

This document describes the initial conceptual data model for **SauraRoute**. 

> [!IMPORTANT]
> **Status: Initial Design — Subject to Data/GIS Research**
> This design is a conceptual draft. No tables, indexes, or migrations have been created. While PostgreSQL/PostGIS is currently a primary candidate due to its robust spatial querying capabilities, this design remains vendor-agnostic and subject to adjustment as mapping and data constraints become clearer.

---

## Entity-Relationship Overview

At a high level, the application will store relational, spatial, and telemetry entities. Below are the draft schemas for core models.

---

## 1. User Entity
* **Purpose:** Represents any system user, including dispatch operators, drivers, and administrators.
* **Fields:**
  * `id` (Primary Key, UUID/String)
  * `username` (String, Unique)
  * `passwordHash` (String)
  * `role` (Enum: `OPERATOR`, `DRIVER`, `ADMIN`)
  * `fullName` (String)
  * `createdAt` / `updatedAt` (Timestamp)
* **Relationships:**
  * One User (Driver) is assigned to zero or one Vehicle.
  * One User (Operator/Driver) can report multiple Incidents.

---

## 2. Vehicle Entity
* **Purpose:** Represents logistics cargo trucks tracked within the platform.
* **Fields:**
  * `id` (Primary Key, UUID/String)
  * `plateNumber` (String, Unique)
  * `vehicleType` (Enum: `LIGHT_CARGO`, `HEAVY_CARGO`, `TANKER`)
  * `status` (Enum: `ACTIVE`, `INACTIVE`, `MAINTENANCE`)
  * `driverId` (Foreign Key -> User.id, Optional)
  * `lastLatitude` (Float/Decimal, Geospatial placeholder)
  * `lastLongitude` (Float/Decimal, Geospatial placeholder)
  * `lastLocationGeom` (Geospatial: Point, SRID 4326 - e.g., PostGIS geometry field)
  * `updatedAt` (Timestamp)
* **Relationships:**
  * Belongs to one User (Driver).
  * Has many telemetry history points (if historical tracking is implemented later).

---

## 3. Incident Entity
* **Purpose:** Represents physical blockages, hazards, or road closures.
* **Fields:**
  * `id` (Primary Key, UUID/String)
  * `type` (Enum: `LANDSLIDE`, `FLOODING`, `ACCIDENT`, `ROAD_REPAIR`, `OTHER`)
  * `description` (Text)
  * `latitude` (Float/Decimal)
  * `longitude` (Float/Decimal)
  * `locationGeom` (Geospatial: Point, SRID 4326)
  * `severity` (Enum: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
  * `status` (Enum: `SUBMITTED`, `VERIFIED`, `RESOLVED`, `REJECTED`)
  * `reportedById` (Foreign Key -> User.id, Optional)
  * `reportedAt` (Timestamp)
  * `resolvedAt` (Timestamp, Optional)
* **Relationships:**
  * Belongs to one User (Reporter).
  * May overlap or cross reference a specific Road segment.

---

## 4. Road Segment Entity
* **Purpose:** Represents segments of the physical road network in the North Eastern Region.
* **Fields:**
  * `id` (Primary Key, UUID/String)
  * `name` (String, e.g., "NH-2", "Guwahati-Shillong Highway")
  * `classification` (String, e.g., "National Highway", "State Highway", "District Road")
  * `geometry` (Geospatial: LineString/MultiLineString, SRID 4326)
  * `slopeGradient` (Float - average incline angle of segment, used for ML predictions)
  * `soilType` (String)
  * `baseRiskScore` (Float - baseline vulnerability based on geological history)
* **Relationships:**
  * Intersects with active Incidents (spatial query).
  * Composes parts of a Route.

---

## 5. Route Entity
* **Purpose:** Represents optimal paths computed for logistics vehicle dispatches.
* **Fields:**
  * `id` (Primary Key, UUID/String)
  * `vehicleId` (Foreign Key -> Vehicle.id)
  * `originName` (String)
  * `destinationName` (String)
  * `pathGeometry` (Geospatial: LineString, SRID 4326 - full sequence of route coordinates)
  * `totalDistanceKm` (Float)
  * `estimatedDurationMinutes` (Integer)
  * `overallRiskIndex` (Float)
  * `status` (Enum: `PENDING`, `ACTIVE`, `COMPLETED`, `ABANDONED`)
  * `createdAt` (Timestamp)
* **Relationships:**
  * Belongs to one Vehicle.

---

## 6. Alert Entity
* **Purpose:** Stores active notifications sent to vehicles, drivers, or operators regarding route changes or hazard proximities.
* **Fields:**
  * `id` (Primary Key, UUID/String)
  * `vehicleId` (Foreign Key -> Vehicle.id, Optional)
  * `routeId` (Foreign Key -> Route.id, Optional)
  * `incidentId` (Foreign Key -> Incident.id, Optional)
  * `message` (Text)
  * `type` (Enum: `PROXIMITY_DANGER`, `ROUTE_RECALCULATION`, `GENERAL_WARNING`)
  * `isRead` (Boolean)
  * `createdAt` (Timestamp)
* **Relationships:**
  * Refers to a Vehicle, Route, and/or Incident.

---

## Initial Database Considerations
1. **Geospatial Indexes:** If using PostgreSQL/PostGIS, spatial columns (e.g., `locationGeom`, `geometry`, `pathGeometry`) must have `GIST` indexes to speed up bounding-box and distance-based queries.
2. **Offline ID Generation:** For mobile field reports created offline, clients will generate client-side UUIDs as primary keys (`id`) to prevent key collisions during later server synchronization.
3. **Partitioning Telemetry:** If fine-grained vehicle coordinate history is logged, a timescaled or partitioned database setup should be considered to handle heavy write volumes without degrading master table performance.
