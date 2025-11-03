-- =====================================================
-- AGENT MODERATION LOG MIGRATION
-- Sprint 51 Phase 4.7
-- =====================================================
--
-- Purpose: Safety and moderation layer for agent outputs
-- Creates: Tables, indexes, functions, RLS policies
--

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE moderation_category AS ENUM (
  'policy_violation',
  'brand_mismatch',
  'tone_violation',
  'hallucination',
  'sensitive_topic',
  'inappropriate_content',
  'offensive_language',
  'bias_detected',
  'factual_error',
  'privacy_concern'
);

CREATE TYPE moderation_action AS ENUM (
  'allow',
  'rewrite',
  'warn',
  'escalate',
  'block'
);

CREATE TYPE moderation_severity AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

CREATE TYPE rule_type AS ENUM (
  'regex',
  'keyword',
  'sentiment',
  'length',
  'tone',
  'custom'
);

CREATE TYPE moderation_source AS ENUM (
  'ai_analysis',
  'static_rules',
  'hybrid',
  'manual_review'
);

-- =====================================================
-- MAIN TABLE: agent_moderation_log
-- =====================================================

CREATE TABLE agent_moderation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  message TEXT NOT NULL,
  flags JSONB NOT NULL DEFAULT '[]',
  categories moderation_category[] NOT NULL DEFAULT '{}',
  severity moderation_severity NOT NULL,
  action moderation_action NOT NULL,
  action_taken TEXT,
  confidence NUMERIC(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  reasoning TEXT NOT NULL,
  suggested_rewrite TEXT,
  source moderation_source NOT NULL,
  context JSONB,
  user_id UUID,
  organization_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_confidence CHECK (confidence >= 0.0 AND confidence <= 1.0),
  CONSTRAINT valid_flags CHECK (jsonb_typeof(flags) = 'array')
);

-- =====================================================
-- MODERATION RULES TABLE
-- =====================================================

CREATE TABLE moderation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type rule_type NOT NULL,
  category moderation_category NOT NULL,
  severity moderation_severity NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}',
  action moderation_action NOT NULL,
  priority INTEGER NOT NULL CHECK (priority >= 1 AND priority <= 10),
  organization_id UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_rule_name_per_org UNIQUE (name, organization_id),
  CONSTRAINT valid_priority CHECK (priority >= 1 AND priority <= 10)
);

-- =====================================================
-- MODERATION RULESETS TABLE
-- =====================================================

CREATE TABLE moderation_rulesets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rule_ids UUID[] NOT NULL DEFAULT '{}',
  organization_id UUID,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_ruleset_name_per_org UNIQUE (name, organization_id),
  CONSTRAINT only_one_default_per_org EXCLUDE (organization_id WITH =) WHERE (is_default = true)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- agent_moderation_log indexes
CREATE INDEX idx_moderation_log_agent ON agent_moderation_log(agent_id);
CREATE INDEX idx_moderation_log_org ON agent_moderation_log(organization_id);
CREATE INDEX idx_moderation_log_user ON agent_moderation_log(user_id);
CREATE INDEX idx_moderation_log_created_at ON agent_moderation_log(created_at DESC);
CREATE INDEX idx_moderation_log_severity ON agent_moderation_log(severity);
CREATE INDEX idx_moderation_log_action ON agent_moderation_log(action);
CREATE INDEX idx_moderation_log_source ON agent_moderation_log(source);

-- GIN indexes for arrays and JSONB
CREATE INDEX idx_moderation_log_categories ON agent_moderation_log USING GIN(categories);
CREATE INDEX idx_moderation_log_flags ON agent_moderation_log USING GIN(flags);
CREATE INDEX idx_moderation_log_context ON agent_moderation_log USING GIN(context);

-- Full-text search index
CREATE INDEX idx_moderation_log_message_fts ON agent_moderation_log USING GIN(to_tsvector('english', message));
CREATE INDEX idx_moderation_log_reasoning_fts ON agent_moderation_log USING GIN(to_tsvector('english', reasoning));

-- Composite indexes for common queries
CREATE INDEX idx_moderation_log_agent_created ON agent_moderation_log(agent_id, created_at DESC);
CREATE INDEX idx_moderation_log_org_created ON agent_moderation_log(organization_id, created_at DESC);

