-- =====================================================
-- ADVANCED COLLABORATION LAYER & INTERNAL HANDOFF SYSTEM
-- Migration: 20250102000025_collaboration_handoff.sql
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

/**
 * Handoff request status enumeration
 */
CREATE TYPE handoff_status AS ENUM (
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'CANCELED',
  'EXPIRED'
);

/**
 * Handoff type enumeration
 */
CREATE TYPE handoff_type AS ENUM (
  'REVIEW',
  'EXECUTION',
  'ESCALATION',
  'STRATEGY_INPUT',
  'QA_REVIEW'
);

/**
 * Collaboration thread visibility enumeration
 */
CREATE TYPE collaboration_visibility AS ENUM (
  'INTERNAL',
  'ORG_WIDE',
  'CAMPAIGN_ONLY'
);

-- =====================================================
-- HANDOFF REQUESTS
-- =====================================================

/**
 * handoff_requests - Internal task handoff requests
 */
CREATE TABLE IF NOT EXISTS handoff_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Campaign context
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Handoff parties
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Handoff details
  handoff_type handoff_type NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Status tracking
  status handoff_status DEFAULT 'PENDING' NOT NULL,

  -- Response details
  response_message TEXT,
  responded_at TIMESTAMPTZ,

  -- Expiration
  expires_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Multi-tenancy
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Constraints
  CONSTRAINT no_self_handoff CHECK (from_user_id != to_user_id)
);

-- Indexes for handoff_requests
CREATE INDEX idx_handoff_requests_campaign ON handoff_requests(campaign_id);
CREATE INDEX idx_handoff_requests_from_user ON handoff_requests(from_user_id);
CREATE INDEX idx_handoff_requests_to_user ON handoff_requests(to_user_id);
CREATE INDEX idx_handoff_requests_status ON handoff_requests(status) WHERE status = 'PENDING';
CREATE INDEX idx_handoff_requests_org ON handoff_requests(organization_id);
CREATE INDEX idx_handoff_requests_composite ON handoff_requests(organization_id, to_user_id, status);

-- =====================================================
-- COLLABORATION THREADS
-- =====================================================

/**
 * collaboration_threads - Campaign discussion threads
 */
CREATE TABLE IF NOT EXISTS collaboration_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Campaign context
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Thread metadata
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Creator
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Visibility settings
  is_private BOOLEAN DEFAULT false,
  visibility collaboration_visibility DEFAULT 'CAMPAIGN_ONLY' NOT NULL,

  -- Activity tracking
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  comment_count INTEGER DEFAULT 0,

  -- Thread status
  is_locked BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,

  -- AI Summary cache
  summary TEXT,
  summary_generated_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Multi-tenancy
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);

-- Indexes for collaboration_threads
CREATE INDEX idx_collab_threads_campaign ON collaboration_threads(campaign_id);
CREATE INDEX idx_collab_threads_created_by ON collaboration_threads(created_by);
CREATE INDEX idx_collab_threads_org ON collaboration_threads(organization_id);
CREATE INDEX idx_collab_threads_activity ON collaboration_threads(last_activity_at DESC);
CREATE INDEX idx_collab_threads_visibility ON collaboration_threads(visibility);

-- =====================================================
-- COLLABORATION COMMENTS
-- =====================================================

/**
 * collaboration_comments - Thread comments
 */
CREATE TABLE IF NOT EXISTS collaboration_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Thread reference
  thread_id UUID NOT NULL REFERENCES collaboration_threads(id) ON DELETE CASCADE,

  -- Author
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Comment content
  content TEXT NOT NULL,

  -- Mentions and attachments
  mentions TEXT[] DEFAULT '{}',
  attachments JSONB DEFAULT '[]'::jsonb,

  -- Nested replies (optional - for future threading)
  parent_comment_id UUID REFERENCES collaboration_comments(id) ON DELETE CASCADE,

  -- Editing tracking
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Multi-tenancy (inherited from thread, but cached for queries)
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);

-- Indexes for collaboration_comments
CREATE INDEX idx_collab_comments_thread ON collaboration_comments(thread_id);
CREATE INDEX idx_collab_comments_author ON collaboration_comments(author_id);
CREATE INDEX idx_collab_comments_created ON collaboration_comments(created_at DESC);
CREATE INDEX idx_collab_comments_org ON collaboration_comments(organization_id);
CREATE INDEX idx_collab_comments_parent ON collaboration_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;

