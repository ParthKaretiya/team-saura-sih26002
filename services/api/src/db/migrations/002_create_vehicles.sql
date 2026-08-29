-- Create Vehicles Table with PostGIS Point Geometry
CREATE TABLE IF NOT EXISTS vehicles (
    id VARCHAR(64) PRIMARY KEY,
    vehicle_code VARCHAR(64) UNIQUE NOT NULL,
    location GEOMETRY(Point, 4326),
    speed DOUBLE PRECISION DEFAULT 0.0,
    heading DOUBLE PRECISION DEFAULT 0.0,
    status VARCHAR(32) DEFAULT 'IDLE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial GIST index for fast proximity queries
CREATE INDEX IF NOT EXISTS idx_vehicles_location ON vehicles USING GIST(location);
