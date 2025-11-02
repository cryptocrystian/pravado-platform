// =====================================================
// AUTOMATIC REVIEW TRIGGERS
// =====================================================
// Automatically creates review requests when certain conditions are met

import { createClient } from '@supabase/supabase-js';
import { reviewEngine } from './review-engine';
import type {
  ReviewType,
  ReviewPriority,
  ReviewableEntityType,
} from '@pravado/shared-types';
import { logger } from '../lib/logger';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =====================================================
// TRIGGER HANDLERS
// =====================================================

/**
 * Trigger review for agent goal approval
 */
export async function triggerGoalReview(params: {
  goalId: string;
  agentId: string;
  organizationId: string;
  userId: string;
}) {
  try {
    // Set organization context
    await supabase.rpc('set_config', {
      setting: 'app.current_organization_id',
      value: params.organizationId,
    });

    // Fetch the goal
    const { data: goal, error } = await supabase
      .from('agent_goals')
      .select('*')
      .eq('id', params.goalId)
      .eq('organization_id', params.organizationId)
      .single();

    if (error || !goal) {
      logger.error('[ReviewTriggers] Failed to fetch goal for review', error);
      return null;
    }

    // Check if goal requires approval
    if (!goal.requires_approval) {
      logger.info('[ReviewTriggers] Goal does not require approval, skipping review');
      return null;
    }

    // Determine priority based on risk level
    let priority: ReviewPriority = 'MEDIUM';
    if (goal.risk_level === 'CRITICAL') priority = 'CRITICAL';
    else if (goal.risk_level === 'HIGH') priority = 'HIGH';
    else if (goal.risk_level === 'MEDIUM') priority = 'MEDIUM';
    else priority = 'LOW';

    // Create review request
    const review = await reviewEngine.createReviewRequest({
      reviewType: 'GOAL_APPROVAL',
      priority,
      reviewableEntityType: 'AGENT_GOAL',
      reviewableEntityId: params.goalId,
      title: `Goal Approval: ${goal.goal_description || 'Agent Goal'}`,
      description: `Agent ${params.agentId} has proposed a new goal that requires approval before execution.`,
      contentToReview: {
        goalDescription: goal.goal_description,
        successCriteria: goal.success_criteria,
        requiredCapabilities: goal.required_capabilities,
        estimatedDuration: goal.estimated_duration_hours,
        riskLevel: goal.risk_level,
        dependencies: goal.dependencies,
      },
      context: {
        agentId: params.agentId,
        goalType: goal.goal_type,
      },
      requestingAgentId: params.agentId,
      agentReasoning: `This goal has been marked as requiring approval due to its ${goal.risk_level} risk level.`,
      assignedTo: params.userId, // Assign to the user who initiated
      organizationId: params.organizationId,
    });

    logger.info(`[ReviewTriggers] Created goal review: ${review.id} for goal: ${params.goalId}`);

    return review;
  } catch (error: any) {
    logger.error('[ReviewTriggers] Error triggering goal review:', error);
    return null;
  }
}

/**
 * Trigger review for autonomous campaign approval
 */
export async function triggerCampaignReview(params: {
  campaignId: string;
  organizationId: string;
  userId: string;
}) {
  try {
    await supabase.rpc('set_config', {
      setting: 'app.current_organization_id',
      value: params.organizationId,
    });

    // Fetch the campaign
    const { data: campaign, error } = await supabase
      .from('autonomous_campaigns')
      .select('*')
      .eq('id', params.campaignId)
      .eq('organization_id', params.organizationId)
      .single();

    if (error || !campaign) {
      logger.error('[ReviewTriggers] Failed to fetch campaign for review', error);
      return null;
    }

    // Check if campaign requires approval
    if (!campaign.requires_approval) {
      logger.info('[ReviewTriggers] Campaign does not require approval, skipping review');
      return null;
    }

    // Determine priority based on campaign scope
    let priority: ReviewPriority = 'MEDIUM';
    if (campaign.estimated_contacts_count > 100) priority = 'HIGH';
    if (campaign.quality_score && campaign.quality_score < 0.6) priority = 'HIGH';

    // Create review request
    const review = await reviewEngine.createReviewRequest({
      reviewType: 'CAMPAIGN_PLAN',
      priority,
      reviewableEntityType: 'AUTONOMOUS_CAMPAIGN',
      reviewableEntityId: params.campaignId,
      title: `Campaign Approval: ${campaign.title}`,
      description: `Autonomous campaign "${campaign.title}" is ready for review before execution.`,
      contentToReview: {
        title: campaign.title,
        campaignType: campaign.campaign_type,
        planningOutput: campaign.planning_output,
        estimatedContactsCount: campaign.estimated_contacts_count,
        qualityScore: campaign.quality_score,
        estimatedDuration: campaign.estimated_duration_days,
      },
      context: {
        campaignType: campaign.campaign_type,
        originalPrompt: campaign.original_prompt,
      },
      requestingAgentId: campaign.agent_created_by || null,
      agentReasoning: `This campaign targets ${campaign.estimated_contacts_count} contacts and requires human approval before execution.`,
      assignedTo: params.userId,
      organizationId: params.organizationId,
    });

    logger.info(
      `[ReviewTriggers] Created campaign review: ${review.id} for campaign: ${params.campaignId}`
    );

    return review;
  } catch (error: any) {
    logger.error('[ReviewTriggers] Error triggering campaign review:', error);
    return null;
  }
}

