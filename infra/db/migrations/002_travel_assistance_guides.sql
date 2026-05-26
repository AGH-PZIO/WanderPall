-- Travel guides (Module 2)

CREATE TABLE IF NOT EXISTS travel_assistance.guides (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES account.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    content jsonb NOT NULL,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    published boolean default false
);

CREATE INDEX ON travel_assistance.guides (user_id);