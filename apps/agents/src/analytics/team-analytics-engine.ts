// =====================================================
// TEAM ANALYTICS ENGINE
// Sprint 32: Activity tracking, anomaly detection, coaching
// =====================================================

import { EventEmitter } from 'events';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import type {
  LogTeamEventInput,
  CalculateMetricsInput,
  DetectAnomaliesInput,
  GetActivityFeedInput,
  GetBehaviorMetricsInput,
  GetAnomaliesInput,
  SummarizeTeamPatternsInput,
  RecommendCoachingInput,
  ResolveAnomalyInput,
  TeamActivityEvent,
  TeamBehaviorMetrics,
  BehavioralAnomaly,
  TeamActivityFeedResult,
  BehaviorMetricsResult,
  AnomaliesResult,
  TeamSummary,
  GptTeamPatternSummary,
  CoachingOpportunity,
  PerformanceTrend,
  PerformanceDataPoint,
} from '@pravado/shared-types';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Team Analytics Engine
 * Tracks activity patterns, detects anomalies, provides coaching insights
 */
export class TeamAnalyticsEngine extends EventEmitter {
  constructor() {
    super();
  }

  // =====================================================
  // ACTIVITY LOGGING
  // =====================================================

  /**
   * Log team event
   * Records a team activity event
   */
  async logTeamEvent(input: LogTeamEventInput): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('log_team_event', {
        p_organization_id: input.organizationId,
        p_user_id: input.userId,
        p_activity_type: input.activityType,
        p_engagement_mode: input.engagementMode || 'MANUAL',
        p_campaign_id: input.campaignId || null,
        p_agent_id: input.agentId || null,
        p_contact_id: input.contactId || null,
        p_task_id: input.taskId || null,
        p_activity_title: input.activityTitle || null,
        p_activity_description: input.activityDescription || null,
        p_metadata: input.metadata || {},
        p_duration_seconds: input.durationSeconds || null,
        p_success: input.success ?? true,
        p_quality_score: input.qualityScore || null,
      });

      if (error) {
        throw new Error(`Failed to log team event: ${error.message}`);
      }

      const eventId = data as string;

      // Emit event for real-time updates
      this.emit('team-event-logged', {
        eventId,
        userId: input.userId,
        activityType: input.activityType,
      });

