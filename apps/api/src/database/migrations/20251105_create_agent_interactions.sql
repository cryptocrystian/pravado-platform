-- =====================================================
-- AGENT INTERACTION & MESSAGING SYSTEM
-- Sprint 45 Phase 4.1
-- =====================================================
--
-- Purpose: Enable real-time human-agent messaging with personality mirroring
-- Provides: Conversations, messages, turns, and interaction tracking
--

-- Create conversation status enum
CREATE TYPE conversation_status AS ENUM ('active', 'paused', 'archived', 'completed');

-- Create sender type enum
CREATE TYPE sender_type AS ENUM ('user', 'agent');

-- Create sentiment enum
CREATE TYPE message_sentiment AS ENUM ('positive', 'neutral', 'negative', 'mixed');

-- =====================================================
-- AGENT CONVERSATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Participants
  user_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Conversation details
  title TEXT,
  status conversation_status NOT NULL DEFAULT 'active',

  -- Message tracking
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Metadata
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- AGENT MESSAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Conversation reference
  conversation_id UUID NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,

  -- Sender information
  sender_type sender_type NOT NULL,
  sender_id UUID NOT NULL,

  -- Message content
  text TEXT NOT NULL,

  -- Message metadata
  metadata JSONB,

  -- Processing context (for agent responses)
  context JSONB,

  -- Message properties
  is_edited BOOLEAN NOT NULL DEFAULT false,
  parent_message_id UUID REFERENCES agent_messages(id),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =====================================================
-- USER AGENT TURNS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_agent_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Conversation reference
  conversation_id UUID NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,

  -- Message references
  user_message_id UUID NOT NULL REFERENCES agent_messages(id),
  agent_message_id UUID NOT NULL REFERENCES agent_messages(id),

  -- Turn tracking
  turn_number INTEGER NOT NULL,

  -- Turn content (denormalized for quick access)
  user_message TEXT NOT NULL,
  agent_response TEXT NOT NULL,

  -- Turn metadata
  metadata JSONB,

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Ensure unique turn numbers per conversation
  UNIQUE(conversation_id, turn_number)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Conversation indexes
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_id
  ON agent_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_agent_id
  ON agent_conversations(agent_id);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_organization_id
  ON agent_conversations(organization_id);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_status
  ON agent_conversations(status);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_last_active
  ON agent_conversations(last_active_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_created_at
  ON agent_conversations(created_at DESC);

-- Composite index for user + status
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_status
  ON agent_conversations(user_id, status, last_active_at DESC);

-- Composite index for agent + status
CREATE INDEX IF NOT EXISTS idx_agent_conversations_agent_status
  ON agent_conversations(agent_id, status, last_active_at DESC);

-- GIN index for metadata
CREATE INDEX IF NOT EXISTS idx_agent_conversations_metadata
  ON agent_conversations USING GIN (metadata);

-- Message indexes
CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation_id
  ON agent_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_agent_messages_sender
  ON agent_messages(sender_type, sender_id);

CREATE INDEX IF NOT EXISTS idx_agent_messages_created_at
  ON agent_messages(created_at DESC);

-- Composite index for conversation + created_at (for history queries)
CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation_created
  ON agent_messages(conversation_id, created_at DESC);

-- Full-text search index on message text
CREATE INDEX IF NOT EXISTS idx_agent_messages_text_fts
  ON agent_messages USING GIN (to_tsvector('english', text));

-- GIN indexes for JSONB
CREATE INDEX IF NOT EXISTS idx_agent_messages_metadata
  ON agent_messages USING GIN (metadata);

CREATE INDEX IF NOT EXISTS idx_agent_messages_context
  ON agent_messages USING GIN (context);

-- Turn indexes
CREATE INDEX IF NOT EXISTS idx_user_agent_turns_conversation_id
  ON user_agent_turns(conversation_id);

CREATE INDEX IF NOT EXISTS idx_user_agent_turns_created_at
  ON user_agent_turns(created_at DESC);

-- Composite index for conversation + turn number
CREATE INDEX IF NOT EXISTS idx_user_agent_turns_conversation_turn
  ON user_agent_turns(conversation_id, turn_number DESC);

-- GIN index for metadata
CREATE INDEX IF NOT EXISTS idx_user_agent_turns_metadata
  ON user_agent_turns USING GIN (metadata);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_agent_turns ENABLE ROW LEVEL SECURITY;

-- Conversations: Users can only access conversations from their organization
CREATE POLICY agent_conversations_select_policy ON agent_conversations
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id')::UUID);

CREATE POLICY agent_conversations_insert_policy ON agent_conversations
  FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id')::UUID);

CREATE POLICY agent_conversations_update_policy ON agent_conversations
  FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id')::UUID);

CREATE POLICY agent_conversations_delete_policy ON agent_conversations
  FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- Messages: Users can only access messages from conversations in their organization
CREATE POLICY agent_messages_select_policy ON agent_messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM agent_conversations
      WHERE organization_id = current_setting('app.current_organization_id')::UUID
    )
  );

