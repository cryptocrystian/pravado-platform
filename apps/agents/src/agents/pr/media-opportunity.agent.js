"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaOpportunityAgent = exports.MediaOpportunityAgent = void 0;
const logger_1 = require("../../lib/logger");
const supabase_1 = require("../../lib/supabase");
const news_feed_json_1 = __importDefault(require("../../mocks/news-feed.json"));
class MediaOpportunityAgent {
    async scanForOpportunities(organizationId, focusKeywords = [], minScore = 50) {
        const startTime = Date.now();
        logger_1.logger.info(`[MediaOpportunityAgent] Starting scan for org: ${organizationId}`);
        const opportunities = [];
        const strategy = await this.getOrganizationStrategy(organizationId);
        const orgKeywords = [...focusKeywords, ...(strategy?.keywords || [])];
        for (const item of news_feed_json_1.default.items) {
            const newsItem = {
                ...item,
                publishedAt: new Date(item.publishedAt),
            };
            const scores = this.calculateOpportunityScore(newsItem, orgKeywords);
            const finalScore = scores.relevance * scores.visibility * scores.freshness / 10000;
            if (finalScore >= minScore) {
                const opportunity = {
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
        opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore);
        const scanDuration = Date.now() - startTime;
        logger_1.logger.info(`[MediaOpportunityAgent] Scan complete | Found: ${opportunities.length} | ` +
            `Duration: ${scanDuration}ms`);
        return {
            scannedItems: news_feed_json_1.default.items.length,
            opportunitiesFound: opportunities.length,
            opportunities,
            scanDuration,
        };
    }
    calculateOpportunityScore(newsItem, orgKeywords) {
        const relevance = this.calculateRelevance(newsItem, orgKeywords);
        const visibility = this.calculateVisibility(newsItem.source);
        const freshness = this.calculateFreshness(newsItem.publishedAt);
        return { relevance, visibility, freshness };
    }
    calculateRelevance(newsItem, orgKeywords) {
        if (orgKeywords.length === 0)
            return 50;
        const text = `${newsItem.title} ${newsItem.description} ${newsItem.keywords.join(' ')}`.toLowerCase();
        let matchCount = 0;
        for (const keyword of orgKeywords) {
            if (text.includes(keyword.toLowerCase())) {
                matchCount++;
            }
        }
        const matchPercentage = (matchCount / orgKeywords.length) * 100;
        return Math.min(100, matchPercentage * 2);
    }
    calculateVisibility(source) {
        const sourceAuthority = {
            'TechCrunch': 95,
            'Bloomberg': 90,
            'Wall Street Journal': 90,
            'Reuters': 85,
            'Forbes': 80,
            'Wired': 75,
            'VentureBeat': 70,
        };
        return sourceAuthority[source] || 50;
    }
    calculateFreshness(publishedAt) {
        const now = new Date();
        const ageInHours = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60);
        if (ageInHours < 24)
            return 100;
        if (ageInHours < 72)
            return 80;
        if (ageInHours < 168)
            return 60;
        if (ageInHours < 336)
            return 40;
        return 20;
    }
    generateMatchReasons(newsItem, orgKeywords, scores) {
        const reasons = [];
        const matchedKeywords = newsItem.keywords.filter((keyword) => orgKeywords.some((orgKw) => keyword.toLowerCase().includes(orgKw.toLowerCase())));
        if (matchedKeywords.length > 0) {
            reasons.push(`Matches ${matchedKeywords.length} focus keywords: ${matchedKeywords.join(', ')}`);
        }
        if (scores.visibility >= 80) {
            reasons.push(`High-authority source: ${newsItem.source}`);
        }
        if (scores.freshness >= 80) {
            reasons.push('Recently published (last 3 days)');
        }
        if (newsItem.category) {
            reasons.push(`Category: ${newsItem.category}`);
        }
        return reasons;
    }
    async saveOpportunities(opportunities) {
        if (opportunities.length === 0)
            return;
        const { error } = await supabase_1.supabase
            .from('media_opportunities')
            .upsert(opportunities.map((opp) => ({
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
        })), { onConflict: 'organization_id,news_item_id' });
        if (error) {
            logger_1.logger.error('[MediaOpportunityAgent] Failed to save opportunities:', error);
            throw error;
        }
        logger_1.logger.info(`[MediaOpportunityAgent] Saved ${opportunities.length} opportunities`);
    }
    async getOrganizationStrategy(organizationId) {
        const { data } = await supabase_1.supabase
            .from('strategies')
            .select('*')
            .eq('organization_id', organizationId)
            .single();
        return data;
    }
}
exports.MediaOpportunityAgent = MediaOpportunityAgent;
exports.mediaOpportunityAgent = new MediaOpportunityAgent();
//# sourceMappingURL=media-opportunity.agent.js.map