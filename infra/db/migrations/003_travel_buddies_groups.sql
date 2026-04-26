-- Travel Buddies: groups and members.
-- This migration is idempotent and safe to run repeatedly.

CREATE TABLE IF NOT EXISTS travel_buddies.travel_group (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id    uuid        NOT NULL,
    name        text        NOT NULL,
    description text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tb_group_owner
    ON travel_buddies.travel_group (owner_id);

CREATE TABLE IF NOT EXISTS travel_buddies.group_member (
    id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id  uuid        NOT NULL REFERENCES travel_buddies.travel_group(id) ON DELETE CASCADE,
    user_id   uuid        NOT NULL,
    role      text        NOT NULL DEFAULT 'member',
    joined_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT group_member_unique UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tb_group_member_group
    ON travel_buddies.group_member (group_id);
CREATE INDEX IF NOT EXISTS idx_tb_group_member_user
    ON travel_buddies.group_member (user_id);

COMMENT ON TABLE travel_buddies.travel_group IS 'Travel buddy groups owned by a user.';
COMMENT ON TABLE travel_buddies.group_member IS 'Members of a travel buddy group with their role.';
