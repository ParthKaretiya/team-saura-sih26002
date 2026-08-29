-- Create Incidents Table with PostGIS Point Geometry
CREATE TABLE IF NOT EXISTS incidents (
    id VARCHAR(64) PRIMARY KEY,
    type VARCHAR(32) NOT NULL,
    severity VARCHAR(32) NOT NULL,
    description TEXT NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'REPORTED',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Spatial GIST index for spatial intersection and bounding box queries
CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents USING GIST(location);
