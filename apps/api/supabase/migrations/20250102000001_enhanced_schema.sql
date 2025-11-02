-- Enhanced Schema Migration: Add audit columns, new tables, and enhanced RLS
-- This migration enhances the existing schema with production-grade features

-- ============================================================================
-- PART 1: Add Audit Columns to Existing Tables
-- ============================================================================

-- Add audit columns to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add audit columns to users (created_by can be NULL for first user)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add audit columns to campaigns
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) NOT NULL DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add audit columns to content_items
ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) NOT NULL DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add audit columns to media_contacts
ALTER TABLE media_contacts
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) NOT NULL DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add audit columns to keywords
ALTER TABLE keywords
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) NOT NULL DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add audit columns to keyword_clusters
ALTER TABLE keyword_clusters
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) NOT NULL DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add audit columns to agent_tasks
ALTER TABLE agent_tasks
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) NOT NULL DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add audit columns to agent_logs (no soft delete needed for logs)
ALTER TABLE agent_logs
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Add audit columns to strategies
ALTER TABLE strategies
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) NOT NULL DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================================
-- PART 2: Create New Tables
-- ============================================================================

-- Teams table for organizing users within organizations
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(organization_id, name)
);

-- Team members junction table
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL DEFAULT 'MEMBER',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    UNIQUE(team_id, user_id)
);

-- Accounts table for OAuth and SSO integrations
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, provider_account_id)
);

-- Custom roles table for fine-grained permissions
CREATE TABLE IF NOT EXISTS custom_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]',
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(organization_id, name)
);

-- Press releases table (dedicated table for PR content)
CREATE TABLE IF NOT EXISTS press_releases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    subtitle TEXT,
    body TEXT NOT NULL,
    status content_status DEFAULT 'DRAFT',
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    contact_list UUID[] DEFAULT '{}',
    embargo_until TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    distribution_channels TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES users(id) NOT NULL DEFAULT auth.uid(),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- SEO audits table for tracking SEO health over time
