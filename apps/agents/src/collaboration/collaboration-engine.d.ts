import { EventEmitter } from 'events';
import type { HandoffRequest, CollaborationThread, CollaborationComment, CreateHandoffRequestInput, AcceptHandoffInput, DeclineHandoffInput, CreateCollaborationThreadInput, CreateCollaborationCommentInput, CampaignCollaborationContext, ThreadSummary, SummarizeThreadInput, EnrichedHandoffRequest } from '@pravado/types';
export declare class CollaborationEngine extends EventEmitter {
    requestHandoff(input: Omit<CreateHandoffRequestInput, 'organizationId'> & {
        fromUserId: string;
        organizationId: string;
    }): Promise<HandoffRequest>;
    acceptHandoff(input: AcceptHandoffInput): Promise<boolean>;
    declineHandoff(input: DeclineHandoffInput): Promise<boolean>;
    getUserHandoffQueue(userId: string, organizationId: string): Promise<EnrichedHandoffRequest[]>;
    createThread(input: Omit<CreateCollaborationThreadInput, 'organizationId'> & {
        userId: string;
        organizationId: string;
    }): Promise<CollaborationThread>;
    addComment(input: Omit<CreateCollaborationCommentInput, 'organizationId'> & {
        authorId: string;
        organizationId: string;
    }): Promise<CollaborationComment>;
    private mentionUser;
    getCampaignDiscussion(campaignId: string, userId: string, organizationId: string): Promise<CampaignCollaborationContext>;
    summarizeThread(input: SummarizeThreadInput): Promise<ThreadSummary>;
    private buildSummaryPrompt;
    private mapHandoffRequest;
    private mapThread;
    private mapComment;
}
export declare const collaborationEngine: CollaborationEngine;
//# sourceMappingURL=collaboration-engine.d.ts.map