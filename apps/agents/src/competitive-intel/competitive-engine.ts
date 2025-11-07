// =====================================================
// COMPETITIVE INTELLIGENCE ENGINE
// Sprint 33: Competitor tracking, market trends, AI insights
// =====================================================

import { EventEmitter } from 'events';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import type {
  Competitor,
  IntelEvent,
  IntelTrend,
  CompetitorMetrics,
  CompetitorProfile,
  MarketTrendsSummary,
  CompetitiveDashboardData,
  GptCompetitorAnalysis,
  GptMarketAnalysis,
  CreateCompetitorInput,
  UpdateCompetitorInput,
  LogIntelEventInput,
  UpdateIntelEventInput,
  CreateTrendInput,
  CalculateCompetitorMetricsInput,
  GetCompetitorsInput,
  GetIntelFeedInput,
  GetTrendsInput,
  SummarizeCompetitorInput,
  SummarizeMarketInput,
  GetDashboardInput,
} from '@pravado/types';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Competitive Intelligence Engine
 * Tracks competitors, market trends, provides AI insights
 */
export class CompetitiveIntelEngine extends EventEmitter {
  constructor() {
    super();
  }

  // =====================================================
  // COMPETITOR MANAGEMENT
  // =====================================================

  /**
   * Create competitor
   */
  async createCompetitor(input: CreateCompetitorInput): Promise<Competitor> {
    try {
      const { data, error } = await supabase
        .from('competitors')
        .insert({
          organization_id: input.organizationId,
          name: input.name,
          description: input.description,
          website: input.website,
          logo_url: input.logoUrl,
          industry: input.industry,
          headquarters: input.headquarters,
          founded_year: input.foundedYear,
          employee_count: input.employeeCount,
          funding_stage: input.fundingStage,
          total_funding_usd: input.totalFundingUsd,
          primary_product: input.primaryProduct,
          product_categories: input.productCategories,
          target_market: input.targetMarket,
          linkedin_url: input.linkedinUrl,
          twitter_handle: input.twitterHandle,
          facebook_url: input.facebookUrl,
          priority: input.priority || 'medium',
          added_by: input.addedBy,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create competitor: ${error.message}`);
      }

      const competitor = this.mapCompetitor(data);

      this.emit('competitor-created', { competitorId: competitor.id });

      return competitor;
    } catch (error: any) {
      console.error('Create competitor error:', error);
      throw error;
    }
  }

  /**
   * Update competitor
   */
  async updateCompetitor(input: UpdateCompetitorInput): Promise<Competitor> {
    try {
      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.website !== undefined) updateData.website = input.website;
      if (input.logoUrl !== undefined) updateData.logo_url = input.logoUrl;
      if (input.industry !== undefined) updateData.industry = input.industry;
      if (input.headquarters !== undefined) updateData.headquarters = input.headquarters;
      if (input.foundedYear !== undefined) updateData.founded_year = input.foundedYear;
      if (input.employeeCount !== undefined) updateData.employee_count = input.employeeCount;
      if (input.fundingStage !== undefined) updateData.funding_stage = input.fundingStage;
      if (input.totalFundingUsd !== undefined) updateData.total_funding_usd = input.totalFundingUsd;
      if (input.primaryProduct !== undefined) updateData.primary_product = input.primaryProduct;
      if (input.productCategories !== undefined) updateData.product_categories = input.productCategories;
      if (input.targetMarket !== undefined) updateData.target_market = input.targetMarket;
      if (input.linkedinUrl !== undefined) updateData.linkedin_url = input.linkedinUrl;
      if (input.twitterHandle !== undefined) updateData.twitter_handle = input.twitterHandle;
      if (input.facebookUrl !== undefined) updateData.facebook_url = input.facebookUrl;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.isActive !== undefined) updateData.is_active = input.isActive;

      const { data, error } = await supabase
        .from('competitors')
        .update(updateData)
        .eq('id', input.competitorId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update competitor: ${error.message}`);
      }

      const competitor = this.mapCompetitor(data);

      this.emit('competitor-updated', { competitorId: competitor.id });

      return competitor;
    } catch (error: any) {
      console.error('Update competitor error:', error);
      throw error;
    }
  }

