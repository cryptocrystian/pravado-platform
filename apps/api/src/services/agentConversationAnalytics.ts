// =====================================================
// AGENT CONVERSATION ANALYTICS SERVICE
// Sprint 47 Phase 4.3
// =====================================================
//
// Purpose: Analytics and insights for agent-user conversations
// Provides: Summary metrics, sentiment trends, topic distribution, engagement, resolution
//

import { pool } from '../database/db';

// =====================================================
// TYPES
// =====================================================

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface ConversationSummary {
  totalConversations: number;
  totalMessages: number;
  avgMessagesPerConversation: number;
  avgConversationLength: number; // in minutes
  avgResponseTime: number; // in milliseconds
  activeConversations: number;
  completedConversations: number;
  dateRange: DateRange;
}

export interface SentimentDataPoint {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
  mixed: number;
  total: number;
}

export interface TopicData {
  topic: string;
  count: number;
  percentage: number;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface EngagementMetrics {
  avgAgentResponseTime: number; // ms
  avgUserResponseTime: number; // ms
  avgMessagesPerConversation: number;
  agentUserMessageRatio: number;
  avgTypingTime: number; // ms (estimated)
  peakActivityHours: Array<{ hour: number; messageCount: number }>;
}

export interface ResolutionOutcomes {
  resolved: number;
  escalated: number;
  abandoned: number;
  inProgress: number;
  total: number;
  resolutionRate: number;
  avgTimeToResolution: number; // minutes
}

// =====================================================
// SERVICE CLASS
// =====================================================

class AgentConversationAnalyticsService {
  /**
   * Get conversation summary statistics
   */
  async getConversationSummary(
    agentId: string,
    dateRange?: DateRange,
    organizationId?: string
  ): Promise<ConversationSummary> {
    const startDate = dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const endDate = dateRange?.endDate || new Date();

    // Get conversation counts and message stats
    const statsQuery = `
      SELECT
        COUNT(DISTINCT c.id) as total_conversations,
        COUNT(m.id) as total_messages,
        AVG(c.message_count) as avg_messages_per_conversation,
        COUNT(CASE WHEN c.status = 'active' THEN 1 END) as active_conversations,
        COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_conversations
      FROM agent_conversations c
      LEFT JOIN agent_messages m ON m.conversation_id = c.id
      WHERE c.agent_id = $1
        AND c.created_at >= $2
        AND c.created_at <= $3
        ${organizationId ? 'AND c.organization_id = $4' : ''}
    `;

    const statsParams = organizationId
      ? [agentId, startDate, endDate, organizationId]
      : [agentId, startDate, endDate];

    const statsResult = await pool.query(statsQuery, statsParams);
    const stats = statsResult.rows[0];

    // Get average conversation length (time between first and last message)
    const lengthQuery = `
      SELECT
        AVG(EXTRACT(EPOCH FROM (c.updated_at - c.created_at)) / 60) as avg_length_minutes
      FROM agent_conversations c
      WHERE c.agent_id = $1
        AND c.created_at >= $2
        AND c.created_at <= $3
        AND c.message_count > 1
        ${organizationId ? 'AND c.organization_id = $4' : ''}
    `;

    const lengthResult = await pool.query(lengthQuery, statsParams);

    // Get average response time (time between user message and agent response)
    const responseTimeQuery = `
      SELECT
        AVG(
          EXTRACT(EPOCH FROM (
            agent_msg.created_at - user_msg.created_at
          )) * 1000
        ) as avg_response_time_ms
      FROM user_agent_turns t
      JOIN agent_messages user_msg ON user_msg.id = t.user_message_id
      JOIN agent_messages agent_msg ON agent_msg.id = t.agent_message_id
      JOIN agent_conversations c ON c.id = t.conversation_id
      WHERE c.agent_id = $1
        AND t.created_at >= $2
        AND t.created_at <= $3
        ${organizationId ? 'AND c.organization_id = $4' : ''}
    `;

    const responseTimeResult = await pool.query(responseTimeQuery, statsParams);

    return {
      totalConversations: parseInt(stats.total_conversations) || 0,
      totalMessages: parseInt(stats.total_messages) || 0,
      avgMessagesPerConversation: parseFloat(stats.avg_messages_per_conversation) || 0,
      avgConversationLength: parseFloat(lengthResult.rows[0]?.avg_length_minutes) || 0,
      avgResponseTime: parseFloat(responseTimeResult.rows[0]?.avg_response_time_ms) || 0,
      activeConversations: parseInt(stats.active_conversations) || 0,
      completedConversations: parseInt(stats.completed_conversations) || 0,
      dateRange: { startDate, endDate },
    };
  }

