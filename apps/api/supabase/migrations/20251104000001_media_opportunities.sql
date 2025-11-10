-- =====================================================
-- MEDIA OPPORTUNITIES SCHEMA
-- Sprint 67 Track B: Media Opportunity Agent
-- =====================================================

-- Media Opportunities Table
CREATE TABLE IF NOT EXISTS media_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  news_item_id TEXT NOT NULL,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  url TEXT NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  opportunity_score INTEGER NOT NULL CHECK (opportunity_score >= 0 AND opportunity_score <= 100),
  relevance_score INTEGER NOT NULL CHECK (relevance_score >= 0 AND relevance_score <= 100),
  visibility_score INTEGER NOT NULL CHECK (visibility_score >= 0 AND visibility_score <= 100),
  freshness_score INTEGER NOT NULL CHECK (freshness_score >= 0 AND freshness_score <= 100),
  match_reasons TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'REVIEWED', 'ADDED_TO_CAMPAIGN', 'DISMISSED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, news_item_id)
);

-- Indexes
CREATE INDEX idx_media_opportunities_org ON media_opportunities(organization_id);
CREATE INDEX idx_media_opportunities_score ON media_opportunities(opportunity_score DESC);
CREATE INDEX idx_media_opportunities_status ON media_opportunities(status);
CREATE INDEX idx_media_opportunities_published ON media_opportunities(published_at DESC);

-- RLS Policies
ALTER TABLE media_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view opportunities in their organization"
  ON media_opportunities FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id')::UUID);

CREATE POLICY "Users can insert opportunities in their organization"
  ON media_opportunities FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id')::UUID);

CREATE POLICY "Users can update opportunities in their organization"
  ON media_opportunities FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- Updated at trigger
CREATE TRIGGER update_media_opportunities_updated_at
  BEFORE UPDATE ON media_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE media_opportunities IS 'Proactively scanned media opportunities from news feeds';
