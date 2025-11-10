import { EventEmitter } from 'events';
import type { AgentEvaluation, EvaluationEvent, EvaluationTemplate, EvaluationWithDetails, EvaluationDashboard, ImprovementRecommendations, EvaluateRunInput, SummarizeEvaluationInput, UpdateEvaluationInput, LogEvaluationEventInput, CreateEvaluationTemplateInput, UpdateEvaluationTemplateInput, GetEvaluationsInput, GetEvaluationEventsInput, GetEvaluationDashboardInput, RecommendImprovementsInput, GetTemplatesInput } from '@pravado/types';
declare class AgentEvaluatorEngine extends EventEmitter {
    evaluateRun(input: EvaluateRunInput): Promise<string>;
    private performGptAnalysis;
    private buildEvaluationPrompt;
    updateEvaluation(input: UpdateEvaluationInput): Promise<AgentEvaluation>;
    getEvaluations(input: GetEvaluationsInput): Promise<{
        evaluations: AgentEvaluation[];
        total: number;
    }>;
    getEvaluationById(organizationId: string, evaluationId: string): Promise<EvaluationWithDetails>;
    private calculateScoreGrade;
    logEvaluationEvent(input: LogEvaluationEventInput): Promise<string>;
    getEvaluationEvents(input: GetEvaluationEventsInput): Promise<{
        events: EvaluationEvent[];
        total: number;
    }>;
    createTemplate(input: CreateEvaluationTemplateInput): Promise<string>;
    updateTemplate(input: UpdateEvaluationTemplateInput): Promise<EvaluationTemplate>;
    getTemplates(input: GetTemplatesInput): Promise<EvaluationTemplate[]>;
    getEvaluatorDashboard(input: GetEvaluationDashboardInput): Promise<EvaluationDashboard>;
    summarizeEvaluation(input: SummarizeEvaluationInput): Promise<string>;
    recommendAgentImprovements(input: RecommendImprovementsInput): Promise<ImprovementRecommendations>;
}
export declare const agentEvaluatorEngine: AgentEvaluatorEngine;
export {};
//# sourceMappingURL=agent-evaluator.d.ts.map