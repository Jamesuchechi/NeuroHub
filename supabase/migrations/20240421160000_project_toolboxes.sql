-- Phase 10: Expert Developer Features - Project Toolboxes

-- 1. Add toolbox_id to snippets
ALTER TABLE snippets 
ADD COLUMN IF NOT EXISTS toolbox_id UUID REFERENCES api_environments(id) ON DELETE SET NULL;

-- 2. Add toolbox_id to api_tests
ALTER TABLE api_tests 
ADD COLUMN IF NOT EXISTS toolbox_id UUID REFERENCES api_environments(id) ON DELETE SET NULL;

-- 3. Create indexes for lookup
CREATE INDEX IF NOT EXISTS snippets_toolbox_id_idx ON snippets(toolbox_id);
CREATE INDEX IF NOT EXISTS api_tests_toolbox_id_idx ON api_tests(toolbox_id);

-- 4. Comments for documentation
COMMENT ON COLUMN snippets.toolbox_id IS 'Associates this snippet with a specific toolbox/environment.';
COMMENT ON COLUMN api_tests.toolbox_id IS 'Associates this API test with a specific toolbox/environment.';
