import type { PromptSlot, PromptResolutionContext, ResolvePromptOutput, ParsedSlot, SlotValidationResult } from '@pravado/types';
export declare class PromptTemplateEngine {
    private staticResolver;
    private contextResolver;
    private memoryResolver;
    private databaseResolver;
    private gptResolver;
    resolvePrompt(templateId: string, context: PromptResolutionContext): Promise<ResolvePromptOutput>;
    resolveSlot(slot: PromptSlot, context: PromptResolutionContext): Promise<any>;
    extractSlots(templateText: string): ParsedSlot[];
    logInvocation(params: {
        templateId: string;
        agentId?: string;
        campaignId?: string;
        userId?: string;
        organizationId: string;
        resolvedPrompt: string;
        resolvedSlots: Record<string, any>;
        responseTimeMs: number;
        gptTokenCount?: number;
        gptModel?: string;
        gptCostUsd?: number;
        success: boolean;
        errorMessage?: string;
        metadata?: Record<string, any>;
    }): Promise<void>;
    validateSlotValue(slot: PromptSlot, value: any): SlotValidationResult;
    protected replaceSlotsInTemplate(templateText: string, resolvedSlots: Record<string, any>): string;
    protected estimateTokenCount(text: string): number;
    protected estimateCost(model: string, tokens: number): number;
}
export declare const promptTemplateEngine: PromptTemplateEngine;
//# sourceMappingURL=prompt-template-engine.d.ts.map