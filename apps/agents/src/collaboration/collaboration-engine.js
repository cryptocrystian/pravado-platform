"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.collaborationEngine = exports.CollaborationEngine = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const openai_1 = __importDefault(require("openai"));
const events_1 = require("events");
const timeline_engine_1 = require("../timeline/timeline-engine");
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
class CollaborationEngine extends events_1.EventEmitter {
    async requestHandoff(input) {
        const { fromUserId, organizationId, ...rest } = input;
        const { data, error } = await supabase.rpc('create_handoff_request', {
            p_campaign_id: input.campaignId,
            p_from_user_id: fromUserId,
            p_to_user_id: input.toUserId,
            p_handoff_type: input.handoffType,
            p_message: input.message,
            p_metadata: input.metadata || {},
            p_organization_id: organizationId,
            p_expires_in_hours: input.expiresInHours || 72,
        });
        if (error) {
            throw new Error(`Failed to create handoff request: ${error.message}`);
        }
        const requestId = data;
        const { data: request, error: fetchError } = await supabase
            .from('handoff_requests')
            .select('*')
            .eq('id', requestId)
            .single();
        if (fetchError || !request) {
            throw new Error('Failed to fetch created handoff request');
        }
        const handoffRequest = this.mapHandoffRequest(request);
        try {
            await timeline_engine_1.timelineEngine.logEvent({
                campaignId: input.campaignId,
                eventType: 'HANDOFF_INITIATED',
                entityType: 'HANDOFF',
                entityId: requestId,
                summary: `Handoff requested: ${input.handoffType}`,
                details: input.message,
                metadata: {
                    handoffType: input.handoffType,
                    toUserId: input.toUserId,
                },
                actorType: 'user',
                actorId: fromUserId,
                status: 'pending',
                importanceScore: 0.7,
                relatedUserId: input.toUserId,
                organizationId,
            });
        }
        catch (error) {
            console.error('[CollaborationEngine] Failed to log timeline event:', error);
        }
        this.emit('handoff-requested', {
            requestId,
            fromUserId,
            toUserId: input.toUserId,
            campaignId: input.campaignId,
            handoffType: input.handoffType,
        });
        return handoffRequest;
    }
    async acceptHandoff(input) {
        const { data, error } = await supabase.rpc('accept_handoff', {
            p_request_id: input.requestId,
            p_user_id: input.userId,
            p_response_message: input.responseMessage || null,
            p_organization_id: input.organizationId,
        });
        if (error) {
            throw new Error(`Failed to accept handoff: ${error.message}`);
        }
        const { data: request } = await supabase
            .from('handoff_requests')
            .select('*')
            .eq('id', input.requestId)
            .single();
        if (request) {
            try {
                await timeline_engine_1.timelineEngine.logEvent({
                    campaignId: request.campaign_id,
                    eventType: 'DECISION_MADE',
                    entityType: 'HANDOFF',
                    entityId: input.requestId,
                    summary: `Handoff accepted`,
                    details: input.responseMessage,
                    metadata: {
                        handoffType: request.handoff_type,
                        fromUserId: request.from_user_id,
                    },
                    actorType: 'user',
                    actorId: input.userId,
                    status: 'success',
                    importanceScore: 0.7,
                    relatedUserId: request.from_user_id,
                    organizationId: input.organizationId,
                });
            }
            catch (error) {
                console.error('[CollaborationEngine] Failed to log timeline event:', error);
            }
            this.emit('handoff-accepted', {
                requestId: input.requestId,
                userId: input.userId,
                campaignId: request.campaign_id,
                handoffType: request.handoff_type,
            });
        }
        return data;
    }
    async declineHandoff(input) {
        const { data, error } = await supabase.rpc('decline_handoff', {
            p_request_id: input.requestId,
            p_user_id: input.userId,
            p_response_message: input.responseMessage || null,
            p_organization_id: input.organizationId,
        });
        if (error) {
            throw new Error(`Failed to decline handoff: ${error.message}`);
        }
        const { data: request } = await supabase
            .from('handoff_requests')
            .select('*')
            .eq('id', input.requestId)
            .single();
        if (request) {
            try {
                await timeline_engine_1.timelineEngine.logEvent({
                    campaignId: request.campaign_id,
                    eventType: 'DECISION_MADE',
                    entityType: 'HANDOFF',
                    entityId: input.requestId,
                    summary: `Handoff declined`,
                    details: input.responseMessage,
                    metadata: {
                        handoffType: request.handoff_type,
                        fromUserId: request.from_user_id,
                    },
                    actorType: 'user',
                    actorId: input.userId,
                    status: 'success',
                    importanceScore: 0.6,
                    relatedUserId: request.from_user_id,
                    organizationId: input.organizationId,
                });
            }
            catch (error) {
                console.error('[CollaborationEngine] Failed to log timeline event:', error);
            }
            this.emit('handoff-declined', {
                requestId: input.requestId,
                userId: input.userId,
                campaignId: request.campaign_id,
                handoffType: request.handoff_type,
            });
        }
        return data;
    }
    async getUserHandoffQueue(userId, organizationId) {
        const { data, error } = await supabase.rpc('get_active_handoffs_for_user', {
            p_user_id: userId,
            p_organization_id: organizationId,
        });
        if (error) {
            throw new Error(`Failed to get handoff queue: ${error.message}`);
        }
        return (data || []).map((row) => ({
            id: row.request_id,
            campaignId: row.campaign_id,
            campaignName: row.campaign_name,
            fromUserId: row.from_user_id,
            toUserId: userId,
            fromUser: {
                id: row.from_user_id,
                name: row.from_user_name,
            },
            toUser: {
                id: userId,
                name: '',
            },
            handoffType: row.handoff_type,
            message: row.message,
            metadata: row.metadata || {},
            status: 'PENDING',
            createdAt: row.created_at,
            updatedAt: row.created_at,
            expiresAt: row.expires_at,
            organizationId,
        }));
    }
    async createThread(input) {
        const { userId, organizationId, ...rest } = input;
        const { data, error } = await supabase.rpc('create_collaboration_thread', {
            p_campaign_id: input.campaignId,
            p_user_id: userId,
            p_title: input.title,
            p_description: input.description || null,
            p_is_private: input.isPrivate || false,
            p_visibility: input.visibility || 'CAMPAIGN_ONLY',
            p_organization_id: organizationId,
        });
        if (error) {
            throw new Error(`Failed to create thread: ${error.message}`);
        }
        const threadId = data;
        const { data: thread, error: fetchError } = await supabase
            .from('collaboration_threads')
            .select('*')
            .eq('id', threadId)
            .single();
        if (fetchError || !thread) {
            throw new Error('Failed to fetch created thread');
        }
        const collaborationThread = this.mapThread(thread);
        try {
            await timeline_engine_1.timelineEngine.logEvent({
                campaignId: input.campaignId,
                eventType: 'COLLABORATION_STARTED',
                entityType: 'COLLABORATION',
                entityId: threadId,
                summary: `Discussion thread created: ${input.title}`,
                details: input.description,
                metadata: {
                    visibility: input.visibility,
                    isPrivate: input.isPrivate,
                },
                actorType: 'user',
                actorId: userId,
                status: 'success',
                importanceScore: 0.5,
                organizationId,
            });
        }
        catch (error) {
            console.error('[CollaborationEngine] Failed to log timeline event:', error);
        }
        this.emit('thread-created', {
            threadId,
            campaignId: input.campaignId,
            userId,
        });
        return collaborationThread;
    }
    async addComment(input) {
        const { authorId, organizationId, ...rest } = input;
        const { data, error } = await supabase.rpc('add_collaboration_comment', {
            p_thread_id: input.threadId,
            p_author_id: authorId,
            p_content: input.content,
            p_mentions: input.mentions || null,
            p_attachments: input.attachments ? JSON.stringify(input.attachments) : null,
            p_parent_comment_id: input.parentCommentId || null,
            p_organization_id: organizationId,
        });
        if (error) {
            throw new Error(`Failed to add comment: ${error.message}`);
        }
        const commentId = data;
        const { data: comment, error: fetchError } = await supabase
            .from('collaboration_comments')
            .select('*')
            .eq('id', commentId)
            .single();
        if (fetchError || !comment) {
            throw new Error('Failed to fetch created comment');
        }
        const collaborationComment = this.mapComment(comment);
        const { data: thread } = await supabase
            .from('collaboration_threads')
            .select('campaign_id')
            .eq('id', input.threadId)
            .single();
        if (thread) {
            try {
                await timeline_engine_1.timelineEngine.logEvent({
                    campaignId: thread.campaign_id,
                    eventType: 'CRM_INTERACTION',
                    entityType: 'INTERACTION',
                    entityId: commentId,
                    summary: `Comment added to discussion`,
                    details: input.content.substring(0, 200),
                    metadata: {
                        threadId: input.threadId,
                        mentions: input.mentions,
                        hasAttachments: (input.attachments?.length || 0) > 0,
                    },
                    actorType: 'user',
                    actorId: authorId,
                    status: 'success',
                    importanceScore: 0.4,
                    organizationId,
                });
            }
            catch (error) {
                console.error('[CollaborationEngine] Failed to log timeline event:', error);
            }
            if (input.mentions && input.mentions.length > 0) {
                for (const mentionedUserId of input.mentions) {
                    await this.mentionUser(input.threadId, authorId, mentionedUserId, organizationId);
                }
            }
        }
        this.emit('comment-added', {
            commentId,
            threadId: input.threadId,
            authorId,
        });
        return collaborationComment;
    }
    async mentionUser(threadId, mentioningUserId, targetUserId, organizationId) {
        this.emit('user-mentioned', {
            threadId,
            mentioningUserId,
            targetUserId,
        });
        console.log(`[CollaborationEngine] User ${targetUserId} mentioned by ${mentioningUserId} in thread ${threadId}`);
    }
    async getCampaignDiscussion(campaignId, userId, organizationId) {
        const { data, error } = await supabase.rpc('get_collaboration_context_for_campaign', {
            p_campaign_id: campaignId,
            p_user_id: userId,
            p_organization_id: organizationId,
            p_include_comments: true,
        });
        if (error) {
            throw new Error(`Failed to get campaign discussion: ${error.message}`);
        }
        const context = data;
        return {
            threads: (context.threads || []).map((t) => this.mapThread(t)),
            comments: context.comments || {},
            totalThreads: (context.threads || []).length,
            totalComments: Object.values(context.comments || {}).reduce((sum, comments) => sum + comments.length, 0),
        };
    }
    async summarizeThread(input) {
        const { data: thread, error: threadError } = await supabase
            .from('collaboration_threads')
            .select('*')
            .eq('id', input.threadId)
            .eq('organization_id', input.organizationId)
            .single();
        if (threadError || !thread) {
            throw new Error('Thread not found');
        }
        const { data: comments, error: commentsError } = await supabase
            .from('collaboration_comments')
            .select('*')
            .eq('thread_id', input.threadId)
            .order('created_at', { ascending: true });
        if (commentsError) {
            throw new Error(`Failed to fetch comments: ${commentsError.message}`);
        }
        if (!comments || comments.length === 0) {
            return {
                threadId: input.threadId,
                summaryText: 'No comments to summarize yet.',
                generatedAt: new Date().toISOString(),
                generatedBy: 'gpt-4-turbo-preview',
            };
        }
        const prompt = this.buildSummaryPrompt(thread, comments, input);
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert at summarizing team discussions and identifying key points, action items, and decisions. Create clear, concise summaries that capture the essence of the conversation.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.5,
            max_tokens: 800,
        });
        const content = completion.choices[0].message.content;
        if (!content) {
            throw new Error('No content returned from OpenAI');
        }
        const result = JSON.parse(content);
        const summary = {
            threadId: input.threadId,
            summaryText: result.summary,
            keyPoints: result.keyPoints,
            actionItems: result.actionItems,
            participants: result.participants,
            generatedAt: new Date().toISOString(),
            generatedBy: 'gpt-4-turbo-preview',
        };
        await supabase
            .from('collaboration_threads')
            .update({
            summary: result.summary,
            summary_generated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
            .eq('id', input.threadId);
        return summary;
    }
    buildSummaryPrompt(thread, comments, input) {
        let prompt = `Thread Title: ${thread.title}\n`;
        if (thread.description) {
            prompt += `Description: ${thread.description}\n`;
        }
        prompt += `\nComments (${comments.length}):\n\n`;
        for (const comment of comments) {
            const timestamp = new Date(comment.created_at).toLocaleString();
            prompt += `[${timestamp}] Author ${comment.author_id}:\n${comment.content}\n\n`;
        }
        prompt += `\nPlease provide:\n`;
        prompt += `1. A concise summary (2-3 sentences) of the entire discussion\n`;
        prompt += `2. Key points discussed (up to 5 bullet points)\n`;
        if (input.includeActionItems) {
            prompt += `3. Action items or decisions made (if any)\n`;
        }
        prompt += `4. List of participant IDs who contributed\n\n`;
        prompt += `Return as JSON with keys: summary, keyPoints (array), actionItems (array), participants (array)`;
        return prompt;
    }
    mapHandoffRequest(row) {
        return {
            id: row.id,
            campaignId: row.campaign_id,
            fromUserId: row.from_user_id,
            toUserId: row.to_user_id,
            handoffType: row.handoff_type,
            message: row.message,
            metadata: row.metadata || {},
            status: row.status,
            responseMessage: row.response_message,
            respondedAt: row.responded_at,
            expiresAt: row.expires_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            organizationId: row.organization_id,
        };
    }
    mapThread(row) {
        return {
            id: row.id,
            campaignId: row.campaign_id || row.campaignId,
            title: row.title,
            description: row.description,
            createdBy: row.created_by || row.createdBy,
            isPrivate: row.is_private ?? row.isPrivate ?? false,
            visibility: row.visibility,
            lastActivityAt: row.last_activity_at || row.lastActivityAt,
            commentCount: row.comment_count ?? row.commentCount ?? 0,
            isLocked: row.is_locked ?? row.isLocked ?? false,
            isPinned: row.is_pinned ?? row.isPinned ?? false,
            summary: row.summary,
            summaryGeneratedAt: row.summary_generated_at || row.summaryGeneratedAt,
            metadata: row.metadata || {},
            createdAt: row.created_at || row.createdAt,
            updatedAt: row.updated_at || row.updatedAt,
            organizationId: row.organization_id || row.organizationId,
        };
    }
    mapComment(row) {
        return {
            id: row.id,
            threadId: row.thread_id,
            authorId: row.author_id,
            content: row.content,
            mentions: row.mentions || [],
            attachments: row.attachments || [],
            parentCommentId: row.parent_comment_id,
            isEdited: row.is_edited || false,
            editedAt: row.edited_at,
            metadata: row.metadata || {},
            createdAt: row.created_at,
            organizationId: row.organization_id,
        };
    }
}
exports.CollaborationEngine = CollaborationEngine;
exports.collaborationEngine = new CollaborationEngine();
//# sourceMappingURL=collaboration-engine.js.map