/**
 * Trigger review for pitch content quality
 */
export async function triggerPitchReview(params: {
  pitchId: string;
  organizationId: string;
  userId: string;
  isHighImpact?: boolean;
}) {
  try {
    await supabase.rpc('set_config', {
      setting: 'app.current_organization_id',
      value: params.organizationId,
    });

    // Fetch the pitch
    const { data: pitch, error } = await supabase
      .from('pitch_workflows')
      .select('*, media_contacts(name, outlet)')
      .eq('id', params.pitchId)
      .eq('organization_id', params.organizationId)
      .single();

    if (error || !pitch) {
      logger.error('[ReviewTriggers] Failed to fetch pitch for review', error);
      return null;
    }

    // Only trigger review for high-impact pitches
    if (!params.isHighImpact && pitch.priority !== 'CRITICAL' && pitch.priority !== 'HIGH') {
      logger.info('[ReviewTriggers] Pitch is not high-impact, skipping review');
      return null;
    }

    // Determine priority
    let priority: ReviewPriority = 'MEDIUM';
    if (pitch.priority === 'CRITICAL') priority = 'CRITICAL';
    else if (pitch.priority === 'HIGH') priority = 'HIGH';

    // Create review request
    const review = await reviewEngine.createReviewRequest({
      reviewType: 'PITCH_CONTENT',
      priority,
      reviewableEntityType: 'PITCH_WORKFLOW',
      reviewableEntityId: params.pitchId,
      title: `Pitch Review: ${pitch.media_contacts?.name || 'Unknown Contact'}`,
      description: `High-impact pitch to ${pitch.media_contacts?.name} at ${pitch.media_contacts?.outlet} requires quality review.`,
      contentToReview: {
        contactName: pitch.media_contacts?.name,
        outlet: pitch.media_contacts?.outlet,
        pitchContent: pitch.pitch_content,
        subject: pitch.subject_line,
        priority: pitch.priority,
        personalizationScore: pitch.personalization_score,
      },
      context: {
        contactId: pitch.contact_id,
        campaignId: pitch.campaign_id,
      },
      requestingAgentId: null, // Pitch may not be from an agent
      agentReasoning: params.isHighImpact
        ? 'This pitch has been flagged as high-impact and requires quality review before sending.'
        : `This pitch has ${pitch.priority} priority and requires review.`,
      assignedTo: params.userId,
      organizationId: params.organizationId,
    });

    logger.info(
      `[ReviewTriggers] Created pitch review: ${review.id} for pitch: ${params.pitchId}`
    );

    return review;
  } catch (error: any) {
    logger.error('[ReviewTriggers] Error triggering pitch review:', error);
    return null;
  }
}

/**
 * Trigger review for high-risk agent decisions
 */
export async function triggerHighRiskActionReview(params: {
  taskId: string;
  agentId: string;
  organizationId: string;
  userId: string;
  actionDescription: string;
  riskFactors: string[];
  proposedAction: Record<string, any>;
}) {
  try {
    // Create review request for high-risk action
    const review = await reviewEngine.createReviewRequest({
      reviewType: 'HIGH_RISK_ACTION',
      priority: 'CRITICAL',
      reviewableEntityType: 'AGENT_TASK',
      reviewableEntityId: params.taskId,
      title: `High-Risk Action Review: ${params.actionDescription}`,
      description: `Agent ${params.agentId} is proposing a high-risk action that requires explicit approval.`,
      contentToReview: {
        actionDescription: params.actionDescription,
        proposedAction: params.proposedAction,
        riskFactors: params.riskFactors,
      },
      context: {
        agentId: params.agentId,
        taskId: params.taskId,
        riskLevel: 'HIGH',
      },
      requestingAgentId: params.agentId,
      agentReasoning: `This action has been flagged as high-risk due to: ${params.riskFactors.join(', ')}`,
      assignedTo: params.userId,
      organizationId: params.organizationId,
    });

    logger.info(
      `[ReviewTriggers] Created high-risk action review: ${review.id} for task: ${params.taskId}`
    );

    return review;
  } catch (error: any) {
    logger.error('[ReviewTriggers] Error triggering high-risk action review:', error);
    return null;
  }
}

/**
 * Trigger review for strategic decisions
 */
