-- User's private notes (Module 2)

CREATE TABLE IF NOT EXISTS travel_assistance.notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES account.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    modified_at timestamptz DEFAULT now()
);

CREATE INDEX ON travel_assistance.notes (user_id);