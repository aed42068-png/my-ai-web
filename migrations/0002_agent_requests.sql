CREATE TABLE IF NOT EXISTS agent_requests (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  raw_text TEXT,
  request_body TEXT NOT NULL,
  result_body TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_requests_created_at
  ON agent_requests (created_at DESC);