      return eventId;
    } catch (error: any) {
      console.error('Log team event error:', error);
      throw error;
    }
  }

  // =====================================================
  // METRICS CALCULATION
  // =====================================================

  /**
   * Calculate behavior metrics
   * Aggregates activity data for a user over a time window
   */
  async calculateBehaviorMetrics(input: CalculateMetricsInput): Promise<TeamBehaviorMetrics> {
    try {
      const { data, error } = await supabase.rpc('calculate_behavior_metrics', {
        p_organization_id: input.organizationId,
        p_user_id: input.userId,
        p_period_start: input.periodStart,
        p_period_end: input.periodEnd,
        p_window_type: input.windowType || 'daily',
      });

      if (error) {
        throw new Error(`Failed to calculate metrics: ${error.message}`);
      }

      const metricId = data as string;

      // Fetch the calculated metrics
      const metrics = await this.getBehaviorMetrics({
        organizationId: input.organizationId,
        userId: input.userId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      });

      if (!metrics.metrics || metrics.metrics.length === 0) {
        throw new Error('Metrics calculated but not found');
      }

      const metric = metrics.metrics[0];

      // Emit event
      this.emit('metrics-calculated', {
        metricId,
        userId: input.userId,
        totalActivities: metric.totalActivities,
      });

      return metric;
    } catch (error: any) {
      console.error('Calculate behavior metrics error:', error);
      throw error;
    }
  }

  /**
   * Calculate metrics for all users in organization
   */
  async calculateMetricsForAllUsers(
    organizationId: string,
    periodStart: string,
    periodEnd: string,
    windowType: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<void> {
    try {
      // Get all users in organization
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('organization_id', organizationId);

      if (usersError) {
        throw new Error(`Failed to get users: ${usersError.message}`);
      }

      // Calculate metrics for each user
      const promises = users.map((user) =>
        this.calculateBehaviorMetrics({
          organizationId,
          userId: user.id,
          periodStart,
          periodEnd,
          windowType,
        })
      );

      await Promise.all(promises);

      this.emit('all-metrics-calculated', {
        organizationId,
        userCount: users.length,
      });
    } catch (error: any) {
      console.error('Calculate metrics for all users error:', error);
      throw error;
    }
  }

  // =====================================================
  // ANOMALY DETECTION
  // =====================================================

  /**
   * Detect behavioral anomalies
   * Identifies unusual patterns in user behavior
   */
  async detectBehavioralAnomalies(input: DetectAnomaliesInput): Promise<BehavioralAnomaly[]> {
    try {
      const { data, error } = await supabase.rpc('detect_behavioral_anomalies', {
        p_organization_id: input.organizationId,
        p_user_id: input.userId,
        p_detection_window_start: input.detectionWindowStart,
        p_detection_window_end: input.detectionWindowEnd,
      });

      if (error) {
        throw new Error(`Failed to detect anomalies: ${error.message}`);
      }

      const result = data as { anomalies: any[]; total_detected: number };

      // Fetch full anomaly details
      if (result.total_detected > 0) {
        const anomalyIds = result.anomalies.map((a: any) => a.id);
        const anomalies = await this.getAnomaliesByIds(anomalyIds, input.organizationId);

        // Emit event
        this.emit('anomalies-detected', {
          userId: input.userId,
          count: anomalies.length,
        });

        return anomalies;
      }

      return [];
    } catch (error: any) {
      console.error('Detect behavioral anomalies error:', error);
      throw error;
    }
  }

  /**
   * Detect anomalies for all users
   */
  async detectAnomaliesForAllUsers(
    organizationId: string,
    detectionWindowStart: string,
    detectionWindowEnd: string
  ): Promise<void> {
    try {
      // Get all users in organization
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('organization_id', organizationId);

      if (usersError) {
        throw new Error(`Failed to get users: ${usersError.message}`);
      }

      // Detect anomalies for each user
      const promises = users.map((user) =>
        this.detectBehavioralAnomalies({
          organizationId,
          userId: user.id,
          detectionWindowStart,
          detectionWindowEnd,
        })
      );

      await Promise.all(promises);

      this.emit('all-anomalies-detected', {
        organizationId,
        userCount: users.length,
      });
    } catch (error: any) {
      console.error('Detect anomalies for all users error:', error);
      throw error;
    }
  }

  /**
   * Resolve anomaly
   */
  async resolveAnomaly(input: ResolveAnomalyInput): Promise<BehavioralAnomaly> {
    try {
      const { data, error } = await supabase
        .from('behavioral_anomalies')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: input.resolvedBy,
          resolution_notes: input.resolutionNotes,
        })
        .eq('id', input.anomalyId)
        .eq('organization_id', input.organizationId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to resolve anomaly: ${error.message}`);
      }

      const anomaly = this.mapBehavioralAnomaly(data);

      this.emit('anomaly-resolved', {
        anomalyId: input.anomalyId,
        resolvedBy: input.resolvedBy,
      });

      return anomaly;
    } catch (error: any) {
      console.error('Resolve anomaly error:', error);
      throw error;
    }
  }

  // =====================================================
  // DATA RETRIEVAL
  // =====================================================

  /**
   * Get team activity feed
   */
  async getTeamActivityFeed(input: GetActivityFeedInput): Promise<TeamActivityFeedResult> {
    try {
      const { data, error } = await supabase.rpc('get_team_activity_feed', {
        p_organization_id: input.organizationId,
        p_user_id: input.userId || null,
        p_campaign_id: input.campaignId || null,
        p_activity_types: input.activityTypes || null,
        p_start_date: input.startDate || null,
        p_end_date: input.endDate || null,
        p_limit: input.limit || 50,
        p_offset: input.offset || 0,
      });

      if (error) {
        throw new Error(`Failed to get activity feed: ${error.message}`);
      }

      const events = (data || []).map(this.mapTeamActivityEvent);
      const total = events.length > 0 ? events[0].totalCount || 0 : 0;

      return { events: events.map(({ totalCount, ...e }) => e), total };
    } catch (error: any) {
      console.error('Get team activity feed error:', error);
      throw error;
    }
  }

  /**
   * Get behavior metrics
   */
  async getBehaviorMetrics(input: GetBehaviorMetricsInput): Promise<BehaviorMetricsResult> {
    try {
      let query = supabase
        .from('team_behavior_metrics')
        .select('*', { count: 'exact' })
        .eq('organization_id', input.organizationId);

      if (input.userId) {
        query = query.eq('user_id', input.userId);
      }

      if (input.windowType) {
        query = query.eq('window_type', input.windowType);
      }

      if (input.periodStart) {
        query = query.gte('period_start', input.periodStart);
      }

      if (input.periodEnd) {
        query = query.lte('period_end', input.periodEnd);
      }

      query = query
        .order('period_start', { ascending: false })
        .range(input.offset || 0, (input.offset || 0) + (input.limit || 50) - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to get behavior metrics: ${error.message}`);
      }

      const metrics = (data || []).map(this.mapBehaviorMetrics);

      return { metrics, total: count || 0 };
    } catch (error: any) {
      console.error('Get behavior metrics error:', error);
      throw error;
    }
  }

  /**
   * Get anomalies
   */
  async getAnomalies(input: GetAnomaliesInput): Promise<AnomaliesResult> {
    try {
      let query = supabase
        .from('behavioral_anomalies')
        .select('*', { count: 'exact' })
        .eq('organization_id', input.organizationId);

      if (input.userId) {
        query = query.eq('user_id', input.userId);
      }

      if (input.anomalyType) {
        query = query.eq('anomaly_type', input.anomalyType);
      }

      if (input.severity) {
        query = query.eq('severity', input.severity);
      }

      if (input.isResolved !== undefined) {
        query = query.eq('is_resolved', input.isResolved);
      }

      query = query
        .order('detected_at', { ascending: false })
        .range(input.offset || 0, (input.offset || 0) + (input.limit || 50) - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to get anomalies: ${error.message}`);
      }

      const anomalies = (data || []).map(this.mapBehavioralAnomaly);

      return { anomalies, total: count || 0 };
    } catch (error: any) {
      console.error('Get anomalies error:', error);
      throw error;
    }
  }

  /**
   * Get anomalies by IDs
   */
  private async getAnomaliesByIds(
    anomalyIds: string[],
    organizationId: string
  ): Promise<BehavioralAnomaly[]> {
    const { data, error } = await supabase
      .from('behavioral_anomalies')
      .select('*')
      .in('id', anomalyIds)
      .eq('organization_id', organizationId);

    if (error) {
      throw new Error(`Failed to get anomalies by IDs: ${error.message}`);
    }

    return (data || []).map(this.mapBehavioralAnomaly);
  }

  // =====================================================
  // SUMMARIZATION & INSIGHTS
  // =====================================================

  /**
   * Summarize team patterns
   * GPT-4 powered summary of team behavioral patterns
   */
  async summarizeTeamPatterns(
    input: SummarizeTeamPatternsInput
  ): Promise<{ summary: GptTeamPatternSummary; teamSummary: TeamSummary }> {
    try {
      // Get raw team summary from database
      const { data: rawSummary, error: summaryError } = await supabase.rpc(
        'summarize_behavioral_patterns',
        {
          p_organization_id: input.organizationId,
          p_period_start: input.periodStart,
          p_period_end: input.periodEnd,
        }
      );

      if (summaryError) {
        throw new Error(`Failed to get team summary: ${summaryError.message}`);
      }

      const teamSummary: TeamSummary = {
        periodStart: rawSummary.period_start,
        periodEnd: rawSummary.period_end,
        activeUsers: rawSummary.active_users,
        totalActivities: rawSummary.total_activities,
        topPerformers: rawSummary.top_performers || [],
        activityDistribution: rawSummary.activity_distribution || {},
        engagementBreakdown: rawSummary.engagement_breakdown || {},
      };

      // Generate GPT summary
      const prompt = `You are a team performance analyst. Analyze the following team behavioral data and provide insights.

**Team Summary**
Period: ${teamSummary.periodStart} to ${teamSummary.periodEnd}
Active Users: ${teamSummary.activeUsers}
Total Activities: ${teamSummary.totalActivities}

**Activity Distribution:**
${JSON.stringify(teamSummary.activityDistribution, null, 2)}

**Engagement Breakdown:**
${JSON.stringify(teamSummary.engagementBreakdown, null, 2)}

**Top Performers:**
${JSON.stringify(teamSummary.topPerformers, null, 2)}

Provide:
1. A concise 2-3 sentence summary of overall team performance
2. 3-5 key insights about patterns, strengths, or concerns
3. 2-4 trend observations (up/down/stable) for important metrics
4. 3-5 actionable recommendations for team optimization

Format as JSON with keys: summary, keyInsights (array), trends (array with metric, direction, magnitude, description), recommendations (array)`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content:
              'You are a team performance analyst specializing in behavioral analytics. Provide data-driven insights in JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });

      const gptResponse = JSON.parse(completion.choices[0].message.content || '{}');

      const gptSummary: GptTeamPatternSummary = {
        summary: gptResponse.summary || '',
        keyInsights: gptResponse.keyInsights || [],
        trends: gptResponse.trends || [],
        recommendations: gptResponse.recommendations || [],
        generatedAt: new Date().toISOString(),
      };

      // Emit event
      this.emit('team-patterns-summarized', {
        organizationId: input.organizationId,
        activeUsers: teamSummary.activeUsers,
      });

      return { summary: gptSummary, teamSummary };
    } catch (error: any) {
      console.error('Summarize team patterns error:', error);
      throw error;
    }
  }

  /**
   * Recommend coaching opportunities
   * GPT-4 powered coaching recommendations
   */
  async recommendCoachingOpportunities(
    input: RecommendCoachingInput
  ): Promise<CoachingOpportunity[]> {
    try {
      // Get metrics and anomalies
      const metricsResult = await this.getBehaviorMetrics({
        organizationId: input.organizationId,
        userId: input.userId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      });

      const anomaliesResult = await this.getAnomalies({
        organizationId: input.organizationId,
        userId: input.userId,
        isResolved: false,
      });

      if (metricsResult.metrics.length === 0) {
        return [];
      }

      // Build coaching prompt
      const metricsData = metricsResult.metrics.map((m) => ({
        userId: m.userId,
        totalActivities: m.totalActivities,
        successRate: m.successRate,
        averageQualityScore: m.averageQualityScore,
        teamPercentile: m.teamPercentile,
        velocityTrend: m.velocityTrend,
      }));

      const anomaliesData = anomaliesResult.anomalies.map((a) => ({
        userId: a.userId,
        type: a.anomalyType,
        severity: a.severity,
        description: a.description,
      }));

      const prompt = `You are a professional coach specializing in team performance. Based on the metrics and anomalies below, identify coaching opportunities.

**User Metrics:**
${JSON.stringify(metricsData, null, 2)}

**Active Anomalies:**
${JSON.stringify(anomaliesData, null, 2)}

For each user who would benefit from coaching, provide:
1. Priority level (low/medium/high)
2. Category (productivity, quality, engagement, collaboration, etc.)
3. Specific issue observed
4. Coaching recommendation
5. 2-4 specific action items

Return as JSON array with keys: userId, userName, priority, category, issue, recommendation, actionItems (array)`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content:
              'You are a professional coach specializing in data-driven performance improvement. Provide actionable coaching in JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const gptResponse = JSON.parse(completion.choices[0].message.content || '{}');
      const opportunities: CoachingOpportunity[] = gptResponse.opportunities || [];

      // Add related anomaly IDs
      opportunities.forEach((opp) => {
        const userAnomalies = anomaliesResult.anomalies
          .filter((a) => a.userId === opp.userId)
          .map((a) => a.id);
        opp.relatedAnomalies = userAnomalies;
      });

      // Emit event
      this.emit('coaching-opportunities-generated', {
        organizationId: input.organizationId,
        opportunitiesCount: opportunities.length,
      });

      return opportunities;
    } catch (error: any) {
      console.error('Recommend coaching opportunities error:', error);
      throw error;
    }
  }

  /**
   * Get performance trend
   * Returns user performance over time
   */
  async getPerformanceTrend(
    organizationId: string,
    userId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<PerformanceTrend> {
    try {
      // Get daily metrics
      const metricsResult = await this.getBehaviorMetrics({
        organizationId,
        userId,
        windowType: 'daily',
        periodStart,
        periodEnd,
      });

      const dataPoints: PerformanceDataPoint[] = metricsResult.metrics.map((m) => ({
        date: m.periodStart,
        activityCount: m.totalActivities,
        successRate: m.successRate,
        qualityScore: m.averageQualityScore,
      }));

      // Calculate average and trend
      const totalActivity = dataPoints.reduce((sum, dp) => sum + dp.activityCount, 0);
      const averageActivity = dataPoints.length > 0 ? totalActivity / dataPoints.length : 0;

      // Simple trend calculation (compare first half to second half)
      const midpoint = Math.floor(dataPoints.length / 2);
      const firstHalfAvg =
        dataPoints.slice(0, midpoint).reduce((sum, dp) => sum + dp.activityCount, 0) / midpoint;
      const secondHalfAvg =
        dataPoints.slice(midpoint).reduce((sum, dp) => sum + dp.activityCount, 0) /
        (dataPoints.length - midpoint);

      let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
      if (secondHalfAvg > firstHalfAvg * 1.1) trend = 'increasing';
      else if (secondHalfAvg < firstHalfAvg * 0.9) trend = 'decreasing';

      // Get user name
      const { data: user } = await supabase.from('users').select('name').eq('id', userId).single();

      return {
        userId,
        userName: user?.name || 'Unknown User',
        dataPoints,
        trend,
        averageActivity,
      };
    } catch (error: any) {
      console.error('Get performance trend error:', error);
      throw error;
    }
  }

  // =====================================================
  // MAPPING FUNCTIONS
  // =====================================================

  private mapTeamActivityEvent(data: any): TeamActivityEvent & { totalCount?: number } {
    return {
      id: data.id,
      organizationId: data.organization_id,
      userId: data.user_id,
      userEmail: data.user_email,
      userName: data.user_name,
      activityType: data.activity_type,
      engagementMode: data.engagement_mode,
      campaignId: data.campaign_id,
      agentId: data.agent_id,
      contactId: data.contact_id,
      taskId: data.task_id,
      activityTitle: data.activity_title,
      activityDescription: data.activity_description,
      metadata: data.metadata || {},
      durationSeconds: data.duration_seconds,
      success: data.success,
      qualityScore: data.quality_score,
      occurredAt: data.occurred_at,
      createdAt: data.created_at,
      totalCount: data.total_count,
    };
  }

  private mapBehaviorMetrics(data: any): TeamBehaviorMetrics {
    return {
      id: data.id,
      organizationId: data.organization_id,
      userId: data.user_id,
      periodStart: data.period_start,
      periodEnd: data.period_end,
      windowType: data.window_type,
      agentRuns: data.agent_runs,
      followupsSent: data.followups_sent,
      goalsUpdated: data.goals_updated,
      commentsAdded: data.comments_added,
      tasksCreated: data.tasks_created,
      tasksCompleted: data.tasks_completed,
      reportsGenerated: data.reports_generated,
      reviewsSubmitted: data.reviews_submitted,
      manualActions: data.manual_actions,
      aiAssistedActions: data.ai_assisted_actions,
      autonomousActions: data.autonomous_actions,
      totalActivities: data.total_activities,
      successRate: data.success_rate,
      averageQualityScore: data.average_quality_score,
      averageDurationSeconds: data.average_duration_seconds,
      activeDays: data.active_days,
      peakActivityHour: data.peak_activity_hour,
      campaignsTouched: data.campaigns_touched,
      teamPercentile: data.team_percentile,
      velocityTrend: data.velocity_trend,
      calculatedAt: data.calculated_at,
      createdAt: data.created_at,
    };
  }

  private mapBehavioralAnomaly(data: any): BehavioralAnomaly {
    return {
      id: data.id,
      organizationId: data.organization_id,
      userId: data.user_id,
      anomalyType: data.anomaly_type,
      severity: data.severity,
      detectedAt: data.detected_at,
      detectionWindowStart: data.detection_window_start,
      detectionWindowEnd: data.detection_window_end,
      baselineValue: data.baseline_value,
      observedValue: data.observed_value,
      deviationPercent: data.deviation_percent,
      metricName: data.metric_name,
      activityTypes: data.activity_types,
      campaignId: data.campaign_id,
      description: data.description,
      possibleCauses: data.possible_causes,
      recommendedActions: data.recommended_actions,
      isResolved: data.is_resolved,
      resolvedAt: data.resolved_at,
      resolvedBy: data.resolved_by,
      resolutionNotes: data.resolution_notes,
      aiAnalysis: data.ai_analysis,
      confidenceScore: data.confidence_score,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

// Export singleton instance
export const teamAnalyticsEngine = new TeamAnalyticsEngine();
