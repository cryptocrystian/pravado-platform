// =====================================================
// A/B TEST ENGINE
// =====================================================
// Assigns variants and records outcomes for A/B testing experiments

import { createClient } from '@supabase/supabase-js';
import type {
  ABExperiment,
  ExperimentVariant,
  ExperimentAssignment,
  CreateABExperimentInput,
  CreateExperimentVariantInput,
  ABTestAssignmentRequest,
  ABTestAssignmentResult,
  ExperimentResults,
  ExperimentStatus,
  VariantType,
} from '@pravado/types';
import {
  CreateABExperimentInputSchema,
  CreateExperimentVariantInputSchema,
} from '@pravado/types';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =====================================================
// A/B TEST ENGINE CLASS
// =====================================================

export class ABTestEngine {
  /**
   * Create a new A/B experiment
   */
  async createExperiment(
    input: CreateABExperimentInput
  ): Promise<ABExperiment> {
    const validatedInput = CreateABExperimentInputSchema.parse(input);

    await supabase.rpc('set_config', {
      setting: 'app.current_organization_id',
      value: validatedInput.organizationId,
    });

    const { data: experiment, error } = await supabase
      .from('ab_experiments')
      .insert({
        name: validatedInput.name,
        description: validatedInput.description || null,
        hypothesis: validatedInput.hypothesis || null,
        experiment_type: validatedInput.experimentType,
        target_entity_type: validatedInput.targetEntityType,
        status: 'DRAFT',
        traffic_allocation: validatedInput.trafficAllocation || 1.0,
        primary_metric: validatedInput.primaryMetric,
        success_threshold: validatedInput.successThreshold || null,
        minimum_sample_size: validatedInput.minimumSampleSize || 100,
        organization_id: validatedInput.organizationId,
      })
      .select()
      .single();

    if (error) {
      console.error('[ABTestEngine] Failed to create experiment:', error);
      throw new Error(`Failed to create experiment: ${error.message}`);
    }

    console.log(`[ABTestEngine] Created experiment: ${experiment.id}`);

    return this.mapDbExperimentToType(experiment);
  }

  /**
   * Create an experiment variant
   */
  async createVariant(
    input: CreateExperimentVariantInput
  ): Promise<ExperimentVariant> {
    const validatedInput = CreateExperimentVariantInputSchema.parse(input);

    await supabase.rpc('set_config', {
      setting: 'app.current_organization_id',
      value: validatedInput.organizationId,
    });

    const { data: variant, error } = await supabase
      .from('experiment_variants')
      .insert({
        experiment_id: validatedInput.experimentId,
        variant_type: validatedInput.variantType,
        variant_name: validatedInput.variantName,
        description: validatedInput.description || null,
        configuration: validatedInput.configuration,
        traffic_percentage: validatedInput.trafficPercentage || 0.5,
        organization_id: validatedInput.organizationId,
      })
      .select()
      .single();

    if (error) {
      console.error('[ABTestEngine] Failed to create variant:', error);
      throw new Error(`Failed to create variant: ${error.message}`);
    }

    console.log(`[ABTestEngine] Created variant: ${variant.id}`);

    return this.mapDbVariantToType(variant);
  }

  /**
   * Start an experiment
   */
  async startExperiment(
    experimentId: string,
    organizationId: string
  ): Promise<ABExperiment> {
    await supabase.rpc('set_config', {
      setting: 'app.current_organization_id',
      value: organizationId,
    });

    // Verify experiment has at least 2 variants
    const { data: variants } = await supabase
      .from('experiment_variants')
      .select('id')
      .eq('experiment_id', experimentId);

    if (!variants || variants.length < 2) {
      throw new Error('Experiment must have at least 2 variants to start');
    }

    const { data: experiment, error } = await supabase
      .from('ab_experiments')
      .update({
        status: 'RUNNING',
        started_at: new Date(),
      })
      .eq('id', experimentId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      console.error('[ABTestEngine] Failed to start experiment:', error);
      throw new Error(`Failed to start experiment: ${error.message}`);
    }

    console.log(`[ABTestEngine] Started experiment: ${experimentId}`);

    return this.mapDbExperimentToType(experiment);
  }

