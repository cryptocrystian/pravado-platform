import { EventEmitter } from 'events';
import type { PromptBlock, PromptTemplate, AssembledPrompt, PromptValidation, PromptPreviewResult, PromptImprovementResult, CreatePromptBlockInput, UpdatePromptBlockInput, CreatePromptTemplateInput, UpdatePromptTemplateInput, AssemblePromptInput, InjectContextInput, ValidatePromptInput, ImprovePromptInput, TokenEstimationResult, BlockType, UseCaseTag, ModelScope } from '@pravado/types';
export declare class PromptEngine extends EventEmitter {
    createPromptBlock(input: CreatePromptBlockInput): Promise<PromptBlock>;
    updatePromptBlock(input: UpdatePromptBlockInput): Promise<PromptBlock>;
    deletePromptBlock(blockId: string, organizationId: string): Promise<boolean>;
    getPromptBlock(blockId: string, organizationId: string): Promise<PromptBlock | null>;
    listPromptBlocks(organizationId: string, filters?: {
        blockType?: BlockType;
        modelScope?: ModelScope;
        tags?: string[];
        category?: string;
    }): Promise<PromptBlock[]>;
    createPromptTemplate(input: CreatePromptTemplateInput): Promise<PromptTemplate>;
    updatePromptTemplate(input: UpdatePromptTemplateInput): Promise<PromptTemplate>;
    deletePromptTemplate(templateId: string, organizationId: string): Promise<boolean>;
    getPromptTemplate(templateId: string, organizationId: string): Promise<PromptTemplate | null>;
    listPromptTemplates(organizationId: string, filters?: {
        useCaseTag?: UseCaseTag;
        modelScope?: ModelScope;
    }): Promise<PromptTemplate[]>;
    assemblePrompt(input: AssemblePromptInput): Promise<AssembledPrompt>;
    getPromptPreview(templateId: string, organizationId: string): Promise<PromptPreviewResult>;
    injectContext(input: InjectContextInput): Promise<string>;
    private buildMemoryContext;
    private buildGoalsContext;
    private buildCampaignContext;
    private buildContactContext;
    private buildCustomContext;
    validatePrompt(input: ValidatePromptInput): Promise<PromptValidation>;
    validatePromptTemplate(templateId: string, organizationId: string): Promise<PromptValidation>;
    private checkRepetition;
    private checkAmbiguity;
    summarizePrompt(prompt: string): Promise<string>;
    recommendPromptImprovements(input: ImprovePromptInput): Promise<PromptImprovementResult>;
    private buildImprovementPrompt;
    estimateTokens(text: string): number;
    getTokenEstimation(text: string, model?: string): TokenEstimationResult;
    private mapBlockFromDb;
    private mapTemplateFromDb;
}
export declare const promptEngine: PromptEngine;
//# sourceMappingURL=prompt-engine.d.ts.map