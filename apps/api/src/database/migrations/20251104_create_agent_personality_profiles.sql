-- =====================================================
-- AGENT PERSONALITY PROFILES TABLE
-- Sprint 44 Phase 3.5.4
-- =====================================================
--
-- Purpose: Store agent personality configurations and behavior models
-- Enables agents to express distinct communication styles and preferences
--

-- Create personality tone enum
CREATE TYPE personality_tone AS ENUM (
  'formal',
  'casual',
  'witty',
  'assertive',
  'friendly',
  'professional',
  'empathetic',
  'direct',
  'diplomatic'
);

-- Create decision style enum
CREATE TYPE decision_style AS ENUM (
  'cautious',
  'confident',
  'exploratory',
  'analytical',
  'intuitive',
  'deliberate',
  'reactive'
);

-- Create collaboration style enum
CREATE TYPE collaboration_style AS ENUM (
  'independent',
  'team-oriented',
  'hierarchical',
  'collaborative',
  'delegative',
  'consultative'
);

-- Create memory style enum
CREATE TYPE memory_style AS ENUM (
  'short-term',
  'long-term',
  'balanced',
  'detail-oriented',
  'summary-focused'
);

-- Create user alignment enum
CREATE TYPE user_alignment AS ENUM (
  'analytical',
  'empathetic',
  'persuasive',
  'instructional',
  'supportive',
  'challenging'
);

-- Create bias type enum
CREATE TYPE bias_type AS ENUM (
  'optimism',
  'pessimism',
  'risk-aversion',
  'risk-seeking',
  'confirmation',
  'recency',
  'anchoring',
  'availability'
);

-- Create agent_personality_profiles table
CREATE TABLE IF NOT EXISTS agent_personality_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Agent and organization
  agent_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Personality dimensions
  tone personality_tone NOT NULL,
  decision_style decision_style NOT NULL,
  collaboration_style collaboration_style NOT NULL,
  memory_style memory_style NOT NULL,
  user_alignment user_alignment NOT NULL,

  -- Cognitive biases
  biases JSONB NOT NULL DEFAULT '[]',

  -- Custom traits
  custom_traits JSONB,

  -- Profile metadata
  confidence_score DECIMAL(3, 2) NOT NULL DEFAULT 0.5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  analysis_period_days INTEGER NOT NULL DEFAULT 30,

  -- Extracted traits and patterns
  traits JSONB NOT NULL DEFAULT '{}',
  behavioral_patterns JSONB NOT NULL DEFAULT '{}',

  -- Additional metadata
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Index for querying by agent
CREATE INDEX IF NOT EXISTS idx_agent_personality_profiles_agent_id
  ON agent_personality_profiles(agent_id);

-- Index for querying by organization
CREATE INDEX IF NOT EXISTS idx_agent_personality_profiles_organization_id
  ON agent_personality_profiles(organization_id);

-- Index for active profiles
CREATE INDEX IF NOT EXISTS idx_agent_personality_profiles_active
  ON agent_personality_profiles(agent_id, is_active) WHERE is_active = true;

-- Index for tone queries
CREATE INDEX IF NOT EXISTS idx_agent_personality_profiles_tone
  ON agent_personality_profiles(tone);

-- Index for decision style queries
CREATE INDEX IF NOT EXISTS idx_agent_personality_profiles_decision_style
  ON agent_personality_profiles(decision_style);

-- Index for collaboration style queries
CREATE INDEX IF NOT EXISTS idx_agent_personality_profiles_collaboration_style
  ON agent_personality_profiles(collaboration_style);

-- Index for version tracking
CREATE INDEX IF NOT EXISTS idx_agent_personality_profiles_version
  ON agent_personality_profiles(agent_id, version DESC);

-- Composite index for agent + active + version
CREATE INDEX IF NOT EXISTS idx_agent_personality_profiles_agent_active_version
  ON agent_personality_profiles(agent_id, is_active, version DESC);

