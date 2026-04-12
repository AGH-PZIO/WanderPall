-- Gmail connection and imported travel-related mail metadata (Module 2).

CREATE TABLE IF NOT EXISTS travel_assistance.gmail_connection (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    google_email text NOT NULL,
    refresh_token_ciphertext bytea NOT NULL,
    scopes text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    last_sync_at timestamptz,
    CONSTRAINT gmail_connection_user_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_gmail_connection_user ON travel_assistance.gmail_connection (user_id);

CREATE TABLE IF NOT EXISTS travel_assistance.travel_mail_document (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    gmail_message_id text NOT NULL,
    gmail_thread_id text,
    subject text,
    snippet text,
    from_addr text,
    received_at timestamptz,
    category text NOT NULL DEFAULT 'other',
    confidence text NOT NULL DEFAULT 'low',
    is_travel_related boolean NOT NULL DEFAULT false,
    user_removed_at timestamptz,
    synced_at timestamptz NOT NULL DEFAULT now(),
    attachment_summary jsonb,
    CONSTRAINT travel_mail_document_user_message_unique UNIQUE (user_id, gmail_message_id)
);

CREATE INDEX IF NOT EXISTS idx_travel_mail_document_user_received
    ON travel_assistance.travel_mail_document (user_id, received_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_travel_mail_document_user_listed
    ON travel_assistance.travel_mail_document (user_id)
    WHERE user_removed_at IS NULL;

COMMENT ON TABLE travel_assistance.gmail_connection IS 'OAuth refresh token and Google account link per app user.';
COMMENT ON TABLE travel_assistance.travel_mail_document IS 'Travel-related Gmail message metadata; bodies and files stay in Gmail unless copied elsewhere.';