-- moderation_rules indexes
CREATE INDEX idx_moderation_rules_org ON moderation_rules(organization_id);
CREATE INDEX idx_moderation_rules_category ON moderation_rules(category);
CREATE INDEX idx_moderation_rules_type ON moderation_rules(type);
CREATE INDEX idx_moderation_rules_enabled ON moderation_rules(enabled);
CREATE INDEX idx_moderation_rules_priority ON moderation_rules(priority DESC);

-- moderation_rulesets indexes
CREATE INDEX idx_moderation_rulesets_org ON moderation_rulesets(organization_id);
CREATE INDEX idx_moderation_rulesets_default ON moderation_rulesets(is_default) WHERE is_default = true;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

/**
 * Get moderation metrics for an agent
 */
CREATE OR REPLACE FUNCTION get_moderation_metrics(
  p_agent_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  total_moderations BIGINT,
  flagged_count BIGINT,
  flagged_percentage NUMERIC,
  action_distribution JSONB,
  category_distribution JSONB,
  severity_distribution JSONB,
  avg_confidence NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH moderation_data AS (
    SELECT
      action,
      categories,
      severity,
      confidence,
      CASE WHEN array_length(categories, 1) > 0 THEN true ELSE false END AS is_flagged
    FROM agent_moderation_log
    WHERE agent_id = p_agent_id
      AND created_at >= p_start_date
      AND created_at <= p_end_date
  ),
  action_counts AS (
    SELECT
      jsonb_object_agg(action::TEXT, count) AS distribution
    FROM (
      SELECT action, COUNT(*) AS count
      FROM moderation_data
      GROUP BY action
    ) sub
  ),
  category_counts AS (
    SELECT
      jsonb_object_agg(category::TEXT, count) AS distribution
    FROM (
      SELECT UNNEST(categories) AS category, COUNT(*) AS count
      FROM moderation_data
      WHERE array_length(categories, 1) > 0
      GROUP BY category
    ) sub
  ),
  severity_counts AS (
    SELECT
      jsonb_object_agg(severity::TEXT, count) AS distribution
    FROM (
      SELECT severity, COUNT(*) AS count
      FROM moderation_data
      GROUP BY severity
    ) sub
  )
  SELECT
    COUNT(*)::BIGINT AS total_moderations,
    COUNT(*) FILTER (WHERE is_flagged)::BIGINT AS flagged_count,
    ROUND((COUNT(*) FILTER (WHERE is_flagged)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2) AS flagged_percentage,
    COALESCE((SELECT distribution FROM action_counts), '{}'::JSONB) AS action_distribution,
    COALESCE((SELECT distribution FROM category_counts), '{}'::JSONB) AS category_distribution,
    COALESCE((SELECT distribution FROM severity_counts), '{}'::JSONB) AS severity_distribution,
    ROUND(AVG(confidence), 2) AS avg_confidence
  FROM moderation_data;
END;
$$ LANGUAGE plpgsql;

/**
 * Get moderation trends over time
 */
CREATE OR REPLACE FUNCTION get_moderation_trends(
  p_agent_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE,
  p_interval TEXT DEFAULT 'day'
)
RETURNS TABLE (
  date TEXT,
  total_moderations BIGINT,
  flagged_count BIGINT,
  avg_severity NUMERIC,
  top_categories JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_data AS (
    SELECT
      DATE_TRUNC(p_interval, created_at) AS period,
      categories,
      severity,
      CASE WHEN array_length(categories, 1) > 0 THEN 1 ELSE 0 END AS is_flagged
    FROM agent_moderation_log
    WHERE agent_id = p_agent_id
      AND created_at >= p_start_date
      AND created_at <= p_end_date
  ),
  severity_mapping AS (
    SELECT
      period,
      categories,
      CASE severity
        WHEN 'low' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'high' THEN 3
        WHEN 'critical' THEN 4
      END AS severity_value,
      is_flagged
    FROM daily_data
  ),
  top_cats AS (
    SELECT
      period,
      jsonb_agg(
        jsonb_build_object(
          'category', category,
          'count', count
        ) ORDER BY count DESC
      ) FILTER (WHERE rn <= 3) AS top_categories
    FROM (
      SELECT
        period,
        UNNEST(categories) AS category,
        COUNT(*) AS count,
        ROW_NUMBER() OVER (PARTITION BY period ORDER BY COUNT(*) DESC) AS rn
      FROM daily_data
      WHERE array_length(categories, 1) > 0
      GROUP BY period, category
    ) sub
    GROUP BY period
  )
  SELECT
    TO_CHAR(sm.period, 'YYYY-MM-DD') AS date,
    COUNT(*)::BIGINT AS total_moderations,
    SUM(sm.is_flagged)::BIGINT AS flagged_count,
    ROUND(AVG(sm.severity_value), 2) AS avg_severity,
    COALESCE(tc.top_categories, '[]'::JSONB) AS top_categories
  FROM severity_mapping sm
  LEFT JOIN top_cats tc ON sm.period = tc.period
  GROUP BY sm.period, tc.top_categories
  ORDER BY sm.period;
END;
$$ LANGUAGE plpgsql;

/**
 * Get category breakdown
 */
CREATE OR REPLACE FUNCTION get_category_breakdown(
  p_agent_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  category TEXT,
  count BIGINT,
  percentage NUMERIC,
  avg_severity TEXT,
  common_reasons TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH category_data AS (
    SELECT
      UNNEST(categories) AS cat,
      severity,
      reasoning
    FROM agent_moderation_log
    WHERE agent_id = p_agent_id
      AND created_at >= p_start_date
      AND created_at <= p_end_date
      AND array_length(categories, 1) > 0
  ),
  total_count AS (
    SELECT COUNT(*) AS total FROM category_data
  ),
  severity_mode AS (
    SELECT
      cat,
      MODE() WITHIN GROUP (ORDER BY severity) AS most_common_severity
    FROM category_data
    GROUP BY cat
  ),
  top_reasons AS (
    SELECT
      cat,
      ARRAY_AGG(DISTINCT reasoning ORDER BY reasoning) FILTER (WHERE reasoning IS NOT NULL) AS reasons
    FROM (
      SELECT
        cat,
        reasoning,
        ROW_NUMBER() OVER (PARTITION BY cat ORDER BY RANDOM()) AS rn
      FROM category_data
    ) sub
    WHERE rn <= 5
    GROUP BY cat
  )
  SELECT
    cd.cat::TEXT AS category,
    COUNT(*)::BIGINT AS count,
    ROUND((COUNT(*)::NUMERIC / NULLIF((SELECT total FROM total_count), 0)) * 100, 2) AS percentage,
    sm.most_common_severity::TEXT AS avg_severity,
    COALESCE(tr.reasons, ARRAY[]::TEXT[]) AS common_reasons
  FROM category_data cd
  LEFT JOIN severity_mode sm ON cd.cat = sm.cat
  LEFT JOIN top_reasons tr ON cd.cat = tr.cat
  GROUP BY cd.cat, sm.most_common_severity, tr.reasons
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

/**
 * Get moderation history with filters
 */
CREATE OR REPLACE FUNCTION get_moderation_history(
  p_agent_id UUID,
  p_categories moderation_category[] DEFAULT NULL,
  p_severity moderation_severity DEFAULT NULL,
  p_action moderation_action DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_min_confidence NUMERIC DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  agent_id UUID,
  message TEXT,
  flags JSONB,
  categories moderation_category[],
  severity moderation_severity,
  action moderation_action,
  action_taken TEXT,
  confidence NUMERIC,
  reasoning TEXT,
  suggested_rewrite TEXT,
  source moderation_source,
  context JSONB,
  user_id UUID,
  organization_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    aml.id,
    aml.agent_id,
    aml.message,
    aml.flags,
    aml.categories,
    aml.severity,
    aml.action,
    aml.action_taken,
    aml.confidence,
    aml.reasoning,
    aml.suggested_rewrite,
    aml.source,
    aml.context,
    aml.user_id,
    aml.organization_id,
    aml.metadata,
    aml.created_at
  FROM agent_moderation_log aml
  WHERE aml.agent_id = p_agent_id
    AND (p_categories IS NULL OR aml.categories && p_categories)
    AND (p_severity IS NULL OR aml.severity = p_severity)
    AND (p_action IS NULL OR aml.action = p_action)
    AND (p_start_date IS NULL OR aml.created_at >= p_start_date)
    AND (p_end_date IS NULL OR aml.created_at <= p_end_date)
    AND (p_min_confidence IS NULL OR aml.confidence >= p_min_confidence)
    AND (p_organization_id IS NULL OR aml.organization_id = p_organization_id)
  ORDER BY aml.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

/**
 * Get moderation rules by filters
 */
CREATE OR REPLACE FUNCTION get_moderation_rules(
  p_organization_id UUID DEFAULT NULL,
  p_category moderation_category DEFAULT NULL,
  p_type rule_type DEFAULT NULL,
  p_enabled BOOLEAN DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  description TEXT,
  type rule_type,
  category moderation_category,
  severity moderation_severity,
  enabled BOOLEAN,
  config JSONB,
  action moderation_action,
  priority INTEGER,
  organization_id UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mr.id,
    mr.name,
    mr.description,
    mr.type,
    mr.category,
    mr.severity,
    mr.enabled,
    mr.config,
    mr.action,
    mr.priority,
    mr.organization_id,
    mr.created_by,
    mr.created_at,
    mr.updated_at
  FROM moderation_rules mr
  WHERE (p_organization_id IS NULL OR mr.organization_id = p_organization_id OR mr.organization_id IS NULL)
    AND (p_category IS NULL OR mr.category = p_category)
    AND (p_type IS NULL OR mr.type = p_type)
    AND (p_enabled IS NULL OR mr.enabled = p_enabled)
  ORDER BY mr.priority DESC, mr.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

/**
 * Trigger to automatically update updated_at timestamp
 */
CREATE OR REPLACE FUNCTION update_moderation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER moderation_rules_updated_at
BEFORE UPDATE ON moderation_rules
FOR EACH ROW
EXECUTE FUNCTION update_moderation_updated_at();

CREATE TRIGGER moderation_rulesets_updated_at
BEFORE UPDATE ON moderation_rulesets
FOR EACH ROW
EXECUTE FUNCTION update_moderation_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on tables
ALTER TABLE agent_moderation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_rulesets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_moderation_log
CREATE POLICY moderation_log_org_isolation ON agent_moderation_log
  USING (
    organization_id IS NULL OR
    organization_id = current_setting('app.current_organization_id', true)::UUID
  );

CREATE POLICY moderation_log_insert ON agent_moderation_log
  FOR INSERT
  WITH CHECK (
    organization_id IS NULL OR
    organization_id = current_setting('app.current_organization_id', true)::UUID
  );

-- RLS Policies for moderation_rules
CREATE POLICY moderation_rules_org_isolation ON moderation_rules
  USING (
    organization_id IS NULL OR
    organization_id = current_setting('app.current_organization_id', true)::UUID
  );

CREATE POLICY moderation_rules_insert ON moderation_rules
  FOR INSERT
  WITH CHECK (
    organization_id IS NULL OR
    organization_id = current_setting('app.current_organization_id', true)::UUID
  );

CREATE POLICY moderation_rules_update ON moderation_rules
  FOR UPDATE
  USING (
    organization_id IS NULL OR
    organization_id = current_setting('app.current_organization_id', true)::UUID
  );

-- RLS Policies for moderation_rulesets
CREATE POLICY moderation_rulesets_org_isolation ON moderation_rulesets
  USING (
    organization_id IS NULL OR
    organization_id = current_setting('app.current_organization_id', true)::UUID
  );

CREATE POLICY moderation_rulesets_insert ON moderation_rulesets
  FOR INSERT
  WITH CHECK (
    organization_id IS NULL OR
    organization_id = current_setting('app.current_organization_id', true)::UUID
  );

CREATE POLICY moderation_rulesets_update ON moderation_rulesets
  FOR UPDATE
  USING (
    organization_id IS NULL OR
    organization_id = current_setting('app.current_organization_id', true)::UUID
  );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE agent_moderation_log IS 'Logs all moderation events for agent outputs';
COMMENT ON TABLE moderation_rules IS 'Defines moderation rules for content checking';
COMMENT ON TABLE moderation_rulesets IS 'Collections of moderation rules that can be applied together';

COMMENT ON COLUMN agent_moderation_log.flags IS 'Array of specific moderation flags with location and details';
COMMENT ON COLUMN agent_moderation_log.categories IS 'Array of moderation categories that were flagged';
COMMENT ON COLUMN agent_moderation_log.confidence IS 'Confidence score (0.0-1.0) of the moderation decision';
COMMENT ON COLUMN agent_moderation_log.source IS 'Source of moderation (AI, static rules, hybrid, manual)';

COMMENT ON COLUMN moderation_rules.config IS 'Rule configuration (patterns, keywords, thresholds, etc.)';
COMMENT ON COLUMN moderation_rules.priority IS 'Priority for rule application (1-10, higher = more important)';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant appropriate permissions (adjust based on your role structure)
-- GRANT SELECT, INSERT ON agent_moderation_log TO authenticated_users;
-- GRANT SELECT, INSERT, UPDATE ON moderation_rules TO admin_users;
-- GRANT SELECT, INSERT, UPDATE ON moderation_rulesets TO admin_users;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
