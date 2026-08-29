# Data Directory

This directory is used for holding raw, processed, and temporary datasets used by the Machine Learning service and GIS processing pipelines.

## Directory Structure
* **`raw/`**: Intended for storing original, unmodified datasets (e.g., historical rain data, landslide reports, road network GeoJSONs).
* **`processed/`**: Intended for storing clean, feature-engineered, or aggregated datasets outputted by python preprocessing pipelines.

## Important Policies
1. **Never commit actual dataset files**: Almost all larger datasets (CSVs, SHPs, GeoJSONs, JSONs) are excluded via the main `.gitignore` file. Large dataset files can clutter git history and may violate licensing constraints.
2. **Document Sources**: When using a dataset, record the download URL, metadata, and license in a markdown file within this folder.
3. **Reproducibility**: Ensure that any script inside `services/ml` can recreate the `processed/` data from files placed in the `raw/` folder.
