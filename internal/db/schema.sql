CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    capacity INT NOT NULL, -- Weight capacity
    start_lat FLOAT NOT NULL DEFAULT 0.0, -- Starting depot (optional, could be fixed)
    start_lon FLOAT NOT NULL DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    lat FLOAT NOT NULL,
    lon FLOAT NOT NULL,
    demand INT NOT NULL,
    -- Time windows in minutes from midnight. 
    -- JSONB array of objects: [{"start": 480, "end": 660}, ...]
    time_windows JSONB NOT NULL DEFAULT '[]'::JSONB, 
    service_duration INT NOT NULL DEFAULT 10 -- Minutes to unload
);


CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_id INT, -- Optional reference to a master customer list if needed
    customer_name TEXT NOT NULL,
    lat FLOAT NOT NULL,
    lon FLOAT NOT NULL,
    demand INT NOT NULL,
    time_windows JSONB NOT NULL DEFAULT '[]'::JSONB,
    service_duration INT NOT NULL DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    solution_json JSONB NOT NULL
);

-- Ensure routes has route_date column
ALTER TABLE routes ADD COLUMN IF NOT EXISTS route_date DATE DEFAULT CURRENT_DATE;

-- Add status to routes (draft, confirmed)
ALTER TABLE routes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';

-- Add status and route_id to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'; -- pending, routed
ALTER TABLE orders ADD COLUMN IF NOT EXISTS route_id INT REFERENCES routes(id);

-- Ensure unique constraint on route_date
-- Removed unique constraint on route_date to allow multiple routes per day (2026-01-03)
-- DO $$ 
-- BEGIN
--     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_route_date') THEN
--         ALTER TABLE routes ADD CONSTRAINT unique_route_date UNIQUE (route_date);
--     END IF;
-- END $$;

