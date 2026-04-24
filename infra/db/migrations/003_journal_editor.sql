-- Journal editor tables (Module 5).

CREATE TABLE IF NOT EXISTS journal.journals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES account.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    visibility text NOT NULL DEFAULT 'private',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT journals_visibility_check CHECK (visibility IN ('private', 'friends_only', 'public'))
);

CREATE INDEX IF NOT EXISTS idx_journals_user_created
    ON journal.journals (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS journal.entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_id uuid NOT NULL REFERENCES journal.journals(id) ON DELETE CASCADE,
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    text text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entries_journal_created
    ON journal.entries (journal_id, created_at DESC);

CREATE TABLE IF NOT EXISTS journal.entry_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id uuid NOT NULL REFERENCES journal.entries(id) ON DELETE CASCADE,
    storage_key text NOT NULL,
    mime_type text NOT NULL,
    byte_size bigint NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entry_images_entry
    ON journal.entry_images (entry_id, created_at DESC);

COMMENT ON TABLE journal.journals IS 'User-owned travel journals; visibility stored for future sharing/explorer.';
COMMENT ON TABLE journal.entries IS 'Journal entries with geo-coordinates and freeform text.';
COMMENT ON TABLE journal.entry_images IS 'Images attached to a journal entry; bytes live in storage keyed by storage_key.';
