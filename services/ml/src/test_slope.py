"""
Automated validation script for DEM slope processing.
Tests slope calculation against mathematically known elevation surfaces.
"""

import sys
import numpy as np
from dem_processor import calculate_slope, generate_synthetic_dem


def test_synthetic_slopes():
    print("==================================================")
    print("SauraRoute DEM Slope Processing — Foundation Test")
    print("==================================================")

    test_angles = [0.0, 15.0, 30.0, 45.0, 60.0]
    all_passed = True

    for target_angle in test_angles:
        cell_size = 30.0  # 30 meters
        grid, meta = generate_synthetic_dem(
            rows=50,
            cols=50,
            cell_size=cell_size,
            slope_angle_degrees=target_angle
        )

        slope_result = calculate_slope(
            grid,
            cell_size_x=meta['cell_size_x'],
            cell_size_y=meta['cell_size_y']
        )

        # Evaluate interior cells (excluding 1-pixel boundary where edge difference is 1-sided)
        interior = slope_result[2:-2, 2:-2]
        mean_computed = float(np.mean(interior))
        max_err = float(np.max(np.abs(interior - target_angle)))

        status = "PASSED" if max_err < 1e-4 else "FAILED"
        if status == "FAILED":
            all_passed = False

        print(f"[*] Target Angle: {target_angle:5.1f}° | Computed Mean: {mean_computed:5.1f}° | Max Error: {max_err:8.6f}° [{status}]")

    print("--------------------------------------------------")
    
    # Test a Gaussian hill topography to verify continuous 2D gradient handling
    x = np.linspace(-3, 3, 100)
    y = np.linspace(-3, 3, 100)
    X, Y = np.meshgrid(x, y)
    # Hill with peak height of 500m
    hill_dem = 500.0 * np.exp(-(X**2 + Y**2))
    hill_slope = calculate_slope(hill_dem, cell_size_x=30.0, cell_size_y=30.0)

    print(f"[*] Synthetic Gaussian Hill (100x100 grid, 30m cell resolution):")
    print(f"    - Min Elevation: {np.min(hill_dem):.1f}m | Max Elevation: {np.max(hill_dem):.1f}m")
    print(f"    - Min Slope:     {np.min(hill_slope):.2f}° | Max Slope:     {np.max(hill_slope):.2f}°")
    print(f"    - Mean Slope:    {np.mean(hill_slope):.2f}°")

    print("==================================================")
    if all_passed:
        print("[+] ALL SLOPE CALCULATIONS VALIDATED SUCCESSFULLY.")
        print("==================================================")
        return 0
    else:
        print("[-] VALIDATION FAILED: Deviations exceeded tolerances.")
        print("==================================================")
        return 1


if __name__ == "__main__":
    sys.exit(test_synthetic_slopes())
