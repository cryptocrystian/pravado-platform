// =====================================================
// HUMAN-IN-THE-LOOP REVIEW ENGINE
// =====================================================
// Manages review requests, decisions, and integration with agent workflows

import { createClient } from '@supabase/supabase-js';
import type {
  AgentReview,
  CreateAgentReviewInput,
  UpdateAgentReviewInput,
  SubmitReviewDecisionInput,
  ReviewStatus,
  ReviewType,
  ReviewPriority,
  ReviewableEntityType,
  ReviewContext,
  ReviewDecisionResult,
  CreateReviewCommentInput,
  ReviewComment,
} from '@pravado/types';
import {
  CreateAgentReviewInputSchema,
  UpdateAgentReviewInputSchema,
  SubmitReviewDecisionInputSchema,
} from '@pravado/types';
import { memoryService } from '../memory/memory-service';
import { EventEmitter } from 'events';

// =====================================================
// CONFIGURATION
// =====================================================

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =====================================================
// REVIEW ENGINE CLASS
// =====================================================

export class ReviewEngine extends EventEmitter {
  /**
   * Create a review request
   */
  async createReviewRequest(
    input: CreateAgentReviewInput
  ): Promise<AgentReview> {
    // Validate input
    const validatedInput = CreateAgentReviewInputSchema.parse(input);

    // Set organization context
    await supabase.rpc('set_config', {
      setting: 'app.current_organization_id',
      value: validatedInput.organizationId,
    });

    // Gather additional context
    const context = await this.fetchReviewContext(
      validatedInput.reviewableEntityType,
      validatedInput.reviewableEntityId,
      validatedInput.organizationId
    );

    // Calculate due date if not provided
    const dueDate = validatedInput.dueDate || this.calculateDueDate(validatedInput.priority);

    // Insert review
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

    // Emit event for notifications
    this.emit('review:created', {
      review: this.mapDbReviewToType(review),
      assignedTo: validatedInput.assignedTo,
    });

    console.log(`[ReviewEngine] Created review ${review.id} for ${validatedInput.reviewableEntityType}`);

    return this.mapDbReviewToType(review);
  }

