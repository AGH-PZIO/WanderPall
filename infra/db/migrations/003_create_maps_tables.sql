-- Maps module: markers, routes, marker groups, marker comments, and map layers.

CREATE TABLE IF NOT EXISTS maps.marker_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES account.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(7) DEFAULT '#3388ff',
    icon VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maps.markers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES account.users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES maps.marker_groups(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    is_visited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maps.marker_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES account.users(id) ON DELETE CASCADE,
    marker_id UUID NOT NULL REFERENCES maps.markers(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maps.routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES account.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#ff0000',
    waypoints JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maps.user_map_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES account.users(id) ON DELETE CASCADE,
    map_layer VARCHAR(50) DEFAULT 'OpenStreetMap',
    center_latitude DECIMAL(10, 8) DEFAULT 52.2297,
    center_longitude DECIMAL(11, 8) DEFAULT 21.0122,
    zoom_level INTEGER DEFAULT 6,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_markers_user_id ON maps.markers(user_id);
CREATE INDEX IF NOT EXISTS idx_markers_group_id ON maps.markers(group_id);
CREATE INDEX IF NOT EXISTS idx_routes_user_id ON maps.routes(user_id);
CREATE INDEX IF NOT EXISTS idx_marker_comments_marker_id ON maps.marker_comments(marker_id);
CREATE INDEX IF NOT EXISTS idx_marker_groups_user_id ON maps.marker_groups(user_id);

COMMENT ON TABLE maps.markers IS 'Travel markers on the map.';
COMMENT ON TABLE maps.routes IS 'Travel routes drawn on the map.';
COMMENT ON TABLE maps.marker_groups IS 'Groups for organizing markers.';
COMMENT ON TABLE maps.marker_comments IS 'Comments attached to markers.';
COMMENT ON TABLE maps.user_map_settings IS 'User-specific map settings and preferences.';