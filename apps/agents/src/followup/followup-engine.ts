// =====================================================
// FOLLOWUP ENGINE - Automated Follow-Up Orchestration
// =====================================================

import { createClient } from '@supabase/supabase-js';
import { EventEmitter } from 'events';
import { timelineEngine } from '../timeline/timeline-engine';
import type {
  FollowupSequence,
  FollowupStep,
  ScheduledFollowup,
  GenerateFollowupsInput,
  GenerateFollowupsResult,
  EvaluateFollowupTriggersInput,
  FollowupTriggerEvaluation,
  RescheduleFollowupInput,
  CancelFollowupSequenceInput,
  GetDueFollowupsInput,
  DueFollowup,
  ExecuteFollowupInput,
  FollowupExecutionResult,
  FollowupBatchExecutionResult,
  MarkFollowupSentInput,
  MarkFollowupFailedInput,
  FollowupSequenceSummary,
  ContactFollowupStatus,
  FollowupStatus,
} from '@pravado/shared-types';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =====================================================
// FOLLOWUP ENGINE
// =====================================================

export class FollowupEngine extends EventEmitter {
  private isRunning: boolean = false;
  private pollIntervalMs: number = 60000; // 1 minute default
  private pollTimer?: NodeJS.Timeout;
  private maxConcurrent: number = 10;
  private activeExecutions: Set<string> = new Set();

  constructor(options?: { pollIntervalMs?: number; maxConcurrent?: number }) {
    super();
    if (options?.pollIntervalMs) {
      this.pollIntervalMs = options.pollIntervalMs;
    }
    if (options?.maxConcurrent) {
      this.maxConcurrent = options.maxConcurrent;
    }
  }

  // =====================================================
  // SEQUENCE MANAGEMENT
  // =====================================================

  /**
   * Generate followups for a campaign
   */
  async generateFollowups(
    input: GenerateFollowupsInput
  ): Promise<GenerateFollowupsResult> {
    const { data, error } = await supabase.rpc('generate_followups_for_campaign', {
      p_campaign_id: input.campaignId,
      p_sequence_id: input.sequenceId,
      p_organization_id: input.organizationId,
      p_contact_ids: input.contactIds || null,
    });

    if (error) {
      throw new Error(`Failed to generate followups: ${error.message}`);
    }

    const createdCount = data as number;

    this.emit('followups-generated', {
      campaignId: input.campaignId,
      sequenceId: input.sequenceId,
      createdCount,
    });

    return {
      success: true,
      createdCount,
      sequenceId: input.sequenceId,
      campaignId: input.campaignId,
      message: `Generated ${createdCount} scheduled followups`,
    };
  }

  /**
   * Evaluate followup triggers
   */
  async evaluateTriggers(
    input: EvaluateFollowupTriggersInput
  ): Promise<FollowupTriggerEvaluation> {
    const { data, error } = await supabase.rpc('evaluate_followup_triggers', {
      p_followup_id: input.followupId,
      p_organization_id: input.organizationId,
    });

    if (error) {
      throw new Error(`Failed to evaluate triggers: ${error.message}`);
    }

    return data as FollowupTriggerEvaluation;
  }

  /**
   * Reschedule a followup
   */
  async rescheduleFollowup(input: RescheduleFollowupInput): Promise<boolean> {
    const { data, error } = await supabase.rpc('reschedule_followup', {
      p_followup_id: input.followupId,
      p_new_scheduled_at: input.newScheduledAt,
      p_reason: input.reason,
      p_organization_id: input.organizationId,
    });

    if (error) {
      throw new Error(`Failed to reschedule followup: ${error.message}`);
    }

    this.emit('followup-rescheduled', {
      followupId: input.followupId,
      newScheduledAt: input.newScheduledAt,
      reason: input.reason,
    });

    return data as boolean;
  }