  /**
   * Submit a review decision (approve, reject, needs edit)
   */
  async submitReviewDecision(
    input: SubmitReviewDecisionInput,
    organizationId: string
  ): Promise<ReviewDecisionResult> {
    // Validate input
    const validatedInput = SubmitReviewDecisionInputSchema.parse(input);

    // Set organization context
    await supabase.rpc('set_config', {
      setting: 'app.current_organization_id',
      value: organizationId,
    });

    // Fetch current review
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

    // Map decision to status
    const statusMap: Record<string, ReviewStatus> = {
      APPROVED: 'APPROVED',
      REJECTED: 'REJECTED',
      NEEDS_EDIT: 'NEEDS_EDIT',
    };

    const newStatus = statusMap[validatedInput.decision];

    // Update review
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

    // Determine next actions
    const nextActions: string[] = [];
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
    } else if (newStatus === 'REJECTED') {
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
    } else if (newStatus === 'NEEDS_EDIT') {
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

    // Store learning in agent memory if applicable
    if (agentNotification && existingReview.requesting_agent_id) {
      await this.recordReviewLearning(
        existingReview.requesting_agent_id,
        review,
        organizationId
      );
    }

    // Emit event
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

  /**
   * Fetch review by ID
   */
  async getReview(
    reviewId: string,
    organizationId: string
  ): Promise<AgentReview | null> {
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

    if (error || !data) return null;

    return this.mapDbReviewToType(data);
  }

  /**
   * Update review metadata
   */
  async updateReview(
    reviewId: string,
    input: UpdateAgentReviewInput,
    organizationId: string
  ): Promise<AgentReview> {
    const validatedInput = UpdateAgentReviewInputSchema.parse(input);

    await supabase.rpc('set_config', {
      setting: 'app.current_organization_id',
      value: organizationId,
    });

    const updateData: any = {};
    if (validatedInput.status) updateData.status = validatedInput.status;
    if (validatedInput.priority) updateData.priority = validatedInput.priority;
    if (validatedInput.decisionSummary) updateData.decision_summary = validatedInput.decisionSummary;
    if (validatedInput.decisionReasoning) updateData.decision_reasoning = validatedInput.decisionReasoning;
    if (validatedInput.modifications) updateData.modifications = validatedInput.modifications;
    if (validatedInput.assignedTo) updateData.assigned_to = validatedInput.assignedTo;

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

  /**
   * Add a comment to a review
   */
  async addComment(
    input: CreateReviewCommentInput
  ): Promise<ReviewComment> {
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

  /**
   * Get all pending reviews for a user
   */
  async getUserPendingReviews(
    userId: string,
    organizationId: string
  ): Promise<AgentReview[]> {
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

  /**
   * Fetch context for a reviewable entity
   */
  async fetchReviewContext(
    entityType: ReviewableEntityType,
    entityId: string,
    organizationId: string
  ): Promise<ReviewContext> {
    const context: ReviewContext = {
      relatedEntities: [],
      riskFactors: [],
      urgencyFactors: [],
    };

    try {
      await supabase.rpc('set_config', {
        setting: 'app.current_organization_id',
        value: organizationId,
      });

      // Fetch context based on entity type
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

      // Fetch historical data from memory if agent is involved
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
    } catch (error) {
      console.error('[ReviewEngine] Error fetching context:', error);
    }

    return context;
  }

  /**
   * Check if entity requires review
   */
  async shouldTriggerReview(
    entityType: ReviewableEntityType,
    entityId: string,
    organizationId: string,
    metadata?: Record<string, any>
  ): Promise<{
    requiresReview: boolean;
    reviewType?: ReviewType;
    priority?: ReviewPriority;
    reason?: string;
  }> {
    try {
      await supabase.rpc('set_config', {
        setting: 'app.current_organization_id',
        value: organizationId,
      });

      // Check based on entity type
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
            let priority: ReviewPriority = 'MEDIUM';
            if (campaign.estimated_contacts_count > 100) priority = 'HIGH';
            if (campaign.quality_score && campaign.quality_score < 0.6) priority = 'HIGH';

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
          // Check if pitch is flagged as high-impact
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
          // Check if handoff involves critical tasks
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
    } catch (error) {
      console.error('[ReviewEngine] Error checking review trigger:', error);
      return { requiresReview: false };
    }
  }

  /**
   * Record review feedback as agent learning
   */
  private async recordReviewLearning(
    agentId: string,
    review: AgentReview,
    organizationId: string
  ): Promise<void> {
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

      await memoryService.storeMemory({
        agentId,
        content: `Review decision: ${review.status} for ${review.reviewableEntityType}. Feedback: ${review.decisionSummary}`,
        memoryType: 'PROCEDURAL',
        category: 'review_learning',
        importance: review.status === 'REJECTED' ? 0.9 : 0.7,
        metadata: learning,
        organizationId,
      });

      console.log(`[ReviewEngine] Stored review learning for agent ${agentId}`);
    } catch (error) {
      console.error('[ReviewEngine] Failed to store review learning:', error);
    }
  }

  /**
   * Calculate due date based on priority
   */
  private calculateDueDate(priority: ReviewPriority): Date {
    const now = new Date();
    const hoursMap: Record<ReviewPriority, number> = {
      CRITICAL: 2,
      HIGH: 12,
      MEDIUM: 24,
      LOW: 72,
    };

    const hours = hoursMap[priority];
    return new Date(now.getTime() + hours * 60 * 60 * 1000);
  }

  /**
   * Map database review to TypeScript type
   */
  private mapDbReviewToType(dbReview: any): AgentReview {
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

  /**
   * Map database comment to TypeScript type
   */
  private mapDbCommentToType(dbComment: any): ReviewComment {
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

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const reviewEngine = new ReviewEngine();