  /**
   * Get competitors
   */
  async getCompetitors(input: GetCompetitorsInput): Promise<{ competitors: Competitor[]; total: number }> {
    try {
      let query = supabase
        .from('competitors')
        .select('*', { count: 'exact' })
        .eq('organization_id', input.organizationId);

      if (input.isActive !== undefined) {
        query = query.eq('is_active', input.isActive);
      }

      if (input.priority) {
        query = query.eq('priority', input.priority);
      }

      if (input.category) {
        query = query.contains('product_categories', [input.category]);
      }

      query = query
        .order('created_at', { ascending: false })
        .range(input.offset || 0, (input.offset || 0) + (input.limit || 50) - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to get competitors: ${error.message}`);
      }

      const competitors = (data || []).map(this.mapCompetitor);

      return { competitors, total: count || 0 };
    } catch (error: any) {
      console.error('Get competitors error:', error);
      throw error;
    }
  }

  /**
   * Get competitor profile
   */
  async getCompetitorProfile(organizationId: string, competitorId: string): Promise<CompetitorProfile> {
    try {
      const { data, error } = await supabase.rpc('summarize_competitor_profile', {
        p_organization_id: organizationId,
        p_competitor_id: competitorId,
      });

      if (error) {
        throw new Error(`Failed to get competitor profile: ${error.message}`);
      }

      return {
        competitor: this.mapCompetitor(data.competitor),
        recentEvents: (data.recent_events || []).map(this.mapIntelEvent),
        metrics: data.metrics ? this.mapCompetitorMetrics(data.metrics) : undefined,
      };
    } catch (error: any) {
      console.error('Get competitor profile error:', error);
      throw error;
    }
  }

  // =====================================================
  // INTEL EVENT MANAGEMENT
  // =====================================================

  /**
   * Log intel event
   */
  async logIntelEvent(input: LogIntelEventInput): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('log_intel_event', {
        p_organization_id: input.organizationId,
        p_competitor_id: input.competitorId,
        p_event_type: input.eventType,
        p_severity: input.severity,
        p_source_type: input.sourceType,
        p_title: input.title,
        p_description: input.description || null,
        p_url: input.url || null,
        p_image_url: input.imageUrl || null,
        p_source_name: input.sourceName || null,
        p_author: input.author || null,
        p_published_at: input.publishedAt || null,
        p_impact_score: input.impactScore || null,
        p_relevance_score: input.relevanceScore || null,
        p_submitted_by: input.submittedBy || null,
      });

      if (error) {
        throw new Error(`Failed to log intel event: ${error.message}`);
      }

      const eventId = data as string;

      this.emit('intel-event-logged', {
        eventId,
        competitorId: input.competitorId,
        eventType: input.eventType,
      });

      return eventId;
    } catch (error: any) {
      console.error('Log intel event error:', error);
      throw error;
    }
  }

  /**
   * Update intel event
   */
  async updateIntelEvent(input: UpdateIntelEventInput): Promise<IntelEvent> {
    try {
      const updateData: any = {};
      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.severity !== undefined) updateData.severity = input.severity;
      if (input.impactScore !== undefined) updateData.impact_score = input.impactScore;
      if (input.relevanceScore !== undefined) updateData.relevance_score = input.relevanceScore;
      if (input.actionRequired !== undefined) updateData.action_required = input.actionRequired;
      if (input.actionNotes !== undefined) updateData.action_notes = input.actionNotes;
      if (input.aiSummary !== undefined) updateData.ai_summary = input.aiSummary;
      if (input.keyInsights !== undefined) updateData.key_insights = input.keyInsights;
      if (input.affectedCampaigns !== undefined) updateData.affected_campaigns = input.affectedCampaigns;
      if (input.isVerified !== undefined) updateData.is_verified = input.isVerified;

      const { data, error } = await supabase
        .from('intel_events')
        .update(updateData)
        .eq('id', input.eventId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update intel event: ${error.message}`);
      }

      return this.mapIntelEvent(data);
    } catch (error: any) {
      console.error('Update intel event error:', error);
      throw error;
    }
  }

  /**
   * Get intel feed
   */
  async getIntelFeed(input: GetIntelFeedInput): Promise<{ events: IntelEvent[]; total: number }> {
    try {
      let query = supabase
        .from('intel_events')
        .select('*', { count: 'exact' })
        .eq('organization_id', input.organizationId);

      if (input.competitorId) {
        query = query.eq('competitor_id', input.competitorId);
      }

      if (input.eventTypes?.length) {
        query = query.in('event_type', input.eventTypes);
      }

      if (input.severity) {
        query = query.eq('severity', input.severity);
      }

      if (input.sourceType) {
        query = query.eq('source_type', input.sourceType);
      }

      if (input.startDate) {
        query = query.gte('detected_at', input.startDate);
      }

      if (input.endDate) {
        query = query.lt('detected_at', input.endDate);
      }

      query = query
        .order('detected_at', { ascending: false })
        .range(input.offset || 0, (input.offset || 0) + (input.limit || 50) - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to get intel feed: ${error.message}`);
      }

      const events = (data || []).map(this.mapIntelEvent);

      return { events, total: count || 0 };
    } catch (error: any) {
      console.error('Get intel feed error:', error);
      throw error;
    }
  }

  // =====================================================
  // METRICS CALCULATION
  // =====================================================

  /**
   * Calculate competitor metrics
   */
  async calculateMetrics(input: CalculateCompetitorMetricsInput): Promise<CompetitorMetrics> {
    try {
      const { data, error } = await supabase.rpc('calculate_competitor_metrics', {
        p_organization_id: input.organizationId,
        p_competitor_id: input.competitorId,
        p_period_start: input.periodStart,
        p_period_end: input.periodEnd,
        p_window_type: input.windowType || 'weekly',
      });

      if (error) {
        throw new Error(`Failed to calculate metrics: ${error.message}`);
      }

      // Fetch the calculated metrics
      const metricsResult = await this.getCompetitorMetrics(input.organizationId, input.competitorId);

      if (!metricsResult.metrics || metricsResult.metrics.length === 0) {
        throw new Error('Metrics calculated but not found');
      }

      const metrics = metricsResult.metrics[0];

      this.emit('metrics-calculated', {
        competitorId: input.competitorId,
        totalEvents: metrics.totalEvents,
      });

      return metrics;
    } catch (error: any) {
      console.error('Calculate metrics error:', error);
      throw error;
    }
  }

  /**
   * Get competitor metrics
   */
  async getCompetitorMetrics(
    organizationId: string,
    competitorId: string
  ): Promise<{ metrics: CompetitorMetrics[]; total: number }> {
    try {
      const { data, error, count } = await supabase
        .from('competitor_metrics')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('competitor_id', competitorId)
        .order('period_start', { ascending: false });

      if (error) {
        throw new Error(`Failed to get competitor metrics: ${error.message}`);
      }

      const metrics = (data || []).map(this.mapCompetitorMetrics);

      return { metrics, total: count || 0 };
    } catch (error: any) {
      console.error('Get competitor metrics error:', error);
      throw error;
    }
  }

  // =====================================================
  // TRENDS
  // =====================================================

  /**
   * Create trend
   */
  async createTrend(input: CreateTrendInput): Promise<IntelTrend> {
    try {
      const { data, error } = await supabase
        .from('intel_trends')
        .insert({
          organization_id: input.organizationId,
          trend_name: input.trendName,
          category: input.category,
          description: input.description,
          momentum: input.momentum,
          growth_rate: input.growthRate,
          market_size_usd: input.marketSizeUsd,
          period_start: input.periodStart,
          period_end: input.periodEnd,
          related_competitors: input.relatedCompetitors,
          related_intel_events: input.relatedIntelEvents,
          keywords: input.keywords,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create trend: ${error.message}`);
      }

      return this.mapIntelTrend(data);
    } catch (error: any) {
      console.error('Create trend error:', error);
      throw error;
    }
  }

  /**
   * Get trends
   */
  async getTrends(input: GetTrendsInput): Promise<{ trends: IntelTrend[]; total: number }> {
    try {
      let query = supabase
        .from('intel_trends')
        .select('*', { count: 'exact' })
        .eq('organization_id', input.organizationId);

      if (input.category) {
        query = query.eq('category', input.category);
      }

      if (input.periodStart) {
        query = query.gte('period_start', input.periodStart);
      }

      if (input.periodEnd) {
        query = query.lte('period_end', input.periodEnd);
      }

      query = query
        .order('created_at', { ascending: false })
        .range(input.offset || 0, (input.offset || 0) + (input.limit || 50) - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to get trends: ${error.message}`);
      }

      const trends = (data || []).map(this.mapIntelTrend);

      return { trends, total: count || 0 };
    } catch (error: any) {
      console.error('Get trends error:', error);
      throw error;
    }
  }

  /**
   * Get market trends summary
   */
  async getMarketTrends(
    organizationId: string,
    category: string,
    periodStart: string,
    periodEnd: string
  ): Promise<MarketTrendsSummary> {
    try {
      const { data, error } = await supabase.rpc('summarize_market_trends', {
        p_organization_id: organizationId,
        p_category: category,
        p_period_start: periodStart,
        p_period_end: periodEnd,
      });

      if (error) {
        throw new Error(`Failed to get market trends: ${error.message}`);
      }

      return {
        category: data.category,
        periodStart: data.period_start,
        periodEnd: data.period_end,
        trends: (data.trends || []).map(this.mapIntelTrend),
        totalEvents: data.total_events,
        topCompetitors: data.top_competitors || [],
      };
    } catch (error: any) {
      console.error('Get market trends error:', error);
      throw error;
    }
  }

  // =====================================================
  // AI SUMMARIZATION
  // =====================================================

  /**
   * Summarize competitor with GPT-4
   */
  async summarizeCompetitor(input: SummarizeCompetitorInput): Promise<GptCompetitorAnalysis> {
    try {
      // Get competitor profile
      const profile = await this.getCompetitorProfile(input.organizationId, input.competitorId);

      // Build GPT prompt
      const competitor = profile.competitor;
      const recentEvents = profile.recentEvents.slice(0, 10);

      const prompt = `You are a competitive intelligence analyst. Analyze the following competitor and provide strategic insights.

**Competitor: ${competitor.name}**

**Company Details:**
- Industry: ${competitor.industry || 'Unknown'}
- Funding Stage: ${competitor.fundingStage || 'Unknown'}
- Total Funding: $${competitor.totalFundingUsd?.toLocaleString() || 'Unknown'}
- Primary Product: ${competitor.primaryProduct || 'Unknown'}
- Target Market: ${competitor.targetMarket || 'Unknown'}

**Recent Activity (Last 30 days):**
${recentEvents.map((e) => `- [${e.eventType}] ${e.title} (${e.severity} severity)`).join('\n')}

**Existing Analysis:**
${competitor.positioningSummary || 'No existing analysis'}

Provide:
1. A concise positioning summary (2-3 sentences)
2. 3-5 key strengths
3. 3-5 weaknesses or vulnerabilities
4. 3-5 specific threats they pose to us
5. 2-4 opportunities we can exploit
6. 3-5 strategic recommendations for how to compete
7. 3 key takeaways

Format as JSON with keys: positioningSummary, strengths (array), weaknesses (array), threatsToUs (array), opportunities (array), strategicRecommendations (array), keyTakeaways (array)`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content:
              'You are a competitive intelligence analyst specializing in strategic competitor analysis. Provide actionable insights in JSON format.',
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

      // Update competitor with insights
      await supabase
        .from('competitors')
        .update({
          positioning_summary: gptResponse.positioningSummary,
          strengths: gptResponse.strengths,
          weaknesses: gptResponse.weaknesses,
          threats_to_us: gptResponse.threatsToUs,
          last_analyzed_at: new Date().toISOString(),
        })
        .eq('id', input.competitorId);

      const analysis: GptCompetitorAnalysis = {
        competitorId: input.competitorId,
        competitorName: competitor.name,
        positioningSummary: gptResponse.positioningSummary || '',
        strengths: gptResponse.strengths || [],
        weaknesses: gptResponse.weaknesses || [],
        threatsToUs: gptResponse.threatsToUs || [],
        opportunities: gptResponse.opportunities || [],
        strategicRecommendations: gptResponse.strategicRecommendations || [],
        keyTakeaways: gptResponse.keyTakeaways || [],
        generatedAt: new Date().toISOString(),
      };

      this.emit('competitor-analyzed', {
        competitorId: input.competitorId,
      });

      return analysis;
    } catch (error: any) {
      console.error('Summarize competitor error:', error);
      throw error;
    }
  }

  /**
   * Summarize market trends with GPT-4
   */
  async summarizeMarketTrends(input: SummarizeMarketInput): Promise<GptMarketAnalysis> {
    try {
      // Get market trends
      const marketSummary = await this.getMarketTrends(
        input.organizationId,
        input.category,
        input.periodStart,
        input.periodEnd
      );

      // Build GPT prompt
      const prompt = `You are a market intelligence analyst. Analyze the following market category and provide strategic insights.

**Market Category: ${input.category}**
**Period: ${input.periodStart} to ${input.periodEnd}**

**Market Activity:**
- Total Events: ${marketSummary.totalEvents}
- Active Competitors: ${marketSummary.topCompetitors.length}

**Top Competitors by Activity:**
${marketSummary.topCompetitors.slice(0, 5).map((c) => `- ${c.competitorName}: ${c.eventCount} events`).join('\n')}

**Identified Trends:**
${marketSummary.trends.map((t) => `- ${t.trendName}: ${t.momentum || 'Unknown'} momentum`).join('\n')}

Provide:
1. A concise market summary (2-3 sentences)
2. Overall category momentum (rising/stable/declining)
3. 4-6 key trends shaping the market
4. 3-5 threats to watch for
5. 3-5 opportunities to capitalize on
6. 3-5 strategic recommendations
7. Top 3-5 movers (competitors with notable activity)

Format as JSON with keys: summary, categoryMomentum, keyTrends (array), threats (array), opportunities (array), strategicRecommendations (array), topMovers (array with competitorName and activity fields)`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content:
              'You are a market intelligence analyst specializing in competitive landscape analysis. Provide actionable insights in JSON format.',
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

      const analysis: GptMarketAnalysis = {
        category: input.category,
        summary: gptResponse.summary || '',
        categoryMomentum: gptResponse.categoryMomentum || 'stable',
        keyTrends: gptResponse.keyTrends || [],
        threats: gptResponse.threats || [],
        opportunities: gptResponse.opportunities || [],
        strategicRecommendations: gptResponse.strategicRecommendations || [],
        topMovers: gptResponse.topMovers || [],
        generatedAt: new Date().toISOString(),
      };

      this.emit('market-analyzed', {
        category: input.category,
      });

      return analysis;
    } catch (error: any) {
      console.error('Summarize market trends error:', error);
      throw error;
    }
  }

  // =====================================================
  // DASHBOARD
  // =====================================================

  /**
   * Get dashboard snapshot
   */
  async getDashboardSnapshot(input: GetDashboardInput): Promise<CompetitiveDashboardData> {
    try {
      const { data, error } = await supabase.rpc('get_competitive_dashboard_data', {
        p_organization_id: input.organizationId,
        p_period_start: input.periodStart || null,
        p_period_end: input.periodEnd || null,
      });

      if (error) {
        throw new Error(`Failed to get dashboard data: ${error.message}`);
      }

      return {
        periodStart: data.period_start,
        periodEnd: data.period_end,
        totalCompetitors: data.total_competitors,
        activeCompetitors: data.active_competitors,
        totalEvents: data.total_events,
        criticalEvents: data.critical_events,
        topCompetitors: data.top_competitors || [],
        recentEvents: data.recent_events || [],
        eventDistribution: data.event_distribution || {},
      };
    } catch (error: any) {
      console.error('Get dashboard snapshot error:', error);
      throw error;
    }
  }

  // =====================================================
  // MAPPING FUNCTIONS
  // =====================================================

  private mapCompetitor(data: any): Competitor {
    return {
      id: data.id,
      organizationId: data.organization_id,
      name: data.name,
      description: data.description,
      website: data.website,
      logoUrl: data.logo_url,
      industry: data.industry,
      headquarters: data.headquarters,
      foundedYear: data.founded_year,
      employeeCount: data.employee_count,
      fundingStage: data.funding_stage,
      totalFundingUsd: data.total_funding_usd,
      primaryProduct: data.primary_product,
      productCategories: data.product_categories,
      targetMarket: data.target_market,
      linkedinUrl: data.linkedin_url,
      twitterHandle: data.twitter_handle,
      facebookUrl: data.facebook_url,
      isActive: data.is_active,
      priority: data.priority,
      addedBy: data.added_by,
      positioningSummary: data.positioning_summary,
      strengths: data.strengths,
      weaknesses: data.weaknesses,
      threatsToUs: data.threats_to_us,
      lastAnalyzedAt: data.last_analyzed_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapIntelEvent(data: any): IntelEvent {
    return {
      id: data.id,
      organizationId: data.organization_id,
      competitorId: data.competitor_id,
      eventType: data.event_type,
      severity: data.severity,
      sourceType: data.source_type,
      title: data.title,
      description: data.description,
      url: data.url,
      imageUrl: data.image_url,
      sourceName: data.source_name,
      author: data.author,
      publishedAt: data.published_at,
      detectedAt: data.detected_at,
      impactScore: data.impact_score,
      relevanceScore: data.relevance_score,
      actionRequired: data.action_required,
      actionNotes: data.action_notes,
      aiSummary: data.ai_summary,
      keyInsights: data.key_insights,
      affectedCampaigns: data.affected_campaigns,
      submittedBy: data.submitted_by,
      isVerified: data.is_verified,
      verifiedBy: data.verified_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapIntelTrend(data: any): IntelTrend {
    return {
      id: data.id,
      organizationId: data.organization_id,
      trendName: data.trend_name,
      category: data.category,
      description: data.description,
      momentum: data.momentum,
      growthRate: data.growth_rate,
      marketSizeUsd: data.market_size_usd,
      periodStart: data.period_start,
      periodEnd: data.period_end,
      relatedCompetitors: data.related_competitors,
      relatedIntelEvents: data.related_intel_events,
      keywords: data.keywords,
      opportunityScore: data.opportunity_score,
      threatScore: data.threat_score,
      strategicRecommendations: data.strategic_recommendations,
      aiSummary: data.ai_summary,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapCompetitorMetrics(data: any): CompetitorMetrics {
    return {
      id: data.id,
      organizationId: data.organization_id,
      competitorId: data.competitor_id,
      periodStart: data.period_start,
      periodEnd: data.period_end,
      windowType: data.window_type,
      productLaunches: data.product_launches,
      fundingEvents: data.funding_events,
      hiringEvents: data.hiring_events,
      layoffEvents: data.layoff_events,
      partnerships: data.partnerships,
      prCampaigns: data.pr_campaigns,
      socialMentions: data.social_mentions,
      mediaMentions: data.media_mentions,
      legalEvents: data.legal_events,
      totalEvents: data.total_events,
      averageSeverityScore: data.average_severity_score,
      averageImpactScore: data.average_impact_score,
      averageRelevanceScore: data.average_relevance_score,
      activityLevel: data.activity_level,
      trendingUp: data.trending_up,
      calculatedAt: data.calculated_at,
      createdAt: data.created_at,
    };
  }
}

// Export singleton instance
export const competitiveIntelEngine = new CompetitiveIntelEngine();
