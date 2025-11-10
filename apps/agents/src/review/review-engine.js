"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewEngine = exports.ReviewEngine = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const types_1 = require("@pravado/types");
const memory_service_1 = require("../memory/memory-service");
const events_1 = require("events");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
class ReviewEngine extends events_1.EventEmitter {
    async createReviewRequest(input) {
        const validatedInput = types_1.CreateAgentReviewInputSchema.parse(input);
        await supabase.rpc('set_config', {
            setting: 'app.current_organization_id',
            value: validatedInput.organizationId,
        });
        const context = await this.fetchReviewContext(validatedInput.reviewableEntityType, validatedInput.reviewableEntityId, validatedInput.organizationId);
        const dueDate = validatedInput.dueDate || this.calculateDueDate(validatedInput.priority);
        const { data: review, error } = await supabase
            .from('agent_reviews')
            .insert({
            review_type: validatedInput.reviewType,
            priority: validatedInput.priority || 'MEDIUM',
            status: 'PENDING',
            reviewable_entity_type: validatedInput.reviewableEntityType,
            reviewable_entity_id: validatedInput.reviewableEntityId,
            title: validatedInput.title,
            description: validatedInput.description || null,
            content_to_review: validatedInput.contentToReview,
            context: { ...validatedInput.context, ...context },
            requesting_agent_id: validatedInput.requestingAgentId || null,
            agent_reasoning: validatedInput.agentReasoning || null,
            assigned_to: validatedInput.assignedTo || null,
            due_date: dueDate,
            submitted_at: new Date(),
            organization_id: validatedInput.organizationId,
        })
            .select()
            .single();
        if (error) {
            console.error('Failed to create review:', error);
            throw new Error(`Failed to create review: ${error.message}`);
        }
        this.emit('review:created', {
            review: this.mapDbReviewToType(review),
            assignedTo: validatedInput.assignedTo,
        });
        console.log(`[ReviewEngine] Created review ${review.id} for ${validatedInput.reviewableEntityType}`);
        return this.mapDbReviewToType(review);
    }
    async submitReviewDecision(input, organizationId) {
        const validatedInput = types_1.SubmitReviewDecisionInputSchema.parse(input);
        await supabase.rpc('set_config', {
            setting: 'app.current_organization_id',
            value: organizationId,
        });
        const { data: existingReview, error: fetchError } = await supabase
            .from('agent_reviews')
            .select('*')
            .eq('id', validatedInput.reviewId)
            .eq('organization_id', organizationId)
            .single();
        if (fetchError || !existingReview) {
            throw new Error(`Review not found: ${validatedInput.reviewId}`);
        }
        if (existingReview.status !== 'PENDING' && existingReview.status !== 'ESCALATED') {
            throw new Error(`Review is not in a reviewable state: ${existingReview.status}`);
        }
        const statusMap = {
            APPROVED: 'APPROVED',
            REJECTED: 'REJECTED',
            NEEDS_EDIT: 'NEEDS_EDIT',
        };
        const newStatus = statusMap[validatedInput.decision];
        const { data: updatedReview, error: updateError } = await supabase
            .from('agent_reviews')
            .update({
            status: newStatus,
            decision_summary: validatedInput.decisionSummary,
            decision_reasoning: validatedInput.decisionReasoning || null,
            modifications: validatedInput.modifications || null,
            reviewed_by: validatedInput.reviewedBy,
            reviewed_at: new Date(),
        })
            .eq('id', validatedInput.reviewId)
            .eq('organization_id', organizationId)
            .select()
            .single();
        if (updateError) {
            console.error('Failed to submit review decision:', updateError);
            throw new Error(`Failed to submit decision: ${updateError.message}`);
        }
        const review = this.mapDbReviewToType(updatedReview);
        const nextActions = [];
        let agentNotification;
        if (newStatus === 'APPROVED') {
            nextActions.push('Resume agent execution');
            nextActions.push('Record approval in agent memory');
            if (existingReview.requesting_agent_id) {
                agentNotification = {
                    agentId: existingReview.requesting_agent_id,
                    message: `Your ${existingReview.reviewable_entity_type} has been approved.`,
                    learnings: [`Approved decision pattern: ${validatedInput.decisionSummary}`],
                };
            }
        }
        else if (newStatus === 'REJECTED') {
            nextActions.push('Notify agent of rejection');
            nextActions.push('Store rejection feedback in agent memory');
            nextActions.push('Consider alternative approach');
            if (existingReview.requesting_agent_id) {
                agentNotification = {
                    agentId: existingReview.requesting_agent_id,
                    message: `Your ${existingReview.reviewable_entity_type} was rejected: ${validatedInput.decisionSummary}`,
                    learnings: [
                        `Rejected pattern: ${existingReview.reviewable_entity_type}`,
                        `Feedback: ${validatedInput.decisionReasoning || validatedInput.decisionSummary}`,
                    ],
                };
            }
        }
        else if (newStatus === 'NEEDS_EDIT') {
            nextActions.push('Provide modifications to agent');
            nextActions.push('Agent revises and resubmits');
            if (existingReview.requesting_agent_id) {
                agentNotification = {
                    agentId: existingReview.requesting_agent_id,
                    message: `Your ${existingReview.reviewable_entity_type} needs revisions: ${validatedInput.decisionSummary}`,
                    learnings: [`Modification requested: ${validatedInput.decisionSummary}`],
                };
            }
        }
        if (agentNotification && existingReview.requesting_agent_id) {
            await this.recordReviewLearning(existingReview.requesting_agent_id, review, organizationId);
        }
        this.emit('review:decided', {
            review,
            decision: validatedInput.decision,
            reviewedBy: validatedInput.reviewedBy,
            agentNotification,
        });
        console.log(`[ReviewEngine] Review ${validatedInput.reviewId} decided: ${validatedInput.decision}`);
        return {
            review,
            nextActions,
            agentNotification,
        };
    }
    async getReview(reviewId, organizationId) {
        await supabase.rpc('set_config', {
            setting: 'app.current_organization_id',
            value: organizationId,
        });
        const { data, error } = await supabase
            .from('agent_reviews')
            .select('*')
            .eq('id', reviewId)
            .eq('organization_id', organizationId)
            .single();
        if (error || !data)
            return null;
        return this.mapDbReviewToType(data);
    }
    async updateReview(reviewId, input, organizationId) {
        const validatedInput = types_1.UpdateAgentReviewInputSchema.parse(input);
        await supabase.rpc('set_config', {
            setting: 'app.current_organization_id',
            value: organizationId,
        });
        const updateData = {};
        if (validatedInput.status)
            updateData.status = validatedInput.status;
        if (validatedInput.priority)
            updateData.priority = validatedInput.priority;
        if (validatedInput.decisionSummary)
            updateData.decision_summary = validatedInput.decisionSummary;
        if (validatedInput.decisionReasoning)
            updateData.decision_reasoning = validatedInput.decisionReasoning;
        if (validatedInput.modifications)
            updateData.modifications = validatedInput.modifications;
        if (validatedInput.assignedTo)
            updateData.assigned_to = validatedInput.assignedTo;
        const { data: updatedReview, error } = await supabase
            .from('agent_reviews')
            .update(updateData)
            .eq('id', reviewId)
            .eq('organization_id', organizationId)
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to update review: ${error.message}`);
        }
        return this.mapDbReviewToType(updatedReview);
    }
    async addComment(input) {
        await supabase.rpc('set_config', {
            setting: 'app.current_organization_id',
            value: input.organizationId,
        });
        const { data: comment, error } = await supabase
            .from('review_comments')
            .insert({
            review_id: input.reviewId,
            parent_comment_id: input.parentCommentId || null,
            content: input.content,
            comment_type: input.commentType || 'FEEDBACK',
            is_internal: input.isInternal || false,
            is_resolution: false,
            highlighted_section: input.highlightedSection || null,
            line_number: input.lineNumber || null,
            author_id: input.authorId,
            author_type: 'USER',
            upvotes: 0,
            is_resolved: false,
            organization_id: input.organizationId,
        })
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to add comment: ${error.message}`);
        }
        this.emit('review:comment', {
            reviewId: input.reviewId,
            comment: this.mapDbCommentToType(comment),
        });
        return this.mapDbCommentToType(comment);
    }
    async getUserPendingReviews(userId, organizationId) {
        await supabase.rpc('set_config', {
            setting: 'app.current_organization_id',
            value: organizationId,
        });
        const { data, error } = await supabase
            .from('agent_reviews')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('status', 'PENDING')
            .or(`assigned_to.eq.${userId}`)
            .order('priority', { ascending: false })
            .order('due_date', { ascending: true });
        if (error) {
            console.error('Failed to fetch pending reviews:', error);
            return [];
        }
        return (data || []).map(this.mapDbReviewToType);
    }
    async fetchReviewContext(entityType, entityId, organizationId) {
        const context = {
            relatedEntities: [],
            riskFactors: [],
            urgencyFactors: [],
        };
        try {
            await supabase.rpc('set_config', {
                setting: 'app.current_organization_id',
                value: organizationId,
            });
            switch (entityType) {
                case 'AGENT_GOAL': {
                    const { data: goal } = await supabase
                        .from('agent_goals')
                        .select('*, agent_tasks(count)')
                        .eq('id', entityId)
                        .single();
                    if (goal) {
                        context.relatedEntities = [
                            {
                                type: 'AGENT',
                                id: goal.agent_id,
                                name: `Agent ${goal.agent_id}`,
                            },
                        ];
                        if (goal.risk_level === 'HIGH' || goal.risk_level === 'CRITICAL') {
                            context.riskFactors?.push(`High-risk goal: ${goal.risk_level}`);
                        }
                        if (goal.requires_approval) {
                            context.urgencyFactors?.push('Goal requires explicit approval');
                        }
                    }
                    break;
                }
                case 'AUTONOMOUS_CAMPAIGN': {
                    const { data: campaign } = await supabase
                        .from('autonomous_campaigns')
                        .select('*')
                        .eq('id', entityId)
                        .single();
                    if (campaign) {
                        context.relatedEntities = [
                            {
                                type: 'CAMPAIGN',
                                id: campaign.id,
                                name: campaign.title,
                            },
                        ];
                        if (campaign.estimated_contacts_count > 100) {
                            context.riskFactors?.push(`Large campaign: ${campaign.estimated_contacts_count} contacts`);
                        }
                        if (campaign.quality_score && campaign.quality_score < 0.7) {
                            context.riskFactors?.push(`Low quality score: ${campaign.quality_score}`);
                        }
                    }
                    break;
                }
                case 'PITCH_WORKFLOW': {
                    const { data: pitch } = await supabase
                        .from('pitch_workflows')
                        .select('*, media_contacts(name, outlet)')
                        .eq('id', entityId)
                        .single();
                    if (pitch) {
                        context.relatedEntities = [
                            {
                                type: 'CONTACT',
                                id: pitch.contact_id,
                                name: pitch.media_contacts?.name || 'Unknown Contact',
                            },
                        ];
                        if (pitch.priority === 'HIGH' || pitch.priority === 'CRITICAL') {
                            context.urgencyFactors?.push(`High-priority pitch: ${pitch.priority}`);
                        }
                    }
                    break;
                }
                default:
                    break;
            }
            const { data: memories } = await supabase
                .from('agent_memories')
                .select('content')
                .eq('organization_id', organizationId)
                .contains('metadata', { entityType, entityId })
                .order('created_at', { ascending: false })
                .limit(5);
            if (memories && memories.length > 0) {
                context.historicalData = {
                    pastInteractions: memories.map((m) => m.content),
                };
            }
        }
        catch (error) {
            console.error('[ReviewEngine] Error fetching context:', error);
        }
        return context;
    }
    async shouldTriggerReview(entityType, entityId, organizationId, metadata) {
        try {
            await supabase.rpc('set_config', {
                setting: 'app.current_organization_id',
                value: organizationId,
            });
            switch (entityType) {
                case 'AGENT_GOAL': {
                    const { data: goal } = await supabase
                        .from('agent_goals')
                        .select('requires_approval, risk_level')
                        .eq('id', entityId)
                        .single();
                    if (goal?.requires_approval) {
                        return {
                            requiresReview: true,
                            reviewType: 'GOAL_APPROVAL',
                            priority: goal.risk_level === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
                            reason: 'Goal marked as requiring approval',
                        };
                    }
                    break;
                }
                case 'AUTONOMOUS_CAMPAIGN': {
                    const { data: campaign } = await supabase
                        .from('autonomous_campaigns')
                        .select('requires_approval, estimated_contacts_count, quality_score')
                        .eq('id', entityId)
                        .single();
                    if (campaign?.requires_approval) {
                        let priority = 'MEDIUM';
                        if (campaign.estimated_contacts_count > 100)
                            priority = 'HIGH';
                        if (campaign.quality_score && campaign.quality_score < 0.6)
                            priority = 'HIGH';
                        return {
                            requiresReview: true,
                            reviewType: 'CAMPAIGN_PLAN',
                            priority,
                            reason: 'Campaign requires approval before execution',
                        };
                    }
                    break;
                }
                case 'PITCH_WORKFLOW': {
                    if (metadata?.isHighImpact || metadata?.priority === 'CRITICAL') {
                        return {
                            requiresReview: true,
                            reviewType: 'PITCH_CONTENT',
                            priority: 'HIGH',
                            reason: 'High-impact pitch content requires review',
                        };
                    }
                    break;
                }
                case 'AGENT_HANDOFF': {
                    if (metadata?.isCritical) {
                        return {
                            requiresReview: true,
                            reviewType: 'AGENT_DECISION',
                            priority: 'MEDIUM',
                            reason: 'Critical task handoff requires oversight',
                        };
                    }
                    break;
                }
                case 'STRATEGIC_DECISION': {
                    return {
                        requiresReview: true,
                        reviewType: 'STRATEGIC_CHANGE',
                        priority: 'HIGH',
                        reason: 'Strategic decisions always require human review',
                    };
                }
                default:
                    break;
            }
            return { requiresReview: false };
        }
        catch (error) {
            console.error('[ReviewEngine] Error checking review trigger:', error);
            return { requiresReview: false };
        }
    }
    async recordReviewLearning(agentId, review, organizationId) {
        try {
            const learning = {
                type: 'review_feedback',
                reviewType: review.reviewType,
                status: review.status,
                entityType: review.reviewableEntityType,
                feedback: review.decisionSummary,
                reasoning: review.decisionReasoning,
                timestamp: new Date(),
            };
            await memory_service_1.memoryService.storeMemory({
                agentId,
                content: `Review decision: ${review.status} for ${review.reviewableEntityType}. Feedback: ${review.decisionSummary}`,
                memoryType: 'PROCEDURAL',
                category: 'review_learning',
                importance: review.status === 'REJECTED' ? 0.9 : 0.7,
                metadata: learning,
                organizationId,
            });
            console.log(`[ReviewEngine] Stored review learning for agent ${agentId}`);
        }
        catch (error) {
            console.error('[ReviewEngine] Failed to store review learning:', error);
        }
    }
    calculateDueDate(priority) {
        const now = new Date();
        const hoursMap = {
            CRITICAL: 2,
            HIGH: 12,
            MEDIUM: 24,
            LOW: 72,
        };
        const hours = hoursMap[priority];
        return new Date(now.getTime() + hours * 60 * 60 * 1000);
    }
    mapDbReviewToType(dbReview) {
        return {
            id: dbReview.id,
            reviewType: dbReview.review_type,
            status: dbReview.status,
            priority: dbReview.priority,
            reviewableEntityType: dbReview.reviewable_entity_type,
            reviewableEntityId: dbReview.reviewable_entity_id,
            title: dbReview.title,
            description: dbReview.description,
            contentToReview: dbReview.content_to_review,
            context: dbReview.context,
            requestingAgentId: dbReview.requesting_agent_id,
            agentReasoning: dbReview.agent_reasoning,
            decisionSummary: dbReview.decision_summary,
            decisionReasoning: dbReview.decision_reasoning,
            modifications: dbReview.modifications,
            assignedTo: dbReview.assigned_to,
            assignedAt: dbReview.assigned_at ? new Date(dbReview.assigned_at) : null,
            assignedBy: dbReview.assigned_by,
            reviewedBy: dbReview.reviewed_by,
            reviewedAt: dbReview.reviewed_at ? new Date(dbReview.reviewed_at) : null,
            dueDate: dbReview.due_date ? new Date(dbReview.due_date) : null,
            escalatedAt: dbReview.escalated_at ? new Date(dbReview.escalated_at) : null,
            escalatedTo: dbReview.escalated_to,
            submittedAt: new Date(dbReview.submitted_at),
            withdrawnAt: dbReview.withdrawn_at ? new Date(dbReview.withdrawn_at) : null,
            withdrawnBy: dbReview.withdrawn_by,
            createdAt: new Date(dbReview.created_at),
            updatedAt: new Date(dbReview.updated_at),
            organizationId: dbReview.organization_id,
        };
    }
    mapDbCommentToType(dbComment) {
        return {
            id: dbComment.id,
            reviewId: dbComment.review_id,
            parentCommentId: dbComment.parent_comment_id,
            content: dbComment.content,
            commentType: dbComment.comment_type,
            isInternal: dbComment.is_internal,
            isResolution: dbComment.is_resolution,
            highlightedSection: dbComment.highlighted_section,
            lineNumber: dbComment.line_number,
            authorId: dbComment.author_id,
            authorType: dbComment.author_type,
            upvotes: dbComment.upvotes,
            isResolved: dbComment.is_resolved,
            resolvedAt: dbComment.resolved_at ? new Date(dbComment.resolved_at) : null,
            resolvedBy: dbComment.resolved_by,
            createdAt: new Date(dbComment.created_at),
            updatedAt: new Date(dbComment.updated_at),
            organizationId: dbComment.organization_id,
        };
    }
}
exports.ReviewEngine = ReviewEngine;
exports.reviewEngine = new ReviewEngine();
//# sourceMappingURL=review-engine.js.map