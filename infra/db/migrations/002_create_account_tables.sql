CREATE TABLE IF NOT EXISTS account.users (
  id uuid PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  birth_date date NOT NULL,
  email text NOT NULL,
  phone text,
  password_hash text NOT NULL,
  theme text NOT NULL DEFAULT 'light',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT users_theme_check CHECK (theme IN ('light', 'dark'))
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_active_idx
  ON account.users (lower(email))
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS account.pending_registrations (
  id uuid PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  birth_date date NOT NULL,
  email text NOT NULL,
  phone text,
  email_code_hash text NOT NULL,
  phone_code_hash text,
  email_verified boolean NOT NULL DEFAULT false,
  phone_verified boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS account.refresh_tokens (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES account.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx
  ON account.refresh_tokens (user_id);

CREATE TABLE IF NOT EXISTS account.password_reset_tokens (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES account.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx
  ON account.password_reset_tokens (user_id);
