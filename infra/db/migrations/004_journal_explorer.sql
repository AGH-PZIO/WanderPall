-- Journal explorer tables (Module 5): reactions + threaded comments.

CREATE TABLE IF NOT EXISTS journal.journal_reactions (
    journal_id uuid NOT NULL REFERENCES journal.journals(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES account.users(id) ON DELETE CASCADE,
    emoji text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT journal_reactions_pk PRIMARY KEY (journal_id, user_id),
    CONSTRAINT journal_reactions_emoji_check CHECK (emoji IN ('like', 'heart', 'haha', 'sad'))
);

CREATE INDEX IF NOT EXISTS idx_journal_reactions_journal
    ON journal.journal_reactions (journal_id);

CREATE INDEX IF NOT EXISTS idx_journal_reactions_user
    ON journal.journal_reactions (user_id);

CREATE TABLE IF NOT EXISTS journal.journal_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_id uuid NOT NULL REFERENCES journal.journals(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES account.users(id) ON DELETE CASCADE,
    parent_comment_id uuid REFERENCES journal.journal_comments(id) ON DELETE SET NULL,
    body text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_journal_comments_journal_created
    ON journal.journal_comments (journal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_journal_comments_parent
    ON journal.journal_comments (parent_comment_id);

COMMENT ON TABLE journal.journal_reactions IS 'Per-user reactions to a journal (one reaction per user).';
COMMENT ON TABLE journal.journal_comments IS 'Threaded comments on journals; deletion is soft so replies remain.';