-- GIN index for mentions array
CREATE INDEX idx_collab_comments_mentions ON collaboration_comments USING GIN (mentions);

-- =====================================================
-- THREAD PARTICIPANTS (for private threads)
-- =====================================================

/**
 * thread_participants - Track users who have access to private threads
 */
CREATE TABLE IF NOT EXISTS thread_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Thread reference
  thread_id UUID NOT NULL REFERENCES collaboration_threads(id) ON DELETE CASCADE,

  -- User reference
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Participation metadata
  role VARCHAR(50) DEFAULT 'participant', -- 'creator', 'participant', 'viewer'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,

  -- Notifications
  is_watching BOOLEAN DEFAULT true,

  -- Multi-tenancy
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Constraints
  UNIQUE(thread_id, user_id)
);

-- Indexes for thread_participants
CREATE INDEX idx_thread_participants_thread ON thread_participants(thread_id);
CREATE INDEX idx_thread_participants_user ON thread_participants(user_id);
CREATE INDEX idx_thread_participants_org ON thread_participants(organization_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE handoff_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_participants ENABLE ROW LEVEL SECURITY;

-- handoff_requests policies
CREATE POLICY handoff_requests_org_isolation ON handoff_requests
  FOR ALL USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- collaboration_threads policies
CREATE POLICY collab_threads_org_isolation ON collaboration_threads
  FOR ALL USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- collaboration_comments policies
CREATE POLICY collab_comments_org_isolation ON collaboration_comments
  FOR ALL USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- thread_participants policies
CREATE POLICY thread_participants_org_isolation ON thread_participants
  FOR ALL USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

/**
 * Create handoff request
 */
CREATE OR REPLACE FUNCTION create_handoff_request(
  p_campaign_id UUID,
  p_from_user_id UUID,
  p_to_user_id UUID,
  p_handoff_type handoff_type,
  p_message TEXT,
  p_metadata JSONB,
  p_organization_id UUID,
  p_expires_in_hours INTEGER DEFAULT 72
)
RETURNS UUID AS $$
DECLARE
  v_request_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Calculate expiration
  v_expires_at := NOW() + (p_expires_in_hours || ' hours')::INTERVAL;

  -- Insert handoff request
  INSERT INTO handoff_requests (
    campaign_id,
    from_user_id,
    to_user_id,
    handoff_type,
    message,
    metadata,
    expires_at,
    organization_id
  ) VALUES (
    p_campaign_id,
    p_from_user_id,
    p_to_user_id,
    p_handoff_type,
    p_message,
    COALESCE(p_metadata, '{}'::jsonb),
    v_expires_at,
    p_organization_id
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql;

/**
 * Accept handoff request
 */
CREATE OR REPLACE FUNCTION accept_handoff(
  p_request_id UUID,
  p_user_id UUID,
  p_response_message TEXT,
  p_organization_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_request RECORD;
BEGIN
  -- Get request details
  SELECT * INTO v_request
  FROM handoff_requests
  WHERE id = p_request_id
    AND organization_id = p_organization_id
    AND status = 'PENDING';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Handoff request not found or already processed';
  END IF;

  -- Verify user is the assignee
  IF v_request.to_user_id != p_user_id THEN
    RAISE EXCEPTION 'Only the assigned user can accept this handoff';
  END IF;

  -- Check expiration
  IF v_request.expires_at IS NOT NULL AND v_request.expires_at < NOW() THEN
    UPDATE handoff_requests
    SET status = 'EXPIRED', updated_at = NOW()
    WHERE id = p_request_id;

    RAISE EXCEPTION 'Handoff request has expired';
  END IF;

  -- Update request status
  UPDATE handoff_requests
  SET
    status = 'ACCEPTED',
    response_message = p_response_message,
    responded_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

/**
 * Decline handoff request
 */
CREATE OR REPLACE FUNCTION decline_handoff(
  p_request_id UUID,
  p_user_id UUID,
  p_response_message TEXT,
  p_organization_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_request RECORD;
BEGIN
  -- Get request details
  SELECT * INTO v_request
  FROM handoff_requests
  WHERE id = p_request_id
    AND organization_id = p_organization_id
    AND status = 'PENDING';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Handoff request not found or already processed';
  END IF;

  -- Verify user is the assignee
  IF v_request.to_user_id != p_user_id THEN
    RAISE EXCEPTION 'Only the assigned user can decline this handoff';
  END IF;

  -- Update request status
  UPDATE handoff_requests
  SET
    status = 'DECLINED',
    response_message = p_response_message,
    responded_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

/**
 * Get active handoffs for user
 */
CREATE OR REPLACE FUNCTION get_active_handoffs_for_user(
  p_user_id UUID,
  p_organization_id UUID
)
RETURNS TABLE (
  request_id UUID,
  campaign_id UUID,
  campaign_name VARCHAR,
  from_user_id UUID,
  from_user_name VARCHAR,
  handoff_type handoff_type,
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    hr.id,
    hr.campaign_id,
    c.name,
    hr.from_user_id,
    u.name,
    hr.handoff_type,
    hr.message,
    hr.metadata,
    hr.created_at,
    hr.expires_at
  FROM handoff_requests hr
  JOIN campaigns c ON c.id = hr.campaign_id
  JOIN users u ON u.id = hr.from_user_id
  WHERE hr.to_user_id = p_user_id
    AND hr.organization_id = p_organization_id
    AND hr.status = 'PENDING'
    AND (hr.expires_at IS NULL OR hr.expires_at > NOW())
  ORDER BY hr.created_at DESC;
END;
$$ LANGUAGE plpgsql;

/**
 * Create collaboration thread
 */
CREATE OR REPLACE FUNCTION create_collaboration_thread(
  p_campaign_id UUID,
  p_user_id UUID,
  p_title VARCHAR,
  p_description TEXT,
  p_is_private BOOLEAN,
  p_visibility collaboration_visibility,
  p_organization_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_thread_id UUID;
BEGIN
  -- Insert thread
  INSERT INTO collaboration_threads (
    campaign_id,
    title,
    description,
    created_by,
    is_private,
    visibility,
    organization_id
  ) VALUES (
    p_campaign_id,
    p_title,
    p_description,
    p_user_id,
    p_is_private,
    p_visibility,
    p_organization_id
  )
  RETURNING id INTO v_thread_id;

  -- Add creator as participant if private
  IF p_is_private THEN
    INSERT INTO thread_participants (
      thread_id,
      user_id,
      role,
      organization_id
    ) VALUES (
      v_thread_id,
      p_user_id,
      'creator',
      p_organization_id
    );
  END IF;

  RETURN v_thread_id;
END;
$$ LANGUAGE plpgsql;

/**
 * Add collaboration comment
 */
CREATE OR REPLACE FUNCTION add_collaboration_comment(
  p_thread_id UUID,
  p_author_id UUID,
  p_content TEXT,
  p_mentions TEXT[],
  p_attachments JSONB,
  p_parent_comment_id UUID,
  p_organization_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_comment_id UUID;
  v_thread RECORD;
BEGIN
  -- Get thread details
  SELECT * INTO v_thread
  FROM collaboration_threads
  WHERE id = p_thread_id
    AND organization_id = p_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Thread not found';
  END IF;

  -- Check if thread is locked
  IF v_thread.is_locked THEN
    RAISE EXCEPTION 'Thread is locked and cannot accept new comments';
  END IF;

  -- Insert comment
  INSERT INTO collaboration_comments (
    thread_id,
    author_id,
    content,
    mentions,
    attachments,
    parent_comment_id,
    organization_id
  ) VALUES (
    p_thread_id,
    p_author_id,
    p_content,
    COALESCE(p_mentions, '{}'),
    COALESCE(p_attachments, '[]'::jsonb),
    p_parent_comment_id,
    p_organization_id
  )
  RETURNING id INTO v_comment_id;

  -- Update thread activity and comment count
  UPDATE collaboration_threads
  SET
    last_activity_at = NOW(),
    comment_count = comment_count + 1,
    updated_at = NOW()
  WHERE id = p_thread_id;

  -- Add mentioned users as participants if private thread
  IF v_thread.is_private AND p_mentions IS NOT NULL THEN
    INSERT INTO thread_participants (thread_id, user_id, organization_id)
    SELECT p_thread_id, unnest(p_mentions)::UUID, p_organization_id
    ON CONFLICT (thread_id, user_id) DO NOTHING;
  END IF;

  RETURN v_comment_id;
END;
$$ LANGUAGE plpgsql;

/**
 * Get collaboration context for campaign
 */
CREATE OR REPLACE FUNCTION get_collaboration_context_for_campaign(
  p_campaign_id UUID,
  p_user_id UUID,
  p_organization_id UUID,
  p_include_comments BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
DECLARE
  v_threads JSONB;
  v_comments JSONB;
  v_result JSONB;
BEGIN
  -- Get accessible threads
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'title', t.title,
      'description', t.description,
      'createdBy', t.created_by,
      'isPrivate', t.is_private,
      'visibility', t.visibility,
      'lastActivityAt', t.last_activity_at,
      'commentCount', t.comment_count,
      'isLocked', t.is_locked,
      'isPinned', t.is_pinned,
      'summary', t.summary,
      'summaryGeneratedAt', t.summary_generated_at,
      'createdAt', t.created_at
    )
  )
  INTO v_threads
  FROM collaboration_threads t
  WHERE t.campaign_id = p_campaign_id
    AND t.organization_id = p_organization_id
    AND (
      -- Public threads
      t.is_private = false
      OR
      -- Private threads where user is participant
      EXISTS (
        SELECT 1 FROM thread_participants tp
        WHERE tp.thread_id = t.id AND tp.user_id = p_user_id
      )
    )
  ORDER BY t.is_pinned DESC, t.last_activity_at DESC;

  -- Get comments if requested
  IF p_include_comments THEN
    SELECT jsonb_object_agg(
      thread_id::TEXT,
      comments
    )
    INTO v_comments
    FROM (
      SELECT
        c.thread_id,
        jsonb_agg(
          jsonb_build_object(
            'id', c.id,
            'threadId', c.thread_id,
            'authorId', c.author_id,
            'content', c.content,
            'mentions', c.mentions,
            'attachments', c.attachments,
            'parentCommentId', c.parent_comment_id,
            'isEdited', c.is_edited,
            'editedAt', c.edited_at,
            'createdAt', c.created_at
          ) ORDER BY c.created_at ASC
        ) AS comments
      FROM collaboration_comments c
      WHERE EXISTS (
        SELECT 1 FROM collaboration_threads t
        WHERE t.id = c.thread_id
          AND t.campaign_id = p_campaign_id
          AND t.organization_id = p_organization_id
          AND (
            t.is_private = false
            OR
            EXISTS (
              SELECT 1 FROM thread_participants tp
              WHERE tp.thread_id = t.id AND tp.user_id = p_user_id
            )
          )
      )
      GROUP BY c.thread_id
    ) subquery;
  END IF;

  -- Build result
  v_result := jsonb_build_object(
    'threads', COALESCE(v_threads, '[]'::jsonb),
    'comments', COALESCE(v_comments, '{}'::jsonb)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

/**
 * Expire old pending handoffs
 */
CREATE OR REPLACE FUNCTION expire_old_handoffs()
RETURNS INTEGER AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  UPDATE handoff_requests
  SET status = 'EXPIRED', updated_at = NOW()
  WHERE status = 'PENDING'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE handoff_requests IS 'Internal task handoff requests between users';
COMMENT ON TABLE collaboration_threads IS 'Campaign discussion threads';
COMMENT ON TABLE collaboration_comments IS 'Comments within collaboration threads';
COMMENT ON TABLE thread_participants IS 'Users with access to private threads';

COMMENT ON FUNCTION create_handoff_request IS 'Create a new handoff request with expiration';
COMMENT ON FUNCTION accept_handoff IS 'Accept a pending handoff request';
COMMENT ON FUNCTION decline_handoff IS 'Decline a pending handoff request';
COMMENT ON FUNCTION get_active_handoffs_for_user IS 'Get pending handoff requests for a user';
COMMENT ON FUNCTION create_collaboration_thread IS 'Create a new discussion thread';
COMMENT ON FUNCTION add_collaboration_comment IS 'Add a comment to a thread';
COMMENT ON FUNCTION get_collaboration_context_for_campaign IS 'Get all collaboration data for a campaign';
COMMENT ON FUNCTION expire_old_handoffs IS 'Expire handoff requests past their deadline';
