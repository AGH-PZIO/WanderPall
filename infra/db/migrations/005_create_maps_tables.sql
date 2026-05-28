-- Module 4: Map editing
-- Map data is owned per travel-buddies group: markers (Sign), routes (Path),
-- and per-marker comments. UC 4.8 (map layer switching) is per-user/per-session
-- and intentionally not persisted (per spec table 4.8).

CREATE TABLE maps.markers (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    uuid NOT NULL REFERENCES travel_buddies.groups(id) ON DELETE CASCADE,
    name        text NOT NULL,
    category    text NOT NULL DEFAULT 'other',
    latitude    double precision NOT NULL,
    longitude   double precision NOT NULL,
    visited     boolean NOT NULL DEFAULT false,
    created_by  uuid NOT NULL REFERENCES account.users(id) ON DELETE RESTRICT,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT maps_markers_lat_range CHECK (latitude  BETWEEN -90  AND 90),
    CONSTRAINT maps_markers_lng_range CHECK (longitude BETWEEN -180 AND 180),
    CONSTRAINT maps_markers_name_len  CHECK (char_length(name) BETWEEN 1 AND 100),
    CONSTRAINT maps_markers_category_len CHECK (char_length(category) BETWEEN 1 AND 32)
);

CREATE INDEX maps_markers_group_idx ON maps.markers(group_id);
CREATE INDEX maps_markers_group_category_idx ON maps.markers(group_id, category);

CREATE TABLE maps.routes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    uuid NOT NULL REFERENCES travel_buddies.groups(id) ON DELETE CASCADE,
    name        text,
    color       text NOT NULL DEFAULT '#2563eb',
    points      jsonb NOT NULL,
    created_by  uuid NOT NULL REFERENCES account.users(id) ON DELETE RESTRICT,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT maps_routes_points_array CHECK (jsonb_typeof(points) = 'array'),
    CONSTRAINT maps_routes_points_nonempty CHECK (jsonb_array_length(points) >= 2),
    CONSTRAINT maps_routes_color_hex CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT maps_routes_name_len CHECK (name IS NULL OR char_length(name) <= 100)
);

CREATE INDEX maps_routes_group_idx ON maps.routes(group_id);

CREATE TABLE maps.marker_comments (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    marker_id   uuid NOT NULL REFERENCES maps.markers(id) ON DELETE CASCADE,
    author_id   uuid NOT NULL REFERENCES account.users(id) ON DELETE RESTRICT,
    body        text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT maps_marker_comments_body_len CHECK (char_length(body) BETWEEN 1 AND 1000)
);

CREATE INDEX maps_marker_comments_marker_idx ON maps.marker_comments(marker_id, created_at);
