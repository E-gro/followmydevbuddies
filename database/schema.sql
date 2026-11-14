-- Estrutura inicial do armazenamento D1 do portal.
-- Use somente em um banco de desenvolvimento vazio; não execute contra produção.
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  owner_id INTEGER NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS cards_owner_idx ON cards(owner_id);
CREATE TABLE IF NOT EXISTS community_follows (
  owner_id INTEGER NOT NULL,
  card_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  PRIMARY KEY (owner_id, card_id, platform)
);
CREATE INDEX IF NOT EXISTS community_follows_card_idx ON community_follows(card_id);
CREATE TABLE IF NOT EXISTS fmdb_sessions (
  session_hash TEXT PRIMARY KEY,
  owner_id INTEGER NOT NULL,
  user_json TEXT NOT NULL,
  token_cipher TEXT NOT NULL,
  token_iv TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS fmdb_sessions_owner_idx ON fmdb_sessions(owner_id);
CREATE TABLE IF NOT EXISTS moderation_reports (
  id TEXT PRIMARY KEY,
  reporter_id INTEGER NOT NULL,
  card_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS moderation_reports_status_idx ON moderation_reports(status);
CREATE TABLE IF NOT EXISTS hidden_cards (
  card_id TEXT PRIMARY KEY,
  moderator_id INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
