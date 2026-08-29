-- Create Historical Landslides Table with PostGIS Point Geometry
CREATE TABLE IF NOT EXISTS historical_landslides (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    state VARCHAR(64) NOT NULL,
    event_date DATE,
    trigger_type VARCHAR(64) DEFAULT 'RAIN',
    fatalities INTEGER DEFAULT 0,
    severity VARCHAR(32) DEFAULT 'HIGH',
    provenance JSONB,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial GIST index for distance and proximity queries
CREATE INDEX IF NOT EXISTS idx_historical_landslides_location
ON historical_landslides USING GIST(location);
