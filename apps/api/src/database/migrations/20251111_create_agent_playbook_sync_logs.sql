-- =====================================================
-- AGENT PLAYBOOK SYNC & DRIFT DETECTION MIGRATION
-- Sprint 53 Phase 4.9
-- =====================================================

-- =====================================================
-- ENUM TYPES
-- =====================================================

CREATE TYPE drift_type AS ENUM (
  'tone_drift',
  'escalation_behavior',
  'policy_adherence',
  'decision_making',
  'knowledge_gap',
  'personality_shift',
  'objective_misalignment',
  'communication_style',
  'priority_mismatch'
);

CREATE TYPE drift_severity AS ENUM (
  'critical',
  'high',
  'medium',
  'low',
  'negligible'
);

CREATE TYPE correction_type AS ENUM (
  'memory_update',
  'personality_adjustment',
  'behavior_modifier',
  'knowledge_injection',
  'objective_realignment',
  'ruleset_update',
  'escalation_path_update',
  'communication_template'
);

CREATE TYPE sync_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'failed',
  'partial'
);

CREATE TYPE playbook_mapping_source AS ENUM (
  'organization_playbook',
  'team_playbook',
  'role_template',
  'custom_config',
  'ai_generated',
  'manual_override'
);

-- =====================================================
-- PLAYBOOKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS playbooks (
  playbook_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  organization_id UUID NOT NULL,
  rules JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_playbooks_org_id ON playbooks(organization_id);
CREATE INDEX idx_playbooks_active ON playbooks(is_active) WHERE is_active = true;
CREATE INDEX idx_playbooks_rules ON playbooks USING GIN(rules);

COMMENT ON TABLE playbooks IS 'Organization-level knowledge playbooks defining expected agent behavior';
COMMENT ON COLUMN playbooks.rules IS 'Array of playbook rules with structure: [{ruleId, name, category, ruleType, definition, priority, isRequired}]';

-- =====================================================
-- AGENT PLAYBOOK SYNC LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_playbook_sync_logs (
  sync_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  playbook_id UUID NOT NULL REFERENCES playbooks(playbook_id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  status sync_status NOT NULL DEFAULT 'pending',

  -- Sync details
  mappings JSONB NOT NULL DEFAULT '[]',
  applied_changes JSONB NOT NULL DEFAULT '[]',
  failed_mappings JSONB DEFAULT '[]',

  -- Metrics
  confidence DOUBLE PRECISION CHECK (confidence >= 0 AND confidence <= 1),
  rules_applied INTEGER DEFAULT 0,
  knowledge_injected INTEGER DEFAULT 0,
  behaviors_updated INTEGER DEFAULT 0,

  -- Summary
  summary TEXT,
  source playbook_mapping_source NOT NULL DEFAULT 'organization_playbook',
  processing_time INTEGER, -- milliseconds

  -- Context
  task_id UUID,
  conversation_id UUID,
  user_id UUID,
  context JSONB DEFAULT '{}',

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- TTL for cleanup

  -- Constraints
  CONSTRAINT fk_agent_playbook_sync_agent FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE CASCADE
);

-- Indexes for agent_playbook_sync_logs
CREATE INDEX idx_sync_logs_agent_id ON agent_playbook_sync_logs(agent_id);
CREATE INDEX idx_sync_logs_playbook_id ON agent_playbook_sync_logs(playbook_id);
CREATE INDEX idx_sync_logs_org_id ON agent_playbook_sync_logs(organization_id);
CREATE INDEX idx_sync_logs_status ON agent_playbook_sync_logs(status);
CREATE INDEX idx_sync_logs_synced_at ON agent_playbook_sync_logs(synced_at DESC);
CREATE INDEX idx_sync_logs_task_id ON agent_playbook_sync_logs(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_sync_logs_conversation_id ON agent_playbook_sync_logs(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX idx_sync_logs_expires_at ON agent_playbook_sync_logs(expires_at) WHERE expires_at IS NOT NULL;

-- GIN indexes for JSONB columns
CREATE INDEX idx_sync_logs_mappings ON agent_playbook_sync_logs USING GIN(mappings);
CREATE INDEX idx_sync_logs_applied_changes ON agent_playbook_sync_logs USING GIN(applied_changes);
CREATE INDEX idx_sync_logs_context ON agent_playbook_sync_logs USING GIN(context);

-- Full-text search on summary
CREATE INDEX idx_sync_logs_summary_fts ON agent_playbook_sync_logs USING GIN(to_tsvector('english', summary));

COMMENT ON TABLE agent_playbook_sync_logs IS 'Logs of agent synchronization with organizational playbooks';
COMMENT ON COLUMN agent_playbook_sync_logs.mappings IS 'Array of playbook-to-agent mappings applied during sync';
COMMENT ON COLUMN agent_playbook_sync_logs.applied_changes IS 'Array of actual changes made to agent configuration';
COMMENT ON COLUMN agent_playbook_sync_logs.failed_mappings IS 'Array of mappings that failed to apply';
COMMENT ON COLUMN agent_playbook_sync_logs.confidence IS 'Confidence score (0-1) of sync accuracy';

-- =====================================================
-- AGENT DRIFT DETECTION LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_drift_detection_logs (
  drift_detection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  playbook_id UUID REFERENCES playbooks(playbook_id) ON DELETE SET NULL,
  organization_id UUID NOT NULL,

  -- Drift summary
  total_drift_items INTEGER NOT NULL DEFAULT 0,
  overall_severity drift_severity NOT NULL,
  drift_items JSONB NOT NULL DEFAULT '[]',
  summary TEXT,
  recommended_actions TEXT[],

  -- Context
  task_id UUID,
  conversation_id UUID,
  time_range JSONB, -- {start: timestamp, end: timestamp}
  context JSONB DEFAULT '{}',

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- TTL for cleanup

  -- Constraints
  CONSTRAINT fk_drift_detection_agent FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE CASCADE
);

-- Indexes for agent_drift_detection_logs
CREATE INDEX idx_drift_logs_agent_id ON agent_drift_detection_logs(agent_id);
CREATE INDEX idx_drift_logs_playbook_id ON agent_drift_detection_logs(playbook_id) WHERE playbook_id IS NOT NULL;
CREATE INDEX idx_drift_logs_org_id ON agent_drift_detection_logs(organization_id);
CREATE INDEX idx_drift_logs_severity ON agent_drift_detection_logs(overall_severity);
CREATE INDEX idx_drift_logs_detected_at ON agent_drift_detection_logs(detected_at DESC);
CREATE INDEX idx_drift_logs_task_id ON agent_drift_detection_logs(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_drift_logs_conversation_id ON agent_drift_detection_logs(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX idx_drift_logs_expires_at ON agent_drift_detection_logs(expires_at) WHERE expires_at IS NOT NULL;

-- GIN indexes for JSONB and array columns
CREATE INDEX idx_drift_logs_drift_items ON agent_drift_detection_logs USING GIN(drift_items);
CREATE INDEX idx_drift_logs_recommended_actions ON agent_drift_detection_logs USING GIN(recommended_actions);
CREATE INDEX idx_drift_logs_context ON agent_drift_detection_logs USING GIN(context);

-- Full-text search on summary
CREATE INDEX idx_drift_logs_summary_fts ON agent_drift_detection_logs USING GIN(to_tsvector('english', summary));

COMMENT ON TABLE agent_drift_detection_logs IS 'Logs of detected behavioral drift from playbook expectations';
COMMENT ON COLUMN agent_drift_detection_logs.drift_items IS 'Array of individual drift items with type, severity, evidence, and suggested corrections';
COMMENT ON COLUMN agent_drift_detection_logs.overall_severity IS 'Highest severity level among all drift items';

-- =====================================================
-- DRIFT CORRECTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_drift_corrections (
  correction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  drift_detection_id UUID REFERENCES agent_drift_detection_logs(drift_detection_id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,

  -- Correction details
  corrections_applied INTEGER NOT NULL DEFAULT 0,
  corrections_failed INTEGER NOT NULL DEFAULT 0,
  applied_corrections JSONB NOT NULL DEFAULT '[]',

  -- Alignment metrics
  before_alignment DOUBLE PRECISION CHECK (before_alignment >= 0 AND before_alignment <= 1),
  after_alignment DOUBLE PRECISION CHECK (after_alignment >= 0 AND after_alignment <= 1),
  alignment_improvement DOUBLE PRECISION,

  -- Summary
  summary TEXT,
  success BOOLEAN NOT NULL DEFAULT false,

  -- Metadata
  processing_time INTEGER, -- milliseconds
  memory_updates INTEGER DEFAULT 0,
  personality_adjustments INTEGER DEFAULT 0,
  behavior_modifiers INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',

  -- Context
  task_id UUID,
  conversation_id UUID,
  user_id UUID,
  context JSONB DEFAULT '{}',

  -- Timestamps
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_drift_correction_agent FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE CASCADE
);

-- Indexes for agent_drift_corrections
CREATE INDEX idx_corrections_agent_id ON agent_drift_corrections(agent_id);
CREATE INDEX idx_corrections_detection_id ON agent_drift_corrections(drift_detection_id) WHERE drift_detection_id IS NOT NULL;
CREATE INDEX idx_corrections_org_id ON agent_drift_corrections(organization_id);
CREATE INDEX idx_corrections_success ON agent_drift_corrections(success);
CREATE INDEX idx_corrections_applied_at ON agent_drift_corrections(applied_at DESC);
CREATE INDEX idx_corrections_alignment_improvement ON agent_drift_corrections(alignment_improvement DESC NULLS LAST);

-- GIN indexes for JSONB columns
CREATE INDEX idx_corrections_applied ON agent_drift_corrections USING GIN(applied_corrections);
CREATE INDEX idx_corrections_context ON agent_drift_corrections USING GIN(context);

COMMENT ON TABLE agent_drift_corrections IS 'Logs of automatic drift corrections applied to agents';
COMMENT ON COLUMN agent_drift_corrections.applied_corrections IS 'Array of corrections with type, success status, and timestamps';
COMMENT ON COLUMN agent_drift_corrections.alignment_improvement IS 'Improvement in alignment score (after - before)';

-- =====================================================
-- PLAYBOOK MAPPINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_playbook_mappings (
  mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  playbook_id UUID NOT NULL REFERENCES playbooks(playbook_id) ON DELETE CASCADE,
  sync_id UUID REFERENCES agent_playbook_sync_logs(sync_id) ON DELETE CASCADE,

  -- Mapping details
  playbook_rule_id VARCHAR(255) NOT NULL,
  rule_name VARCHAR(255) NOT NULL,
  rule_type VARCHAR(100) NOT NULL,
  target_property VARCHAR(255) NOT NULL,
  target_value JSONB NOT NULL,
  previous_value JSONB,

  -- Metadata
  source playbook_mapping_source NOT NULL,
  confidence DOUBLE PRECISION CHECK (confidence >= 0 AND confidence <= 1),
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deactivated_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT fk_mapping_agent FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE CASCADE,
  CONSTRAINT unique_active_mapping UNIQUE (agent_id, playbook_rule_id, is_active)
);

-- Indexes for agent_playbook_mappings
CREATE INDEX idx_mappings_agent_id ON agent_playbook_mappings(agent_id);
CREATE INDEX idx_mappings_playbook_id ON agent_playbook_mappings(playbook_id);
CREATE INDEX idx_mappings_sync_id ON agent_playbook_mappings(sync_id) WHERE sync_id IS NOT NULL;
CREATE INDEX idx_mappings_rule_id ON agent_playbook_mappings(playbook_rule_id);
CREATE INDEX idx_mappings_active ON agent_playbook_mappings(is_active) WHERE is_active = true;
CREATE INDEX idx_mappings_source ON agent_playbook_mappings(source);

-- GIN indexes for JSONB columns
CREATE INDEX idx_mappings_target_value ON agent_playbook_mappings USING GIN(target_value);
CREATE INDEX idx_mappings_previous_value ON agent_playbook_mappings USING GIN(previous_value);

COMMENT ON TABLE agent_playbook_mappings IS 'Active mappings between playbook rules and agent configurations';
COMMENT ON COLUMN agent_playbook_mappings.is_active IS 'Whether this mapping is currently active (supports mapping history)';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update playbooks updated_at timestamp
CREATE OR REPLACE FUNCTION update_playbook_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER playbooks_updated_at_trigger
BEFORE UPDATE ON playbooks
FOR EACH ROW
EXECUTE FUNCTION update_playbook_updated_at();

-- Cleanup expired sync logs
CREATE OR REPLACE FUNCTION cleanup_expired_sync_logs()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM agent_playbook_sync_logs
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_expired_sync_logs_trigger
AFTER INSERT ON agent_playbook_sync_logs
FOR EACH STATEMENT
EXECUTE FUNCTION cleanup_expired_sync_logs();

-- Cleanup expired drift logs
CREATE OR REPLACE FUNCTION cleanup_expired_drift_logs()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM agent_drift_detection_logs
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_expired_drift_logs_trigger
AFTER INSERT ON agent_drift_detection_logs
FOR EACH STATEMENT
EXECUTE FUNCTION cleanup_expired_drift_logs();

-- Auto-deactivate old mappings when new mapping for same rule
CREATE OR REPLACE FUNCTION deactivate_old_mappings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE agent_playbook_mappings
    SET is_active = false,
        deactivated_at = NOW()
    WHERE agent_id = NEW.agent_id
      AND playbook_rule_id = NEW.playbook_rule_id
      AND is_active = true
      AND mapping_id != NEW.mapping_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deactivate_old_mappings_trigger
BEFORE INSERT ON agent_playbook_mappings
FOR EACH ROW
EXECUTE FUNCTION deactivate_old_mappings();

-- Calculate alignment improvement on correction insert
CREATE OR REPLACE FUNCTION calculate_alignment_improvement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.before_alignment IS NOT NULL AND NEW.after_alignment IS NOT NULL THEN
    NEW.alignment_improvement = NEW.after_alignment - NEW.before_alignment;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_alignment_improvement_trigger
BEFORE INSERT OR UPDATE ON agent_drift_corrections
FOR EACH ROW
EXECUTE FUNCTION calculate_alignment_improvement();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_playbook_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_drift_detection_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_drift_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_playbook_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for playbooks
CREATE POLICY playbooks_org_isolation ON playbooks
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- RLS Policies for sync logs
CREATE POLICY sync_logs_org_isolation ON agent_playbook_sync_logs
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- RLS Policies for drift logs
CREATE POLICY drift_logs_org_isolation ON agent_drift_detection_logs
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- RLS Policies for corrections
CREATE POLICY corrections_org_isolation ON agent_drift_corrections
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- RLS Policies for mappings (via playbook's organization_id)
CREATE POLICY mappings_org_isolation ON agent_playbook_mappings
  FOR ALL
  USING (
    playbook_id IN (
      SELECT playbook_id FROM playbooks
      WHERE organization_id = current_setting('app.current_organization_id', true)::UUID
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get sync summary for an agent
CREATE OR REPLACE FUNCTION get_agent_sync_summary(
  p_agent_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  sync_id UUID,
  playbook_id UUID,
  status sync_status,
  synced_at TIMESTAMP WITH TIME ZONE,
  changes_applied INTEGER,
  confidence DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.sync_id,
    s.playbook_id,
    s.status,
    s.synced_at,
    COALESCE(jsonb_array_length(s.applied_changes), 0)::INTEGER as changes_applied,
    s.confidence
  FROM agent_playbook_sync_logs s
  WHERE s.agent_id = p_agent_id
  ORDER BY s.synced_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get drift summary for an agent
CREATE OR REPLACE FUNCTION get_agent_drift_summary(
  p_agent_id UUID,
  p_severity_threshold drift_severity DEFAULT 'low'
)
RETURNS TABLE (
  total_detections BIGINT,
  critical_count BIGINT,
  high_count BIGINT,
  medium_count BIGINT,
  low_count BIGINT,
  last_detected_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_detections,
    COUNT(*) FILTER (WHERE overall_severity = 'critical')::BIGINT as critical_count,
    COUNT(*) FILTER (WHERE overall_severity = 'high')::BIGINT as high_count,
    COUNT(*) FILTER (WHERE overall_severity = 'medium')::BIGINT as medium_count,
    COUNT(*) FILTER (WHERE overall_severity = 'low')::BIGINT as low_count,
    MAX(detected_at) as last_detected_at
  FROM agent_drift_detection_logs
  WHERE agent_id = p_agent_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get alignment score for an agent
CREATE OR REPLACE FUNCTION get_agent_alignment_score(
  p_agent_id UUID,
  p_playbook_id UUID DEFAULT NULL
)
RETURNS DOUBLE PRECISION AS $$
DECLARE
  v_score DOUBLE PRECISION;
BEGIN
  SELECT AVG(after_alignment)
  INTO v_score
  FROM agent_drift_corrections
  WHERE agent_id = p_agent_id
    AND success = true
    AND after_alignment IS NOT NULL
    AND (p_playbook_id IS NULL OR drift_detection_id IN (
      SELECT drift_detection_id
      FROM agent_drift_detection_logs
      WHERE playbook_id = p_playbook_id
    ))
    AND applied_at > NOW() - INTERVAL '30 days';

  RETURN COALESCE(v_score, 0.0);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SAMPLE DATA (Optional - for development)
-- =====================================================

-- Uncomment to insert sample playbook
-- INSERT INTO playbooks (playbook_id, name, description, version, organization_id, rules)
-- VALUES (
--   gen_random_uuid(),
--   'Standard Sales Agent Playbook',
--   'Standard behavior guidelines for sales-focused agents',
--   '1.0.0',
--   (SELECT organization_id FROM organizations LIMIT 1),
--   '[
--     {
--       "ruleId": "tone-001",
--       "name": "Professional Friendly Tone",
--       "category": "communication",
--       "ruleType": "tone",
--       "definition": {
--         "property": "personality.tone",
--         "operator": "equals",
--         "value": "professional_friendly"
--       },
--       "priority": 1,
--       "isRequired": true
--     },
--     {
--       "ruleId": "escalation-001",
--       "name": "Escalate Complex Pricing Questions",
--       "category": "escalation",
--       "ruleType": "escalation",
--       "definition": {
--         "property": "escalation.triggers",
--         "operator": "contains",
--         "value": "complex_pricing_question",
--         "conditions": {
--           "escalateTo": "sales_manager",
--           "threshold": "medium"
--         }
--       },
--       "priority": 2,
--       "isRequired": true
--     }
--   ]'::jsonb
-- );

-- =====================================================
-- GRANTS (Adjust based on your user roles)
-- =====================================================

-- Grant permissions to api_user (adjust role name as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON playbooks TO api_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON agent_playbook_sync_logs TO api_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON agent_drift_detection_logs TO api_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON agent_drift_corrections TO api_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON agent_playbook_mappings TO api_user;
-- GRANT EXECUTE ON FUNCTION get_agent_sync_summary TO api_user;
-- GRANT EXECUTE ON FUNCTION get_agent_drift_summary TO api_user;
-- GRANT EXECUTE ON FUNCTION get_agent_alignment_score TO api_user;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