  /**
   * Assign an entity to an experiment variant
   */
  async assignVariant(
    request: ABTestAssignmentRequest
  ): Promise<ABTestAssignmentResult> {
    const { experimentId, entityType, entityId, agentId, organizationId } = request;

    await supabase.rpc('set_config', {
      setting: 'app.current_organization_id',
      value: organizationId,
    });

    // Get experiment
    const { data: experiment, error: expError } = await supabase
      .from('ab_experiments')
      .select('*')
      .eq('id', experimentId)
      .eq('organization_id', organizationId)
      .single();

    if (expError || !experiment) {
      throw new Error('Experiment not found');
    }

    if (experiment.status !== 'RUNNING') {
      throw new Error('Experiment is not running');
    }

    // Check if should participate based on traffic allocation
    const shouldParticipate = Math.random() < parseFloat(experiment.traffic_allocation);

    if (!shouldParticipate) {
      // Return control variant without creating assignment
      const { data: controlVariant } = await supabase
        .from('experiment_variants')
        .select('*')
        .eq('experiment_id', experimentId)
        .eq('variant_type', 'CONTROL')
        .single();

      if (!controlVariant) {
        throw new Error('Control variant not found');
      }

      return {
        assignment: null as any,
        variant: this.mapDbVariantToType(controlVariant),
        shouldParticipate: false,
      };
    }

    // Get all variants
    const { data: variants } = await supabase
      .from('experiment_variants')
      .select('*')
      .eq('experiment_id', experimentId)
      .eq('organization_id', organizationId);

    if (!variants || variants.length === 0) {
      throw new Error('No variants found for experiment');
    }

    // Select variant based on traffic percentage
    const selectedVariant = this.selectVariant(variants);

    // Create assignment
    const { data: assignment, error: assignError } = await supabase
      .from('experiment_assignments')
      .insert({
        experiment_id: experimentId,
        variant_id: selectedVariant.id,
        entity_type: entityType,
        entity_id: entityId,
        agent_id: agentId || null,
        organization_id: organizationId,
      })
      .select()
      .single();

    if (assignError) {
      console.error('[ABTestEngine] Failed to create assignment:', assignError);
      throw new Error(`Failed to create assignment: ${assignError.message}`);
    }

    console.log(
      `[ABTestEngine] Assigned ${entityType}:${entityId} to variant ${selectedVariant.variant_name}`
    );

    return {
      assignment: this.mapDbAssignmentToType(assignment),
      variant: this.mapDbVariantToType(selectedVariant),
      shouldParticipate: true,
    };
  }

  /**
   * Select variant based on traffic percentages
   */
  private selectVariant(variants: any[]): any {
    // Normalize traffic percentages
    const totalPercentage = variants.reduce(
      (sum, v) => sum + parseFloat(v.traffic_percentage),
      0
    );

    let random = Math.random() * totalPercentage;
    for (const variant of variants) {
      random -= parseFloat(variant.traffic_percentage);
      if (random <= 0) {
        return variant;
      }
    }

    // Fallback to first variant
    return variants[0];
  }

  /**
   * Record outcome for an assignment
   */
  async recordOutcome(
    assignmentId: string,
    successScore: number,
    qualityScore: number,
    efficiencyScore: number,
    executionTimeMs: number,
    organizationId: string
  ): Promise<void> {
    await supabase.rpc('set_config', {
      setting: 'app.current_organization_id',
      value: organizationId,
    });

    // Call database function to record outcome
    const { error } = await supabase.rpc('record_experiment_outcome', {
      p_assignment_id: assignmentId,
      p_success_score: successScore,
      p_quality_score: qualityScore,
      p_efficiency_score: efficiencyScore,
      p_execution_time_ms: executionTimeMs,
    });

    if (error) {
      console.error('[ABTestEngine] Failed to record outcome:', error);
      throw new Error(`Failed to record outcome: ${error.message}`);
    }

    console.log(`[ABTestEngine] Recorded outcome for assignment: ${assignmentId}`);

    // Check if experiment should be concluded
    await this.checkExperimentCompletion(assignmentId, organizationId);
  }

  /**
   * Check if experiment has reached minimum sample size and should conclude
   */
  private async checkExperimentCompletion(
    assignmentId: string,
    organizationId: string
  ): Promise<void> {
    // Get experiment ID from assignment
    const { data: assignment } = await supabase
      .from('experiment_assignments')
      .select('experiment_id')
      .eq('id', assignmentId)
      .single();

    if (!assignment) return;

    // Get experiment
    const { data: experiment } = await supabase
      .from('ab_experiments')
      .select('*')
      .eq('id', assignment.experiment_id)
      .single();

    if (!experiment || experiment.status !== 'RUNNING') return;

    // Get all variants
    const { data: variants } = await supabase
      .from('experiment_variants')
      .select('*')
      .eq('experiment_id', experiment.id);

    if (!variants) return;

    // Check if all variants have minimum sample size
    const allVariantsHaveEnoughSamples = variants.every(
      (v) => v.sample_size >= experiment.minimum_sample_size
    );

    if (allVariantsHaveEnoughSamples) {
      console.log(`[ABTestEngine] Experiment ${experiment.id} reached minimum sample size`);
      // Auto-complete experiment (could also send notification instead)
      // await this.completeExperiment(experiment.id, organizationId);
    }
  }

