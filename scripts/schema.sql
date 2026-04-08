DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pgvector extension unavailable, continuing without vector support';
END
$$;

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning',
  cost_budget_cents INT,
  time_budget_seconds INT,
  callback_url TEXT,
  callback_secret TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  priority INT DEFAULT 5,
  estimated_cost_cents INT,
  estimated_duration_seconds INT,
  actual_cost_cents INT,
  actual_duration_seconds INT,
  assigned_agent TEXT,
  tool_requirements TEXT[] DEFAULT '{}',
  dependencies UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS task_results (
  id UUID PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  success BOOLEAN NOT NULL,
  output TEXT,
  error_message TEXT,
  tokens_input INT,
  tokens_output INT,
  cost_cents INT,
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_progress (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  step INT,
  tool TEXT,
  status TEXT,
  snippet TEXT,
  ts BIGINT
);

CREATE TABLE IF NOT EXISTS tool_calls (
  id UUID PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  input JSONB,
  output JSONB,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS context_embeddings (
  id UUID PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  relevance_type TEXT,
  text_snippet TEXT,
  embedding TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_states (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  last_context JSONB,
  decisions_made JSONB,
  learnings JSONB,
  available_tools TEXT[],
  execution_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tool_outcomes_cache (
  id UUID PRIMARY KEY,
  tool_name TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  output JSONB,
  cost_cents INT,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ttl_seconds INT DEFAULT 3600,
  hit_count INT DEFAULT 0,
  UNIQUE(tool_name, input_hash)
);

CREATE INDEX IF NOT EXISTS idx_tasks_campaign ON tasks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_task_results_task ON task_results(task_id);
CREATE INDEX IF NOT EXISTS idx_tool_calls_task ON tool_calls(task_id);
CREATE INDEX IF NOT EXISTS idx_ctx_embed_task ON context_embeddings(task_id);
CREATE INDEX IF NOT EXISTS idx_tool_cache_lookup ON tool_outcomes_cache(tool_name, input_hash);
