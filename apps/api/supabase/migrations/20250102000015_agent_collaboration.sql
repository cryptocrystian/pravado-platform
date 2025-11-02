-- =====================================================
-- MULTI-AGENT COLLABORATION & HAND-OFFS
-- =====================================================
-- Enable seamless multi-agent orchestration, task delegation, and communication

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE collaboration_role AS ENUM (
  'OWNER',
  'CONTRIBUTOR',
  'REVIEWER',
  'OBSERVER'
);

CREATE TYPE collaboration_scope AS ENUM (
  'FULL',
  'TASK_ONLY',
  'SUMMARY_ONLY'
);

CREATE TYPE collaboration_status AS ENUM (
  'PENDING',
  'ACCEPTED',
  'DECLINED'
);

CREATE TYPE handoff_status AS ENUM (
  'INITIATED',
  'ACCEPTED',
  'REJECTED',
  'CANCELLED',
  'COMPLETED'
);

CREATE TYPE agent_message_type AS ENUM (
  'INFO',
  'REQUEST',
  'RESPONSE',
  'ESCALATION',
  'SYSTEM'
);

-- =====================================================
-- AGENT COLLABORATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_collaborations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID REFERENCES agent_goals(id) ON DELETE CASCADE NOT NULL,
    agent_id VARCHAR(255) NOT NULL,

    -- Collaboration metadata
    role collaboration_role NOT NULL,
    scope collaboration_scope NOT NULL DEFAULT 'FULL',
    status collaboration_status NOT NULL DEFAULT 'PENDING',

    -- Notes and context
    collaboration_notes TEXT,

    -- Audit
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Multi-tenancy
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Constraints
    UNIQUE(goal_id, agent_id)
);

-- Indexes
CREATE INDEX idx_agent_collaborations_goal_id ON agent_collaborations(goal_id);
CREATE INDEX idx_agent_collaborations_agent_id ON agent_collaborations(agent_id);
CREATE INDEX idx_agent_collaborations_organization_id ON agent_collaborations(organization_id);
CREATE INDEX idx_agent_collaborations_status ON agent_collaborations(status);
CREATE INDEX idx_agent_collaborations_role ON agent_collaborations(role);

-- =====================================================
-- AGENT HANDOFFS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_handoffs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES agent_tasks(id) ON DELETE CASCADE NOT NULL,

    -- Agent information
    from_agent_id VARCHAR(255) NOT NULL,
    to_agent_id VARCHAR(255) NOT NULL,

    -- Handoff details
    handoff_reason TEXT NOT NULL,
    handoff_message TEXT,
    status handoff_status NOT NULL DEFAULT 'INITIATED',

    -- Resolution
    resolution_notes TEXT,
    resolved_by VARCHAR(255),
    resolved_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Multi-tenancy
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Constraints
    CONSTRAINT different_agents CHECK (from_agent_id != to_agent_id)
);

-- Indexes
CREATE INDEX idx_agent_handoffs_task_id ON agent_handoffs(task_id);
CREATE INDEX idx_agent_handoffs_from_agent ON agent_handoffs(from_agent_id);
CREATE INDEX idx_agent_handoffs_to_agent ON agent_handoffs(to_agent_id);
CREATE INDEX idx_agent_handoffs_status ON agent_handoffs(status);
CREATE INDEX idx_agent_handoffs_organization_id ON agent_handoffs(organization_id);

-- =====================================================
-- AGENT CHAT THREADS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_chat_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Context
    goal_id UUID REFERENCES agent_goals(id) ON DELETE CASCADE,
    task_id UUID REFERENCES agent_tasks(id) ON DELETE CASCADE,

    -- Metadata
    title VARCHAR(500),
    participants VARCHAR(255)[] NOT NULL DEFAULT '{}',
    human_observer UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Status
    is_active BOOLEAN DEFAULT true,
    closed_at TIMESTAMPTZ,
    closed_by VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ,

    -- Multi-tenancy
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Constraints
    CONSTRAINT has_context CHECK (goal_id IS NOT NULL OR task_id IS NOT NULL)
);