CREATE TABLE IF NOT EXISTS seo_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL,
    title TEXT,
    score INTEGER,
    issues JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    metrics JSONB DEFAULT '{}',
    content_id UUID REFERENCES content_items(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    audited_at TIMESTAMPTZ DEFAULT NOW(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES users(id) NOT NULL DEFAULT auth.uid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Strategy plans table for comprehensive strategic planning
CREATE TABLE IF NOT EXISTS strategy_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'DRAFT',
    goals JSONB DEFAULT '[]',
    tactics JSONB DEFAULT '[]',
    timeline JSONB DEFAULT '{}',
    budget JSONB,
    metrics JSONB DEFAULT '{}',
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    parent_strategy_id UUID REFERENCES strategy_plans(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) NOT NULL DEFAULT auth.uid(),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Style guides table for brand voice and content guidelines
CREATE TABLE IF NOT EXISTS style_guides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    tone_guidelines TEXT,
    voice_characteristics JSONB DEFAULT '{}',
    formatting_rules JSONB DEFAULT '{}',
    vocabulary_preferences JSONB DEFAULT '{}',
    examples JSONB DEFAULT '[]',
    dos_and_donts JSONB DEFAULT '{}',
    is_default BOOLEAN DEFAULT FALSE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES users(id) NOT NULL DEFAULT auth.uid(),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(organization_id, name)
);

-- Tasks table for project and task management
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'TODO',
    priority TEXT DEFAULT 'NORMAL',
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    content_id UUID REFERENCES content_items(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',
    checklist JSONB DEFAULT '[]',
    attachments JSONB DEFAULT '[]',
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES users(id) NOT NULL DEFAULT auth.uid(),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Contact interactions table for tracking outreach history
CREATE TABLE IF NOT EXISTS contact_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES media_contacts(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    subject TEXT,
    message TEXT,
    response TEXT,
    sentiment TEXT,
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES users(id) NOT NULL DEFAULT auth.uid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 3: Create Indexes for Performance
-- ============================================================================

-- Organizations indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_deleted_at ON organizations(deleted_at) WHERE deleted_at IS NULL;

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_organization_deleted ON users(organization_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Teams indexes
CREATE INDEX IF NOT EXISTS idx_teams_organization ON teams(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);

-- Campaigns indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_organization_status ON campaigns(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_campaigns_owner ON campaigns(owner_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(start_date, end_date);

-- Content indexes
CREATE INDEX IF NOT EXISTS idx_content_organization_status ON content_items(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_content_campaign ON content_items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_content_author ON content_items(author_id);
CREATE INDEX IF NOT EXISTS idx_content_scheduled ON content_items(scheduled_for) WHERE scheduled_for IS NOT NULL;

-- Press releases indexes
CREATE INDEX IF NOT EXISTS idx_press_releases_organization_status ON press_releases(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_press_releases_campaign ON press_releases(campaign_id);
CREATE INDEX IF NOT EXISTS idx_press_releases_embargo ON press_releases(embargo_until) WHERE embargo_until IS NOT NULL;

-- Media contacts indexes
CREATE INDEX IF NOT EXISTS idx_media_contacts_organization_status ON media_contacts(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_media_contacts_tier ON media_contacts(tier);
CREATE INDEX IF NOT EXISTS idx_media_contacts_email ON media_contacts(email);

-- SEO audits indexes
CREATE INDEX IF NOT EXISTS idx_seo_audits_organization ON seo_audits(organization_id);
CREATE INDEX IF NOT EXISTS idx_seo_audits_content ON seo_audits(content_id);
CREATE INDEX IF NOT EXISTS idx_seo_audits_date ON seo_audits(audited_at);

-- Strategy plans indexes
CREATE INDEX IF NOT EXISTS idx_strategy_plans_organization_status ON strategy_plans(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_strategy_plans_owner ON strategy_plans(owner_id);

-- Style guides indexes
CREATE INDEX IF NOT EXISTS idx_style_guides_organization ON style_guides(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_style_guides_default ON style_guides(organization_id, is_default) WHERE is_default = TRUE;

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_organization_status ON tasks(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_campaign ON tasks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;

-- Agent tasks indexes
CREATE INDEX IF NOT EXISTS idx_agent_tasks_organization_status ON agent_tasks(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_type ON agent_tasks(type);

-- Contact interactions indexes
CREATE INDEX IF NOT EXISTS idx_contact_interactions_contact ON contact_interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_interactions_organization ON contact_interactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_contact_interactions_campaign ON contact_interactions(campaign_id);

-- ============================================================================
-- PART 4: Update Triggers for updated_at and updated_by
-- ============================================================================

-- Function to update updated_at and updated_by
CREATE OR REPLACE FUNCTION update_modified_columns()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at/updated_by
DROP TRIGGER IF EXISTS update_organizations_modified ON organizations;
CREATE TRIGGER update_organizations_modified BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_modified_columns();

DROP TRIGGER IF EXISTS update_users_modified ON users;
CREATE TRIGGER update_users_modified BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_modified_columns();

DROP TRIGGER IF EXISTS update_teams_modified ON teams;
CREATE TRIGGER update_teams_modified BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_modified_columns();

DROP TRIGGER IF EXISTS update_campaigns_modified ON campaigns;
CREATE TRIGGER update_campaigns_modified BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_modified_columns();

DROP TRIGGER IF EXISTS update_content_items_modified ON content_items;
CREATE TRIGGER update_content_items_modified BEFORE UPDATE ON content_items FOR EACH ROW EXECUTE FUNCTION update_modified_columns();

DROP TRIGGER IF EXISTS update_press_releases_modified ON press_releases;
CREATE TRIGGER update_press_releases_modified BEFORE UPDATE ON press_releases FOR EACH ROW EXECUTE FUNCTION update_modified_columns();

DROP TRIGGER IF EXISTS update_media_contacts_modified ON media_contacts;
CREATE TRIGGER update_media_contacts_modified BEFORE UPDATE ON media_contacts FOR EACH ROW EXECUTE FUNCTION update_modified_columns();

DROP TRIGGER IF EXISTS update_keywords_modified ON keywords;
CREATE TRIGGER update_keywords_modified BEFORE UPDATE ON keywords FOR EACH ROW EXECUTE FUNCTION update_modified_columns();

DROP TRIGGER IF EXISTS update_keyword_clusters_modified ON keyword_clusters;
CREATE TRIGGER update_keyword_clusters_modified BEFORE UPDATE ON keyword_clusters FOR EACH ROW EXECUTE FUNCTION update_modified_columns();

DROP TRIGGER IF EXISTS update_agent_tasks_modified ON agent_tasks;
CREATE TRIGGER update_agent_tasks_modified BEFORE UPDATE ON agent_tasks FOR EACH ROW EXECUTE FUNCTION update_modified_columns();

DROP TRIGGER IF EXISTS update_strategies_modified ON strategies;
CREATE TRIGGER update_strategies_modified BEFORE UPDATE ON strategies FOR EACH ROW EXECUTE FUNCTION update_modified_columns();

DROP TRIGGER IF EXISTS update_strategy_plans_modified ON strategy_plans;
CREATE TRIGGER update_strategy_plans_modified BEFORE UPDATE ON strategy_plans FOR EACH ROW EXECUTE FUNCTION update_modified_columns();

DROP TRIGGER IF EXISTS update_style_guides_modified ON style_guides;
CREATE TRIGGER update_style_guides_modified BEFORE UPDATE ON style_guides FOR EACH ROW EXECUTE FUNCTION update_modified_columns();

DROP TRIGGER IF EXISTS update_tasks_modified ON tasks;
CREATE TRIGGER update_tasks_modified BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_modified_columns();

DROP TRIGGER IF EXISTS update_custom_roles_modified ON custom_roles;
CREATE TRIGGER update_custom_roles_modified BEFORE UPDATE ON custom_roles FOR EACH ROW EXECUTE FUNCTION update_modified_columns();

-- ============================================================================
-- PART 5: Enhanced RLS Policies
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE press_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_interactions ENABLE ROW LEVEL SECURITY;

-- Teams policies
CREATE POLICY "Users can view teams in their organization" ON teams FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()) AND deleted_at IS NULL
);

CREATE POLICY "Managers can create teams" ON teams FOR INSERT WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM users
        WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER')
    )
);

CREATE POLICY "Managers can update teams" ON teams FOR UPDATE USING (
    organization_id IN (
        SELECT organization_id FROM users
        WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER')
    )
);

-- Team members policies
CREATE POLICY "Users can view team members in their organization" ON team_members FOR SELECT USING (
    team_id IN (
        SELECT id FROM teams WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    )
);

-- Press releases policies
CREATE POLICY "Users can view press releases in their organization" ON press_releases FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()) AND deleted_at IS NULL
);

CREATE POLICY "Contributors can create press releases" ON press_releases FOR INSERT WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM users
        WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER', 'CONTRIBUTOR')
    )
);

CREATE POLICY "Contributors can update their press releases" ON press_releases FOR UPDATE USING (
    created_by = auth.uid() OR
    organization_id IN (
        SELECT organization_id FROM users
        WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER')
    )
);

-- SEO audits policies
CREATE POLICY "Users can view SEO audits in their organization" ON seo_audits FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
);

-- Strategy plans policies
CREATE POLICY "Users can view strategy plans in their organization" ON strategy_plans FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()) AND deleted_at IS NULL
);

CREATE POLICY "Managers can create strategy plans" ON strategy_plans FOR INSERT WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM users
        WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER')
    )
);

