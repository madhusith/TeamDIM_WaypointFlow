CREATE TABLE IF NOT EXISTS outlets (
    id TEXT PRIMARY KEY,
    brand TEXT NOT NULL CHECK (brand IN ('Fresh', 'Style', 'Tech')),
    district TEXT NOT NULL,
    depot TEXT NOT NULL CHECK (depot IN ('Peliyagoda', 'Kandy')),
    dock_type TEXT NOT NULL,
    parking_constraint TEXT,
    mall_window TEXT,
    window_open_time TIME NOT NULL,
    window_close_time TIME NOT NULL
);

CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('truck', 'van')),
    temp TEXT NOT NULL CHECK (temp IN ('reefer', 'ambient')),
    weight_cap_kg NUMERIC NOT NULL CHECK (weight_cap_kg > 0),
    volume_cap_m3 NUMERIC NOT NULL CHECK (volume_cap_m3 > 0),
    fuel_type TEXT NOT NULL,
    km_per_l NUMERIC NOT NULL CHECK (km_per_l > 0),
    weekly_fuel_quota_l NUMERIC NOT NULL CHECK (weekly_fuel_quota_l > 0),
    depot TEXT NOT NULL CHECK (depot IN ('Peliyagoda', 'Kandy')),
    status TEXT NOT NULL DEFAULT 'available'
);

CREATE TABLE IF NOT EXISTS operating_calendar (
    date DATE PRIMARY KEY,
    dow SMALLINT NOT NULL,
    iso_year INTEGER NOT NULL,
    iso_week SMALLINT NOT NULL,
    is_payday BOOLEAN NOT NULL,
    festival TEXT,
    festival_ramp NUMERIC NOT NULL,
    is_holiday BOOLEAN NOT NULL,
    monsoon BOOLEAN NOT NULL,
    is_operating BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS district_travel (
    district TEXT PRIMARY KEY,
    depot TEXT NOT NULL,
    road_class TEXT NOT NULL,
    free_flow_kmh NUMERIC NOT NULL,
    depot_to_district_km NUMERIC NOT NULL,
    depot_to_district_freeflow_min NUMERIC NOT NULL,
    inter_stop_km NUMERIC NOT NULL,
    inter_stop_freeflow_min NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS service_allowance (
    brand TEXT NOT NULL,
    dock_type TEXT NOT NULL,
    service_allowance_min INTEGER NOT NULL,
    PRIMARY KEY (brand, dock_type)
);

CREATE TABLE IF NOT EXISTS users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('dispatcher', 'loader', 'driver', 'store_manager')),
    depot TEXT,
    outlet_id TEXT REFERENCES outlets(id)
);

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_date DATE NOT NULL,
    outlet_id TEXT NOT NULL REFERENCES outlets(id),
    brand TEXT NOT NULL,
    temp_requirement TEXT NOT NULL CHECK (temp_requirement IN ('ambient', 'chilled')),
    order_units INTEGER NOT NULL CHECK (order_units > 0),
    order_weight_kg NUMERIC NOT NULL CHECK (order_weight_kg > 0),
    order_volume_m3 NUMERIC NOT NULL CHECK (order_volume_m3 > 0),
    window_open_time TIME NOT NULL,
    window_close_time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed',
    deferred_reason TEXT,
    historical_outcome TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    trip_date DATE NOT NULL,
    vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
    trip_number SMALLINT NOT NULL CHECK (trip_number BETWEEN 1 AND 2),
    depot TEXT NOT NULL,
    departure_time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    published_at TIMESTAMPTZ,
    UNIQUE (trip_date, vehicle_id, trip_number)
);

CREATE TABLE IF NOT EXISTS trip_stops (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL CHECK (sequence >= 0),
    outlet_id TEXT NOT NULL REFERENCES outlets(id),
    planned_arrival_time TIME,
    status TEXT NOT NULL DEFAULT 'pending',
    UNIQUE (trip_id, sequence)
);

CREATE TABLE IF NOT EXISTS trip_stop_orders (
    stop_id BIGINT NOT NULL REFERENCES trip_stops(id) ON DELETE CASCADE,
    order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
    PRIMARY KEY (stop_id, order_id)
);

CREATE TABLE IF NOT EXISTS load_issues (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES trips(id),
    order_id TEXT REFERENCES orders(id),
    expected_units INTEGER,
    actual_units INTEGER,
    reason TEXT NOT NULL,
    reported_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS delivery_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    client_event_id TEXT NOT NULL UNIQUE,
    stop_id BIGINT NOT NULL REFERENCES trip_stops(id),
    event_type TEXT NOT NULL CHECK (event_type IN ('arrived', 'delivered', 'problem')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    happened_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS receipts (
    order_id TEXT PRIMARY KEY REFERENCES orders(id),
    confirmed_by BIGINT NOT NULL REFERENCES users(id),
    received_units INTEGER,
    issue TEXT,
    confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_date_status_idx ON orders(order_date, status);
CREATE INDEX IF NOT EXISTS trips_date_idx ON trips(trip_date);
