-- =====================================================
-- AUTOMATED FOLLOW-UP ENGINE + CADENCE MANAGEMENT
-- Migration: 20250102000023_followup_cadence.sql
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

/**
 * Follow-up trigger type enumeration
 */
CREATE TYPE followup_trigger_type AS ENUM (
  'TIME_DELAY',
  'NO_RESPONSE',
  'LINK_CLICK',
  'OPEN_ONLY',
  'CUSTOM_CONDITION'
);

/**
 * Follow-up status enumeration
 */
CREATE TYPE followup_status AS ENUM (
  'PENDING',
  'SENT',
  'SKIPPED',
  'CANCELED',
  'FAILED'
);

-- =====================================================
-- FOLLOWUP SEQUENCES
-- =====================================================

/**
 * followup_sequences - Campaign-level follow-up templates
 */
CREATE TABLE IF NOT EXISTS followup_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Sequence identification
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Campaign association (optional - can be reusable template)
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Sequence configuration
  is_active BOOLEAN DEFAULT true,
  total_steps INTEGER DEFAULT 0,

  -- Timing configuration
  default_timezone VARCHAR(50) DEFAULT 'UTC',
  send_window_start TIME DEFAULT '09:00:00',
  send_window_end TIME DEFAULT '17:00:00',

  -- Eligibility rules
  min_relationship_tier VARCHAR(10),
  target_statuses VARCHAR(50)[],

  -- Metadata
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Multi-tenancy
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);

-- =====================================================
-- FOLLOWUP STEPS
-- =====================================================

/**
 * followup_steps - Individual steps in a follow-up sequence
 */
CREATE TABLE IF NOT EXISTS followup_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Sequence reference
  sequence_id UUID NOT NULL REFERENCES followup_sequences(id) ON DELETE CASCADE,

  -- Step ordering
  step_number INTEGER NOT NULL,
  step_name VARCHAR(255),

  -- Trigger configuration
  trigger_type followup_trigger_type DEFAULT 'TIME_DELAY',
  delay_hours INTEGER DEFAULT 48,
  delay_days INTEGER DEFAULT 0,

  -- Conditions
  requires_no_response BOOLEAN DEFAULT true,
  requires_no_click BOOLEAN DEFAULT false,
  custom_condition JSONB,

  -- Message template
  template_ref VARCHAR(255),
  subject_template TEXT,
  body_template TEXT,
  personalization_fields JSONB,

  -- Step behavior
  skip_if_replied BOOLEAN DEFAULT true,
  max_attempts INTEGER DEFAULT 1,

  -- Metadata
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(sequence_id, step_number)
);

-- =====================================================
-- SCHEDULED FOLLOWUPS
-- =====================================================

/**
 * scheduled_followups - Contact-level follow-up execution tasks
 */
