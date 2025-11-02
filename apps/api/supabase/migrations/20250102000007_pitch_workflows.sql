-- =====================================================
-- PITCH WORKFLOWS MIGRATION
-- =====================================================
-- Automated pitching system with agent-powered personalization

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE pitch_workflow_status AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'PAUSED', 'CANCELLED');
CREATE TYPE pitch_job_status AS ENUM ('PENDING', 'SENDING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED', 'BOUNCED', 'FAILED');
CREATE TYPE pitch_event_type AS ENUM ('SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED', 'BOUNCED', 'SPAM', 'UNSUBSCRIBED');

-- =====================================================
-- PITCH WORKFLOWS
-- =====================================================

CREATE TABLE IF NOT EXISTS pitch_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Workflow Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status pitch_workflow_status DEFAULT 'DRAFT' NOT NULL,

    -- Agent Configuration
    agent_template_id UUID REFERENCES agent_templates(id) ON DELETE SET NULL,
    agent_input_data JSONB DEFAULT '{}',

    -- Contact Filters
    contact_filters JSONB NOT NULL, -- { tier, topics, regions, limit }
    total_contacts INTEGER DEFAULT 0,

    -- Pitch Template
    pitch_template_id UUID REFERENCES pitch_templates(id) ON DELETE SET NULL,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    custom_variables JSONB DEFAULT '{}', -- User-defined variables

    -- Scheduling
    scheduled_at TIMESTAMPTZ,
    send_window_start TIME, -- e.g., 09:00
    send_window_end TIME, -- e.g., 17:00
    timezone VARCHAR(50) DEFAULT 'UTC',
    batch_size INTEGER DEFAULT 50, -- Send N at a time
    batch_delay_minutes INTEGER DEFAULT 5, -- Wait M minutes between batches

    -- Execution Tracking
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    paused_at TIMESTAMPTZ,

    -- Stats
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    replied_count INTEGER DEFAULT 0,
    bounced_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,

    -- Organization
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Audit
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_pitch_workflows_org_id ON pitch_workflows(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pitch_workflows_status ON pitch_workflows(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_pitch_workflows_scheduled_at ON pitch_workflows(scheduled_at) WHERE status = 'SCHEDULED';

-- =====================================================
-- PITCH JOBS
-- =====================================================

CREATE TABLE IF NOT EXISTS pitch_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relations
    workflow_id UUID REFERENCES pitch_workflows(id) ON DELETE CASCADE NOT NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,

    -- Status
    status pitch_job_status DEFAULT 'PENDING' NOT NULL,

    -- Generated Content
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    personalization_data JSONB, -- Data used for personalization

    -- Email Metadata
    email_provider VARCHAR(50), -- 'sendgrid', 'postmark', etc.
    message_id VARCHAR(255), -- Provider message ID
    from_email VARCHAR(255),
    to_email VARCHAR(255),

    -- Timestamps
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,

    -- Error Handling
    error_message TEXT,
    error_details JSONB,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMPTZ,

    -- Organization
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_pitch_jobs_workflow_id ON pitch_jobs(workflow_id);
CREATE INDEX idx_pitch_jobs_contact_id ON pitch_jobs(contact_id);
CREATE INDEX idx_pitch_jobs_status ON pitch_jobs(status);
CREATE INDEX idx_pitch_jobs_message_id ON pitch_jobs(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX idx_pitch_jobs_next_retry ON pitch_jobs(next_retry_at) WHERE status = 'FAILED' AND retry_count < max_retries;

-- =====================================================
-- PITCH EVENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS pitch_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relations
    job_id UUID REFERENCES pitch_jobs(id) ON DELETE CASCADE NOT NULL,
    workflow_id UUID REFERENCES pitch_workflows(id) ON DELETE CASCADE NOT NULL,

    -- Event Info
    event_type pitch_event_type NOT NULL,
    occurred_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Event Data
    user_agent TEXT,
    ip_address INET,
    location JSONB, -- { city, country, region }
    link_url TEXT, -- For click events
    webhook_data JSONB, -- Raw webhook payload

    -- Organization
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_pitch_events_job_id ON pitch_events(job_id);
CREATE INDEX idx_pitch_events_workflow_id ON pitch_events(workflow_id);
CREATE INDEX idx_pitch_events_event_type ON pitch_events(event_type);
CREATE INDEX idx_pitch_events_occurred_at ON pitch_events(occurred_at DESC);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Update workflow stats when job status changes
CREATE OR REPLACE FUNCTION update_workflow_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update counts based on status change
    IF NEW.status = 'SENT' AND (OLD.status IS NULL OR OLD.status != 'SENT') THEN
        UPDATE pitch_workflows
        SET sent_count = sent_count + 1,
            updated_at = NOW()
        WHERE id = NEW.workflow_id;
    END IF;

    IF NEW.status = 'DELIVERED' AND (OLD.status IS NULL OR OLD.status != 'DELIVERED') THEN
        UPDATE pitch_workflows
        SET delivered_count = delivered_count + 1,
            updated_at = NOW()
        WHERE id = NEW.workflow_id;
    END IF;

    IF NEW.status = 'OPENED' AND (OLD.status IS NULL OR OLD.status != 'OPENED') THEN
        UPDATE pitch_workflows
        SET opened_count = opened_count + 1,
            updated_at = NOW()
        WHERE id = NEW.workflow_id;
    END IF;

    IF NEW.status = 'CLICKED' AND (OLD.status IS NULL OR OLD.status != 'CLICKED') THEN
        UPDATE pitch_workflows
        SET clicked_count = clicked_count + 1,
            updated_at = NOW()
        WHERE id = NEW.workflow_id;
    END IF;

    IF NEW.status = 'REPLIED' AND (OLD.status IS NULL OR OLD.status != 'REPLIED') THEN
        UPDATE pitch_workflows
        SET replied_count = replied_count + 1,
            updated_at = NOW()
        WHERE id = NEW.workflow_id;
    END IF;

    IF NEW.status = 'BOUNCED' AND (OLD.status IS NULL OR OLD.status != 'BOUNCED') THEN
        UPDATE pitch_workflows
        SET bounced_count = bounced_count + 1,
            updated_at = NOW()
        WHERE id = NEW.workflow_id;
    END IF;

    IF NEW.status = 'FAILED' AND (OLD.status IS NULL OR OLD.status != 'FAILED') THEN
        UPDATE pitch_workflows
        SET failed_count = failed_count + 1,
            updated_at = NOW()
        WHERE id = NEW.workflow_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pitch_jobs_update_stats
    AFTER UPDATE ON pitch_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_workflow_stats();

-- Get workflow with full stats
CREATE OR REPLACE FUNCTION get_pitch_workflow_stats(workflow_uuid UUID)
RETURNS TABLE (
    workflow JSONB,
    jobs JSONB,
    recent_events JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        to_jsonb(w.*) as workflow,
        COALESCE(
            (
                SELECT jsonb_agg(to_jsonb(j.*))
                FROM pitch_jobs j
                WHERE j.workflow_id = workflow_uuid
            ),
            '[]'::jsonb
        ) as jobs,
        COALESCE(
            (
                SELECT jsonb_agg(to_jsonb(e.*))
                FROM pitch_events e
                WHERE e.workflow_id = workflow_uuid
                ORDER BY e.occurred_at DESC
                LIMIT 50
            ),
            '[]'::jsonb
        ) as recent_events
    FROM pitch_workflows w
    WHERE w.id = workflow_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get pending jobs for sending
CREATE OR REPLACE FUNCTION get_pending_pitch_jobs(batch_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    job JSONB,
    contact JSONB,
    workflow JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        to_jsonb(j.*) as job,
        to_jsonb(c.*) as contact,
        to_jsonb(w.*) as workflow
    FROM pitch_jobs j
    JOIN contacts c ON j.contact_id = c.id
    JOIN pitch_workflows w ON j.workflow_id = w.id
    WHERE j.status = 'PENDING'
      AND w.status = 'RUNNING'
      AND (w.scheduled_at IS NULL OR w.scheduled_at <= NOW())
    ORDER BY j.created_at ASC
    LIMIT batch_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE pitch_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitch_events ENABLE ROW LEVEL SECURITY;

-- Pitch Workflows Policies
CREATE POLICY pitch_workflows_view_policy ON pitch_workflows
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY pitch_workflows_insert_policy ON pitch_workflows
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role IN ('ADMIN', 'CONTRIBUTOR')
        )
    );

CREATE POLICY pitch_workflows_update_policy ON pitch_workflows
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role IN ('ADMIN', 'CONTRIBUTOR')
        )
    );

CREATE POLICY pitch_workflows_delete_policy ON pitch_workflows
    FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role = 'ADMIN'
        )
    );

-- Pitch Jobs Policies
CREATE POLICY pitch_jobs_view_policy ON pitch_jobs
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY pitch_jobs_manage_policy ON pitch_jobs
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role IN ('ADMIN', 'CONTRIBUTOR')
        )
    );

-- Pitch Events Policies
CREATE POLICY pitch_events_view_policy ON pitch_events
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY pitch_events_insert_policy ON pitch_events
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE pitch_workflows IS 'Automated pitch campaign workflows with agent-powered personalization';
COMMENT ON TABLE pitch_jobs IS 'Individual pitch sending jobs, one per contact';
COMMENT ON TABLE pitch_events IS 'Email tracking events (opens, clicks, replies, bounces)';

COMMENT ON FUNCTION get_pitch_workflow_stats IS 'Get complete workflow stats with jobs and events';
COMMENT ON FUNCTION get_pending_pitch_jobs IS 'Get next batch of pending jobs ready to send';