-- Style guides policies
CREATE POLICY "Users can view style guides in their organization" ON style_guides FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()) AND deleted_at IS NULL
);

CREATE POLICY "Managers can manage style guides" ON style_guides FOR ALL USING (
    organization_id IN (
        SELECT organization_id FROM users
        WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER')
    )
);

-- Tasks policies
CREATE POLICY "Users can view tasks in their organization" ON tasks FOR SELECT USING (
    (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()) AND deleted_at IS NULL)
    OR assignee_id = auth.uid()
);

CREATE POLICY "Users can create tasks" ON tasks FOR INSERT WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM users
        WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER', 'CONTRIBUTOR')
    )
);

CREATE POLICY "Users can update assigned tasks" ON tasks FOR UPDATE USING (
    assignee_id = auth.uid() OR created_by = auth.uid() OR
    organization_id IN (
        SELECT organization_id FROM users
        WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER')
    )
);

-- Contact interactions policies
CREATE POLICY "Users can view contact interactions in their organization" ON contact_interactions FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "Users can log contact interactions" ON contact_interactions FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
);

-- Accounts policies (users can only see their own accounts)
CREATE POLICY "Users can view their own accounts" ON accounts FOR SELECT USING (
    user_id = auth.uid()
);

-- Custom roles policies
CREATE POLICY "Users can view custom roles in their organization" ON custom_roles FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()) AND deleted_at IS NULL
);

CREATE POLICY "Admins can manage custom roles" ON custom_roles FOR ALL USING (
    organization_id IN (
        SELECT organization_id FROM users
        WHERE id = auth.uid() AND role = 'ADMIN'
    )
);
