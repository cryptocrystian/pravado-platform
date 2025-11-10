"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadScoringEngine = exports.LeadScoringEngine = void 0;
const events_1 = require("events");
const supabase_js_1 = require("@supabase/supabase-js");
const openai_1 = __importDefault(require("openai"));
const timeline_engine_1 = require("../timeline/timeline-engine");
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
class LeadScoringEngine extends events_1.EventEmitter {
    async calculateLeadScore(input) {
        const { data, error } = await supabase.rpc('calculate_lead_score', {
            p_contact_id: input.contactId,
            p_campaign_id: input.campaignId,
            p_organization_id: input.organizationId,
        });
        if (error) {
            throw new Error(`Failed to calculate lead score: ${error.message}`);
        }
        const leadScore = await this.getLeadScore(input.contactId, input.campaignId, input.organizationId);
        if (!leadScore) {
            throw new Error('Lead score not found after calculation');
        }
        if (input.campaignId) {
            await timeline_engine_1.timelineEngine.logEvent({
                organizationId: input.organizationId,
                campaignId: input.campaignId,
                eventType: 'DECISION_MADE',
                title: `Lead score calculated: ${leadScore.rawScore}`,
                description: `Score: ${leadScore.rawScore}/100 (${leadScore.ragStatus})`,
                metadata: {
                    leadScoreId: leadScore.id,
                    rawScore: leadScore.rawScore,
                    ragStatus: leadScore.ragStatus,
                    componentScores: {
                        engagement: leadScore.engagementScore,
                        sentiment: leadScore.sentimentScore,
                        behavior: leadScore.behaviorScore,
                        fit: leadScore.fitScore,
                    },
                },
                contactId: input.contactId,
            });
        }
        this.emit('lead-score-calculated', {
            contactId: input.contactId,
            score: leadScore.rawScore,
            ragStatus: leadScore.ragStatus,
        });
        if (leadScore.rawScore >= 70 && leadScore.stage === 'UNQUALIFIED') {
            await this.autoQualify({
                contactId: input.contactId,
                campaignId: input.campaignId,
                organizationId: input.organizationId,
                threshold: 70,
            });
        }
        return leadScore;
    }
    async getLeadScore(contactId, campaignId, organizationId) {
        const { data, error } = await supabase
            .from('lead_scores')
            .select('*')
            .eq('contact_id', contactId)
            .eq('organization_id', organizationId)
            .eq('campaign_id', campaignId || null)
            .single();
        if (error || !data) {
            return null;
        }
        return this.mapLeadScoreFromDb(data);
    }
    async updateStage(input) {
        const { data, error } = await supabase.rpc('update_lead_stage', {
            p_contact_id: input.contactId,
            p_campaign_id: input.campaignId,
            p_organization_id: input.organizationId,
            p_new_stage: input.newStage,
            p_disqualification_reason: input.disqualificationReason,
            p_disqualification_notes: input.disqualificationNotes,
            p_user_id: input.userId,
            p_source: input.source || 'MANUAL',
        });
        if (error) {
            throw new Error(`Failed to update lead stage: ${error.message}`);
        }
        if (input.campaignId) {
            await timeline_engine_1.timelineEngine.logEvent({
                organizationId: input.organizationId,
                campaignId: input.campaignId,
                eventType: 'DECISION_MADE',
                title: `Lead stage changed to ${input.newStage}`,
                description: input.disqualificationNotes || `Stage updated to ${input.newStage}`,
                metadata: {
                    newStage: input.newStage,
                    disqualificationReason: input.disqualificationReason,
                    source: input.source,
                },
                contactId: input.contactId,
                userId: input.userId,
            });
        }
        this.emit('lead-stage-updated', {
            contactId: input.contactId,
            newStage: input.newStage,
            disqualificationReason: input.disqualificationReason,
        });
        return data;
    }
    async autoQualify(input) {
        const threshold = input.threshold || 70;
        const leadScore = await this.getLeadScore(input.contactId, input.campaignId, input.organizationId);
        if (!leadScore) {
            return false;
        }
        if (leadScore.stage === 'QUALIFIED' || leadScore.stage === 'DISQUALIFIED') {
            return false;
        }
        if (leadScore.rawScore < threshold) {
            return false;
        }
        await this.updateStage({
            contactId: input.contactId,
            campaignId: input.campaignId,
            organizationId: input.organizationId,
            newStage: 'QUALIFIED',
            source: 'SYSTEM',
        });
        return true;
    }
    async getLeadScoreSummary(campaignId, organizationId) {
        const { data, error } = await supabase.rpc('get_lead_score_summary', {
            p_campaign_id: campaignId,
            p_organization_id: organizationId,
        });
        if (error) {
            throw new Error(`Failed to get lead score summary: ${error.message}`);
        }
        const row = data[0];
        return {
            campaignId,
            totalLeads: parseInt(row.total_leads) || 0,
            qualifiedCount: parseInt(row.qualified_count) || 0,
            disqualifiedCount: parseInt(row.disqualified_count) || 0,
            inProgressCount: parseInt(row.in_progress_count) || 0,
            unqualifiedCount: parseInt(row.unqualified_count) || 0,
            avgScore: parseFloat(row.avg_score) || 0,
            greenCount: parseInt(row.green_count) || 0,
            amberCount: parseInt(row.amber_count) || 0,
            redCount: parseInt(row.red_count) || 0,
            qualificationRate: parseInt(row.total_leads) > 0
                ? (parseInt(row.qualified_count) / parseInt(row.total_leads)) * 100
                : 0,
            disqualificationRate: parseInt(row.total_leads) > 0
                ? (parseInt(row.disqualified_count) / parseInt(row.total_leads)) * 100
                : 0,
        };
    }
    async getLeadTrends(contactId, organizationId) {
        const { data, error } = await supabase.rpc('get_lead_trend', {
            p_contact_id: contactId,
            p_organization_id: organizationId,
            p_limit: 50,
        });
        if (error) {
            throw new Error(`Failed to get lead trends: ${error.message}`);
        }
        const trends = (data || []).map((row) => ({
            timestamp: row.timestamp,
            score: row.score,
            stage: row.stage,
            changeType: row.change_type,
            source: row.source,
        }));
        const currentLead = await this.getLeadScore(contactId, undefined, organizationId);
        const currentScore = currentLead?.rawScore || 0;
        const scores = trends.map((t) => t.score).filter((s) => s !== null && s !== undefined);
        const highestScore = Math.max(...scores, currentScore);
        const lowestScore = Math.min(...scores, currentScore);
        const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        const recent = trends.slice(0, 5).map((t) => t.score);
        const older = trends.slice(5, 10).map((t) => t.score);
        const recentAvg = recent.reduce((a, b) => a + b, 0) / (recent.length || 1);
        const olderAvg = older.reduce((a, b) => a + b, 0) / (older.length || 1);
        let trendDirection;
        if (recentAvg > olderAvg + 5) {
            trendDirection = 'IMPROVING';
        }
        else if (recentAvg < olderAvg - 5) {
            trendDirection = 'DECLINING';
        }
        else {
            trendDirection = 'STABLE';
        }
        return {
            contactId,
            trends,
            currentScore,
            highestScore,
            lowestScore,
            avgScore,
            trendDirection,
        };
    }
    async summarizeLeadPerformance(input) {
        const leadScore = await this.getLeadScore(input.contactId, input.campaignId, input.organizationId);
        if (!leadScore) {
            throw new Error('Lead score not found');
        }
        const trends = await this.getLeadTrends(input.contactId, input.organizationId);
        const prompt = this.buildPerformanceSummaryPrompt(leadScore, trends, input);
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert sales analyst evaluating lead quality and providing actionable insights.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.7,
            response_format: { type: 'json_object' },
        });
        const response = completion.choices[0].message.content || '{}';
        const parsed = JSON.parse(response);
        return {
            contactId: input.contactId,
            currentScore: leadScore.rawScore,
            currentStage: leadScore.stage,
            summaryText: parsed.summary || '',
            generatedAt: new Date().toISOString(),
            strengths: parsed.strengths || [],
            weaknesses: parsed.weaknesses || [],
            recommendedActions: input.includeRecommendations ? parsed.recommendedActions || [] : undefined,
            componentScores: {
                engagement: leadScore.engagementScore,
                sentiment: leadScore.sentimentScore,
                behavior: leadScore.behaviorScore,
                fit: leadScore.fitScore,
            },
            shouldQualify: parsed.shouldQualify || false,
            qualificationReasoning: parsed.qualificationReasoning,
        };
    }
    buildPerformanceSummaryPrompt(leadScore, trends, input) {
        let prompt = `Analyze this lead's performance:\n\n`;
        prompt += `Current Score: ${leadScore.rawScore}/100 (${leadScore.ragStatus})\n`;
        prompt += `Stage: ${leadScore.stage}\n`;
        prompt += `Confidence: ${(leadScore.confidenceScore * 100).toFixed(0)}%\n\n`;
        prompt += `Component Scores:\n`;
        prompt += `- Engagement: ${leadScore.engagementScore}/100\n`;
        prompt += `- Sentiment: ${leadScore.sentimentScore}/100\n`;
        prompt += `- Behavior: ${leadScore.behaviorScore}/100\n`;
        prompt += `- Fit: ${leadScore.fitScore}/100\n\n`;
        prompt += `Trend: ${trends.trendDirection}\n`;
        prompt += `Score Range: ${trends.lowestScore} - ${trends.highestScore}\n`;
        prompt += `Recent Changes: ${trends.trends.length} events tracked\n\n`;
        prompt += 'Provide analysis in JSON format with:\n';
        prompt += '- summary: 2-3 sentence overview\n';
        prompt += '- strengths: array of 2-4 positive points\n';
        prompt += '- weaknesses: array of 1-3 areas of concern\n';
        if (input.includeRecommendations) {
            prompt += '- recommendedActions: array of 3-5 specific actions to take\n';
        }
        prompt += '- shouldQualify: boolean (should this lead be qualified?)\n';
        prompt += '- qualificationReasoning: brief explanation of qualification recommendation\n';
        return prompt;
    }
    async getTopLeads(campaignId, organizationId, limit = 20) {
        const { data, error } = await supabase
            .from('lead_scores')
            .select('*')
            .eq('campaign_id', campaignId)
            .eq('organization_id', organizationId)
            .order('raw_score', { ascending: false })
            .limit(limit);
        if (error) {
            throw new Error(`Failed to get top leads: ${error.message}`);
        }
        const leads = (data || []).map((d) => this.mapLeadScoreFromDb(d));
        const avgScore = leads.reduce((sum, l) => sum + l.rawScore, 0) / (leads.length || 1);
        return {
            leads,
            total: leads.length,
            avgScore,
        };
    }
    async getQualifiedLeads(organizationId, campaignId) {
        let query = supabase
            .from('lead_scores')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('stage', 'QUALIFIED');
        if (campaignId) {
            query = query.eq('campaign_id', campaignId);
        }
        const { data, error } = await query.order('raw_score', { ascending: false });
        if (error) {
            throw new Error(`Failed to get qualified leads: ${error.message}`);
        }
        const leads = (data || []).map((d) => this.mapLeadScoreFromDb(d));
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentlyQualified = leads.filter((l) => new Date(l.lastStageChangeAt) > sevenDaysAgo);
        const avgScore = leads.reduce((sum, l) => sum + l.rawScore, 0) / (leads.length || 1);
        return {
            leads,
            total: leads.length,
            avgScore,
            recentlyQualified,
        };
    }
    async getDisqualifiedLeads(organizationId, campaignId) {
        let query = supabase
            .from('lead_scores')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('stage', 'DISQUALIFIED');
        if (campaignId) {
            query = query.eq('campaign_id', campaignId);
        }
        const { data, error } = await query.order('updated_at', { ascending: false });
        if (error) {
            throw new Error(`Failed to get disqualified leads: ${error.message}`);
        }
        const leads = (data || []).map((d) => this.mapLeadScoreFromDb(d));
        const byReason = leads.reduce((acc, lead) => {
            if (lead.disqualificationReason) {
                acc[lead.disqualificationReason] = (acc[lead.disqualificationReason] || 0) + 1;
            }
            return acc;
        }, {});
        return {
            leads,
            total: leads.length,
            byReason,
        };
    }
    mapLeadScoreFromDb(data) {
        return {
            id: data.id,
            organizationId: data.organization_id,
            contactId: data.contact_id,
            campaignId: data.campaign_id,
            rawScore: data.raw_score,
            confidenceScore: parseFloat(data.confidence_score) || 0.5,
            stage: data.stage,
            disqualificationReason: data.disqualification_reason,
            disqualificationNotes: data.disqualification_notes,
            engagementScore: data.engagement_score,
            sentimentScore: data.sentiment_score,
            behaviorScore: data.behavior_score,
            fitScore: data.fit_score,
            lastCalculatedAt: data.last_calculated_at,
            lastStageChangeAt: data.last_stage_change_at,
            calculatedBy: data.calculated_by,
            ragStatus: data.rag_status,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };
    }
}
exports.LeadScoringEngine = LeadScoringEngine;
exports.leadScoringEngine = new LeadScoringEngine();
//# sourceMappingURL=lead-engine.js.map