  /**
   * Complete an experiment and determine winner
   */
  async completeExperiment(
    experimentId: string,
    organizationId: string
  ): Promise<ExperimentResults> {
    await supabase.rpc('set_config', {
      setting: 'app.current_organization_id',
      value: organizationId,
    });

    // Get experiment and variants
    const { data: experiment } = await supabase
      .from('ab_experiments')
      .select('*')
      .eq('id', experimentId)
      .eq('organization_id', organizationId)
      .single();

    if (!experiment) {
      throw new Error('Experiment not found');
    }

    const { data: variants } = await supabase
      .from('experiment_variants')
      .select('*')
      .eq('experiment_id', experimentId)
      .eq('organization_id', organizationId);

    if (!variants || variants.length === 0) {
      throw new Error('No variants found');
    }

    // Calculate lift vs control for each variant
    const controlVariant = variants.find((v) => v.variant_type === 'CONTROL');
    if (controlVariant) {
      for (const variant of variants) {
        if (variant.variant_type !== 'CONTROL') {
          const lift = this.calculateLift(variant, controlVariant);
          await supabase
            .from('experiment_variants')
            .update({ lift_vs_control: lift })
            .eq('id', variant.id);

          variant.lift_vs_control = lift;
        }
      }
    }

    // Determine winning variant based on primary metric
    const winningVariant = this.determineWinner(
      variants,
      experiment.primary_metric
    );

    // Calculate statistical significance
    const { data: significance } = await supabase.rpc(
      'calculate_experiment_significance',
      {
        p_experiment_id: experimentId,
      }
    );

    const isStatisticallySignificant =
      significance?.some((s: any) => s.is_significant) || false;

    // Update experiment status
    await supabase
      .from('ab_experiments')
      .update({
        status: 'COMPLETED',
        ended_at: new Date(),
        winning_variant_id: winningVariant?.id || null,
        confidence_level: isStatisticallySignificant ? 0.95 : 0.5,
      })
      .eq('id', experimentId);

    const recommendation = this.generateRecommendation(
      winningVariant,
      isStatisticallySignificant
    );

    console.log(`[ABTestEngine] Completed experiment: ${experimentId}`);

    return {
      experiment: this.mapDbExperimentToType(experiment),
      variants: variants.map(this.mapDbVariantToType),
      winningVariant: winningVariant ? this.mapDbVariantToType(winningVariant) : null,
      isStatisticallySignificant,
      recommendation,
    };
  }

  /**
   * Calculate lift vs control
   */
  private calculateLift(variant: any, control: any): number {
    const variantScore = parseFloat(variant.avg_success_score || 0);
    const controlScore = parseFloat(control.avg_success_score || 0);

    if (controlScore === 0) return 0;

    return ((variantScore - controlScore) / controlScore) * 100;
  }

  /**
   * Determine winning variant
   */
  private determineWinner(variants: any[], primaryMetric: string): any | null {
    if (variants.length === 0) return null;

    // Sort by primary metric (assuming success_score for now)
    const sortedVariants = [...variants].sort((a, b) => {
      const aScore = parseFloat(a.avg_success_score || 0);
      const bScore = parseFloat(b.avg_success_score || 0);
      return bScore - aScore;
    });

    return sortedVariants[0];
  }

  /**
   * Generate recommendation based on results
   */
  private generateRecommendation(
    winningVariant: any | null,
    isStatisticallySignificant: boolean
  ): string {
    if (!winningVariant) {
      return 'No winner could be determined. Consider running the experiment longer or with more traffic.';
    }

    if (!isStatisticallySignificant) {
      return `Variant "${winningVariant.variant_name}" shows promise but results are not statistically significant. Consider continuing the experiment to gather more data.`;
    }

    if (winningVariant.variant_type === 'CONTROL') {
      return 'The control variant performed best. Current approach is optimal. No changes recommended.';
    }

    const lift = parseFloat(winningVariant.lift_vs_control || 0);
    return `Variant "${winningVariant.variant_name}" is the winner with ${lift.toFixed(1)}% improvement. Recommend rolling out this variant to 100% of traffic.`;
  }

  /**
   * Get experiment results
   */
  async getExperimentResults(
    experimentId: string,
    organizationId: string
  ): Promise<ExperimentResults> {
    await supabase.rpc('set_config', {
      setting: 'app.current_organization_id',
      value: organizationId,
    });

    const { data: experiment } = await supabase
      .from('ab_experiments')
      .select('*')
      .eq('id', experimentId)
      .eq('organization_id', organizationId)
      .single();

    if (!experiment) {
      throw new Error('Experiment not found');
    }

    const { data: variants } = await supabase
      .from('experiment_variants')
      .select('*')
      .eq('experiment_id', experimentId)
      .eq('organization_id', organizationId);

    const winningVariant = experiment.winning_variant_id
      ? variants?.find((v: any) => v.id === experiment.winning_variant_id)
      : null;

    const isStatisticallySignificant = parseFloat(experiment.confidence_level || 0) >= 0.9;

    const recommendation = winningVariant
      ? this.generateRecommendation(winningVariant, isStatisticallySignificant)
      : 'Experiment not yet complete';

    return {
      experiment: this.mapDbExperimentToType(experiment),
      variants: (variants || []).map(this.mapDbVariantToType),
      winningVariant: winningVariant ? this.mapDbVariantToType(winningVariant) : null,
      isStatisticallySignificant,
      recommendation,
    };
  }

