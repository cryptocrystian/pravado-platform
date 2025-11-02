-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for additional cryptographic functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create custom types/enums
CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER', 'CONTRIBUTOR', 'VIEWER');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
CREATE TYPE campaign_status AS ENUM ('DRAFT', 'PLANNING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');
CREATE TYPE campaign_type AS ENUM ('PR', 'CONTENT', 'SEO', 'INTEGRATED');
CREATE TYPE content_type AS ENUM ('BLOG_POST', 'PRESS_RELEASE', 'SOCIAL_POST', 'EMAIL', 'LANDING_PAGE', 'VIDEO_SCRIPT', 'WHITEPAPER');
CREATE TYPE content_status AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE agent_type AS ENUM ('CONTENT_GENERATOR', 'SEO_OPTIMIZER', 'OUTREACH_COMPOSER', 'KEYWORD_RESEARCHER', 'STRATEGY_PLANNER', 'COMPETITOR_ANALYZER');
CREATE TYPE agent_task_status AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE agent_priority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    role user_role DEFAULT 'CONTRIBUTOR',
    status user_status DEFAULT 'ACTIVE',
    avatar_url TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns table
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    type campaign_type NOT NULL,
    status campaign_status DEFAULT 'DRAFT',
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    budget NUMERIC(12, 2),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    goals JSONB DEFAULT '[]',
    metrics JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content items table
CREATE TABLE content_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    type content_type NOT NULL,
    status content_status DEFAULT 'DRAFT',
    channels TEXT[] DEFAULT '{}',
    content TEXT NOT NULL,
    summary TEXT,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ,
    scheduled_for TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    seo_data JSONB,
    agent_generated BOOLEAN DEFAULT FALSE,
    agent_task_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media contacts table
CREATE TABLE media_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    outlet TEXT NOT NULL,
    position TEXT NOT NULL,
    tier TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    beats TEXT[] DEFAULT '{}',
    interests TEXT[] DEFAULT '{}',
    timezone TEXT,
    social_profiles JSONB DEFAULT '{}',
    notes TEXT,
    last_contacted_at TIMESTAMPTZ,
    response_rate NUMERIC(5, 2) DEFAULT 0,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keywords table
CREATE TABLE keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keyword TEXT NOT NULL,
    search_volume INTEGER NOT NULL,
    difficulty TEXT NOT NULL,
    intent TEXT NOT NULL,
    cpc NUMERIC(10, 2),
    competition_score NUMERIC(5, 2),
    cluster_id UUID,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keyword clusters table
CREATE TABLE keyword_clusters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    primary_keyword TEXT NOT NULL,
    keywords TEXT[] DEFAULT '{}',
    total_search_volume INTEGER DEFAULT 0,
    average_difficulty TEXT,
    content_gaps JSONB DEFAULT '[]',
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent tasks table
CREATE TABLE agent_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type agent_type NOT NULL,
    status agent_task_status DEFAULT 'QUEUED',
    priority agent_priority DEFAULT 'NORMAL',
    context JSONB NOT NULL,
    output JSONB,
    error JSONB,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    parent_task_id UUID REFERENCES agent_tasks(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    estimated_duration INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent logs table
CREATE TABLE agent_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES agent_tasks(id) ON DELETE CASCADE,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Strategies table
CREATE TABLE strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'DRAFT',
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    objectives JSONB DEFAULT '[]',
    tactics JSONB DEFAULT '[]',
    timeline JSONB DEFAULT '{}',
    budget JSONB,
    performance JSONB DEFAULT '{}',
    agent_generated BOOLEAN DEFAULT FALSE,
    agent_task_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_campaigns_organization ON campaigns(organization_id);
CREATE INDEX idx_campaigns_owner ON campaigns(owner_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_content_items_campaign ON content_items(campaign_id);
CREATE INDEX idx_content_items_author ON content_items(author_id);
CREATE INDEX idx_content_items_status ON content_items(status);
CREATE INDEX idx_media_contacts_organization ON media_contacts(organization_id);
CREATE INDEX idx_keywords_organization ON keywords(organization_id);
CREATE INDEX idx_keywords_cluster ON keywords(cluster_id);
CREATE INDEX idx_keyword_clusters_organization ON keyword_clusters(organization_id);
CREATE INDEX idx_agent_tasks_organization ON agent_tasks(organization_id);
CREATE INDEX idx_agent_tasks_user ON agent_tasks(user_id);
CREATE INDEX idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX idx_agent_logs_task ON agent_logs(task_id);
CREATE INDEX idx_strategies_organization ON strategies(organization_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_items_updated_at BEFORE UPDATE ON content_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_media_contacts_updated_at BEFORE UPDATE ON media_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_keywords_updated_at BEFORE UPDATE ON keywords FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_keyword_clusters_updated_at BEFORE UPDATE ON keyword_clusters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_tasks_updated_at BEFORE UPDATE ON agent_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_strategies_updated_at BEFORE UPDATE ON strategies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (users can access data from their own organization)
CREATE POLICY "Users can view their own organization" ON organizations FOR SELECT USING (id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Users can view users in their organization" ON users FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Users can view campaigns in their organization" ON campaigns FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Users can view content in their organization" ON content_items FOR SELECT USING (campaign_id IN (SELECT id FROM campaigns WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())));
CREATE POLICY "Users can view media contacts in their organization" ON media_contacts FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Users can view keywords in their organization" ON keywords FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Users can view keyword clusters in their organization" ON keyword_clusters FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Users can view agent tasks in their organization" ON agent_tasks FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Users can view agent logs for their organization's tasks" ON agent_logs FOR SELECT USING (task_id IN (SELECT id FROM agent_tasks WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())));
CREATE POLICY "Users can view strategies in their organization" ON strategies FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