-- Indexes
CREATE INDEX idx_agent_chat_threads_goal_id ON agent_chat_threads(goal_id) WHERE goal_id IS NOT NULL;
CREATE INDEX idx_agent_chat_threads_task_id ON agent_chat_threads(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_agent_chat_threads_organization_id ON agent_chat_threads(organization_id);
CREATE INDEX idx_agent_chat_threads_is_active ON agent_chat_threads(is_active);
CREATE INDEX idx_agent_chat_threads_participants ON agent_chat_threads USING GIN(participants);

-- =====================================================
-- AGENT MESSAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID REFERENCES agent_chat_threads(id) ON DELETE CASCADE NOT NULL,

    -- Sender
    sender_agent_id VARCHAR(255),
    sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    sender_type VARCHAR(50) NOT NULL, -- 'agent', 'system', 'user'

    -- Message content
    message_type agent_message_type NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,

    -- Read status
    read_by VARCHAR(255)[] DEFAULT '{}',
    read_at TIMESTAMPTZ,

    -- Reply to
    in_reply_to UUID REFERENCES agent_messages(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Multi-tenancy
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Constraints
    CONSTRAINT valid_sender CHECK (
        (sender_type = 'agent' AND sender_agent_id IS NOT NULL) OR
        (sender_type = 'user' AND sender_user_id IS NOT NULL) OR
        (sender_type = 'system')
    )
);

-- Indexes
CREATE INDEX idx_agent_messages_thread_id ON agent_messages(thread_id);
CREATE INDEX idx_agent_messages_sender_agent ON agent_messages(sender_agent_id) WHERE sender_agent_id IS NOT NULL;
CREATE INDEX idx_agent_messages_sender_user ON agent_messages(sender_user_id) WHERE sender_user_id IS NOT NULL;
CREATE INDEX idx_agent_messages_organization_id ON agent_messages(organization_id);
CREATE INDEX idx_agent_messages_created_at ON agent_messages(created_at DESC);
CREATE INDEX idx_agent_messages_message_type ON agent_messages(message_type);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to get active collaborators for a goal
CREATE OR REPLACE FUNCTION get_goal_collaborators(
    p_goal_id UUID,
    p_organization_id UUID
) RETURNS TABLE (
    agent_id VARCHAR,
    role collaboration_role,
    scope collaboration_scope,
    status collaboration_status
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.agent_id,
        c.role,
        c.scope,
        c.status
    FROM agent_collaborations c
    WHERE
        c.goal_id = p_goal_id
        AND c.organization_id = p_organization_id
        AND c.status = 'ACCEPTED'
    ORDER BY
        CASE c.role
            WHEN 'OWNER' THEN 1
            WHEN 'CONTRIBUTOR' THEN 2
            WHEN 'REVIEWER' THEN 3
            WHEN 'OBSERVER' THEN 4
        END;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if agent has permission for task
CREATE OR REPLACE FUNCTION check_agent_task_permission(
    p_task_id UUID,
    p_agent_id VARCHAR(255),
    p_organization_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_goal_id UUID;
    v_has_permission BOOLEAN;
BEGIN
    -- Get goal_id from task
    SELECT goal_id INTO v_goal_id
    FROM agent_tasks
    WHERE id = p_task_id AND organization_id = p_organization_id;

    IF v_goal_id IS NULL THEN
        RETURN false;
    END IF;

    -- Check if agent is a collaborator with appropriate scope
    SELECT EXISTS (
        SELECT 1
        FROM agent_collaborations
        WHERE
            goal_id = v_goal_id
            AND agent_id = p_agent_id
            AND organization_id = p_organization_id
            AND status = 'ACCEPTED'
            AND scope IN ('FULL', 'TASK_ONLY')
    ) INTO v_has_permission;

    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to create or get thread for goal/task
CREATE OR REPLACE FUNCTION get_or_create_thread(
    p_goal_id UUID,
    p_task_id UUID,
    p_participants VARCHAR(255)[],
    p_organization_id UUID
) RETURNS UUID AS $$
DECLARE
    v_thread_id UUID;
BEGIN
    -- Try to find existing thread
    SELECT id INTO v_thread_id
    FROM agent_chat_threads
    WHERE
        (p_goal_id IS NULL OR goal_id = p_goal_id)
        AND (p_task_id IS NULL OR task_id = p_task_id)
        AND organization_id = p_organization_id
        AND is_active = true
    LIMIT 1;

    -- Create new thread if not found
    IF v_thread_id IS NULL THEN
        INSERT INTO agent_chat_threads (
            goal_id,
            task_id,
            participants,
            organization_id
        ) VALUES (
            p_goal_id,
            p_task_id,
            p_participants,
            p_organization_id
        )
        RETURNING id INTO v_thread_id;
    ELSE
        -- Update participants if needed
        UPDATE agent_chat_threads
        SET
            participants = array_cat(participants, p_participants),
            updated_at = NOW()
        WHERE id = v_thread_id;
    END IF;

    RETURN v_thread_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update thread last message time
CREATE OR REPLACE FUNCTION update_thread_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE agent_chat_threads
    SET last_message_at = NEW.created_at
    WHERE id = NEW.thread_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_messages_update_thread
    AFTER INSERT ON agent_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_thread_last_message();

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION trigger_update_collab_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_collaborations_updated_at
    BEFORE UPDATE ON agent_collaborations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_collab_timestamp();

CREATE TRIGGER agent_handoffs_updated_at
    BEFORE UPDATE ON agent_handoffs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_collab_timestamp();

CREATE TRIGGER agent_chat_threads_updated_at
    BEFORE UPDATE ON agent_chat_threads
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_collab_timestamp();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE agent_collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;

-- Policies for agent_collaborations
CREATE POLICY agent_collaborations_org_isolation ON agent_collaborations
    USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY agent_collaborations_insert ON agent_collaborations
    FOR INSERT
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Policies for agent_handoffs
CREATE POLICY agent_handoffs_org_isolation ON agent_handoffs
    USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY agent_handoffs_insert ON agent_handoffs
    FOR INSERT
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Policies for agent_chat_threads
CREATE POLICY agent_chat_threads_org_isolation ON agent_chat_threads
    USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY agent_chat_threads_insert ON agent_chat_threads
    FOR INSERT
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Policies for agent_messages
CREATE POLICY agent_messages_org_isolation ON agent_messages
    USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY agent_messages_insert ON agent_messages
    FOR INSERT
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE agent_collaborations IS 'Multi-agent collaboration on shared goals with role-based scoping';
COMMENT ON TABLE agent_handoffs IS 'Task delegation and handoffs between agents';
COMMENT ON TABLE agent_chat_threads IS 'Communication threads for cross-agent messaging';
COMMENT ON TABLE agent_messages IS 'Individual messages in agent communication threads';
COMMENT ON FUNCTION get_goal_collaborators IS 'Get active collaborators for a goal ordered by role';
COMMENT ON FUNCTION check_agent_task_permission IS 'Verify if agent has permission to execute a task';
COMMENT ON FUNCTION get_or_create_thread IS 'Get existing or create new communication thread';
