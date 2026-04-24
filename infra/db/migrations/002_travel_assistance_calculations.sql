-- User's saved calculations (Module 2)

CREATE TABLE IF NOT EXISTS travel_assistance.calculations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES account.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    created_at timestamptz NOT NULL default now()
);

CREATE INDEX ON travel_assistance.calculations (user_id);

CREATE TABLE IF NOT EXISTS travel_assistance.expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    calculation_id uuid NOT NULL REFERENCES travel_assistance.calculations(id) ON DELETE CASCADE,
    category text NOT NULL,
    amount numeric(10,2) NOT NULL
);

CREATE INDEX ON travel_assistance.expenses (calculation_id);