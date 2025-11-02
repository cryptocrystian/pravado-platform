-- =====================================================
-- PERSONA INTELLIGENCE & ADAPTIVE VOICE MIGRATION
-- Sprint 31: Persona-based adaptive communication
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

-- Tone archetypes for communication
CREATE TYPE tone_archetype AS ENUM (
  'ANALYTICAL',       -- Factual, data-oriented, logical
  'WARM',            -- Friendly, empathetic, relationship-focused
  'ASSERTIVE',       -- Direct, confident, outcome-driven
  'EXPRESSIVE',      -- Enthusiastic, creative, energetic
  'AMIABLE'          -- Supportive, patient, collaborative
);

-- Voice modes (formality levels)
CREATE TYPE voice_mode AS ENUM (
  'FORMAL',          -- Professional, structured language
  'CONVERSATIONAL',  -- Natural, friendly but professional
  'CASUAL'           -- Informal, relaxed tone
);

-- Confidence levels for persona assignment
CREATE TYPE confidence_level AS ENUM (
  'HIGH',            -- 80-100% confidence
  'MEDIUM',          -- 50-79% confidence
  'LOW'              -- 0-49% confidence
);

-- =====================================================
-- PERSONA DEFINITIONS TABLE
-- =====================================================

CREATE TABLE persona_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Persona metadata
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,

  -- Default communication attributes
  default_tone tone_archetype NOT NULL,
  default_voice voice_mode NOT NULL DEFAULT 'CONVERSATIONAL',

  -- Behavioral characteristics
  characteristics JSONB DEFAULT '{}',  -- Key traits and preferences

  -- Communication guidelines
  do_list TEXT[],                      -- Recommended approaches
  dont_list TEXT[],                    -- Things to avoid

  -- Example content
  example_phrases TEXT[],              -- Sample language that fits this persona

  -- Status
  is_system_persona BOOLEAN DEFAULT true,  -- System-provided vs custom
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_persona_definitions_active ON persona_definitions(is_active) WHERE is_active = true;
CREATE INDEX idx_persona_definitions_system ON persona_definitions(is_system_persona);

-- =====================================================
-- PERSONA STRATEGIES TABLE
-- =====================================================

CREATE TABLE persona_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to persona
  persona_id UUID NOT NULL REFERENCES persona_definitions(id) ON DELETE CASCADE,

  -- Strategy configuration
  recommended_tone tone_archetype NOT NULL,
  recommended_voice voice_mode NOT NULL,

  -- Strategic guidance
  strategy_name TEXT NOT NULL,
  strategy_notes TEXT,

  -- Content guidelines
  content_structure JSONB,             -- Preferred structure (e.g., lead with data)
  messaging_focus TEXT[],              -- Key themes to emphasize

  -- Response patterns
  optimal_email_length TEXT,           -- e.g., "concise" or "detailed"
  preferred_cta_style TEXT,            -- e.g., "direct" or "soft"

  -- Use case specific overrides
  use_case_tag TEXT,                   -- Optional: PLANNING, EXECUTION, etc.

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT persona_strategies_unique UNIQUE(persona_id, use_case_tag)
);

CREATE INDEX idx_persona_strategies_persona ON persona_strategies(persona_id);
CREATE INDEX idx_persona_strategies_use_case ON persona_strategies(use_case_tag);

-- =====================================================
-- CONTACT PERSONAS TABLE
-- =====================================================