CREATE TABLE IF NOT EXISTS scheduled_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  sequence_id UUID NOT NULL REFERENCES followup_sequences(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES followup_steps(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,

  -- Status tracking
  status followup_status DEFAULT 'PENDING',

  -- Execution details
  attempt_number INTEGER DEFAULT 1,
  last_attempt_at TIMESTAMPTZ,

  -- Outcome tracking
  outcome VARCHAR(100),
  error_message TEXT,

  -- Engagement tracking
  was_opened BOOLEAN DEFAULT false,
  was_clicked BOOLEAN DEFAULT false,
  was_replied BOOLEAN DEFAULT false,
  replied_at TIMESTAMPTZ,

  -- Message details
  subject TEXT,
  body TEXT,
  sent_message_id VARCHAR(255),

  -- Metadata
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Multi-tenancy
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_followup_sequences_campaign ON followup_sequences(campaign_id);
CREATE INDEX idx_followup_sequences_org ON followup_sequences(organization_id);
CREATE INDEX idx_followup_sequences_active ON followup_sequences(is_active) WHERE is_active = true;

CREATE INDEX idx_followup_steps_sequence ON followup_steps(sequence_id);
CREATE INDEX idx_followup_steps_number ON followup_steps(step_number);

CREATE INDEX idx_scheduled_followups_sequence ON scheduled_followups(sequence_id);
CREATE INDEX idx_scheduled_followups_contact ON scheduled_followups(contact_id);
CREATE INDEX idx_scheduled_followups_campaign ON scheduled_followups(campaign_id);
CREATE INDEX idx_scheduled_followups_status ON scheduled_followups(status);
CREATE INDEX idx_scheduled_followups_scheduled ON scheduled_followups(scheduled_at) WHERE status = 'PENDING';
CREATE INDEX idx_scheduled_followups_org ON scheduled_followups(organization_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE followup_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_followups ENABLE ROW LEVEL SECURITY;

-- followup_sequences policies
CREATE POLICY followup_sequences_org_isolation ON followup_sequences
  FOR ALL USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- followup_steps policies
CREATE POLICY followup_steps_org_isolation ON followup_steps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM followup_sequences
      WHERE id = followup_steps.sequence_id
        AND organization_id = current_setting('app.current_organization_id')::UUID
    )
  );

-- scheduled_followups policies
CREATE POLICY scheduled_followups_org_isolation ON scheduled_followups
  FOR ALL USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

/**
 * Generate follow-ups for campaign contacts
 */
CREATE OR REPLACE FUNCTION generate_followups_for_campaign(
  p_campaign_id UUID,
  p_sequence_id UUID,
  p_organization_id UUID,
  p_contact_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_step RECORD;
  v_contact RECORD;
  v_base_time TIMESTAMPTZ;
  v_scheduled_time TIMESTAMPTZ;
  v_created_count INTEGER := 0;
BEGIN
  -- Get base time (now)
  v_base_time := NOW();

  -- Get all steps in sequence
  FOR v_step IN
    SELECT *
    FROM followup_steps
    WHERE sequence_id = p_sequence_id
    ORDER BY step_number
  LOOP
    -- Calculate scheduled time for this step
    v_scheduled_time := v_base_time +
      (v_step.delay_days || ' days')::INTERVAL +
      (v_step.delay_hours || ' hours')::INTERVAL;

    -- Get contacts (either specified or all matched contacts for campaign)
    FOR v_contact IN
      SELECT c.id
      FROM contacts c
      WHERE c.organization_id = p_organization_id
        AND (p_contact_ids IS NULL OR c.id = ANY(p_contact_ids))
        AND EXISTS (
          SELECT 1
          FROM campaign_contact_matches m
          WHERE m.campaign_id = p_campaign_id
            AND m.contact_id = c.id
            AND m.is_approved = true
            AND m.is_excluded = false
        )
    LOOP
      -- Create scheduled followup
      INSERT INTO scheduled_followups (
        sequence_id,
        step_id,
        campaign_id,
        contact_id,
        scheduled_at,
        status,
        subject,
        body,
        organization_id
      ) VALUES (
        p_sequence_id,
        v_step.id,
        p_campaign_id,
        v_contact.id,
        v_scheduled_time,
        'PENDING',
        v_step.subject_template,
        v_step.body_template,
        p_organization_id
      )
      ON CONFLICT DO NOTHING;

      v_created_count := v_created_count + 1;
    END LOOP;
  END LOOP;

  -- Update sequence total_steps
  UPDATE followup_sequences
  SET total_steps = (
    SELECT COUNT(*) FROM followup_steps WHERE sequence_id = p_sequence_id
  )
  WHERE id = p_sequence_id;

  RETURN v_created_count;
END;
$$ LANGUAGE plpgsql;

/**
 * Evaluate follow-up triggers for a contact
 */
CREATE OR REPLACE FUNCTION evaluate_followup_triggers(
  p_followup_id UUID,
  p_organization_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_followup RECORD;
  v_step RECORD;
  v_contact RECORD;
  v_result JSONB;
  v_eligible BOOLEAN := true;
  v_reasons TEXT[] := '{}';
  v_has_reply BOOLEAN;
  v_has_click BOOLEAN;
  v_has_open BOOLEAN;
BEGIN
  -- Get followup details
  SELECT * INTO v_followup
  FROM scheduled_followups
  WHERE id = p_followup_id
    AND organization_id = p_organization_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'Follow-up not found'
    );
  END IF;

  -- Get step details
  SELECT * INTO v_step
  FROM followup_steps
  WHERE id = v_followup.step_id;

  -- Check if already sent
  IF v_followup.status != 'PENDING' THEN
    v_eligible := false;
    v_reasons := array_append(v_reasons, 'Already processed');
  END IF;

  -- Check if scheduled time has arrived
  IF v_followup.scheduled_at > NOW() THEN
    v_eligible := false;
    v_reasons := array_append(v_reasons, 'Not yet scheduled');
  END IF;

  -- Check for reply (if required)
  IF v_step.requires_no_response THEN
    SELECT EXISTS (
      SELECT 1
      FROM crm_interactions
      WHERE contact_id = v_followup.contact_id
        AND interaction_type = 'EMAIL_REPLIED'
        AND occurred_at >= v_followup.created_at
        AND organization_id = p_organization_id
    ) INTO v_has_reply;

    IF v_has_reply THEN
      v_eligible := false;
      v_reasons := array_append(v_reasons, 'Contact has replied');
    END IF;
  END IF;

  -- Check for click (if required)
  IF v_step.requires_no_click THEN
    SELECT EXISTS (
      SELECT 1
      FROM crm_interactions
      WHERE contact_id = v_followup.contact_id
        AND interaction_type = 'EMAIL_CLICKED'
        AND occurred_at >= v_followup.created_at
        AND organization_id = p_organization_id
    ) INTO v_has_click;

    IF v_has_click THEN
      v_eligible := false;
      v_reasons := array_append(v_reasons, 'Contact has clicked');
    END IF;
  END IF;

  -- Build result
  v_result := jsonb_build_object(
    'followupId', p_followup_id,
    'eligible', v_eligible,
    'reasons', v_reasons,
    'step', jsonb_build_object(
      'stepNumber', v_step.step_number,
      'stepName', v_step.step_name,
      'triggerType', v_step.trigger_type
    )
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

/**
 * Reschedule follow-up
 */
CREATE OR REPLACE FUNCTION reschedule_followup(
  p_followup_id UUID,
  p_new_scheduled_at TIMESTAMPTZ,
  p_reason TEXT,
  p_organization_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE scheduled_followups
  SET
    scheduled_at = p_new_scheduled_at,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'rescheduled', true,
      'rescheduledAt', NOW(),
      'rescheduledReason', p_reason
    ),
    updated_at = NOW()
  WHERE id = p_followup_id
    AND organization_id = p_organization_id
    AND status = 'PENDING';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

/**
 * Cancel follow-up and all future steps for contact in sequence
 */
CREATE OR REPLACE FUNCTION cancel_followup_sequence_for_contact(
  p_contact_id UUID,
  p_sequence_id UUID,
  p_reason TEXT,
  p_organization_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_canceled_count INTEGER;
BEGIN
  UPDATE scheduled_followups
  SET
    status = 'CANCELED',
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'canceledAt', NOW(),
      'canceledReason', p_reason
    ),
    updated_at = NOW()
  WHERE contact_id = p_contact_id
    AND sequence_id = p_sequence_id
    AND organization_id = p_organization_id
    AND status = 'PENDING';

  GET DIAGNOSTICS v_canceled_count = ROW_COUNT;

  RETURN v_canceled_count;
END;
$$ LANGUAGE plpgsql;

/**
 * Get due follow-ups for execution
 */
CREATE OR REPLACE FUNCTION get_due_followups(
  p_organization_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  followup_id UUID,
  sequence_id UUID,
  step_id UUID,
  campaign_id UUID,
  contact_id UUID,
  contact_name VARCHAR,
  contact_email VARCHAR,
  step_number INTEGER,
  step_name VARCHAR,
  subject TEXT,
  body TEXT,
  scheduled_at TIMESTAMPTZ,
  attempt_number INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sf.id,
    sf.sequence_id,
    sf.step_id,
    sf.campaign_id,
    sf.contact_id,
    c.name,
    c.email,
    fs.step_number,
    fs.step_name,
    sf.subject,
    sf.body,
    sf.scheduled_at,
    sf.attempt_number
  FROM scheduled_followups sf
  JOIN contacts c ON c.id = sf.contact_id
  JOIN followup_steps fs ON fs.id = sf.step_id
  WHERE sf.organization_id = p_organization_id
    AND sf.status = 'PENDING'
    AND sf.scheduled_at <= NOW()
  ORDER BY sf.scheduled_at
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

/**
 * Mark followup as sent and create interaction
 */
CREATE OR REPLACE FUNCTION mark_followup_sent(
  p_followup_id UUID,
  p_sent_message_id VARCHAR,
  p_organization_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_followup RECORD;
BEGIN
  -- Get followup details
  SELECT * INTO v_followup
  FROM scheduled_followups
  WHERE id = p_followup_id
    AND organization_id = p_organization_id;

  -- Update followup status
  UPDATE scheduled_followups
  SET
    status = 'SENT',
    sent_at = NOW(),
    sent_message_id = p_sent_message_id,
    outcome = 'SUCCESS',
    updated_at = NOW()
  WHERE id = p_followup_id;

  -- Create CRM interaction
  INSERT INTO crm_interactions (
    contact_id,
    interaction_type,
    interaction_channel,
    subject,
    description,
    campaign_id,
    metadata,
    occurred_at,
    organization_id
  ) VALUES (
    v_followup.contact_id,
    'EMAIL_SENT',
    'email',
    v_followup.subject,
    'Automated follow-up sent',
    v_followup.campaign_id,
    jsonb_build_object(
      'followupId', p_followup_id,
      'sequenceId', v_followup.sequence_id,
      'stepId', v_followup.step_id,
      'messageId', p_sent_message_id
    ),
    NOW(),
    p_organization_id
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE followup_sequences IS 'Campaign-level follow-up sequence templates';
COMMENT ON TABLE followup_steps IS 'Individual steps in follow-up sequences';
COMMENT ON TABLE scheduled_followups IS 'Contact-level follow-up execution tasks';

COMMENT ON FUNCTION generate_followups_for_campaign IS 'Bulk generate scheduled follow-ups for campaign contacts';
COMMENT ON FUNCTION evaluate_followup_triggers IS 'Evaluate if contact is eligible for follow-up based on triggers';
COMMENT ON FUNCTION reschedule_followup IS 'Reschedule a pending follow-up to new time';
COMMENT ON FUNCTION cancel_followup_sequence_for_contact IS 'Cancel all pending follow-ups for contact in sequence';
COMMENT ON FUNCTION get_due_followups IS 'Get all due follow-ups ready for execution';
COMMENT ON FUNCTION mark_followup_sent IS 'Mark follow-up as sent and create CRM interaction';