  /**
   * Cancel followup sequence for contact
   */
  async cancelSequenceForContact(
    input: CancelFollowupSequenceInput
  ): Promise<number> {
    const { data, error } = await supabase.rpc(
      'cancel_followup_sequence_for_contact',
      {
        p_contact_id: input.contactId,
        p_sequence_id: input.sequenceId,
        p_reason: input.reason,
        p_organization_id: input.organizationId,
      }
    );

    if (error) {
      throw new Error(`Failed to cancel sequence: ${error.message}`);
    }

    const canceledCount = data as number;

    this.emit('sequence-canceled', {
      contactId: input.contactId,
      sequenceId: input.sequenceId,
      canceledCount,
      reason: input.reason,
    });

    return canceledCount;
  }

  // =====================================================
  // EXECUTION
  // =====================================================

  /**
   * Get due followups
   */
  async getDueFollowups(input: GetDueFollowupsInput): Promise<DueFollowup[]> {
    const { data, error } = await supabase.rpc('get_due_followups', {
      p_organization_id: input.organizationId,
      p_limit: input.limit || 100,
    });

    if (error) {
      throw new Error(`Failed to get due followups: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      followupId: row.followup_id,
      sequenceId: row.sequence_id,
      stepId: row.step_id,
      campaignId: row.campaign_id,
      contactId: row.contact_id,
      contactName: row.contact_name,
      contactEmail: row.contact_email,
      stepNumber: row.step_number,
      stepName: row.step_name,
      subject: row.subject,
      body: row.body,
      scheduledAt: row.scheduled_at,
      attemptNumber: row.attempt_number,
    }));
  }

  /**
   * Execute a single followup
   */
  async executeFollowup(
    input: ExecuteFollowupInput
  ): Promise<FollowupExecutionResult> {
    const startTime = Date.now();

    // Prevent duplicate execution
    if (this.activeExecutions.has(input.followupId)) {
      throw new Error(`Followup ${input.followupId} is already being executed`);
    }

    this.activeExecutions.add(input.followupId);

    try {
      // Evaluate triggers first
      const evaluation = await this.evaluateTriggers({
        followupId: input.followupId,
        organizationId: input.organizationId,
      });

      if (!evaluation.eligible) {
        // Mark as skipped
        await this.markFollowupSkipped(input.followupId, evaluation.reasons);

        this.emit('followup-skipped', {
          followupId: input.followupId,
          reasons: evaluation.reasons,
        });

        return {
          success: true,
          followupId: input.followupId,
          contactId: '',
          contactEmail: '',
          status: 'SKIPPED' as FollowupStatus,
          outcome: 'Skipped: ' + evaluation.reasons.join(', '),
          durationMs: Date.now() - startTime,
        };
      }

      // Get followup details
      const { data: followup, error: fetchError } = await supabase
        .from('scheduled_followups')
        .select(
          `
          *,
          contacts (
            id,
            name,
            email
          )
        `
        )
        .eq('id', input.followupId)
        .eq('organization_id', input.organizationId)
        .single();

      if (fetchError || !followup) {
        throw new Error('Followup not found');
      }

      const contact = followup.contacts as any;

      // Dry run mode
      if (input.dryRun) {
        return {
          success: true,
          followupId: input.followupId,
          contactId: contact.id,
          contactEmail: contact.email,
          status: 'PENDING' as FollowupStatus,
          outcome: 'Dry run - would send',
          durationMs: Date.now() - startTime,
        };
      }

      // Send email
      const emailResult = await this.sendFollowupEmail(followup, contact);

      if (!emailResult.success) {
        // Mark as failed
        await this.markFollowupFailed({
          followupId: input.followupId,
          errorMessage: emailResult.error || 'Unknown error',
          organizationId: input.organizationId,
        });

        this.emit('followup-failed', {
          followupId: input.followupId,
          contactId: contact.id,
          error: emailResult.error,
        });

        return {
          success: false,
          followupId: input.followupId,
          contactId: contact.id,
          contactEmail: contact.email,
          status: 'FAILED' as FollowupStatus,
          errorMessage: emailResult.error,
          outcome: 'Failed to send',
          durationMs: Date.now() - startTime,
        };
      }

      // Mark as sent
      await this.markFollowupSent({
        followupId: input.followupId,
        sentMessageId: emailResult.messageId!,
        organizationId: input.organizationId,
      });

      this.emit('followup-sent', {
        followupId: input.followupId,
        contactId: contact.id,
        contactEmail: contact.email,
        messageId: emailResult.messageId,
      });

      // Log timeline event
      try {
        const { data: step } = await supabase
          .from('followup_steps')
          .select('step_number, sequence_id')
          .eq('id', followup.step_id)
          .single();

        if (step) {
          await timelineEngine.logFollowupSent(
            input.followupId,
            step.sequence_id,
            step.step_number,
            contact.id,
            contact.email,
            followup.subject || 'Follow-up',
            followup.campaign_id,
            input.organizationId,
            emailResult.messageId
          );
        }
      } catch (error) {
        console.error('[FollowupEngine] Failed to log timeline event:', error);
      }

      return {
        success: true,
        followupId: input.followupId,
        contactId: contact.id,
        contactEmail: contact.email,
        status: 'SENT' as FollowupStatus,
        sentAt: new Date().toISOString(),
        sentMessageId: emailResult.messageId,
        outcome: 'Sent successfully',
        durationMs: Date.now() - startTime,
      };
    } finally {
      this.activeExecutions.delete(input.followupId);
    }
  }

  /**
   * Execute batch of due followups
   */
  async executeBatch(input: GetDueFollowupsInput): Promise<FollowupBatchExecutionResult> {
    const startTime = Date.now();

    // Get due followups
    const dueFollowups = await this.getDueFollowups(input);

    if (dueFollowups.length === 0) {
      return {
        success: true,
        totalProcessed: 0,
        totalSent: 0,
        totalFailed: 0,
        totalSkipped: 0,
        executions: [],
        durationMs: Date.now() - startTime,
      };
    }

    this.emit('batch-started', {
      totalFollowups: dueFollowups.length,
      organizationId: input.organizationId,
    });

    // Execute in parallel (respecting concurrency limit)
    const executions: FollowupExecutionResult[] = [];
    let totalSent = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    // Process in batches
    for (let i = 0; i < dueFollowups.length; i += this.maxConcurrent) {
      const batch = dueFollowups.slice(i, i + this.maxConcurrent);

      const batchResults = await Promise.allSettled(
        batch.map((followup) =>
          this.executeFollowup({
            followupId: followup.followupId,
            organizationId: input.organizationId,
          })
        )
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          const execution = result.value;
          executions.push(execution);

          if (execution.status === 'SENT') totalSent++;
          else if (execution.status === 'FAILED') totalFailed++;
          else if (execution.status === 'SKIPPED') totalSkipped++;
        } else {
          totalFailed++;
        }
      }
    }

    this.emit('batch-completed', {
      totalProcessed: dueFollowups.length,
      totalSent,
      totalFailed,
      totalSkipped,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      totalProcessed: dueFollowups.length,
      totalSent,
      totalFailed,
      totalSkipped,
      executions,
      durationMs: Date.now() - startTime,
    };
  }

  // =====================================================
  // BACKGROUND POLLING
  // =====================================================

  /**
   * Start automatic polling for due followups
   */
  startPolling(organizationId: string): void {
    if (this.isRunning) {
      console.warn('Followup polling already running');
      return;
    }

    this.isRunning = true;

    this.emit('polling-started', { organizationId });

    const poll = async () => {
      try {
        await this.executeBatch({ organizationId, limit: 50 });
      } catch (error) {
        console.error('Followup polling error:', error);
        this.emit('polling-error', { error });
      }
    };

    // Initial poll
    poll();

    // Set up interval
    this.pollTimer = setInterval(() => {
      poll();
    }, this.pollIntervalMs);
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }

    this.isRunning = false;
    this.emit('polling-stopped');
  }

  // =====================================================
  // ANALYTICS
  // =====================================================

  /**
   * Get sequence summary
   */
  async getSequenceSummary(
    sequenceId: string,
    organizationId: string
  ): Promise<FollowupSequenceSummary> {
    // Get sequence with steps
    const { data: sequence, error: seqError } = await supabase
      .from('followup_sequences')
      .select('*')
      .eq('id', sequenceId)
      .eq('organization_id', organizationId)
      .single();

    if (seqError || !sequence) {
      throw new Error('Sequence not found');
    }

    const { data: steps } = await supabase
      .from('followup_steps')
      .select('*')
      .eq('sequence_id', sequenceId)
      .order('step_number');

    // Get statistics
    const { data: stats } = await supabase
      .from('scheduled_followups')
      .select('status, was_opened, was_clicked, was_replied')
      .eq('sequence_id', sequenceId)
      .eq('organization_id', organizationId);

    const totalScheduled = stats?.length || 0;
    const totalSent = stats?.filter((s) => s.status === 'SENT').length || 0;
    const totalPending = stats?.filter((s) => s.status === 'PENDING').length || 0;
    const totalCanceled = stats?.filter((s) => s.status === 'CANCELED').length || 0;
    const totalFailed = stats?.filter((s) => s.status === 'FAILED').length || 0;

    const sentFollowups = stats?.filter((s) => s.status === 'SENT') || [];
    const avgOpenRate =
      sentFollowups.length > 0
        ? sentFollowups.filter((s) => s.was_opened).length / sentFollowups.length
        : 0;
    const avgClickRate =
      sentFollowups.length > 0
        ? sentFollowups.filter((s) => s.was_clicked).length / sentFollowups.length
        : 0;
    const avgReplyRate =
      sentFollowups.length > 0
        ? sentFollowups.filter((s) => s.was_replied).length / sentFollowups.length
        : 0;

    return {
      sequence: sequence as FollowupSequence,
      steps: (steps || []) as FollowupStep[],
      statistics: {
        totalScheduled,
        totalSent,
        totalPending,
        totalCanceled,
        totalFailed,
        avgOpenRate,
        avgClickRate,
        avgReplyRate,
      },
    };
  }

  /**
   * Get contact followup status
   */
  async getContactStatus(
    contactId: string,
    organizationId: string
  ): Promise<ContactFollowupStatus> {
    // Get contact
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, name, email')
      .eq('id', contactId)
      .eq('organization_id', organizationId)
      .single();

    if (!contact) {
      throw new Error('Contact not found');
    }

    // Get all sequences for contact
    const { data: followups } = await supabase
      .from('scheduled_followups')
      .select(
        `
        *,
        followup_sequences (
          id,
          name,
          total_steps
        ),
        followup_steps (
          step_number
        )
      `
      )
      .eq('contact_id', contactId)
      .eq('organization_id', organizationId);

    // Group by sequence
    const sequenceMap = new Map<string, any>();

    for (const followup of followups || []) {
      const seq = followup.followup_sequences as any;
      const step = followup.followup_steps as any;

      if (!sequenceMap.has(seq.id)) {
        sequenceMap.set(seq.id, {
          sequenceId: seq.id,
          sequenceName: seq.name,
          totalSteps: seq.total_steps,
          followups: [],
        });
      }

      sequenceMap.get(seq.id).followups.push({
        ...followup,
        stepNumber: step.step_number,
      });
    }

    const sequences = Array.from(sequenceMap.values()).map((seqData) => {
      const pending = seqData.followups.filter(
        (f: any) => f.status === 'PENDING'
      ).length;
      const sent = seqData.followups.filter((f: any) => f.status === 'SENT').length;
      const canceled = seqData.followups.filter(
        (f: any) => f.status === 'CANCELED'
      ).length;

      let status: 'active' | 'completed' | 'canceled' = 'active';
      if (canceled > 0) status = 'canceled';
      else if (pending === 0 && sent === seqData.totalSteps) status = 'completed';

      const nextPending = seqData.followups
        .filter((f: any) => f.status === 'PENDING')
        .sort(
          (a: any, b: any) =>
            new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
        )[0];

      const lastSent = seqData.followups
        .filter((f: any) => f.status === 'SENT')
        .sort(
          (a: any, b: any) =>
            new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
        )[0];

      return {
        sequenceId: seqData.sequenceId,
        sequenceName: seqData.sequenceName,
        currentStep: lastSent ? lastSent.stepNumber : undefined,
        totalSteps: seqData.totalSteps,
        status,
        nextScheduledAt: nextPending?.scheduled_at,
        lastSentAt: lastSent?.sent_at,
        totalSent: sent,
        totalPending: pending,
      };
    });

    return {
      contactId: contact.id,
      contactName: contact.name,
      contactEmail: contact.email,
      sequences,
    };
  }

  // =====================================================
  // PRIVATE HELPERS
  // =====================================================

  private async sendFollowupEmail(
    followup: any,
    contact: any
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // TODO: Integrate with actual email service (SendGrid, Resend, etc.)
      // For now, simulate email sending

      // Personalize subject and body
      const subject = this.personalize(followup.subject || 'Follow-up', contact);
      const body = this.personalize(followup.body || '', contact);

      console.log(`[FOLLOWUP EMAIL] To: ${contact.email}`);
      console.log(`[FOLLOWUP EMAIL] Subject: ${subject}`);
      console.log(`[FOLLOWUP EMAIL] Body: ${body.substring(0, 100)}...`);

      // Simulate sending
      const messageId = `followup-${followup.id}-${Date.now()}`;

      return {
        success: true,
        messageId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private personalize(template: string, contact: any): string {
    return template
      .replace(/\{\{contact\.name\}\}/g, contact.name || 'there')
      .replace(/\{\{contact\.email\}\}/g, contact.email || '')
      .replace(/\{\{contact\.firstName\}\}/g, contact.name?.split(' ')[0] || 'there');
  }

  private async markFollowupSent(input: MarkFollowupSentInput): Promise<void> {
    const { error } = await supabase.rpc('mark_followup_sent', {
      p_followup_id: input.followupId,
      p_sent_message_id: input.sentMessageId,
      p_organization_id: input.organizationId,
    });

    if (error) {
      throw new Error(`Failed to mark followup as sent: ${error.message}`);
    }
  }

  private async markFollowupFailed(input: MarkFollowupFailedInput): Promise<void> {
    const { error } = await supabase
      .from('scheduled_followups')
      .update({
        status: 'FAILED',
        error_message: input.errorMessage,
        last_attempt_at: new Date().toISOString(),
        attempt_number: supabase.raw('attempt_number + 1'),
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.followupId)
      .eq('organization_id', input.organizationId);

    if (error) {
      throw new Error(`Failed to mark followup as failed: ${error.message}`);
    }
  }

  private async markFollowupSkipped(
    followupId: string,
    reasons: string[]
  ): Promise<void> {
    const { error } = await supabase
      .from('scheduled_followups')
      .update({
        status: 'SKIPPED',
        outcome: reasons.join(', '),
        metadata: supabase.raw(
          `COALESCE(metadata, '{}'::jsonb) || '${JSON.stringify({ skippedReasons: reasons })}'::jsonb`
        ),
        updated_at: new Date().toISOString(),
      })
      .eq('id', followupId);

    if (error) {
      throw new Error(`Failed to mark followup as skipped: ${error.message}`);
    }
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const followupEngine = new FollowupEngine({
  pollIntervalMs: 60000, // 1 minute
  maxConcurrent: 10,
});
