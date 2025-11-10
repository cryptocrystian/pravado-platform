import type { AgentReview, CreateAgentReviewInput, UpdateAgentReviewInput, SubmitReviewDecisionInput, ReviewType, ReviewPriority, ReviewableEntityType, ReviewContext, ReviewDecisionResult, CreateReviewCommentInput, ReviewComment } from '@pravado/types';
import { EventEmitter } from 'events';
export declare class ReviewEngine extends EventEmitter {
    createReviewRequest(input: CreateAgentReviewInput): Promise<AgentReview>;
    submitReviewDecision(input: SubmitReviewDecisionInput, organizationId: string): Promise<ReviewDecisionResult>;
    getReview(reviewId: string, organizationId: string): Promise<AgentReview | null>;
    updateReview(reviewId: string, input: UpdateAgentReviewInput, organizationId: string): Promise<AgentReview>;
    addComment(input: CreateReviewCommentInput): Promise<ReviewComment>;
    getUserPendingReviews(userId: string, organizationId: string): Promise<AgentReview[]>;
    fetchReviewContext(entityType: ReviewableEntityType, entityId: string, organizationId: string): Promise<ReviewContext>;
    shouldTriggerReview(entityType: ReviewableEntityType, entityId: string, organizationId: string, metadata?: Record<string, any>): Promise<{
        requiresReview: boolean;
        reviewType?: ReviewType;
        priority?: ReviewPriority;
        reason?: string;
    }>;
    private recordReviewLearning;
    private calculateDueDate;
    private mapDbReviewToType;
    private mapDbCommentToType;
}
export declare const reviewEngine: ReviewEngine;
//# sourceMappingURL=review-engine.d.ts.map