CREATE TABLE contact_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Contact reference
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Persona assignment
  persona_id UUID NOT NULL REFERENCES persona_definitions(id),

  -- Confidence metrics
  confidence_score NUMERIC(3,2) NOT NULL DEFAULT 0.5,  -- 0.0 to 1.0
  confidence_level confidence_level GENERATED ALWAYS AS (
    CASE
      WHEN confidence_score >= 0.8 THEN 'HIGH'
      WHEN confidence_score >= 0.5 THEN 'MEDIUM'
      ELSE 'LOW'
    END
  ) STORED,

  -- Source of assignment
  assignment_source TEXT NOT NULL DEFAULT 'INFERRED',  -- INFERRED, MANUAL, ML_MODEL
  assigned_by UUID REFERENCES users(id),

  -- Supporting data
  inference_signals JSONB DEFAULT '{}',  -- Data points that led to this persona
  behavioral_stats JSONB DEFAULT '{}',   -- Engagement patterns, preferences

  -- Effectiveness tracking
  messages_sent INTEGER DEFAULT 0,
  positive_responses INTEGER DEFAULT 0,
  negative_responses INTEGER DEFAULT 0,
  effectiveness_score NUMERIC(3,2),      -- Calculated engagement success

  -- Status
  is_verified BOOLEAN DEFAULT false,     -- Has a human confirmed this?
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT contact_personas_unique UNIQUE(organization_id, contact_id)
);

CREATE INDEX idx_contact_personas_org ON contact_personas(organization_id);
CREATE INDEX idx_contact_personas_contact ON contact_personas(contact_id);
CREATE INDEX idx_contact_personas_persona ON contact_personas(persona_id);
CREATE INDEX idx_contact_personas_confidence ON contact_personas(confidence_level);

-- =====================================================
-- USER VOICE PREFERENCES TABLE
-- =====================================================

CREATE TABLE user_voice_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Contact reference
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Preference overrides
  preferred_tone tone_archetype,
  preferred_voice voice_mode,

  -- Context
  override_reason TEXT,
  applies_to_campaigns UUID[],          -- Specific campaigns or null for all

  -- Set by
  set_by UUID REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT user_voice_preferences_unique UNIQUE(organization_id, contact_id)
);

CREATE INDEX idx_user_voice_preferences_org ON user_voice_preferences(organization_id);
CREATE INDEX idx_user_voice_preferences_contact ON user_voice_preferences(contact_id);

-- =====================================================
-- PERSONA EVENT LOG TABLE
-- =====================================================

CREATE TABLE persona_event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Contact reference
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL,  -- PERSONA_ASSIGNED, PERSONA_CHANGED, OVERRIDE_SET, etc.

  -- Before/after state
  old_persona_id UUID REFERENCES persona_definitions(id),
  new_persona_id UUID REFERENCES persona_definitions(id),
  old_confidence NUMERIC(3,2),
  new_confidence NUMERIC(3,2),

  -- Context
  trigger_source TEXT,       -- What triggered this event
  campaign_id UUID REFERENCES campaigns(id),
  initiated_by UUID REFERENCES users(id),

  -- Additional data
  reason TEXT,
  metadata JSONB DEFAULT '{}',

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_persona_event_log_org ON persona_event_log(organization_id);
CREATE INDEX idx_persona_event_log_contact ON persona_event_log(contact_id);
CREATE INDEX idx_persona_event_log_created ON persona_event_log(created_at DESC);
CREATE INDEX idx_persona_event_log_type ON persona_event_log(event_type);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE persona_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_voice_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_event_log ENABLE ROW LEVEL SECURITY;

-- Persona Definitions - Everyone can read system personas
CREATE POLICY persona_definitions_read_all ON persona_definitions
  FOR SELECT
  USING (is_system_persona = true OR true);  -- Allow all reads for now

-- Contact Personas - Org isolation
CREATE POLICY contact_personas_org_isolation ON contact_personas
  FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- User Voice Preferences - Org isolation
CREATE POLICY user_voice_preferences_org_isolation ON user_voice_preferences
  FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- Persona Event Log - Org isolation
CREATE POLICY persona_event_log_org_isolation ON persona_event_log
  FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- =====================================================
-- POSTGRESQL FUNCTIONS
-- =====================================================

/**
 * Match contact to persona based on attributes and behavior
 */
