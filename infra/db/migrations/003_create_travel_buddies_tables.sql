-- Travel Buddies module tables

-- Groups table
CREATE TABLE IF NOT EXISTS travel_buddies.groups (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS groups_created_by_idx ON travel_buddies.groups (created_by);

-- Group members table
CREATE TABLE IF NOT EXISTS travel_buddies.group_members (
  id uuid PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES travel_buddies.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS group_members_group_id_idx ON travel_buddies.group_members (group_id);
CREATE INDEX IF NOT EXISTS group_members_user_id_idx ON travel_buddies.group_members (user_id);

-- Polls table
CREATE TABLE IF NOT EXISTS travel_buddies.polls (
  id uuid PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES travel_buddies.groups(id) ON DELETE CASCADE,
  question text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE INDEX IF NOT EXISTS polls_group_id_idx ON travel_buddies.polls (group_id);

-- Poll options table
CREATE TABLE IF NOT EXISTS travel_buddies.poll_options (
  id uuid PRIMARY KEY,
  poll_id uuid NOT NULL REFERENCES travel_buddies.polls(id) ON DELETE CASCADE,
  text text NOT NULL,
  order_index integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS poll_options_poll_id_idx ON travel_buddies.poll_options (poll_id);

-- Poll votes table
CREATE TABLE IF NOT EXISTS travel_buddies.poll_votes (
  id uuid PRIMARY KEY,
  poll_id uuid NOT NULL REFERENCES travel_buddies.polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES travel_buddies.poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

CREATE INDEX IF NOT EXISTS poll_votes_poll_id_idx ON travel_buddies.poll_votes (poll_id);
CREATE INDEX IF NOT EXISTS poll_votes_user_id_idx ON travel_buddies.poll_votes (user_id);

-- Messages table
CREATE TABLE IF NOT EXISTS travel_buddies.messages (
  id uuid PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES travel_buddies.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_group_id_idx ON travel_buddies.messages (group_id);

-- Message reactions table
CREATE TABLE IF NOT EXISTS travel_buddies.message_reactions (
  message_id uuid NOT NULL REFERENCES travel_buddies.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  PRIMARY KEY(message_id, user_id, emoji)
);

-- Attachments table
CREATE TABLE IF NOT EXISTS travel_buddies.attachments (
  id uuid PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES travel_buddies.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  filename text NOT NULL,
  content_type text NOT NULL,
  size integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS attachments_group_id_idx ON travel_buddies.attachments (group_id);

-- Message attachments junction table
CREATE TABLE IF NOT EXISTS travel_buddies.message_attachments (
  message_id uuid NOT NULL REFERENCES travel_buddies.messages(id) ON DELETE CASCADE,
  attachment_id uuid NOT NULL REFERENCES travel_buddies.attachments(id) ON DELETE CASCADE,
  PRIMARY KEY(message_id, attachment_id)
);

-- Tasks table
CREATE TABLE IF NOT EXISTS travel_buddies.tasks (
  id uuid PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES travel_buddies.groups(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  assigned_to uuid,
  due_date date,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS tasks_group_id_idx ON travel_buddies.tasks (group_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON travel_buddies.tasks (status);

-- Packing items table
CREATE TABLE IF NOT EXISTS travel_buddies.packing_items (
  id uuid PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES travel_buddies.groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  quantity integer NOT NULL DEFAULT 1,
  is_packed boolean NOT NULL DEFAULT false,
  added_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS packing_items_group_id_idx ON travel_buddies.packing_items (group_id);
CREATE INDEX IF NOT EXISTS packing_items_category_idx ON travel_buddies.packing_items (category);