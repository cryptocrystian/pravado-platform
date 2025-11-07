// =====================================================
// ONBOARDING SERVICE
// =====================================================
// Business logic for onboarding session management

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import {
  OnboardingStatus,
  IntakeStep,
  type CreateOnboardingSessionInput,
  type UpdateOnboardingSessionInput,
  type CreateIntakeResponseInput,
} from '@pravado/types';

export class OnboardingService {
  /**
   * Check if organization can start onboarding
   */
  async canStartOnboarding(organizationId: string): Promise<boolean> {
    // Check if organization is on trial tier
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('subscription_tier')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      logger.error('Failed to fetch organization', orgError);
      return false;
    }

    if (org.subscription_tier !== 'TRIAL') {
      return false;
    }

    // Check if onboarding session already exists
    const { data: existing } = await supabase
      .from('onboarding_sessions')
      .select('id')
      .eq('organization_id', organizationId)
      .single();

    return !existing;
  }

  /**
   * Create a new onboarding session
   */
  async createSession(input: CreateOnboardingSessionInput) {
    const canStart = await this.canStartOnboarding(input.organizationId);

    if (!canStart) {
      throw new Error(
        'Organization cannot start onboarding. Either not on trial tier or session already exists.'
      );
    }

    const { data, error } = await supabase
      .from('onboarding_sessions')
      .insert({
        organization_id: input.organizationId,
        user_id: input.userId,
        status: OnboardingStatus.STARTED,
        current_step: IntakeStep.BUSINESS_INFO,
        completed_steps: [],
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create onboarding session', error);
      throw new Error(`Failed to create onboarding session: ${error.message}`);
    }

    logger.info(`Created onboarding session ${data.id} for org ${input.organizationId}`);

    return data;
  }

  /**
   * Get onboarding session by ID
   */
  async getSession(sessionId: string) {
    const { data, error } = await supabase
      .from('onboarding_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      logger.error('Failed to fetch onboarding session', error);
      throw new Error(`Failed to fetch onboarding session: ${error.message}`);
    }

    return data;
  }

  /**
   * Get onboarding session by organization ID
   */
  async getSessionByOrganization(organizationId: string) {
    const { data, error } = await supabase
      .from('onboarding_sessions')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      logger.error('Failed to fetch onboarding session', error);
      throw new Error(`Failed to fetch onboarding session: ${error.message}`);
    }

    return data;
  }

  /**
   * Update onboarding session
   */
  async updateSession(sessionId: string, updates: UpdateOnboardingSessionInput) {
    const { data, error } = await supabase
      .from('onboarding_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update onboarding session', error);
      throw new Error(`Failed to update onboarding session: ${error.message}`);
    }

    return data;
  }

  /**
   * Save intake response for a specific step
   */
  async saveIntakeResponse(input: CreateIntakeResponseInput) {
    const { data, error } = await supabase
      .from('intake_responses')
      .upsert(
        {
          session_id: input.sessionId,
          step: input.step,
          ...input.data,
        },
        {
          onConflict: 'session_id,step',
        }
      )
      .select()
      .single();

    if (error) {
      logger.error('Failed to save intake response', error);
      throw new Error(`Failed to save intake response: ${error.message}`);
    }

    logger.info(`Saved intake response for session ${input.sessionId}, step ${input.step}`);

    return data;
  }

  /**
   * Get all intake responses for a session
   */
  async getIntakeResponses(sessionId: string) {
    const { data, error } = await supabase
      .from('intake_responses')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Failed to fetch intake responses', error);
      throw new Error(`Failed to fetch intake responses: ${error.message}`);
    }

    return data;
  }

  /**
   * Get aggregated intake summary (all responses combined)
   */
  async getIntakeSummary(sessionId: string) {
    const { data, error } = await supabase.rpc('get_intake_summary', {
      session_uuid: sessionId,
    });

    if (error) {
      logger.error('Failed to fetch intake summary', error);
      throw new Error(`Failed to fetch intake summary: ${error.message}`);
    }

    return data;
  }

  /**
   * Mark a step as completed and advance to next step
   */
  async completeStep(sessionId: string, step: IntakeStep) {
    const session = await this.getSession(sessionId);

    const completedSteps = session.completed_steps || [];
    if (!completedSteps.includes(step)) {
      completedSteps.push(step);
    }

    // Determine next step
    const stepOrder = [
      IntakeStep.BUSINESS_INFO,
      IntakeStep.GOALS,
      IntakeStep.COMPETITORS,
      IntakeStep.BRAND_VOICE,
      IntakeStep.CHANNELS,
      IntakeStep.REGIONS,
    ];

    const currentIndex = stepOrder.indexOf(step);
    const nextStep = currentIndex < stepOrder.length - 1 ? stepOrder[currentIndex + 1] : step;

    // Check if all steps are completed
    const allStepsCompleted = stepOrder.every((s) => completedSteps.includes(s));

    const updates: any = {
      completed_steps: completedSteps,
      current_step: nextStep,
    };

    if (allStepsCompleted) {
      updates.status = OnboardingStatus.INTAKE_COMPLETE;
      updates.intake_completed_at = new Date().toISOString();
    }

    return this.updateSession(sessionId, updates);
  }

  /**
   * Get agent results for a session
   */
  async getAgentResults(sessionId: string) {
    const { data, error } = await supabase
      .from('onboarding_agent_results')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Failed to fetch agent results', error);
      throw new Error(`Failed to fetch agent results: ${error.message}`);
    }

    return data;
  }

  /**
   * Get complete onboarding result (session + intake + strategy + planner)
   */
  async getOnboardingResult(sessionId: string) {
    const session = await this.getSession(sessionId);
    const intakeSummary = await this.getIntakeSummary(sessionId);
    const agentResults = await this.getAgentResults(sessionId);

    const strategyResult = agentResults.find((r) => r.agent_type === 'strategy');
    const plannerResult = agentResults.find((r) => r.agent_type === 'planner');

    // Fetch strategy plan if available
    let strategyPlan = null;
    if (session.strategy_plan_id) {
      const { data } = await supabase
        .from('strategy_plans')
        .select('*')
        .eq('id', session.strategy_plan_id)
        .single();
      strategyPlan = data;
    }

    return {
      session,
      intakeSummary,
      strategy: {
        result: strategyResult?.result || null,
        plan: strategyPlan,
      },
      planner: {
        result: plannerResult?.result || null,
        contentIds: plannerResult?.generated_content_ids || [],
        pressReleaseId: plannerResult?.generated_press_release_id || null,
        seoAuditId: plannerResult?.generated_seo_audit_id || null,
      },
    };
  }

  /**
   * Mark onboarding as complete
   */
  async completeOnboarding(sessionId: string) {
    const { data, error } = await supabase.rpc('complete_onboarding', {
      session_uuid: sessionId,
    });

    if (error) {
      logger.error('Failed to complete onboarding', error);
      throw new Error(`Failed to complete onboarding: ${error.message}`);
    }

    logger.info(`Onboarding completed for session ${sessionId}`);

    return this.getSession(sessionId);
  }
}

export const onboardingService = new OnboardingService();
