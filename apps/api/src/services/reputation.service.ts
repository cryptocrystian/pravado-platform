// =====================================================
// REPUTATION SERVICE
// =====================================================
// Business logic for reputation monitoring and media analysis

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import type {
  MediaMention,
  CreateMentionInput,
  UpdateMentionInput,
  MonitoringRule,
  CreateMonitoringRuleInput,
  UpdateMonitoringRuleInput,
  MentionAlert,
  MentionFeedback,
  SubmitFeedbackInput,
  MonitoringSnapshot,
  MentionSearchParams,
  MentionTrendsResponse,
  MonitoringStats,
  SimilarMention,
} from '@pravado/shared-types';

export class ReputationService {
  // =====================================================
  // MEDIA MENTIONS
  // =====================================================

  /**
   * List media mentions with filters
   */
  async listMentions(
    organizationId: string,
    params: MentionSearchParams
  ): Promise<{ mentions: MediaMention[]; total: number }> {
    try {
      const {
        mentionType,
        medium,
        sentiment,
        minRelevance,
        minVisibility,
        isViral,
        startDate,
        endDate,
        outlet,
        topics,
        searchQuery,
        limit = 50,
        offset = 0,
        sortBy = 'publishedAt',
        sortOrder = 'desc',
      } = params;

      let query = supabase
        .from('media_mentions')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('is_duplicate', false); // Exclude duplicates by default

      // Apply filters
      if (mentionType && mentionType.length > 0) {
        query = query.in('mention_type', mentionType);
      }

      if (medium && medium.length > 0) {
        query = query.in('medium', medium);
      }

      if (sentiment && sentiment.length > 0) {
        query = query.in('sentiment', sentiment);
      }

      if (minRelevance !== undefined) {
        query = query.gte('relevance_score', minRelevance);
      }

      if (minVisibility !== undefined) {
        query = query.gte('visibility_score', minVisibility);
      }

      if (isViral !== undefined) {
        query = query.eq('is_viral', isViral);
      }

      if (startDate) {
        query = query.gte('published_at', startDate.toISOString());
      }

      if (endDate) {
        query = query.lte('published_at', endDate.toISOString());
      }

      if (outlet) {
        query = query.ilike('outlet', `%${outlet}%`);
      }

      if (topics && topics.length > 0) {
        query = query.overlaps('topics', topics);
      }

      if (searchQuery) {
        query = query.or(
          `title.ilike.%${searchQuery}%,excerpt.ilike.%${searchQuery}%`
        );
      }

      // Apply sorting
      const sortColumn = {
        publishedAt: 'published_at',
        relevanceScore: 'relevance_score',
        visibilityScore: 'visibility_score',
        viralityScore: 'virality_score',
      }[sortBy];

      query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        logger.error('Failed to list mentions', error);
        throw new Error(`Failed to list mentions: ${error.message}`);
      }

      return {
        mentions: (data || []).map(this.mapMentionFromDb),
        total: count || 0,
      };
    } catch (error) {
      logger.error('List mentions failed', error);
      throw error;
    }
  }

  /**
   * Get mention by ID
   */
  async getMentionById(
    id: string,
    organizationId: string
  ): Promise<MediaMention | null> {
    const { data, error } = await supabase
      .from('media_mentions')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      logger.error('Failed to get mention', error);
      throw new Error(`Failed to get mention: ${error.message}`);
    }

    return data ? this.mapMentionFromDb(data) : null;
  }

  /**
   * Find similar mentions using vector similarity
   */
  async findSimilarMentions(
    mentionId: string,
    organizationId: string,
    limit = 10
  ): Promise<SimilarMention[]> {
    try {
      const { data, error } = await supabase.rpc('find_similar_mentions', {
        ref_mention_id: mentionId,
        similarity_threshold: 0.85,
        result_limit: limit,
      });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        mention: this.mapMentionFromDb(item.mention),
        similarityScore: parseFloat(item.similarity_score),
      }));
    } catch (error) {
      logger.error('Find similar mentions failed', error);
      throw error;
    }
  }

  /**
   * Get mention trends over time
   */
  async getMentionTrends(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    granularity: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<MentionTrendsResponse> {
    try {
      // Use monitoring_snapshots for aggregated data
      const snapshotType = granularity === 'daily' ? 'DAILY' : granularity === 'weekly' ? 'WEEKLY' : 'MONTHLY';

      const { data, error } = await supabase
        .from('monitoring_snapshots')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('snapshot_type', snapshotType)
        .gte('snapshot_date', startDate.toISOString())
        .lte('snapshot_date', endDate.toISOString())
        .order('snapshot_date', { ascending: true });

      if (error) throw error;

      const trends = (data || []).map((snapshot) => ({
        date: new Date(snapshot.snapshot_date).toISOString().split('T')[0],
        totalMentions: snapshot.total_mentions,
        brandMentions: snapshot.brand_mentions,
        competitorMentions: snapshot.competitor_mentions,
        avgSentiment: parseFloat(snapshot.avg_sentiment) || 0,
        avgVisibility: parseFloat(snapshot.avg_visibility_score) || 0,
        avgVirality: parseFloat(snapshot.avg_virality_score) || 0,
      }));

      return {
        trends,
        startDate,
        endDate,
        granularity,
      };
    } catch (error) {
      logger.error('Get mention trends failed', error);
      throw error;
    }
  }

  /**
   * Get monitoring statistics
   */
  async getMonitoringStats(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<MonitoringStats> {
    try {
      let query = supabase
        .from('media_mentions')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_duplicate', false);

      if (startDate) {
        query = query.gte('published_at', startDate.toISOString());
      }

      if (endDate) {
        query = query.lte('published_at', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const mentions = data || [];

      // Calculate aggregations
      const mentionsByType: any = {};
      const mentionsByMedium: any = {
        NEWS: 0,
        BLOG: 0,
        FORUM: 0,
        SOCIAL: 0,
        PODCAST: 0,
        VIDEO: 0,
      };
      const sentimentBreakdown = {
        positive: 0,
        neutral: 0,
        negative: 0,
        mixed: 0,
      };
      const outletCounts: Record<string, number> = {};
      const keywordCounts: Record<string, number> = {};

      let totalRelevance = 0;
      let totalVisibility = 0;
      let totalVirality = 0;
      let viralCount = 0;

      mentions.forEach((mention) => {
        // By type
        mentionsByType[mention.mention_type] = (mentionsByType[mention.mention_type] || 0) + 1;

        // By medium
        if (mention.medium in mentionsByMedium) {
          mentionsByMedium[mention.medium]++;
        }

        // By sentiment
        if (mention.sentiment) {
          const key = mention.sentiment.toLowerCase() as keyof typeof sentimentBreakdown;
          if (key in sentimentBreakdown) {
            sentimentBreakdown[key]++;
          }
        }

        // Outlets
        if (mention.outlet) {
          outletCounts[mention.outlet] = (outletCounts[mention.outlet] || 0) + 1;
        }

        // Keywords/topics
        (mention.topics || []).forEach((topic: string) => {
          keywordCounts[topic] = (keywordCounts[topic] || 0) + 1;
        });

        // Scores
        totalRelevance += parseFloat(mention.relevance_score) || 0;
        totalVisibility += parseFloat(mention.visibility_score) || 0;
        totalVirality += parseFloat(mention.virality_score) || 0;

        if (mention.is_viral) {
          viralCount++;
        }
      });

      const count = mentions.length || 1;

      // Top outlets
      const topOutlets = Object.entries(outletCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([outlet, count]) => ({ outlet, count }));

      // Top keywords
      const topKeywords = Object.entries(keywordCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([keyword]) => keyword);

      return {
        totalMentions: count,
        mentionsByType,
        mentionsByMedium,
        sentimentBreakdown,
        avgRelevanceScore: totalRelevance / count,
        avgVisibilityScore: totalVisibility / count,
        avgViralityScore: totalVirality / count,
        viralMentionsCount: viralCount,
        topOutlets,
        topKeywords,
      };
    } catch (error) {
      logger.error('Get monitoring stats failed', error);
      throw error;
    }
  }

  // =====================================================
  // MONITORING RULES
  // =====================================================

  /**
   * Create monitoring rule
   */
  async createMonitoringRule(
    userId: string,
    input: CreateMonitoringRuleInput
  ): Promise<MonitoringRule> {
    try {
      const { data, error } = await supabase
        .from('monitoring_rules')
        .insert({
          name: input.name,
          description: input.description || null,
          query_terms: input.queryTerms,
          entity_type: input.entityType,
          mention_types: input.mentionTypes || null,
          mediums: input.mediums || null,
          min_relevance_score: input.minRelevanceScore || null,
          min_visibility_score: input.minVisibilityScore || null,
          alert_channel: input.alertChannel,
          alert_frequency: input.alertFrequency || 'IMMEDIATE',
          threshold_score: input.thresholdScore || 70,
          alert_email: input.alertEmail || null,
          alert_webhook_url: input.alertWebhookUrl || null,
          alert_slack_channel: input.alertSlackChannel || null,
          is_active: true,
          organization_id: input.organizationId,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create monitoring rule', error);
        throw new Error(`Failed to create monitoring rule: ${error.message}`);
      }

      return this.mapRuleFromDb(data);
    } catch (error) {
      logger.error('Create monitoring rule failed', error);
      throw error;
    }
  }

  /**
   * List monitoring rules
   */
  async listMonitoringRules(
    organizationId: string,
    activeOnly = true
  ): Promise<MonitoringRule[]> {
    try {
      let query = supabase
        .from('monitoring_rules')
        .select('*')
        .eq('organization_id', organizationId);

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to list monitoring rules', error);
        throw new Error(`Failed to list monitoring rules: ${error.message}`);
      }

      return (data || []).map(this.mapRuleFromDb);
    } catch (error) {
      logger.error('List monitoring rules failed', error);
      throw error;
    }
  }

  /**
   * Update monitoring rule
   */
  async updateMonitoringRule(
    id: string,
    userId: string,
    organizationId: string,
    input: UpdateMonitoringRuleInput
  ): Promise<MonitoringRule> {
    try {
      const updateData: any = {
        updated_by: userId,
        updated_at: new Date().toISOString(),
      };

      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.queryTerms !== undefined) updateData.query_terms = input.queryTerms;
      if (input.mentionTypes !== undefined) updateData.mention_types = input.mentionTypes;
      if (input.mediums !== undefined) updateData.mediums = input.mediums;
      if (input.minRelevanceScore !== undefined) updateData.min_relevance_score = input.minRelevanceScore;
      if (input.minVisibilityScore !== undefined) updateData.min_visibility_score = input.minVisibilityScore;
      if (input.alertChannel !== undefined) updateData.alert_channel = input.alertChannel;
      if (input.alertFrequency !== undefined) updateData.alert_frequency = input.alertFrequency;
      if (input.thresholdScore !== undefined) updateData.threshold_score = input.thresholdScore;
      if (input.alertEmail !== undefined) updateData.alert_email = input.alertEmail;
      if (input.alertWebhookUrl !== undefined) updateData.alert_webhook_url = input.alertWebhookUrl;
      if (input.alertSlackChannel !== undefined) updateData.alert_slack_channel = input.alertSlackChannel;
      if (input.isActive !== undefined) updateData.is_active = input.isActive;

      const { data, error } = await supabase
        .from('monitoring_rules')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update monitoring rule', error);
        throw new Error(`Failed to update monitoring rule: ${error.message}`);
      }

      return this.mapRuleFromDb(data);
    } catch (error) {
      logger.error('Update monitoring rule failed', error);
      throw error;
    }
  }

  /**
   * Delete monitoring rule
   */
  async deleteMonitoringRule(id: string, organizationId: string): Promise<void> {
    const { error } = await supabase
      .from('monitoring_rules')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      logger.error('Failed to delete monitoring rule', error);
      throw new Error(`Failed to delete monitoring rule: ${error.message}`);
    }
  }

  // =====================================================
  // MENTION ALERTS
  // =====================================================

  /**
   * List mention alerts
   */
  async listAlerts(
    organizationId: string,
    limit = 50,
    offset = 0
  ): Promise<MentionAlert[]> {
    try {
      const { data, error } = await supabase
        .from('mention_alerts')
        .select('*')
        .eq('organization_id', organizationId)
        .order('triggered_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Failed to list alerts', error);
        throw new Error(`Failed to list alerts: ${error.message}`);
      }

      return (data || []).map(this.mapAlertFromDb);
    } catch (error) {
      logger.error('List alerts failed', error);
      throw error;
    }
  }

  /**
   * Mark alert as viewed
   */
  async markAlertAsViewed(id: string, organizationId: string): Promise<void> {
    const { error } = await supabase
      .from('mention_alerts')
      .update({
        was_viewed: true,
        viewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      logger.error('Failed to mark alert as viewed', error);
      throw new Error(`Failed to mark alert as viewed: ${error.message}`);
    }
  }

  // =====================================================
  // MENTION FEEDBACK
  // =====================================================

  /**
   * Submit mention feedback
   */
  async submitFeedback(
    userId: string,
    input: SubmitFeedbackInput
  ): Promise<MentionFeedback> {
    try {
      const { data, error } = await supabase
        .from('mention_feedback')
        .insert({
          mention_id: input.mentionId,
          user_id: userId,
          feedback_type: input.feedbackType,
          comment: input.comment || null,
          organization_id: input.organizationId,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to submit feedback', error);
        throw new Error(`Failed to submit feedback: ${error.message}`);
      }

      return this.mapFeedbackFromDb(data);
    } catch (error) {
      logger.error('Submit feedback failed', error);
      throw error;
    }
  }

  // =====================================================
  // MONITORING SNAPSHOTS
  // =====================================================

  /**
   * Get monitoring snapshots
   */
  async getSnapshots(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    snapshotType: string = 'DAILY'
  ): Promise<MonitoringSnapshot[]> {
    try {
      const { data, error } = await supabase
        .from('monitoring_snapshots')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('snapshot_type', snapshotType)
        .gte('snapshot_date', startDate.toISOString())
        .lte('snapshot_date', endDate.toISOString())
        .order('snapshot_date', { ascending: false });

      if (error) {
        logger.error('Failed to get snapshots', error);
        throw new Error(`Failed to get snapshots: ${error.message}`);
      }

      return (data || []).map(this.mapSnapshotFromDb);
    } catch (error) {
      logger.error('Get snapshots failed', error);
      throw error;
    }
  }

  /**
   * Generate daily snapshot
   */
  async generateDailySnapshot(
    organizationId: string,
    date: Date
  ): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('generate_daily_snapshot', {
        org_uuid: organizationId,
        target_date: date.toISOString().split('T')[0],
      });

      if (error) {
        logger.error('Failed to generate daily snapshot', error);
        throw new Error(`Failed to generate daily snapshot: ${error.message}`);
      }

      return data;
    } catch (error) {
      logger.error('Generate daily snapshot failed', error);
      throw error;
    }
  }

  // =====================================================
  // MAPPER HELPERS
  // =====================================================

  private mapMentionFromDb(data: any): MediaMention {
    return {
      id: data.id,
      sourceUrl: data.source_url,
      title: data.title,
      excerpt: data.excerpt,
      fullContent: data.full_content,
      publishedAt: new Date(data.published_at),
      author: data.author,
      outlet: data.outlet,
      outletDomain: data.outlet_domain,
      topics: data.topics || [],
      mentionType: data.mention_type,
      medium: data.medium,
      sentiment: data.sentiment,
      sentimentScore: data.sentiment_score ? parseFloat(data.sentiment_score) : null,
      tone: data.tone,
      stance: data.stance,
      emotion: data.emotion,
      relevanceScore: parseFloat(data.relevance_score) || 0,
      visibilityScore: parseFloat(data.visibility_score) || 0,
      viralityScore: parseFloat(data.virality_score) || 0,
      isViral: data.is_viral,
      detectedEntities: data.detected_entities,
      entityTags: data.entity_tags || [],
      shareCount: data.share_count || 0,
      commentCount: data.comment_count || 0,
      reachEstimate: data.reach_estimate,
      contentEmbedding: data.content_embedding,
      nlpProcessed: data.nlp_processed,
      nlpProcessedAt: data.nlp_processed_at ? new Date(data.nlp_processed_at) : null,
      nlpConfidenceScore: data.nlp_confidence_score ? parseFloat(data.nlp_confidence_score) : null,
      nlpTokensUsed: data.nlp_tokens_used,
      contentHash: data.content_hash,
      isDuplicate: data.is_duplicate,
      originalMentionId: data.original_mention_id,
      organizationId: data.organization_id,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapRuleFromDb(data: any): MonitoringRule {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      queryTerms: data.query_terms || [],
      entityType: data.entity_type,
      mentionTypes: data.mention_types,
      mediums: data.mediums,
      minRelevanceScore: data.min_relevance_score ? parseFloat(data.min_relevance_score) : null,
      minVisibilityScore: data.min_visibility_score ? parseFloat(data.min_visibility_score) : null,
      alertChannel: data.alert_channel,
      alertFrequency: data.alert_frequency,
      thresholdScore: parseFloat(data.threshold_score),
      alertEmail: data.alert_email,
      alertWebhookUrl: data.alert_webhook_url,
      alertSlackChannel: data.alert_slack_channel,
      isActive: data.is_active,
      lastTriggeredAt: data.last_triggered_at ? new Date(data.last_triggered_at) : null,
      triggerCount: data.trigger_count || 0,
      organizationId: data.organization_id,
      createdBy: data.created_by,
      updatedBy: data.updated_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapAlertFromDb(data: any): MentionAlert {
    return {
      id: data.id,
      ruleId: data.rule_id,
      mentionId: data.mention_id,
      alertChannel: data.alert_channel,
      triggeredAt: new Date(data.triggered_at),
      wasDelivered: data.was_delivered,
      deliveredAt: data.delivered_at ? new Date(data.delivered_at) : null,
      deliveryError: data.delivery_error,
      retryCount: data.retry_count || 0,
      alertTitle: data.alert_title,
      alertMessage: data.alert_message,
      wasViewed: data.was_viewed,
      viewedAt: data.viewed_at ? new Date(data.viewed_at) : null,
      wasDismissed: data.was_dismissed,
      dismissedAt: data.dismissed_at ? new Date(data.dismissed_at) : null,
      organizationId: data.organization_id,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapFeedbackFromDb(data: any): MentionFeedback {
    return {
      id: data.id,
      mentionId: data.mention_id,
      userId: data.user_id,
      feedbackType: data.feedback_type,
      comment: data.comment,
      organizationId: data.organization_id,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapSnapshotFromDb(data: any): MonitoringSnapshot {
    return {
      id: data.id,
      organizationId: data.organization_id,
      snapshotDate: new Date(data.snapshot_date),
      snapshotType: data.snapshot_type,
      totalMentions: data.total_mentions || 0,
      brandMentions: data.brand_mentions || 0,
      competitorMentions: data.competitor_mentions || 0,
      industryMentions: data.industry_mentions || 0,
      avgSentiment: data.avg_sentiment ? parseFloat(data.avg_sentiment) : null,
      positiveMentions: data.positive_mentions || 0,
      neutralMentions: data.neutral_mentions || 0,
      negativeMentions: data.negative_mentions || 0,
      avgVisibilityScore: data.avg_visibility_score ? parseFloat(data.avg_visibility_score) : null,
      avgViralityScore: data.avg_virality_score ? parseFloat(data.avg_virality_score) : null,
      totalReachEstimate: data.total_reach_estimate || 0,
      viralMentions: data.viral_mentions || 0,
      topSources: data.top_sources,
      topKeywords: data.top_keywords || [],
      topEntities: data.top_entities,
      byMedium: data.by_medium,
      mentionsChangePct: data.mentions_change_pct ? parseFloat(data.mentions_change_pct) : null,
      sentimentChangePct: data.sentiment_change_pct ? parseFloat(data.sentiment_change_pct) : null,
      createdAt: new Date(data.created_at),
    };
  }
}

export const reputationService = new ReputationService();