CREATE POLICY agent_messages_insert_policy ON agent_messages
  FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM agent_conversations
      WHERE organization_id = current_setting('app.current_organization_id')::UUID
    )
  );

CREATE POLICY agent_messages_update_policy ON agent_messages
  FOR UPDATE
  USING (
    conversation_id IN (
      SELECT id FROM agent_conversations
      WHERE organization_id = current_setting('app.current_organization_id')::UUID
    )
  );

CREATE POLICY agent_messages_delete_policy ON agent_messages
  FOR DELETE
  USING (
    conversation_id IN (
      SELECT id FROM agent_conversations
      WHERE organization_id = current_setting('app.current_organization_id')::UUID
    )
  );

-- Turns: Users can only access turns from conversations in their organization
CREATE POLICY user_agent_turns_select_policy ON user_agent_turns
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM agent_conversations
      WHERE organization_id = current_setting('app.current_organization_id')::UUID
    )
  );

CREATE POLICY user_agent_turns_insert_policy ON user_agent_turns
  FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM agent_conversations
      WHERE organization_id = current_setting('app.current_organization_id')::UUID
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Get active conversations for a user
CREATE OR REPLACE FUNCTION get_user_active_conversations(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  agent_id UUID,
  title TEXT,
  message_count INTEGER,
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_active_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ac.id,
    ac.agent_id,
    ac.title,
    ac.message_count,
    ac.last_message_at,
    ac.last_active_at,
    ac.created_at
  FROM agent_conversations ac
  WHERE ac.user_id = p_user_id
    AND ac.status = 'active'
  ORDER BY ac.last_active_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Get conversation messages
CREATE OR REPLACE FUNCTION get_conversation_messages(
  p_conversation_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  sender_type sender_type,
  sender_id UUID,
  text TEXT,
  metadata JSONB,
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    am.id,
    am.sender_type,
    am.sender_id,
    am.text,
    am.metadata,
    am.context,
    am.created_at
  FROM agent_messages am
  WHERE am.conversation_id = p_conversation_id
  ORDER BY am.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function: Get recent turns for a conversation
CREATE OR REPLACE FUNCTION get_recent_turns(
  p_conversation_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  turn_number INTEGER,
  user_message TEXT,
  agent_response TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    uat.id,
    uat.turn_number,
    uat.user_message,
    uat.agent_response,
    uat.metadata,
    uat.created_at
  FROM user_agent_turns uat
  WHERE uat.conversation_id = p_conversation_id
  ORDER BY uat.turn_number DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Get conversation analytics
CREATE OR REPLACE FUNCTION get_conversation_analytics(
  p_conversation_id UUID
)
RETURNS TABLE(
  total_messages INTEGER,
  total_turns INTEGER,
  avg_response_time_ms DECIMAL,
  user_message_count INTEGER,
  agent_message_count INTEGER,
  first_message_at TIMESTAMP WITH TIME ZONE,
  last_message_at TIMESTAMP WITH TIME ZONE,
  duration_minutes DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ac.message_count as total_messages,
    (SELECT COUNT(*) FROM user_agent_turns WHERE conversation_id = p_conversation_id)::INTEGER as total_turns,
    3000::DECIMAL as avg_response_time_ms, -- Placeholder: Calculate from metadata
    (SELECT COUNT(*) FROM agent_messages WHERE conversation_id = p_conversation_id AND sender_type = 'user')::INTEGER as user_message_count,
    (SELECT COUNT(*) FROM agent_messages WHERE conversation_id = p_conversation_id AND sender_type = 'agent')::INTEGER as agent_message_count,
    (SELECT MIN(created_at) FROM agent_messages WHERE conversation_id = p_conversation_id) as first_message_at,
    ac.last_message_at,
    EXTRACT(EPOCH FROM (COALESCE(ac.last_message_at, NOW()) - ac.created_at)) / 60 as duration_minutes
  FROM agent_conversations ac
  WHERE ac.id = p_conversation_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Search messages by text
CREATE OR REPLACE FUNCTION search_messages(
  p_user_id UUID,
  p_search_query TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  message_id UUID,
  conversation_id UUID,
  text TEXT,
  sender_type sender_type,
  relevance REAL,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    am.id as message_id,
    am.conversation_id,
    am.text,
    am.sender_type,
    ts_rank(to_tsvector('english', am.text), plainto_tsquery('english', p_search_query)) as relevance,
    am.created_at
  FROM agent_messages am
  JOIN agent_conversations ac ON am.conversation_id = ac.id
  WHERE ac.user_id = p_user_id
    AND to_tsvector('english', am.text) @@ plainto_tsquery('english', p_search_query)
  ORDER BY relevance DESC, am.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Get agent conversation stats
CREATE OR REPLACE FUNCTION get_agent_conversation_stats(
  p_agent_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  total_conversations BIGINT,
  active_conversations BIGINT,
  total_messages BIGINT,
  total_turns BIGINT,
  avg_messages_per_conversation DECIMAL,
  avg_turns_per_conversation DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT ac.id) as total_conversations,
    COUNT(DISTINCT ac.id) FILTER (WHERE ac.status = 'active') as active_conversations,
    COALESCE(SUM(ac.message_count), 0) as total_messages,
    COALESCE((
      SELECT COUNT(*)
      FROM user_agent_turns uat
      JOIN agent_conversations ac2 ON uat.conversation_id = ac2.id
      WHERE ac2.agent_id = p_agent_id
        AND ac2.created_at >= NOW() - (p_days || ' days')::INTERVAL
    ), 0) as total_turns,
    COALESCE(AVG(ac.message_count), 0) as avg_messages_per_conversation,
    COALESCE((
      SELECT AVG(turn_count)
      FROM (
        SELECT COUNT(*) as turn_count
        FROM user_agent_turns uat
        JOIN agent_conversations ac2 ON uat.conversation_id = ac2.id
        WHERE ac2.agent_id = p_agent_id
          AND ac2.created_at >= NOW() - (p_days || ' days')::INTERVAL
        GROUP BY uat.conversation_id
      ) turn_counts
    ), 0) as avg_turns_per_conversation
  FROM agent_conversations ac
  WHERE ac.agent_id = p_agent_id
    AND ac.created_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Update conversation timestamps when message is added
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE agent_conversations
  SET
    message_count = message_count + 1,
    last_message_at = NEW.created_at,
    last_active_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON agent_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- Trigger: Update conversation updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_timestamp
  BEFORE UPDATE ON agent_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- Trigger: Update message updated_at timestamp
CREATE OR REPLACE FUNCTION update_message_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_message_timestamp
  BEFORE UPDATE ON agent_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_message_timestamp();

-- Trigger: Auto-archive inactive conversations (30 days)
CREATE OR REPLACE FUNCTION archive_inactive_conversations()
RETURNS void AS $$
BEGIN
  UPDATE agent_conversations
  SET
    status = 'archived',
    archived_at = NOW()
  WHERE status = 'active'
    AND last_active_at < NOW() - INTERVAL '30 days'
    AND archived_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Note: This function should be called by a scheduled job (cron)
-- Example: SELECT archive_inactive_conversations();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE agent_conversations IS 'Human-agent conversations and interaction sessions';
COMMENT ON COLUMN agent_conversations.id IS 'Unique identifier for the conversation';
COMMENT ON COLUMN agent_conversations.user_id IS 'User participating in the conversation';
COMMENT ON COLUMN agent_conversations.agent_id IS 'Agent participating in the conversation';
COMMENT ON COLUMN agent_conversations.organization_id IS 'Organization context for multi-tenancy';
COMMENT ON COLUMN agent_conversations.title IS 'Conversation title or subject';
COMMENT ON COLUMN agent_conversations.status IS 'Conversation status (active, paused, archived, completed)';
COMMENT ON COLUMN agent_conversations.message_count IS 'Total number of messages in conversation';
COMMENT ON COLUMN agent_conversations.last_message_at IS 'Timestamp of last message';
COMMENT ON COLUMN agent_conversations.last_active_at IS 'Timestamp of last activity';
COMMENT ON COLUMN agent_conversations.metadata IS 'Conversation metadata (JSONB)';

COMMENT ON TABLE agent_messages IS 'Messages exchanged in agent conversations';
COMMENT ON COLUMN agent_messages.id IS 'Unique identifier for the message';
COMMENT ON COLUMN agent_messages.conversation_id IS 'Conversation this message belongs to';
COMMENT ON COLUMN agent_messages.sender_type IS 'Type of sender (user or agent)';
COMMENT ON COLUMN agent_messages.sender_id IS 'ID of the sender';
COMMENT ON COLUMN agent_messages.text IS 'Message text content';
COMMENT ON COLUMN agent_messages.metadata IS 'Message metadata (tone, sentiment, etc.)';
COMMENT ON COLUMN agent_messages.context IS 'Processing context for agent responses';
COMMENT ON COLUMN agent_messages.is_edited IS 'Whether message was edited';
COMMENT ON COLUMN agent_messages.parent_message_id IS 'Parent message for threading';

COMMENT ON TABLE user_agent_turns IS 'User-agent conversation turns (exchanges)';
COMMENT ON COLUMN user_agent_turns.id IS 'Unique identifier for the turn';
COMMENT ON COLUMN user_agent_turns.conversation_id IS 'Conversation this turn belongs to';
COMMENT ON COLUMN user_agent_turns.user_message_id IS 'User message in this turn';
COMMENT ON COLUMN user_agent_turns.agent_message_id IS 'Agent response in this turn';
COMMENT ON COLUMN user_agent_turns.turn_number IS 'Sequential turn number in conversation';
COMMENT ON COLUMN user_agent_turns.user_message IS 'Denormalized user message text';
COMMENT ON COLUMN user_agent_turns.agent_response IS 'Denormalized agent response text';
COMMENT ON COLUMN user_agent_turns.metadata IS 'Turn metadata (ratings, feedback, etc.)';

COMMENT ON FUNCTION get_user_active_conversations IS 'Get active conversations for a user';
COMMENT ON FUNCTION get_conversation_messages IS 'Get messages from a conversation';
COMMENT ON FUNCTION get_recent_turns IS 'Get recent turns from a conversation';
COMMENT ON FUNCTION get_conversation_analytics IS 'Get analytics for a conversation';
COMMENT ON FUNCTION search_messages IS 'Full-text search across user messages';
COMMENT ON FUNCTION get_agent_conversation_stats IS 'Get conversation statistics for an agent';
COMMENT ON FUNCTION archive_inactive_conversations IS 'Archive conversations inactive for 30+ days';