export async function triggerStrategicDecisionReview(params: {
  decisionId: string;
  agentId: string;
  organizationId: string;
  userId: string;
  decisionTitle: string;
  decisionDetails: Record<string, any>;
  impactAssessment: string;
}) {
  try {
    const review = await reviewEngine.createReviewRequest({
      reviewType: 'STRATEGIC_CHANGE',
      priority: 'HIGH',
      reviewableEntityType: 'STRATEGIC_DECISION',
      reviewableEntityId: params.decisionId,
      title: `Strategic Decision: ${params.decisionTitle}`,
      description: `Agent ${params.agentId} is proposing a strategic change that could significantly impact the organization.`,
      contentToReview: {
        decisionTitle: params.decisionTitle,
        decisionDetails: params.decisionDetails,
        impactAssessment: params.impactAssessment,
      },
      context: {
        agentId: params.agentId,
      },
      requestingAgentId: params.agentId,
      agentReasoning: `This decision requires strategic review: ${params.impactAssessment}`,
      assignedTo: params.userId,
      organizationId: params.organizationId,
    });

    logger.info(
      `[ReviewTriggers] Created strategic decision review: ${review.id} for decision: ${params.decisionId}`
    );

    return review;
  } catch (error: any) {
    logger.error('[ReviewTriggers] Error triggering strategic decision review:', error);
    return null;
  }
}

/**
 * Trigger review for agent task outputs
 */
export async function triggerTaskOutputReview(params: {
  taskId: string;
  agentId: string;
  organizationId: string;
  userId: string;
  taskOutput: Record<string, any>;
  outputType: string;
  qualityScore?: number;
}) {
  try {
    // Only trigger review if quality score is low or output is critical
    if (params.qualityScore && params.qualityScore >= 0.8) {
      logger.info('[ReviewTriggers] Task output quality is high, skipping review');
      return null;
    }

    let priority: ReviewPriority = 'MEDIUM';
    if (params.qualityScore && params.qualityScore < 0.5) priority = 'HIGH';

    const review = await reviewEngine.createReviewRequest({
      reviewType: 'TASK_OUTPUT',
      priority,
      reviewableEntityType: 'AGENT_TASK',
      reviewableEntityId: params.taskId,
      title: `Task Output Review: ${params.outputType}`,
      description: `Task output from ${params.agentId} requires quality review.`,
      contentToReview: {
        outputType: params.outputType,
        taskOutput: params.taskOutput,
        qualityScore: params.qualityScore,
      },
      context: {
        agentId: params.agentId,
        taskId: params.taskId,
      },
      requestingAgentId: params.agentId,
      agentReasoning: params.qualityScore
        ? `Task output has a quality score of ${params.qualityScore.toFixed(2)}, which is below the threshold for automatic approval.`
        : 'Task output requires human review before proceeding.',
      assignedTo: params.userId,
      organizationId: params.organizationId,
    });

    logger.info(
      `[ReviewTriggers] Created task output review: ${review.id} for task: ${params.taskId}`
    );

    return review;
  } catch (error: any) {
    logger.error('[ReviewTriggers] Error triggering task output review:', error);
    return null;
  }
}

// =====================================================
// AUTOMATIC TRIGGER SETUP
// =====================================================

/**
 * Set up automatic review triggers based on database changes
 * This would typically be called on application startup
 */
export function setupReviewTriggers() {
  logger.info('[ReviewTriggers] Review triggers initialized');

  // Note: In a production system, you might want to set up database triggers
  // or use Supabase Realtime to automatically detect when reviews are needed.
  // For now, the application code will explicitly call these trigger functions
  // when creating goals, campaigns, pitches, etc.
}

/**
 * Helper function to check all pending entities and trigger reviews if needed
 */
export async function checkPendingReviewsForEntity(params: {
  entityType: ReviewableEntityType;
  entityId: string;
  organizationId: string;
  userId: string;
  metadata?: Record<string, any>;
}) {
  try {
    const shouldReview = await reviewEngine.shouldTriggerReview(
      params.entityType,
      params.entityId,
      params.organizationId,
      params.metadata
    );

    if (!shouldReview.requiresReview) {
      return null;
    }

    // Trigger appropriate review based on entity type
    switch (params.entityType) {
      case 'AGENT_GOAL':
        return await triggerGoalReview({
          goalId: params.entityId,
          agentId: params.metadata?.agentId || 'unknown',
          organizationId: params.organizationId,
          userId: params.userId,
        });

      case 'AUTONOMOUS_CAMPAIGN':
        return await triggerCampaignReview({
          campaignId: params.entityId,
          organizationId: params.organizationId,
          userId: params.userId,
        });

      case 'PITCH_WORKFLOW':
        return await triggerPitchReview({
          pitchId: params.entityId,
          organizationId: params.organizationId,
          userId: params.userId,
          isHighImpact: params.metadata?.isHighImpact,
        });

      default:
        logger.warn(`[ReviewTriggers] No trigger handler for entity type: ${params.entityType}`);
        return null;
    }
  } catch (error: any) {
    logger.error('[ReviewTriggers] Error checking pending reviews:', error);
    return null;
  }
}