  /**
   * Get sentiment trends over time
   */
  async getSentimentTrends(
    agentId: string,
    interval: 'daily' | 'weekly' | 'monthly' = 'daily',
    dateRange?: DateRange,
    organizationId?: string
  ): Promise<SentimentDataPoint[]> {
    const startDate = dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateRange?.endDate || new Date();

    // Determine date truncation based on interval
    const dateTrunc = interval === 'monthly' ? 'month' : interval === 'weekly' ? 'week' : 'day';

    const query = `
      SELECT
        DATE_TRUNC($1, m.created_at) as date,
        COUNT(CASE WHEN m.metadata->>'sentiment' = 'positive' THEN 1 END) as positive,
        COUNT(CASE WHEN m.metadata->>'sentiment' = 'neutral' THEN 1 END) as neutral,
        COUNT(CASE WHEN m.metadata->>'sentiment' = 'negative' THEN 1 END) as negative,
        COUNT(CASE WHEN m.metadata->>'sentiment' = 'mixed' THEN 1 END) as mixed,
        COUNT(*) as total
      FROM agent_messages m
      JOIN agent_conversations c ON c.id = m.conversation_id
      WHERE c.agent_id = $2
        AND m.created_at >= $3
        AND m.created_at <= $4
        AND m.sender_type = 'agent'
        ${organizationId ? 'AND c.organization_id = $5' : ''}
      GROUP BY DATE_TRUNC($1, m.created_at)
      ORDER BY date ASC
    `;

    const params = organizationId
      ? [dateTrunc, agentId, startDate, endDate, organizationId]
      : [dateTrunc, agentId, startDate, endDate];

    const result = await pool.query(query, params);

    return result.rows.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      positive: parseInt(row.positive) || 0,
      neutral: parseInt(row.neutral) || 0,
      negative: parseInt(row.negative) || 0,
      mixed: parseInt(row.mixed) || 0,
      total: parseInt(row.total) || 0,
    }));
  }

  /**
   * Get topic distribution from conversations
   */
  async getTopicDistribution(
    agentId: string,
    dateRange?: DateRange,
    limit: number = 20,
    organizationId?: string
  ): Promise<TopicData[]> {
    const startDate = dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateRange?.endDate || new Date();

    // Extract topics from message metadata
    const query = `
      WITH topic_counts AS (
        SELECT
          jsonb_array_elements_text(m.metadata->'topics') as topic,
          m.metadata->>'sentiment' as sentiment
        FROM agent_messages m
        JOIN agent_conversations c ON c.id = m.conversation_id
        WHERE c.agent_id = $1
          AND m.created_at >= $2
          AND m.created_at <= $3
          AND m.metadata ? 'topics'
          ${organizationId ? 'AND c.organization_id = $4' : ''}
      ),
      topic_aggregates AS (
        SELECT
          topic,
          COUNT(*) as count,
          COUNT(CASE WHEN sentiment = 'positive' THEN 1 END) as positive,
          COUNT(CASE WHEN sentiment = 'neutral' THEN 1 END) as neutral,
          COUNT(CASE WHEN sentiment = 'negative' THEN 1 END) as negative
        FROM topic_counts
        WHERE topic IS NOT NULL AND topic != ''
        GROUP BY topic
      ),
      total_count AS (
        SELECT SUM(count) as total FROM topic_aggregates
      )
      SELECT
        ta.topic,
        ta.count,
        ROUND((ta.count::numeric / tc.total::numeric * 100), 2) as percentage,
        ta.positive,
        ta.neutral,
        ta.negative
      FROM topic_aggregates ta, total_count tc
      ORDER BY ta.count DESC
      LIMIT $${organizationId ? 5 : 4}
    `;

    const params = organizationId
      ? [agentId, startDate, endDate, organizationId, limit]
      : [agentId, startDate, endDate, limit];

    const result = await pool.query(query, params);

    return result.rows.map((row) => ({
      topic: row.topic,
      count: parseInt(row.count) || 0,
      percentage: parseFloat(row.percentage) || 0,
      sentiment: {
        positive: parseInt(row.positive) || 0,
        neutral: parseInt(row.neutral) || 0,
        negative: parseInt(row.negative) || 0,
      },
    }));
  }

  /**
   * Get engagement metrics
   */
  async getEngagementMetrics(
    agentId: string,
    dateRange?: DateRange,
    organizationId?: string
  ): Promise<EngagementMetrics> {
    const startDate = dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateRange?.endDate || new Date();

    const params = organizationId
      ? [agentId, startDate, endDate, organizationId]
      : [agentId, startDate, endDate];

    // Get response times
    const responseTimeQuery = `
      SELECT
        AVG(
          CASE WHEN user_msg.sender_type = 'user'
          THEN EXTRACT(EPOCH FROM (agent_msg.created_at - user_msg.created_at)) * 1000
          END
        ) as avg_agent_response_time_ms,
        AVG(
          CASE WHEN prev_msg.sender_type = 'agent'
          THEN EXTRACT(EPOCH FROM (user_msg.created_at - prev_msg.created_at)) * 1000
          END
        ) as avg_user_response_time_ms
      FROM user_agent_turns t
      JOIN agent_messages user_msg ON user_msg.id = t.user_message_id
      JOIN agent_messages agent_msg ON agent_msg.id = t.agent_message_id
      LEFT JOIN agent_messages prev_msg ON prev_msg.conversation_id = t.conversation_id
        AND prev_msg.created_at < user_msg.created_at
      JOIN agent_conversations c ON c.id = t.conversation_id
      WHERE c.agent_id = $1
        AND t.created_at >= $2
        AND t.created_at <= $3
        ${organizationId ? 'AND c.organization_id = $4' : ''}
    `;

    const responseTimeResult = await pool.query(responseTimeQuery, params);

    // Get message counts and ratio
    const messageRatioQuery = `
      SELECT
        COUNT(CASE WHEN m.sender_type = 'agent' THEN 1 END) as agent_messages,
        COUNT(CASE WHEN m.sender_type = 'user' THEN 1 END) as user_messages,
        COUNT(DISTINCT m.conversation_id) as conversation_count
      FROM agent_messages m
      JOIN agent_conversations c ON c.id = m.conversation_id
      WHERE c.agent_id = $1
        AND m.created_at >= $2
        AND m.created_at <= $3
        ${organizationId ? 'AND c.organization_id = $4' : ''}
    `;

    const messageRatioResult = await pool.query(messageRatioQuery, params);
    const ratioData = messageRatioResult.rows[0];

    const agentMessages = parseInt(ratioData.agent_messages) || 0;
    const userMessages = parseInt(ratioData.user_messages) || 0;
    const conversationCount = parseInt(ratioData.conversation_count) || 1;

    // Get peak activity hours
    const peakHoursQuery = `
      SELECT
        EXTRACT(HOUR FROM m.created_at) as hour,
        COUNT(*) as message_count
      FROM agent_messages m
      JOIN agent_conversations c ON c.id = m.conversation_id
      WHERE c.agent_id = $1
        AND m.created_at >= $2
        AND m.created_at <= $3
        ${organizationId ? 'AND c.organization_id = $4' : ''}
      GROUP BY EXTRACT(HOUR FROM m.created_at)
      ORDER BY message_count DESC
      LIMIT 5
    `;

    const peakHoursResult = await pool.query(peakHoursQuery, params);

    return {
      avgAgentResponseTime: parseFloat(responseTimeResult.rows[0]?.avg_agent_response_time_ms) || 0,
      avgUserResponseTime: parseFloat(responseTimeResult.rows[0]?.avg_user_response_time_ms) || 0,
      avgMessagesPerConversation: (agentMessages + userMessages) / conversationCount,
      agentUserMessageRatio: userMessages > 0 ? agentMessages / userMessages : 0,
      avgTypingTime: parseFloat(responseTimeResult.rows[0]?.avg_agent_response_time_ms) * 0.3 || 0, // Estimate: 30% of response time
      peakActivityHours: peakHoursResult.rows.map((row) => ({
        hour: parseInt(row.hour),
        messageCount: parseInt(row.message_count),
      })),
    };
  }

  /**
   * Get resolution outcomes
   */
  async getResolutionOutcomes(
    agentId: string,
    dateRange?: DateRange,
    organizationId?: string
  ): Promise<ResolutionOutcomes> {
    const startDate = dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateRange?.endDate || new Date();

    // Get conversation status counts
    const statusQuery = `
      SELECT
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as resolved,
        COUNT(CASE WHEN status = 'archived' AND message_count < 3 THEN 1 END) as abandoned,
        COUNT(CASE WHEN status = 'active' OR status = 'paused' THEN 1 END) as in_progress,
        COUNT(*) as total,
        AVG(
          CASE WHEN status = 'completed'
          THEN EXTRACT(EPOCH FROM (updated_at - created_at)) / 60
          END
        ) as avg_time_to_resolution_minutes
      FROM agent_conversations
      WHERE agent_id = $1
        AND created_at >= $2
        AND created_at <= $3
        ${organizationId ? 'AND organization_id = $4' : ''}
    `;

    const params = organizationId
      ? [agentId, startDate, endDate, organizationId]
      : [agentId, startDate, endDate];

    const result = await pool.query(statusQuery, params);
    const data = result.rows[0];

    const resolved = parseInt(data.resolved) || 0;
    const abandoned = parseInt(data.abandoned) || 0;
    const inProgress = parseInt(data.in_progress) || 0;
    const total = parseInt(data.total) || 1;

    // Escalated conversations: those with negative sentiment or unresolved after long time
    const escalatedQuery = `
      SELECT COUNT(*) as escalated
      FROM agent_conversations c
      WHERE c.agent_id = $1
        AND c.created_at >= $2
        AND c.created_at <= $3
        AND (
          c.status = 'archived'
          AND c.message_count >= 3
          AND c.message_count < 10
          AND EXISTS (
            SELECT 1 FROM agent_messages m
            WHERE m.conversation_id = c.id
              AND m.metadata->>'sentiment' = 'negative'
            LIMIT 1
          )
        )
        ${organizationId ? 'AND c.organization_id = $4' : ''}
    `;

    const escalatedResult = await pool.query(escalatedQuery, params);
    const escalated = parseInt(escalatedResult.rows[0]?.escalated) || 0;

    return {
      resolved,
      escalated,
      abandoned,
      inProgress,
      total,
      resolutionRate: total > 0 ? (resolved / total) * 100 : 0,
      avgTimeToResolution: parseFloat(data.avg_time_to_resolution_minutes) || 0,
    };
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

export const agentConversationAnalytics = new AgentConversationAnalyticsService();
export default agentConversationAnalytics;
