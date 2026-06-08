CREATE TABLE IF NOT EXISTS sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  run_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  retry_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sync_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_run_id UUID NOT NULL REFERENCES sync_runs(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  records_seen INTEGER NOT NULL DEFAULT 0,
  records_upserted INTEGER NOT NULL DEFAULT 0,
  records_skipped INTEGER NOT NULL DEFAULT 0,
  records_failed INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS query_product_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  query_id UUID NOT NULL REFERENCES search_queries(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  match_type TEXT NOT NULL,
  confidence NUMERIC NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, query_id, product_id, match_type)
);

CREATE TABLE IF NOT EXISTS product_page_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL,
  confidence NUMERIC NOT NULL DEFAULT 0,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, product_id, page_id, link_type)
);

CREATE TABLE IF NOT EXISTS opportunity_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  role TEXT NOT NULL,
  confidence NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(opportunity_id, entity_type, entity_id, role)
);

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS rule_id TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS rule_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS score_components JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT,
  ADD COLUMN IF NOT EXISTS generated_by_sync_run_id UUID REFERENCES sync_runs(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_opportunities_store_rule_dedupe
  ON opportunities(store_id, rule_id, rule_version, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sync_runs_store_type_status
  ON sync_runs(store_id, run_type, status);

CREATE INDEX IF NOT EXISTS idx_query_product_matches_store_query
  ON query_product_matches(store_id, query_id);

CREATE INDEX IF NOT EXISTS idx_product_page_links_store_product
  ON product_page_links(store_id, product_id);

CREATE INDEX IF NOT EXISTS idx_opportunity_entities_opportunity
  ON opportunity_entities(opportunity_id);

