import { EventEmitter } from 'events';
import type { GenerateFollowupsInput, GenerateFollowupsResult, EvaluateFollowupTriggersInput, FollowupTriggerEvaluation, RescheduleFollowupInput, CancelFollowupSequenceInput, GetDueFollowupsInput, DueFollowup, ExecuteFollowupInput, FollowupExecutionResult, FollowupBatchExecutionResult, FollowupSequenceSummary, ContactFollowupStatus } from '@pravado/types';
export declare class FollowupEngine extends EventEmitter {
    private isRunning;
    private pollIntervalMs;
    private pollTimer?;
    private maxConcurrent;
    private activeExecutions;
    constructor(options?: {
        pollIntervalMs?: number;
        maxConcurrent?: number;
    });
    generateFollowups(input: GenerateFollowupsInput): Promise<GenerateFollowupsResult>;
    evaluateTriggers(input: EvaluateFollowupTriggersInput): Promise<FollowupTriggerEvaluation>;
    rescheduleFollowup(input: RescheduleFollowupInput): Promise<boolean>;
    cancelSequenceForContact(input: CancelFollowupSequenceInput): Promise<number>;
    getDueFollowups(input: GetDueFollowupsInput): Promise<DueFollowup[]>;
    executeFollowup(input: ExecuteFollowupInput): Promise<FollowupExecutionResult>;
    executeBatch(input: GetDueFollowupsInput): Promise<FollowupBatchExecutionResult>;
    startPolling(organizationId: string): void;
    stopPolling(): void;
    getSequenceSummary(sequenceId: string, organizationId: string): Promise<FollowupSequenceSummary>;
    getContactStatus(contactId: string, organizationId: string): Promise<ContactFollowupStatus>;
    private sendFollowupEmail;
    private personalize;
    private markFollowupSent;
    private markFollowupFailed;
    private markFollowupSkipped;
}
export declare const followupEngine: FollowupEngine;
//# sourceMappingURL=followup-engine.d.ts.map