  /**
   * List experiments
   */
  async listExperiments(
    organizationId: string,
    status?: ExperimentStatus
  ): Promise<ABExperiment[]> {
    await supabase.rpc('set_config', {
      setting: 'app.current_organization_id',
      value: organizationId,
    });

    let query = supabase
      .from('ab_experiments')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ABTestEngine] Failed to list experiments:', error);
      return [];
    }

    return (data || []).map(this.mapDbExperimentToType);
  }

  /**
   * Map database experiment to TypeScript type
   */
  private mapDbExperimentToType(dbExperiment: any): ABExperiment {
    return {
      id: dbExperiment.id,
      name: dbExperiment.name,
      description: dbExperiment.description,
      hypothesis: dbExperiment.hypothesis,
      experimentType: dbExperiment.experiment_type,
      targetEntityType: dbExperiment.target_entity_type,
      status: dbExperiment.status,
      trafficAllocation: parseFloat(dbExperiment.traffic_allocation),
      primaryMetric: dbExperiment.primary_metric,
      successThreshold: dbExperiment.success_threshold
        ? parseFloat(dbExperiment.success_threshold)
        : null,
      minimumSampleSize: dbExperiment.minimum_sample_size,
      winningVariantId: dbExperiment.winning_variant_id,
      confidenceLevel: dbExperiment.confidence_level
        ? parseFloat(dbExperiment.confidence_level)
        : null,
      startedAt: dbExperiment.started_at ? new Date(dbExperiment.started_at) : null,
      endedAt: dbExperiment.ended_at ? new Date(dbExperiment.ended_at) : null,
      createdBy: dbExperiment.created_by,
      createdAt: new Date(dbExperiment.created_at),
      updatedAt: new Date(dbExperiment.updated_at),
      organizationId: dbExperiment.organization_id,
    };
  }

  /**
   * Map database variant to TypeScript type
   */
  private mapDbVariantToType(dbVariant: any): ExperimentVariant {
    return {
      id: dbVariant.id,
      experimentId: dbVariant.experiment_id,
      variantType: dbVariant.variant_type,
      variantName: dbVariant.variant_name,
      description: dbVariant.description,
      configuration: dbVariant.configuration,
      trafficPercentage: parseFloat(dbVariant.traffic_percentage),
      sampleSize: dbVariant.sample_size,
      successCount: dbVariant.success_count,
      totalRuns: dbVariant.total_runs,
      avgSuccessScore: dbVariant.avg_success_score
        ? parseFloat(dbVariant.avg_success_score)
        : null,
      avgQualityScore: dbVariant.avg_quality_score
        ? parseFloat(dbVariant.avg_quality_score)
        : null,
      avgEfficiencyScore: dbVariant.avg_efficiency_score
        ? parseFloat(dbVariant.avg_efficiency_score)
        : null,
      avgExecutionTimeMs: dbVariant.avg_execution_time_ms,
      metricsSummary: dbVariant.metrics_summary,
      liftVsControl: dbVariant.lift_vs_control ? parseFloat(dbVariant.lift_vs_control) : null,
      statisticalSignificance: dbVariant.statistical_significance
        ? parseFloat(dbVariant.statistical_significance)
        : null,
      createdAt: new Date(dbVariant.created_at),
      updatedAt: new Date(dbVariant.updated_at),
      organizationId: dbVariant.organization_id,
    };
  }

  /**
   * Map database assignment to TypeScript type
   */
  private mapDbAssignmentToType(dbAssignment: any): ExperimentAssignment {
    return {
      id: dbAssignment.id,
      experimentId: dbAssignment.experiment_id,
      variantId: dbAssignment.variant_id,
      entityType: dbAssignment.entity_type,
      entityId: dbAssignment.entity_id,
      agentId: dbAssignment.agent_id,
      outcomeRecorded: dbAssignment.outcome_recorded,
      successScore: dbAssignment.success_score ? parseFloat(dbAssignment.success_score) : null,
      qualityScore: dbAssignment.quality_score ? parseFloat(dbAssignment.quality_score) : null,
      assignedAt: new Date(dbAssignment.assigned_at),
      completedAt: dbAssignment.completed_at ? new Date(dbAssignment.completed_at) : null,
      organizationId: dbAssignment.organization_id,
    };
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const abTestEngine = new ABTestEngine();
