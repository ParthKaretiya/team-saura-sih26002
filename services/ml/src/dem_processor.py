"""
DEM Processor Module: Computes elevation gradients and slope angles (degrees)
from Digital Elevation Model (DEM) rasters (e.g. SRTM 30m / CartoDEM).
"""

import numpy as np
from typing import Tuple, Dict, Any, Optional

try:
    import rasterio
    from rasterio.transform import from_origin
    RASTERIO_AVAILABLE = True
except ImportError:
    RASTERIO_AVAILABLE = False


def calculate_slope(
    elevation_grid: np.ndarray,
    cell_size_x: float = 30.0,
    cell_size_y: float = 30.0,
    nodata_value: Optional[float] = None,
) -> np.ndarray:
    """
    Computes slope in degrees from a 2D elevation array using finite difference gradients.

    Parameters:
    -----------
    elevation_grid : np.ndarray
        2D numpy array representing elevation in meters.
    cell_size_x : float
        Horizontal grid cell spacing in meters (default: 30m for SRTM 1 arc-second).
    cell_size_y : float
        Vertical grid cell spacing in meters (default: 30m for SRTM 1 arc-second).
    nodata_value : Optional[float]
        Value used to represent missing/void data in DEMs.

    Returns:
    --------
    slope_deg : np.ndarray
        2D numpy array containing slope angles in degrees [0, 90].
    """
    grid = elevation_grid.astype(np.float64).copy()

    if nodata_value is not None:
        mask = grid == nodata_value
        grid[mask] = np.nan

    # Calculate spatial gradients: dy along rows (axis 0), dx along cols (axis 1)
    dy, dx = np.gradient(grid, cell_size_y, cell_size_x)

    # Calculate maximum rate of change: tan(slope) = sqrt(dx^2 + dy^2)
    gradient_magnitude = np.sqrt(dx**2 + dy**2)

    # Convert gradient to slope angle in degrees
    slope_deg = np.degrees(np.arctan(gradient_magnitude))

    if nodata_value is not None:
        slope_deg[mask] = np.nan

    return slope_deg


def read_dem(filepath: str) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Reads a GeoTIFF DEM raster and extracts the elevation array and spatial metadata.
    """
    if not RASTERIO_AVAILABLE:
        raise RuntimeError("rasterio is required to read GeoTIFF files. Install via pip install rasterio.")

    with rasterio.open(filepath) as src:
        elevation = src.read(1)
        meta = src.meta.copy()
        
        # Calculate cell resolution in meters from transform
        res_x = abs(src.transform[0])
        res_y = abs(src.transform[4])
        meta['cell_size_x'] = res_x
        meta['cell_size_y'] = res_y

    return elevation, meta


def save_slope_raster(
    slope_array: np.ndarray,
    metadata: Dict[str, Any],
    output_path: str
) -> None:
    """
    Saves the computed slope array to a GeoTIFF raster.
    """
    if not RASTERIO_AVAILABLE:
        raise RuntimeError("rasterio is required to save GeoTIFF files.")

    out_meta = metadata.copy()
    out_meta.update({
        "driver": "GTiff",
        "dtype": "float32",
        "count": 1,
        "nodata": -9999.0
    })

    # Clean custom metadata keys before passing to rasterio
    out_meta.pop('cell_size_x', None)
    out_meta.pop('cell_size_y', None)

    with rasterio.open(output_path, "w", **out_meta) as dst:
        dst.write(slope_array.astype(np.float32), 1)


def generate_synthetic_dem(
    rows: int = 100,
    cols: int = 100,
    cell_size: float = 30.0,
    slope_angle_degrees: float = 30.0
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Generates a synthetic inclined plane DEM with a mathematically exact slope.
    Useful for automated verification without external GeoTIFF dependencies.
    """
    # Rise = tan(angle) * run
    rise_per_cell = np.tan(np.radians(slope_angle_degrees)) * cell_size
    
    # Create coordinate grid along X (columns)
    col_indices = np.arange(cols)
    elevation_grid = np.tile(col_indices * rise_per_cell, (rows, 1)).astype(np.float64)

    meta = {
        "driver": "GTiff",
        "dtype": "float32",
        "count": 1,
        "width": cols,
        "height": rows,
        "crs": "EPSG:32646",  # UTM Zone 46N (covering NER)
        "cell_size_x": cell_size,
        "cell_size_y": cell_size
    }

    if RASTERIO_AVAILABLE:
        meta["transform"] = from_origin(500000.0, 3000000.0, cell_size, cell_size)

    return elevation_grid, meta