CREATE OR REPLACE FUNCTION match_contact_to_persona(
  p_contact_id UUID,
  p_organization_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contact contacts%ROWTYPE;
  v_persona_id UUID;
  v_confidence NUMERIC(3,2);
  v_signals JSONB;
  v_avg_sentiment NUMERIC;
  v_response_rate NUMERIC;
  v_engagement_style TEXT;
BEGIN
  -- Get contact info
  SELECT * INTO v_contact
  FROM contacts
  WHERE id = p_contact_id AND organization_id = p_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contact not found';
  END IF;

  -- Initialize signals
  v_signals := '{}'::JSONB;
  v_confidence := 0.3;  -- Base confidence

  -- Get sentiment data
  SELECT AVG(avg_sentiment_score) INTO v_avg_sentiment
  FROM contact_channel_profiles
  WHERE contact_id = p_contact_id;

  -- Get engagement metrics
  SELECT
    CASE
      WHEN COUNT(*) > 0
      THEN COUNT(*) FILTER (WHERE response_type = 'REPLY')::NUMERIC / COUNT(*)
      ELSE 0
    END INTO v_response_rate
  FROM channel_performance_aggregates cpa
  WHERE cpa.contact_id = p_contact_id;

  -- Rule-based persona matching
  -- ANALYTICAL: High response to data-driven content
  IF v_contact.job_title ILIKE ANY(ARRAY['%analyst%', '%director%', '%cfo%', '%cto%']) THEN
    SELECT id INTO v_persona_id FROM persona_definitions WHERE name = 'Analytical';
    v_confidence := 0.7;
    v_signals := v_signals || jsonb_build_object('job_title_match', true);

  -- WARM: High sentiment, relationship-focused
  ELSIF v_avg_sentiment > 0.7 THEN
    SELECT id INTO v_persona_id FROM persona_definitions WHERE name = 'Warm';
    v_confidence := 0.6;
    v_signals := v_signals || jsonb_build_object('high_sentiment', v_avg_sentiment);

  -- ASSERTIVE: Quick responder, direct
  ELSIF v_response_rate > 0.6 THEN
    SELECT id INTO v_persona_id FROM persona_definitions WHERE name = 'Assertive';
    v_confidence := 0.6;
    v_signals := v_signals || jsonb_build_object('response_rate', v_response_rate);

  -- Default to AMIABLE (collaborative, balanced)
  ELSE
    SELECT id INTO v_persona_id FROM persona_definitions WHERE name = 'Amiable';
    v_confidence := 0.4;  -- Lower confidence for default
    v_signals := v_signals || jsonb_build_object('default_assignment', true);
  END IF;

  -- Increase confidence if we have interaction data
  IF v_response_rate IS NOT NULL AND v_response_rate > 0 THEN
    v_confidence := LEAST(v_confidence + 0.2, 1.0);
  END IF;

  RETURN jsonb_build_object(
    'persona_id', v_persona_id,
    'confidence', v_confidence,
    'signals', v_signals
  );
END;
$$;

/**
 * Update persona based on engagement
 */
CREATE OR REPLACE FUNCTION update_persona_based_on_engagement(
  p_contact_id UUID,
  p_organization_id UUID,
  p_interaction_type TEXT,
  p_sentiment_score NUMERIC DEFAULT NULL,
  p_response_positive BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_persona contact_personas%ROWTYPE;
  v_new_confidence NUMERIC(3,2);
  v_adjustment NUMERIC(3,2);
BEGIN
  -- Get current persona
  SELECT * INTO v_current_persona
  FROM contact_personas
  WHERE contact_id = p_contact_id AND organization_id = p_organization_id;

  IF NOT FOUND THEN
    -- No persona yet, trigger initial assignment
    PERFORM match_contact_to_persona(p_contact_id, p_organization_id);
    RETURN true;
  END IF;

  -- Update message counts
  UPDATE contact_personas
  SET messages_sent = messages_sent + 1
  WHERE id = v_current_persona.id;

  -- Adjust confidence based on interaction outcome
  v_adjustment := 0;

  IF p_response_positive = true THEN
    -- Positive response reinforces current persona
    v_adjustment := 0.05;
    UPDATE contact_personas
    SET positive_responses = positive_responses + 1
    WHERE id = v_current_persona.id;
  ELSIF p_response_positive = false THEN
    -- Negative response decreases confidence
    v_adjustment := -0.1;
    UPDATE contact_personas
    SET negative_responses = negative_responses + 1
    WHERE id = v_current_persona.id;
  END IF;

  -- Update confidence
  v_new_confidence := GREATEST(0.1, LEAST(1.0, v_current_persona.confidence_score + v_adjustment));

  UPDATE contact_personas
  SET
    confidence_score = v_new_confidence,
    last_updated_at = NOW(),
    effectiveness_score = CASE
      WHEN messages_sent > 0
      THEN positive_responses::NUMERIC / messages_sent
      ELSE NULL
    END
  WHERE id = v_current_persona.id;

  RETURN true;
END;
$$;

/**
 * Get preferred tone for persona
 */
CREATE OR REPLACE FUNCTION get_preferred_tone_for_persona(
  p_persona_id UUID,
  p_use_case_tag TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_strategy persona_strategies%ROWTYPE;
  v_persona persona_definitions%ROWTYPE;
BEGIN
  -- Get persona
  SELECT * INTO v_persona
  FROM persona_definitions
  WHERE id = p_persona_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Persona not found';
  END IF;

  -- Try to get use-case specific strategy
  IF p_use_case_tag IS NOT NULL THEN
    SELECT * INTO v_strategy
    FROM persona_strategies
    WHERE persona_id = p_persona_id AND use_case_tag = p_use_case_tag;
  END IF;

  -- Fallback to default strategy
  IF v_strategy IS NULL THEN
    SELECT * INTO v_strategy
    FROM persona_strategies
    WHERE persona_id = p_persona_id AND use_case_tag IS NULL
    LIMIT 1;
  END IF;

  -- Return strategy or defaults
  RETURN jsonb_build_object(
    'persona_id', p_persona_id,
    'persona_name', v_persona.name,
    'tone', COALESCE(v_strategy.recommended_tone, v_persona.default_tone),
    'voice', COALESCE(v_strategy.recommended_voice, v_persona.default_voice),
    'strategy_notes', v_strategy.strategy_notes,
    'messaging_focus', v_strategy.messaging_focus
  );
END;
$$;

/**
 * Get adaptive strategy for contact
 */
CREATE OR REPLACE FUNCTION get_adaptive_strategy_for_contact(
  p_contact_id UUID,
  p_organization_id UUID,
  p_use_case_tag TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contact_persona contact_personas%ROWTYPE;
  v_voice_pref user_voice_preferences%ROWTYPE;
  v_strategy JSONB;
BEGIN
  -- Get contact's persona
  SELECT * INTO v_contact_persona
  FROM contact_personas
  WHERE contact_id = p_contact_id AND organization_id = p_organization_id;

  -- If no persona, try to infer one
  IF NOT FOUND THEN
    DECLARE
      v_matched JSONB;
    BEGIN
      v_matched := match_contact_to_persona(p_contact_id, p_organization_id);

      -- Create persona assignment
      INSERT INTO contact_personas (
        organization_id,
        contact_id,
        persona_id,
        confidence_score,
        assignment_source,
        inference_signals
      ) VALUES (
        p_organization_id,
        p_contact_id,
        (v_matched->>'persona_id')::UUID,
        (v_matched->>'confidence')::NUMERIC,
        'INFERRED',
        v_matched->'signals'
      ) RETURNING * INTO v_contact_persona;
    END;
  END IF;

  -- Get base strategy
  v_strategy := get_preferred_tone_for_persona(v_contact_persona.persona_id, p_use_case_tag);

  -- Check for manual overrides
  SELECT * INTO v_voice_pref
  FROM user_voice_preferences
  WHERE contact_id = p_contact_id AND organization_id = p_organization_id;

  -- Apply overrides if present
  IF v_voice_pref IS NOT NULL THEN
    v_strategy := v_strategy || jsonb_build_object(
      'tone', COALESCE(v_voice_pref.preferred_tone, v_strategy->>'tone'),
      'voice', COALESCE(v_voice_pref.preferred_voice, v_strategy->>'voice'),
      'overridden', true,
      'override_reason', v_voice_pref.override_reason
    );
  END IF;

  -- Add confidence and metadata
  v_strategy := v_strategy || jsonb_build_object(
    'confidence', v_contact_persona.confidence_score,
    'confidence_level', v_contact_persona.confidence_level,
    'is_verified', v_contact_persona.is_verified,
    'effectiveness_score', v_contact_persona.effectiveness_score
  );

  RETURN v_strategy;
END;
$$;

/**
 * Log persona override event
 */
CREATE OR REPLACE FUNCTION log_persona_override_event(
  p_contact_id UUID,
  p_organization_id UUID,
  p_old_persona_id UUID,
  p_new_persona_id UUID,
  p_initiated_by UUID,
  p_reason TEXT DEFAULT NULL,
  p_campaign_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
  v_old_confidence NUMERIC(3,2);
  v_new_confidence NUMERIC(3,2);
BEGIN
  -- Get old confidence if available
  SELECT confidence_score INTO v_old_confidence
  FROM contact_personas
  WHERE contact_id = p_contact_id AND organization_id = p_organization_id;

  -- Insert event log
  INSERT INTO persona_event_log (
    organization_id,
    contact_id,
    event_type,
    old_persona_id,
    new_persona_id,
    old_confidence,
    new_confidence,
    trigger_source,
    campaign_id,
    initiated_by,
    reason
  ) VALUES (
    p_organization_id,
    p_contact_id,
    'PERSONA_CHANGED',
    p_old_persona_id,
    p_new_persona_id,
    v_old_confidence,
    0.9,  -- Manual overrides get high confidence
    'MANUAL_OVERRIDE',
    p_campaign_id,
    p_initiated_by,
    p_reason
  ) RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- =====================================================
-- UPDATE TIMESTAMP TRIGGERS
-- =====================================================

CREATE TRIGGER update_persona_definitions_updated_at
  BEFORE UPDATE ON persona_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_persona_strategies_updated_at
  BEFORE UPDATE ON persona_strategies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_personas_updated_at
  BEFORE UPDATE ON contact_personas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_voice_preferences_updated_at
  BEFORE UPDATE ON user_voice_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED PERSONA DEFINITIONS
-- =====================================================

-- Insert standard persona archetypes
INSERT INTO persona_definitions (
  name,
  description,
  default_tone,
  default_voice,
  characteristics,
  do_list,
  dont_list,
  example_phrases
) VALUES
  (
    'Analytical',
    'Detail-oriented, data-driven decision maker who values logic and evidence',
    'ANALYTICAL',
    'FORMAL',
    '{"traits": ["logical", "methodical", "precision-focused", "risk-averse"]}'::JSONB,
    ARRAY['Provide data and statistics', 'Use structured arguments', 'Include case studies', 'Be precise and thorough'],
    ARRAY['Avoid emotional appeals', 'Don''t rush decisions', 'Minimize fluff', 'Avoid vague claims'],
    ARRAY['In fact, data shows...', 'According to our analysis...', 'The metrics indicate...']
  ),
  (
    'Warm',
    'Empathetic, relationship-focused communicator who values trust and connection',
    'WARM',
    'CONVERSATIONAL',
    '{"traits": ["empathetic", "patient", "relationship-oriented", "collaborative"]}'::JSONB,
    ARRAY['Build rapport first', 'Show genuine interest', 'Use friendly language', 'Be supportive'],
    ARRAY['Avoid being too direct', 'Don''t skip pleasantries', 'Minimize pressure', 'Avoid cold facts only'],
    ARRAY['I hope you''re doing well...', 'I''d love to hear your thoughts...', 'Let''s collaborate on...']
  ),
  (
    'Assertive',
    'Goal-focused, decisive leader who values efficiency and results',
    'ASSERTIVE',
    'FORMAL',
    '{"traits": ["direct", "confident", "results-driven", "time-conscious"]}'::JSONB,
    ARRAY['Be concise and direct', 'Focus on outcomes', 'Provide clear CTAs', 'Respect their time'],
    ARRAY['Avoid lengthy explanations', 'Don''t be wishy-washy', 'Minimize small talk', 'Avoid ambiguity'],
    ARRAY['Let''s cut to the chase...', 'The bottom line is...', 'Here''s what you need to know...']
  ),
  (
    'Expressive',
    'Enthusiastic, creative thinker who values innovation and excitement',
    'EXPRESSIVE',
    'CONVERSATIONAL',
    '{"traits": ["enthusiastic", "creative", "visionary", "spontaneous"]}'::JSONB,
    ARRAY['Be engaging and dynamic', 'Highlight innovation', 'Use vivid language', 'Show excitement'],
    ARRAY['Avoid being too rigid', 'Don''t focus only on details', 'Minimize bureaucracy', 'Avoid monotony'],
    ARRAY['Imagine if we could...', 'This is game-changing...', 'Picture this...']
  ),
  (
    'Amiable',
    'Supportive, patient collaborator who values harmony and teamwork',
    'AMIABLE',
    'CONVERSATIONAL',
    '{"traits": ["supportive", "patient", "team-oriented", "consensus-seeking"]}'::JSONB,
    ARRAY['Be encouraging', 'Emphasize collaboration', 'Show patience', 'Build consensus'],
    ARRAY['Avoid aggressive tactics', 'Don''t create conflict', 'Minimize pressure', 'Avoid forcing decisions'],
    ARRAY['Together we can...', 'I value your input...', 'Let''s work through this...']
  );

-- Insert default strategies for each persona
INSERT INTO persona_strategies (
  persona_id,
  recommended_tone,
  recommended_voice,
  strategy_name,
  strategy_notes,
  messaging_focus,
  optimal_email_length,
  preferred_cta_style
)
SELECT
  id,
  default_tone,
  default_voice,
  name || ' Default Strategy',
  'Standard communication approach for ' || name || ' persona',
  CASE name
    WHEN 'Analytical' THEN ARRAY['ROI', 'data', 'evidence', 'methodology']
    WHEN 'Warm' THEN ARRAY['relationship', 'trust', 'support', 'collaboration']
    WHEN 'Assertive' THEN ARRAY['results', 'efficiency', 'outcomes', 'action']
    WHEN 'Expressive' THEN ARRAY['innovation', 'vision', 'excitement', 'creativity']
    WHEN 'Amiable' THEN ARRAY['teamwork', 'harmony', 'patience', 'consensus']
  END,
  CASE name
    WHEN 'Analytical' THEN 'detailed'
    WHEN 'Warm' THEN 'moderate'
    WHEN 'Assertive' THEN 'concise'
    WHEN 'Expressive' THEN 'moderate'
    WHEN 'Amiable' THEN 'moderate'
  END,
  CASE name
    WHEN 'Analytical' THEN 'soft'
    WHEN 'Warm' THEN 'soft'
    WHEN 'Assertive' THEN 'direct'
    WHEN 'Expressive' THEN 'enthusiastic'
    WHEN 'Amiable' THEN 'collaborative'
  END
FROM persona_definitions
WHERE is_system_persona = true;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE persona_definitions IS 'Library of persona archetypes with communication traits';
COMMENT ON TABLE persona_strategies IS 'Communication strategies mapped to personas';
COMMENT ON TABLE contact_personas IS 'Persona assignments for contacts with confidence tracking';
COMMENT ON TABLE user_voice_preferences IS 'Manual overrides for tone and voice preferences';
COMMENT ON TABLE persona_event_log IS 'Audit trail of persona-related events and changes';
COMMENT ON FUNCTION match_contact_to_persona IS 'Infers best-fit persona for a contact based on behavior';
COMMENT ON FUNCTION get_adaptive_strategy_for_contact IS 'Returns complete adaptive voice strategy for contact';
