// =====================================================
// MEDIA OPPORTUNITY AGENT - Proactive Scanner
// Sprint 67 Track B
// =====================================================

import { logger } from '../../lib/logger';
import { supabase } from '../../lib/supabase';
import newsFeed from '../../mocks/news-feed.json';
import type { NewsItem, MediaOpportunity, OpportunityScoreComponents, ScanResult } from './types';

export class MediaOpportunityAgent {
  /**
   * Scan news feed for relevant opportunities
   */
  async scanForOpportunities(
    organizationId: string,
    focusKeywords: string[] = [],
    minScore: number = 50
  ): Promise<ScanResult> {
    const startTime = Date.now();
    logger.info(`[MediaOpportunityAgent] Starting scan for org: ${organizationId}`);

    const opportunities: MediaOpportunity[] = [];

    // Get organization's strategy for context
    const strategy = await this.getOrganizationStrategy(organizationId);
    const orgKeywords = [...focusKeywords, ...(strategy?.keywords || [])];

    // Process each news item
    for (const item of newsFeed.items) {
      const newsItem = {
        ...item,
        publishedAt: new Date(item.publishedAt),
      };

      // Calculate opportunity scores
      const scores = this.calculateOpportunityScore(newsItem, orgKeywords);
      const finalScore = scores.relevance * scores.visibility * scores.freshness / 10000;

      // Only include if above threshold
      if (finalScore >= minScore) {
        const opportunity: MediaOpportunity = {
          organizationId,
          newsItemId: newsItem.id,
          title: newsItem.title,
          source: newsItem.source,
          url: newsItem.url,
          publishedAt: newsItem.publishedAt,
          opportunityScore: Math.round(finalScore),
          relevanceScore: scores.relevance,
          visibilityScore: scores.visibility,
          freshnessScore: scores.freshness,
          matchReasons: this.generateMatchReasons(newsItem, orgKeywords, scores),
          keywords: newsItem.keywords,
          status: 'NEW',
        };

        opportunities.push(opportunity);
      }
    }

    // Sort by score descending
    opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore);

    const scanDuration = Date.now() - startTime;
    logger.info(
      `[MediaOpportunityAgent] Scan complete | Found: ${opportunities.length} | ` +
      `Duration: ${scanDuration}ms`
    );

    return {
      scannedItems: newsFeed.items.length,
      opportunitiesFound: opportunities.length,
      opportunities,
      scanDuration,
    };
  }

  /**
   * Calculate opportunity score components
   * Formula: finalScore = relevance × visibility × freshness / 10000
   */
  private calculateOpportunityScore(
    newsItem: NewsItem,
    orgKeywords: string[]
  ): OpportunityScoreComponents {
    // Relevance (0-100): Keyword matching
    const relevance = this.calculateRelevance(newsItem, orgKeywords);

    // Visibility (0-100): Source authority
    const visibility = this.calculateVisibility(newsItem.source);

    // Freshness (0-100): Recency (decays over time)
    const freshness = this.calculateFreshness(newsItem.publishedAt);

    return { relevance, visibility, freshness };
  }

  /**
   * Calculate relevance score based on keyword matches
   */
  private calculateRelevance(newsItem: NewsItem, orgKeywords: string[]): number {
    if (orgKeywords.length === 0) return 50; // Default neutral

    const text = `${newsItem.title} ${newsItem.description} ${newsItem.keywords.join(' ')}`.toLowerCase();

    let matchCount = 0;
    for (const keyword of orgKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }

    // Calculate percentage of keywords matched
    const matchPercentage = (matchCount / orgKeywords.length) * 100;
    return Math.min(100, matchPercentage * 2); // Amplify to reach 100 faster
  }

  /**
   * Calculate visibility score based on source authority
   */
  private calculateVisibility(source: string): number {
    const sourceAuthority: Record<string, number> = {
      'TechCrunch': 95,
      'Bloomberg': 90,
      'Wall Street Journal': 90,
      'Reuters': 85,
      'Forbes': 80,
      'Wired': 75,
      'VentureBeat': 70,
    };

    return sourceAuthority[source] || 50; // Default for unknown sources
  }

  /**
   * Calculate freshness score based on age
   * Recent = 100, decays over time
   */
  private calculateFreshness(publishedAt: Date): number {
    const now = new Date();
    const ageInHours = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60);

    if (ageInHours < 24) return 100; // Less than 1 day
    if (ageInHours < 72) return 80;  // 1-3 days
    if (ageInHours < 168) return 60; // 3-7 days
    if (ageInHours < 336) return 40; // 1-2 weeks
    return 20; // Older than 2 weeks
  }

  /**
   * Generate human-readable match reasons
   */
  private generateMatchReasons(
    newsItem: NewsItem,
    orgKeywords: string[],
    scores: OpportunityScoreComponents
  ): string[] {
    const reasons: string[] = [];

    // Relevance reasons
    const matchedKeywords = newsItem.keywords.filter((keyword) =>
      orgKeywords.some((orgKw) => keyword.toLowerCase().includes(orgKw.toLowerCase()))
    );
    if (matchedKeywords.length > 0) {
      reasons.push(`Matches ${matchedKeywords.length} focus keywords: ${matchedKeywords.join(', ')}`);
    }

    // Visibility reasons
    if (scores.visibility >= 80) {
      reasons.push(`High-authority source: ${newsItem.source}`);
    }

    // Freshness reasons
    if (scores.freshness >= 80) {
      reasons.push('Recently published (last 3 days)');
    }

    // Category reasons
    if (newsItem.category) {
      reasons.push(`Category: ${newsItem.category}`);
    }

    return reasons;
  }

  /**
   * Save opportunities to database
   */
  async saveOpportunities(opportunities: MediaOpportunity[]): Promise<void> {
    if (opportunities.length === 0) return;

    const { error } = await supabase
      .from('media_opportunities')
      .upsert(
        opportunities.map((opp) => ({
          organization_id: opp.organizationId,
          news_item_id: opp.newsItemId,
          title: opp.title,
          source: opp.source,
          url: opp.url,
          published_at: opp.publishedAt.toISOString(),
          opportunity_score: opp.opportunityScore,
          relevance_score: opp.relevanceScore,
          visibility_score: opp.visibilityScore,
          freshness_score: opp.freshnessScore,
          match_reasons: opp.matchReasons,
          keywords: opp.keywords,
          status: opp.status,
        })),
        { onConflict: 'organization_id,news_item_id' }
      );

    if (error) {
      logger.error('[MediaOpportunityAgent] Failed to save opportunities:', error);
      throw error;
    }

    logger.info(`[MediaOpportunityAgent] Saved ${opportunities.length} opportunities`);
  }

  /**
   * Get organization strategy for context
   */
  private async getOrganizationStrategy(organizationId: string): Promise<any> {
    const { data } = await supabase
      .from('strategies')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    return data;
  }
}

export const mediaOpportunityAgent = new MediaOpportunityAgent();
