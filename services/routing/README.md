# Local GraphHopper Feasibility Spike

This directory contains the tracked configuration for the Step 5 Phase 0
feasibility spike only. It uses **GraphHopper 10.2**, pinned for compatibility
with the project's local Java 17 runtime.

`car.json` refers to GraphHopper 10.2's built-in baseline car model. It is not
duplicated in this repository because that filename is reserved by the engine.

## Local-only files

Do not commit either of the following:

- `data/raw/north-eastern-zone-latest.osm.pbf` — the Geofabrik North-Eastern
  Zone OpenStreetMap extract.
- `data/raw/graphhopper-web-10.2.jar` and
  `data/processed/graphhopper-cache/` — the downloaded routing engine and its
  generated graph cache.

Those locations are already excluded by the repository's data ignore rules.

## Run

From the repository root, after placing the pinned JAR and PBF in `data/raw/`:

```powershell
.\services\routing\start-graphhopper.ps1
```

The launcher verifies Java 17, the pinned JAR, PBF, configuration, and port
8989 before starting the engine. Use `-HeapGiB 4` (the default) to make the
JVM memory limit explicit. It never downloads data automatically.

GraphHopper listens on `http://localhost:8989`; its administrative health
endpoint listens on `http://localhost:8990/healthcheck`.

The feasibility request is Guwahati (`26.1445, 91.7362`) to Shillong
(`25.5788, 91.8933`) using the `car` profile. This configuration deliberately
does not enable terrain, weather, incident avoidance, or an API integration.

## Verified Phase 0 result

Verified locally on 2026-08-29 with Java `17.0.18` and
`north-eastern-zone-latest.osm.pbf` (109,194,731 bytes; MD5
`7c83961e18fad3763b61744475d253e9`):

- Initial import completed in approximately 18 seconds.
- `GET http://localhost:8989/health` returned `200 OK`.
- The administrative graph health check at `http://localhost:8990/healthcheck`
  returned healthy for GraphHopper and deadlock checks.
- The Guwahati-to-Shillong request returned `200 OK`, 95,992.345 metres, and
  5,273,735 milliseconds with an unencoded GeoJSON `LineString` containing
  3,278 `[longitude, latitude]` coordinates.

Use this request to repeat the check:

```text
http://localhost:8989/route?point=26.1445,91.7362&point=25.5788,91.8933&profile=car&points_encoded=false
```
