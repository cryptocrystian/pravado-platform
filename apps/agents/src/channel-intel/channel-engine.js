"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.channelEngine = exports.ChannelEngine = void 0;
const events_1 = require("events");
const supabase_js_1 = require("@supabase/supabase-js");
const openai_1 = __importDefault(require("openai"));
const timeline_engine_1 = require("../timeline/timeline-engine");
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
class ChannelEngine extends events_1.EventEmitter {
    async logEngagement(input) {
        let sentiment = input.sentiment || 'UNDETERMINED';
        let engagementScore = input.engagementScore || 0.5;
        if (input.rawMessage && input.sentiment === undefined) {
            const analysis = await this.analyzeSentiment({
                message: input.rawMessage,
                channelType: input.channelType,
                engagementType: input.engagementType,
            });
            sentiment = analysis.sentiment;
            engagementScore = analysis.sentimentScore;
        }
        const { data, error } = await supabase.rpc('log_engagement', {
            p_organization_id: input.organizationId,
            p_contact_id: input.contactId,
            p_campaign_id: input.campaignId,
            p_channel_type: input.channelType,
            p_engagement_type: input.engagementType,
            p_sentiment: sentiment,
            p_engagement_score: engagementScore,
            p_raw_message: input.rawMessage,
            p_metadata: input.metadata || {},
            p_agent_id: input.agentId,
            p_engaged_at: input.engagedAt || new Date().toISOString(),
        });
        if (error) {
            throw new Error(`Failed to log engagement: ${error.message}`);
        }
        const engagementId = data;
        if (input.campaignId) {
            await timeline_engine_1.timelineEngine.logEvent({
                organizationId: input.organizationId,
                campaignId: input.campaignId,
                eventType: 'CRM_INTERACTION',
                title: `${input.engagementType} via ${input.channelType}`,
                description: `Contact engaged: ${input.engagementType} (Sentiment: ${sentiment})`,
                metadata: {
                    engagementId,
                    channelType: input.channelType,
                    engagementType: input.engagementType,
                    sentiment,
                    engagementScore,
                },
                contactId: input.contactId,
            });
        }
        this.emit('engagement-logged', {
            engagementId,
            contactId: input.contactId,
            channelType: input.channelType,
            sentiment,
        });
        return engagementId;
    }
    async analyzeSentiment(input) {
        const prompt = this.buildSentimentPrompt(input);
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert at analyzing communication sentiment and tone. Classify messages accurately and objectively.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        });
        const response = completion.choices[0].message.content || '{}';
        const parsed = JSON.parse(response);
        return {
            sentiment: parsed.sentiment || 'NEUTRAL',
            sentimentScore: parsed.sentimentScore || 0.5,
            confidence: parsed.confidence || 0.7,
            reasoning: parsed.reasoning,
            detectedTone: parsed.detectedTone || 'neutral',
            keywords: parsed.keywords || [],
        };
    }
    buildSentimentPrompt(input) {
        let prompt = `Analyze the sentiment of this ${input.channelType} ${input.engagementType}:\n\n`;
        prompt += `Message: "${input.message}"\n\n`;
        if (input.contactContext) {
            prompt += `Contact Context:\n`;
            prompt += `- Name: ${input.contactContext.name}\n`;
            if (input.contactContext.previousSentiment) {
                prompt += `- Previous Sentiment: ${input.contactContext.previousSentiment}\n`;
            }
            if (input.contactContext.relationship) {
                prompt += `- Relationship: ${input.contactContext.relationship}\n`;
            }
            prompt += '\n';
        }
        prompt += 'Provide your analysis in JSON format with the following keys:\n';
        prompt += '- sentiment: "POSITIVE", "NEUTRAL", or "NEGATIVE"\n';
        prompt += '- sentimentScore: number between 0.0 (very negative) and 1.0 (very positive)\n';
        prompt += '- confidence: number between 0.0 and 1.0 for how confident you are\n';
        prompt += '- reasoning: brief explanation of your classification\n';
        prompt += '- detectedTone: description of the overall tone (e.g., "enthusiastic", "professional", "dismissive")\n';
        prompt += '- keywords: array of key words or phrases that influenced your decision\n\n';
        prompt += 'Guidelines:\n';
        prompt += '- POSITIVE: Enthusiastic, interested, friendly, appreciative\n';
        prompt += '- NEUTRAL: Professional, informative, matter-of-fact\n';
        prompt += '- NEGATIVE: Dismissive, annoyed, uninterested, hostile\n';
        prompt += '- Consider context: a brief reply might be neutral, not necessarily negative\n';
        return prompt;
    }
    async getBestChannelForContact(input) {
        const { data, error } = await supabase.rpc('get_channel_recommendations', {
            p_contact_id: input.contactId,
            p_organization_id: input.organizationId,
        });
        if (error) {
            throw new Error(`Failed to get channel recommendations: ${error.message}`);
        }
        const recommendations = [];
        for (const row of data || []) {
            if (input.excludeChannels?.includes(row.channel)) {
                continue;
            }
            const { data: timeData } = await supabase.rpc('get_best_time_to_contact', {
                p_contact_id: input.contactId,
                p_organization_id: input.organizationId,
            });
            const timeRec = timeData?.find((t) => t.channel === row.channel);
            const tone = await this.recommendTone(input.contactId, row.channel, input.organizationId);
            recommendations.push({
                channel: row.channel,
                score: parseFloat(row.score) || 0,
                rationale: row.rationale,
                recommendedTone: tone,
                bestTimeWindow: timeRec
                    ? {
                        hour: timeRec.preferred_hour,
                        dayOfWeek: timeRec.preferred_day_of_week,
                        confidence: timeRec.confidence_level,
                    }
                    : undefined,
            });
        }
        return recommendations;
    }
    async recommendTone(contactId, channel, organizationId) {
        const { data } = await supabase
            .from('channel_engagements')
            .select('sentiment, engagement_type')
            .eq('contact_id', contactId)
            .eq('channel_type', channel)
            .eq('organization_id', organizationId)
            .order('engaged_at', { ascending: false })
            .limit(5);
        if (!data || data.length === 0) {
            return 'professional';
        }
        const positiveCount = data.filter((e) => e.sentiment === 'POSITIVE').length;
        const negativeCount = data.filter((e) => e.sentiment === 'NEGATIVE').length;
        const hasReplies = data.some((e) => e.engagement_type === 'REPLY');
        if (positiveCount >= 3 && hasReplies) {
            return 'friendly';
        }
        else if (negativeCount >= 2) {
            return 'professional';
        }
        else if (hasReplies && positiveCount >= 1) {
            return 'consultative';
        }
        else {
            return 'professional';
        }
    }
    async getContactChannelProfile(contactId, organizationId) {
        const { data: perfData } = await supabase
            .from('channel_performance_aggregates')
            .select('*')
            .eq('contact_id', contactId)
            .eq('organization_id', organizationId);
        const performances = (perfData || []).map((p) => this.mapPerformanceFromDb(p));
        const recommendations = await this.getBestChannelForContact({
            contactId,
            organizationId,
        });
        const avgReceptiveness = performances.reduce((sum, p) => sum + p.contactReceptivenessScore, 0) /
            (performances.length || 1);
        const preferredChannel = performances.sort((a, b) => b.contactReceptivenessScore - a.contactReceptivenessScore)[0]?.channelType;
        const { data: engData } = await supabase
            .from('channel_engagements')
            .select('*')
            .eq('contact_id', contactId)
            .eq('organization_id', organizationId)
            .order('engaged_at', { ascending: false })
            .limit(20);
        const recentEngagements = (engData || []).map((e) => this.mapEngagementFromDb(e));
        const sentimentTrend = this.calculateSentimentTrend(recentEngagements);
        return {
            contactId,
            performances,
            recommendations,
            overallReceptiveness: avgReceptiveness,
            preferredChannel,
            sentimentTrend,
            recentEngagements,
        };
    }
    async getCampaignChannelStats(campaignId, organizationId) {
        const { data: perfData } = await supabase
            .from('channel_performance_aggregates')
            .select('*')
            .eq('campaign_id', campaignId)
            .eq('organization_id', organizationId);
        const performances = (perfData || []).map((p) => this.mapPerformanceFromDb(p));
        const sorted = [...performances].sort((a, b) => b.replyRate - a.replyRate);
        const bestPerformingChannel = sorted[0]?.channelType;
        const worstPerformingChannel = sorted[sorted.length - 1]?.channelType;
        const { count } = await supabase
            .from('channel_engagements')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaignId)
            .eq('organization_id', organizationId);
        const avgSentimentScore = performances.reduce((sum, p) => sum + p.avgSentimentScore, 0) / (performances.length || 1);
        const { data: topContactsData } = await supabase
            .from('channel_performance_aggregates')
            .select('contact_id')
            .not('contact_id', 'is', null)
            .eq('organization_id', organizationId)
            .order('contact_receptiveness_score', { ascending: false })
            .limit(10);
        const topContacts = await Promise.all((topContactsData || []).map(async (item) => {
            const { data: contactData } = await supabase
                .from('contacts')
                .select('name')
                .eq('id', item.contact_id)
                .single();
            const { data: perfData } = await supabase
                .from('channel_performance_aggregates')
                .select('contact_receptiveness_score')
                .eq('contact_id', item.contact_id)
                .eq('organization_id', organizationId)
                .order('contact_receptiveness_score', { ascending: false })
                .limit(1)
                .single();
            return {
                contactId: item.contact_id,
                contactName: contactData?.name || 'Unknown',
                receptivenessScore: perfData?.contact_receptiveness_score || 50,
            };
        }));
        return {
            campaignId,
            performances,
            bestPerformingChannel,
            worstPerformingChannel,
            totalEngagements: count || 0,
            avgSentimentScore,
            topContacts,
        };
    }
    async getSentimentTrends(contactId, organizationId, channelType) {
        const { data, error } = await supabase.rpc('get_sentiment_trends', {
            p_contact_id: contactId,
            p_organization_id: organizationId,
            p_channel_type: channelType,
            p_limit: 50,
        });
        if (error) {
            throw new Error(`Failed to get sentiment trends: ${error.message}`);
        }
        return (data || []).map((row) => ({
            date: row.engagement_date,
            channel: row.channel,
            sentiment: row.sentiment,
            engagementType: row.engagement_type,
            sentimentScore: parseFloat(row.sentiment_score) || 0.5,
            messagePreview: row.message_preview,
        }));
    }
    async summarizeSentimentTrends(input) {
        const trends = await this.getSentimentTrends(input.contactId, input.organizationId, input.channelType);
        const prompt = this.buildSentimentSummaryPrompt(trends, input);
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert at analyzing communication patterns and sentiment trends over time.',
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
        const avgByChannel = trends.reduce((acc, t) => {
            if (!acc[t.channel]) {
                acc[t.channel] = { sum: 0, count: 0 };
            }
            acc[t.channel].sum += t.sentimentScore;
            acc[t.channel].count += 1;
            return acc;
        }, {});
        const avgSentimentByChannel = Object.entries(avgByChannel).reduce((acc, [channel, data]) => {
            acc[channel] = data.sum / data.count;
            return acc;
        }, {});
        const engagementsByChannel = trends.reduce((acc, t) => {
            acc[t.channel] = (acc[t.channel] || 0) + 1;
            return acc;
        }, {});
        const mostEngagedChannel = Object.entries(engagementsByChannel).sort(([, a], [, b]) => b - a)[0]?.[0];
        return {
            contactId: input.contactId,
            overallTrend: parsed.overallTrend || 'STABLE',
            summaryText: parsed.summary || '',
            generatedAt: new Date().toISOString(),
            keyObservations: parsed.keyObservations || [],
            recommendations: input.includeRecommendations ? parsed.recommendations || [] : undefined,
            trendsData: trends,
            avgSentimentByChannel,
            mostEngagedChannel,
        };
    }
    buildSentimentSummaryPrompt(trends, input) {
        let prompt = `Analyze the following sentiment trends for a contact:\n\n`;
        prompt += `Recent Engagements (${trends.length} total):\n`;
        trends.slice(0, 20).forEach((t) => {
            prompt += `- ${t.date} | ${t.channel} | ${t.engagementType} | Sentiment: ${t.sentiment} (${t.sentimentScore.toFixed(2)})\n`;
            if (t.messagePreview) {
                prompt += `  Preview: "${t.messagePreview}"\n`;
            }
        });
        prompt += '\nProvide your analysis in JSON format with:\n';
        prompt += '- overallTrend: "IMPROVING", "STABLE", or "DECLINING"\n';
        prompt += '- summary: 2-3 sentence overview of sentiment patterns\n';
        prompt += '- keyObservations: array of 3-5 key insights\n';
        if (input.includeRecommendations) {
            prompt += '- recommendations: array of 3-5 actionable suggestions for outreach\n';
        }
        return prompt;
    }
    async getBestTimeToContact(contactId, organizationId) {
        const { data, error } = await supabase.rpc('get_best_time_to_contact', {
            p_contact_id: contactId,
            p_organization_id: organizationId,
        });
        if (error) {
            throw new Error(`Failed to get best time to contact: ${error.message}`);
        }
        return (data || []).map((row) => ({
            channel: row.channel,
            preferredHour: row.preferred_hour,
            preferredDayOfWeek: row.preferred_day_of_week,
            confidence: row.confidence_level,
            rationale: this.formatTimeRationale(row.preferred_hour, row.preferred_day_of_week),
        }));
    }
    formatTimeRationale(hour, dayOfWeek) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
        return `Most responsive on ${days[dayOfWeek]}s in the ${timeOfDay} (around ${hour % 12 || 12}${hour < 12 ? 'am' : 'pm'})`;
    }
    calculateSentimentTrend(engagements) {
        if (engagements.length < 3)
            return 'STABLE';
        const recent = engagements.slice(0, 5);
        const older = engagements.slice(5, 10);
        const recentAvg = recent.reduce((sum, e) => sum + e.engagementScore, 0) / (recent.length || 1);
        const olderAvg = older.reduce((sum, e) => sum + e.engagementScore, 0) / (older.length || 1);
        const diff = recentAvg - olderAvg;
        if (diff > 0.1)
            return 'IMPROVING';
        if (diff < -0.1)
            return 'DECLINING';
        return 'STABLE';
    }
    mapEngagementFromDb(data) {
        return {
            id: data.id,
            organizationId: data.organization_id,
            campaignId: data.campaign_id,
            contactId: data.contact_id,
            agentId: data.agent_id,
            channelType: data.channel_type,
            engagementType: data.engagement_type,
            sentiment: data.sentiment,
            engagementScore: parseFloat(data.engagement_score) || 0.5,
            rawMessage: data.raw_message,
            metadata: data.metadata,
            engagedAt: data.engaged_at,
            createdAt: data.created_at,
        };
    }
    mapPerformanceFromDb(data) {
        return {
            id: data.id,
            organizationId: data.organization_id,
            contactId: data.contact_id,
            campaignId: data.campaign_id,
            channelType: data.channel_type,
            totalSent: data.total_sent,
            totalOpened: data.total_opened,
            totalClicked: data.total_clicked,
            totalReplied: data.total_replied,
            totalConnected: data.total_connected,
            totalDismissed: data.total_dismissed,
            openRate: parseFloat(data.open_rate) || 0,
            clickRate: parseFloat(data.click_rate) || 0,
            replyRate: parseFloat(data.reply_rate) || 0,
            connectRate: parseFloat(data.connect_rate) || 0,
            avgSentimentScore: parseFloat(data.avg_sentiment_score) || 0.5,
            positiveRatio: parseFloat(data.positive_ratio) || 0,
            negativeRatio: parseFloat(data.negative_ratio) || 0,
            contactReceptivenessScore: data.contact_receptiveness_score,
            preferredHour: data.preferred_hour,
            preferredDayOfWeek: data.preferred_day_of_week,
            avgResponseTimeHours: data.avg_response_time_hours
                ? parseFloat(data.avg_response_time_hours)
                : undefined,
            lastEngagementAt: data.last_engagement_at,
            updatedAt: data.updated_at,
            createdAt: data.created_at,
        };
    }
}
exports.ChannelEngine = ChannelEngine;
exports.channelEngine = new ChannelEngine();
//# sourceMappingURL=channel-engine.js.map