-- Index for timestamps
CREATE INDEX IF NOT EXISTS idx_agent_personality_profiles_created_at
  ON agent_personality_profiles(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_personality_profiles_updated_at
  ON agent_personality_profiles(updated_at DESC);

-- GIN indexes for JSONB fields
CREATE INDEX IF NOT EXISTS idx_agent_personality_profiles_biases
  ON agent_personality_profiles USING GIN (biases);

CREATE INDEX IF NOT EXISTS idx_agent_personality_profiles_traits
  ON agent_personality_profiles USING GIN (traits);

CREATE INDEX IF NOT EXISTS idx_agent_personality_profiles_behavioral_patterns
  ON agent_personality_profiles USING GIN (behavioral_patterns);

CREATE INDEX IF NOT EXISTS idx_agent_personality_profiles_metadata
  ON agent_personality_profiles USING GIN (metadata);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE agent_personality_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view profiles from their organization
CREATE POLICY agent_personality_profiles_select_policy ON agent_personality_profiles
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- Policy: Users can only insert profiles for their organization
CREATE POLICY agent_personality_profiles_insert_policy ON agent_personality_profiles
  FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id')::UUID);

-- Policy: Users can only update profiles from their organization
CREATE POLICY agent_personality_profiles_update_policy ON agent_personality_profiles
  FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- Policy: Users can only delete profiles from their organization
CREATE POLICY agent_personality_profiles_delete_policy ON agent_personality_profiles
  FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Get active personality profile for an agent
CREATE OR REPLACE FUNCTION get_active_personality_profile(
  p_agent_id UUID
)
RETURNS TABLE(
  id UUID,
  agent_id UUID,
  organization_id UUID,
  tone personality_tone,
  decision_style decision_style,
  collaboration_style collaboration_style,
  memory_style memory_style,
  user_alignment user_alignment,
  biases JSONB,
  custom_traits JSONB,
  confidence_score DECIMAL,
  version INTEGER,
  traits JSONB,
  behavioral_patterns JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    app.id,
    app.agent_id,
    app.organization_id,
    app.tone,
    app.decision_style,
    app.collaboration_style,
    app.memory_style,
    app.user_alignment,
    app.biases,
    app.custom_traits,
    app.confidence_score,
    app.version,
    app.traits,
    app.behavioral_patterns,
    app.created_at,
    app.updated_at
  FROM agent_personality_profiles app
  WHERE app.agent_id = p_agent_id
    AND app.is_active = true
  ORDER BY app.version DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function: Get personality profile by version
CREATE OR REPLACE FUNCTION get_personality_profile_version(
  p_agent_id UUID,
  p_version INTEGER
)
RETURNS TABLE(
  id UUID,
  agent_id UUID,
  tone personality_tone,
  decision_style decision_style,
  collaboration_style collaboration_style,
  confidence_score DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    app.id,
    app.agent_id,
    app.tone,
    app.decision_style,
    app.collaboration_style,
    app.confidence_score,
    app.created_at
  FROM agent_personality_profiles app
  WHERE app.agent_id = p_agent_id
    AND app.version = p_version
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function: Get personality evolution timeline
CREATE OR REPLACE FUNCTION get_personality_evolution(
  p_agent_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  version INTEGER,
  tone personality_tone,
  decision_style decision_style,
  collaboration_style collaboration_style,
  confidence_score DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    app.version,
    app.tone,
    app.decision_style,
    app.collaboration_style,
    app.confidence_score,
    app.created_at
  FROM agent_personality_profiles app
  WHERE app.agent_id = p_agent_id
  ORDER BY app.version DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Get agents by personality tone
CREATE OR REPLACE FUNCTION get_agents_by_tone(
  p_tone personality_tone,
  p_organization_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  agent_id UUID,
  tone personality_tone,
  decision_style decision_style,
  collaboration_style collaboration_style,
  confidence_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (app.agent_id)
    app.agent_id,
    app.tone,
    app.decision_style,
    app.collaboration_style,
    app.confidence_score
  FROM agent_personality_profiles app
  WHERE app.tone = p_tone
    AND app.organization_id = p_organization_id
    AND app.is_active = true
  ORDER BY app.agent_id, app.version DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Get agents by decision style
CREATE OR REPLACE FUNCTION get_agents_by_decision_style(
  p_decision_style decision_style,
  p_organization_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  agent_id UUID,
  tone personality_tone,
  decision_style decision_style,
  collaboration_style collaboration_style,
  confidence_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (app.agent_id)
    app.agent_id,
    app.tone,
    app.decision_style,
    app.collaboration_style,
    app.confidence_score
  FROM agent_personality_profiles app
  WHERE app.decision_style = p_decision_style
    AND app.organization_id = p_organization_id
    AND app.is_active = true
  ORDER BY app.agent_id, app.version DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Get personality trait distribution
CREATE OR REPLACE FUNCTION get_personality_trait_distribution(
  p_organization_id UUID
)
RETURNS TABLE(
  trait_type TEXT,
  trait_value TEXT,
  agent_count BIGINT,
  percentage DECIMAL
) AS $$
DECLARE
  total_agents BIGINT;
BEGIN
  -- Get total number of agents with active profiles
  SELECT COUNT(DISTINCT agent_id) INTO total_agents
  FROM agent_personality_profiles
  WHERE organization_id = p_organization_id
    AND is_active = true;

  -- Return tone distribution
  RETURN QUERY
  SELECT
    'tone'::TEXT as trait_type,
    tone::TEXT as trait_value,
    COUNT(DISTINCT agent_id) as agent_count,
    ROUND((COUNT(DISTINCT agent_id)::DECIMAL / NULLIF(total_agents, 0)) * 100, 2) as percentage
  FROM agent_personality_profiles
  WHERE organization_id = p_organization_id
    AND is_active = true
  GROUP BY tone

  UNION ALL

  -- Return decision style distribution
  SELECT
    'decision_style'::TEXT as trait_type,
    decision_style::TEXT as trait_value,
    COUNT(DISTINCT agent_id) as agent_count,
    ROUND((COUNT(DISTINCT agent_id)::DECIMAL / NULLIF(total_agents, 0)) * 100, 2) as percentage
  FROM agent_personality_profiles
  WHERE organization_id = p_organization_id
    AND is_active = true
  GROUP BY decision_style

  UNION ALL

  -- Return collaboration style distribution
  SELECT
    'collaboration_style'::TEXT as trait_type,
    collaboration_style::TEXT as trait_value,
    COUNT(DISTINCT agent_id) as agent_count,
    ROUND((COUNT(DISTINCT agent_id)::DECIMAL / NULLIF(total_agents, 0)) * 100, 2) as percentage
  FROM agent_personality_profiles
  WHERE organization_id = p_organization_id
    AND is_active = true
  GROUP BY collaboration_style

  ORDER BY trait_type, agent_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Compare two agent personalities
CREATE OR REPLACE FUNCTION compare_agent_personalities(
  p_agent_a_id UUID,
  p_agent_b_id UUID
)
RETURNS TABLE(
  dimension TEXT,
  agent_a_value TEXT,
  agent_b_value TEXT,
  is_different BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH agent_a AS (
    SELECT * FROM get_active_personality_profile(p_agent_a_id) LIMIT 1
  ),
  agent_b AS (
    SELECT * FROM get_active_personality_profile(p_agent_b_id) LIMIT 1
  )
  SELECT
    'tone'::TEXT as dimension,
    a.tone::TEXT as agent_a_value,
    b.tone::TEXT as agent_b_value,
    (a.tone != b.tone) as is_different
  FROM agent_a a, agent_b b

  UNION ALL

  SELECT
    'decision_style'::TEXT,
    a.decision_style::TEXT,
    b.decision_style::TEXT,
    (a.decision_style != b.decision_style)
  FROM agent_a a, agent_b b

  UNION ALL

  SELECT
    'collaboration_style'::TEXT,
    a.collaboration_style::TEXT,
    b.collaboration_style::TEXT,
    (a.collaboration_style != b.collaboration_style)
  FROM agent_a a, agent_b b

  UNION ALL

  SELECT
    'memory_style'::TEXT,
    a.memory_style::TEXT,
    b.memory_style::TEXT,
    (a.memory_style != b.memory_style)
  FROM agent_a a, agent_b b

  UNION ALL

  SELECT
    'user_alignment'::TEXT,
    a.user_alignment::TEXT,
    b.user_alignment::TEXT,
    (a.user_alignment != b.user_alignment)
  FROM agent_a a, agent_b b;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_personality_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_personality_profile_timestamp
  BEFORE UPDATE ON agent_personality_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_personality_profile_timestamp();

-- Trigger: Deactivate old profiles when new active profile is created
CREATE OR REPLACE FUNCTION deactivate_old_personality_profiles()
RETURNS TRIGGER AS $$
BEGIN
  -- If the new profile is active, deactivate all other profiles for this agent
  IF NEW.is_active = true THEN
    UPDATE agent_personality_profiles
    SET is_active = false
    WHERE agent_id = NEW.agent_id
      AND id != NEW.id
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deactivate_old_personality_profiles
  AFTER INSERT ON agent_personality_profiles
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION deactivate_old_personality_profiles();

-- Trigger: Auto-increment version number
CREATE OR REPLACE FUNCTION auto_increment_personality_version()
RETURNS TRIGGER AS $$
DECLARE
  max_version INTEGER;
BEGIN
  -- Get the maximum version for this agent
  SELECT COALESCE(MAX(version), 0) INTO max_version
  FROM agent_personality_profiles
  WHERE agent_id = NEW.agent_id;

  -- Set the new version
  NEW.version = max_version + 1;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_increment_personality_version
  BEFORE INSERT ON agent_personality_profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_increment_personality_version();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE agent_personality_profiles IS 'Agent personality configurations and behavior models for distinct communication styles';
COMMENT ON COLUMN agent_personality_profiles.id IS 'Unique identifier for the personality profile';
COMMENT ON COLUMN agent_personality_profiles.agent_id IS 'ID of the agent this profile belongs to';
COMMENT ON COLUMN agent_personality_profiles.organization_id IS 'Organization context for multi-tenancy';
COMMENT ON COLUMN agent_personality_profiles.tone IS 'Communication tone (formal, casual, witty, etc.)';
COMMENT ON COLUMN agent_personality_profiles.decision_style IS 'Decision-making approach (cautious, confident, exploratory, etc.)';
COMMENT ON COLUMN agent_personality_profiles.collaboration_style IS 'Collaboration preference (independent, team-oriented, etc.)';
COMMENT ON COLUMN agent_personality_profiles.memory_style IS 'Memory orientation (short-term, long-term, balanced, etc.)';
COMMENT ON COLUMN agent_personality_profiles.user_alignment IS 'User interaction style (analytical, empathetic, persuasive, etc.)';
COMMENT ON COLUMN agent_personality_profiles.biases IS 'JSONB array of cognitive biases';
COMMENT ON COLUMN agent_personality_profiles.custom_traits IS 'Custom personality traits (JSONB)';
COMMENT ON COLUMN agent_personality_profiles.confidence_score IS 'Confidence in this personality profile (0-1)';
COMMENT ON COLUMN agent_personality_profiles.is_active IS 'Whether this is the currently active profile';
COMMENT ON COLUMN agent_personality_profiles.version IS 'Profile version number (auto-incremented)';
COMMENT ON COLUMN agent_personality_profiles.analysis_period_days IS 'Number of days analyzed to generate this profile';
COMMENT ON COLUMN agent_personality_profiles.traits IS 'Extracted personality traits (JSONB)';
COMMENT ON COLUMN agent_personality_profiles.behavioral_patterns IS 'Detected behavioral patterns (JSONB)';
COMMENT ON COLUMN agent_personality_profiles.metadata IS 'Additional metadata (JSONB)';
COMMENT ON COLUMN agent_personality_profiles.created_at IS 'Timestamp when profile was created';
COMMENT ON COLUMN agent_personality_profiles.updated_at IS 'Timestamp when profile was last updated';

COMMENT ON FUNCTION get_active_personality_profile IS 'Get the currently active personality profile for an agent';
COMMENT ON FUNCTION get_personality_profile_version IS 'Get a specific version of an agent personality profile';
COMMENT ON FUNCTION get_personality_evolution IS 'Get timeline of personality changes for an agent';
COMMENT ON FUNCTION get_agents_by_tone IS 'Find agents with a specific communication tone';
COMMENT ON FUNCTION get_agents_by_decision_style IS 'Find agents with a specific decision-making style';
COMMENT ON FUNCTION get_personality_trait_distribution IS 'Get distribution of personality traits across organization';
COMMENT ON FUNCTION compare_agent_personalities IS 'Compare personality profiles of two agents';
