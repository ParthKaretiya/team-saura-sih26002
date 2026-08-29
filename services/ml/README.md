# SauraRoute Machine Learning & Geospatial Service

This service provides terrain processing and machine learning capabilities for the SauraRoute logistics platform.

## Current Status
* **Foundation Spike**: Minimal DEM raster reader and 2D finite-difference slope calculation pipeline (`dem_processor.py`) verified against mathematical surface tests (`test_slope.py`).

## Features (Foundation Phase)
* `dem_processor.calculate_slope(elevation_grid, cell_size_x, cell_size_y)`: Computes slope angles in degrees $[0^\circ, 90^\circ]$ from 2D elevation matrices.
* `dem_processor.read_dem(filepath)`: Reads GeoTIFF files using `rasterio`.
* `dem_processor.generate_synthetic_dem(...)`: Generates mathematically exact inclined planes and topographical test surfaces.

## Input / Output Specifications
* **Input DEM Format**: GeoTIFF (Single-band 32-bit float or 16-bit int, e.g. USGS SRTM 30m / ISRO CartoDEM), projected coordinate system (UTM Zone 46N / EPSG:32646 recommended for metric units).
* **Output Slope Format**: GeoTIFF raster where each pixel value corresponds to the local slope angle in degrees ($0.0^\circ$ to $90.0^\circ$).

## Environment Setup & Testing
1. Activate virtual environment:
   ```bash
   .\venv\Scripts\activate   # Windows
   source venv/bin/activate  # Linux/macOS
   ```
2. Install requirements:
   ```bash
   pip install -r requirements.txt
   ```
3. Run slope calculation test:
   ```bash
   python src/test_slope.py
   ```

## Planned Additions (Future Phases)
* Landslide probability classifier (XGBoost / Random Forest) trained on historical GSI/NASA events.
* FastAPI service wrapping inference endpoints for the Node.js API gateway.
