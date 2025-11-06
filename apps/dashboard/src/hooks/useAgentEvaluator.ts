// =====================================================
// AGENT EVALUATOR HOOKS
// Sprint 35: Agent performance evaluation framework
// =====================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  AgentEvaluation,
  EvaluationEvent,
  EvaluationTemplate,
  EvaluationWithDetails,
  EvaluationDashboard,
  ImprovementRecommendations,
  EvaluateRunInput,
  SummarizeEvaluationInput,
  UpdateEvaluationInput,
  LogEvaluationEventInput,
  CreateEvaluationTemplateInput,
  UpdateEvaluationTemplateInput,
  GetEvaluationsInput,
  GetEvaluationEventsInput,
  GetEvaluationDashboardInput,
  RecommendImprovementsInput,
  GetTemplatesInput,
  EvaluationSource,
  EvaluationStatus,
  EvaluationCriteria,
  EVALUATION_SOURCE_CONFIGS,
  EVALUATION_STATUS_CONFIGS,
  EVALUATION_CRITERIA_CONFIGS,
  EVALUATION_EVENT_TYPE_CONFIGS,
  ScoreTrendChartData,
  CriteriaComparisonChartData,
  SourceDistributionChartData,
  PerformanceDistributionChartData,
} from '@pravado/types';

// =====================================================
// API FUNCTIONS
// =====================================================

const agentEvaluatorApi = {
  // Evaluations
  evaluateRun: (input: Omit<EvaluateRunInput, 'organizationId' | 'evaluatedBy'>) =>
    apiClient.post<{ evaluationId: string }>('/agent-evaluator/evaluate', input),

  updateEvaluation: (evaluationId: string, input: Omit<UpdateEvaluationInput, 'evaluationId'>) =>
    apiClient.put<{ evaluation: AgentEvaluation }>(`/agent-evaluator/evaluations/${evaluationId}`, input),

  getEvaluations: (params: Omit<GetEvaluationsInput, 'organizationId'>) =>
    apiClient.get<{ evaluations: AgentEvaluation[]; total: number }>('/agent-evaluator/evaluations', { params }),

  getEvaluationById: (evaluationId: string) =>
    apiClient.get<{ evaluation: EvaluationWithDetails }>(`/agent-evaluator/evaluations/${evaluationId}`),

  logEvaluationEvent: (
    evaluationId: string,
    input: Omit<LogEvaluationEventInput, 'evaluationId' | 'triggeredBy'>
  ) => apiClient.post<{ eventId: string }>(`/agent-evaluator/evaluations/${evaluationId}/events`, input),

  getEvaluationEvents: (evaluationId: string, params: Omit<GetEvaluationEventsInput, 'evaluationId'>) =>
    apiClient.get<{ events: EvaluationEvent[]; total: number }>(
      `/agent-evaluator/evaluations/${evaluationId}/events`,
      { params }
    ),

  // Templates
  createTemplate: (input: Omit<CreateEvaluationTemplateInput, 'organizationId' | 'createdBy'>) =>
    apiClient.post<{ templateId: string }>('/agent-evaluator/templates', input),

  updateTemplate: (templateId: string, input: Omit<UpdateEvaluationTemplateInput, 'templateId'>) =>
    apiClient.put<{ template: EvaluationTemplate }>(`/agent-evaluator/templates/${templateId}`, input),

  getTemplates: (params: Omit<GetTemplatesInput, 'organizationId'>) =>
    apiClient.get<{ templates: EvaluationTemplate[] }>('/agent-evaluator/templates', { params }),

  // AI Insights
  summarizeEvaluation: (evaluationId: string) =>
    apiClient.post<{ summary: string }>(`/agent-evaluator/evaluations/${evaluationId}/summarize`, {}),

  recommendImprovements: (evaluationId: string) =>
    apiClient.post<{ recommendations: ImprovementRecommendations }>(
      `/agent-evaluator/evaluations/${evaluationId}/improvements`,
      {}
    ),

  // Dashboard
  getDashboard: (params: Omit<GetEvaluationDashboardInput, 'organizationId'>) =>
    apiClient.get<{ dashboard: EvaluationDashboard }>('/agent-evaluator/dashboard', { params }),
};

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Evaluate agent run
 */
export function useEvaluateRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: agentEvaluatorApi.evaluateRun,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['evaluation-dashboard'] });
    },
  });
}

/**
 * Update evaluation
 */
export function useUpdateEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ evaluationId, ...input }: { evaluationId: string } & Omit<UpdateEvaluationInput, 'evaluationId'>) =>
      agentEvaluatorApi.updateEvaluation(evaluationId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['evaluation', variables.evaluationId] });
      queryClient.invalidateQueries({ queryKey: ['evaluation-dashboard'] });
    },
  });
}

/**
 * Log evaluation event
 */
export function useLogEvaluationEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      evaluationId,
      ...input
    }: { evaluationId: string } & Omit<LogEvaluationEventInput, 'evaluationId' | 'triggeredBy'>) =>
      agentEvaluatorApi.logEvaluationEvent(evaluationId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evaluation', variables.evaluationId] });
      queryClient.invalidateQueries({ queryKey: ['evaluation-events', variables.evaluationId] });
    },
  });
}

/**
 * Create evaluation template
 */
export function useCreateEvaluationTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: agentEvaluatorApi.createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-templates'] });
    },
  });
}

/**
 * Update evaluation template
 */
export function useUpdateEvaluationTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      ...input
    }: { templateId: string } & Omit<UpdateEvaluationTemplateInput, 'templateId'>) =>
      agentEvaluatorApi.updateTemplate(templateId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-templates'] });
    },
  });
}

/**
 * Summarize evaluation with GPT-4
 */
export function useSummarizeEvaluation() {
  return useMutation({
    mutationFn: (evaluationId: string) => agentEvaluatorApi.summarizeEvaluation(evaluationId),
  });
}

/**
 * Recommend improvements with GPT-4
 */
export function useRecommendImprovements() {
  return useMutation({
    mutationFn: (evaluationId: string) => agentEvaluatorApi.recommendImprovements(evaluationId),
  });
}

// =====================================================
// QUERY HOOKS
// =====================================================

/**
 * Get evaluations list
 */
export function useEvaluations(params: Omit<GetEvaluationsInput, 'organizationId'> = {}) {
  return useQuery({
    queryKey: ['evaluations', params],
    queryFn: () => agentEvaluatorApi.getEvaluations(params),
    select: (data) => data.data,
  });
}

/**
 * Get evaluation by ID
 */
export function useEvaluationById(evaluationId: string | null) {
  return useQuery({
    queryKey: ['evaluation', evaluationId],
    queryFn: () => agentEvaluatorApi.getEvaluationById(evaluationId!),
    enabled: !!evaluationId,
    select: (data) => data.data.evaluation,
  });
}

/**
 * Get evaluation events
 */
export function useEvaluationEvents(
  evaluationId: string | null,
  params: Omit<GetEvaluationEventsInput, 'evaluationId'> = {}
) {
  return useQuery({
    queryKey: ['evaluation-events', evaluationId, params],
    queryFn: () => agentEvaluatorApi.getEvaluationEvents(evaluationId!, params),
    enabled: !!evaluationId,
    select: (data) => data.data,
  });
}

/**
 * Get evaluation templates
 */
export function useEvaluationTemplates(params: Omit<GetTemplatesInput, 'organizationId'> = {}) {
  return useQuery({
    queryKey: ['evaluation-templates', params],
    queryFn: () => agentEvaluatorApi.getTemplates(params),
    select: (data) => data.data.templates,
  });
}

/**
 * Get evaluation dashboard
 */
export function useEvaluationDashboard(params: Omit<GetEvaluationDashboardInput, 'organizationId'> = {}) {
  return useQuery({
    queryKey: ['evaluation-dashboard', params],
    queryFn: () => agentEvaluatorApi.getDashboard(params),
    select: (data) => data.data.dashboard,
  });
}

// =====================================================
// FILTERED QUERY HOOKS
// =====================================================

/**
 * Get evaluations by source
 */
export function useEvaluationsBySource(source: EvaluationSource) {
  return useEvaluations({ source });
}

/**
 * Get evaluations by status
 */
export function useEvaluationsByStatus(status: EvaluationStatus) {
  return useEvaluations({ status });
}

/**
 * Get completed evaluations
 */
export function useCompletedEvaluations(params: Omit<GetEvaluationsInput, 'organizationId' | 'status'> = {}) {
  return useEvaluations({ ...params, status: EvaluationStatus.COMPLETED });
}

/**
 * Get pending evaluations
 */
export function usePendingEvaluations(params: Omit<GetEvaluationsInput, 'organizationId' | 'status'> = {}) {
  return useEvaluations({ ...params, status: EvaluationStatus.PENDING });
}

/**
 * Get failed evaluations
 */
export function useFailedEvaluations(params: Omit<GetEvaluationsInput, 'organizationId' | 'status'> = {}) {
  return useEvaluations({ ...params, status: EvaluationStatus.FAILED });
}

/**
 * Get GPT evaluations
 */
export function useGptEvaluations(params: Omit<GetEvaluationsInput, 'organizationId' | 'source'> = {}) {
  return useEvaluations({ ...params, source: EvaluationSource.GPT });
}

/**
 * Get manual evaluations
 */
export function useManualEvaluations(params: Omit<GetEvaluationsInput, 'organizationId' | 'source'> = {}) {
  return useEvaluations({ ...params, source: EvaluationSource.MANUAL });
}

/**
 * Get evaluations for agent run
 */
export function useAgentRunEvaluations(agentRunId: string) {
  return useEvaluations({ agentRunId });
}

/**
 * Get evaluations for campaign
 */
export function useCampaignEvaluations(campaignId: string) {
  return useEvaluations({ campaignId });
}

/**
 * Get evaluations for contact
 */
export function useContactEvaluations(contactId: string) {
  return useEvaluations({ contactId });
}

/**
 * Get evaluations by template
 */
export function useTemplateEvaluations(templateId: string) {
  return useEvaluations({ templateId });
}

/**
 * Get evaluations in score range
 */
export function useEvaluationsByScoreRange(minScore: number, maxScore: number) {
  return useEvaluations({ minScore, maxScore });
}

/**
 * Get high-scoring evaluations (>= 80)
 */
export function useHighScoringEvaluations(params: Omit<GetEvaluationsInput, 'organizationId' | 'minScore'> = {}) {
  return useEvaluations({ ...params, minScore: 80 });
}

/**
 * Get low-scoring evaluations (< 60)
 */
export function useLowScoringEvaluations(params: Omit<GetEvaluationsInput, 'organizationId' | 'maxScore'> = {}) {
  return useEvaluations({ ...params, maxScore: 59.99 });
}

/**
 * Get active templates
 */
export function useActiveTemplates() {
  return useEvaluationTemplates({ isActive: true });
}

/**
 * Get default template
 */
export function useDefaultTemplate() {
  return useEvaluationTemplates({ isDefault: true });
}

// =====================================================
// CONFIGURATION HOOKS
// =====================================================

/**
 * Get evaluation source configuration
 */
export function useEvaluationSourceConfig(source: EvaluationSource) {
  return EVALUATION_SOURCE_CONFIGS[source];
}

/**
 * Get evaluation status configuration
 */
export function useEvaluationStatusConfig(status: EvaluationStatus) {
  return EVALUATION_STATUS_CONFIGS[status];
}

/**
 * Get evaluation criteria configuration
 */
export function useEvaluationCriteriaConfig(criteria: EvaluationCriteria) {
  return EVALUATION_CRITERIA_CONFIGS[criteria];
}

/**
 * Get evaluation event type configuration
 */
export function useEvaluationEventTypeConfig(eventType: string) {
  return EVALUATION_EVENT_TYPE_CONFIGS[eventType];
}

/**
 * Get all evaluation sources
 */
export function useEvaluationSources() {
  return Object.values(EvaluationSource);
}

/**
 * Get all evaluation statuses
 */
export function useEvaluationStatuses() {
  return Object.values(EvaluationStatus);
}

/**
 * Get all evaluation criteria
 */
export function useEvaluationCriteria() {
  return Object.values(EvaluationCriteria);
}

// =====================================================
// HELPER HOOKS
// =====================================================

/**
 * Get source color
 */
export function useSourceColor(source: EvaluationSource) {
  return EVALUATION_SOURCE_CONFIGS[source].color;
}

/**
 * Get source label
 */
export function useSourceLabel(source: EvaluationSource) {
  return EVALUATION_SOURCE_CONFIGS[source].label;
}

/**
 * Get source icon
 */
export function useSourceIcon(source: EvaluationSource) {
  return EVALUATION_SOURCE_CONFIGS[source].icon;
}

/**
 * Get status color
 */
export function useStatusColor(status: EvaluationStatus) {
  return EVALUATION_STATUS_CONFIGS[status].color;
}

/**
 * Get status label
 */
export function useStatusLabel(status: EvaluationStatus) {
  return EVALUATION_STATUS_CONFIGS[status].label;
}

/**
 * Get status icon
 */
export function useStatusIcon(status: EvaluationStatus) {
  return EVALUATION_STATUS_CONFIGS[status].icon;
}

/**
 * Get criteria color
 */
export function useCriteriaColor(criteria: EvaluationCriteria) {
  return EVALUATION_CRITERIA_CONFIGS[criteria].color;
}

/**
 * Get criteria label
 */
export function useCriteriaLabel(criteria: EvaluationCriteria) {
  return EVALUATION_CRITERIA_CONFIGS[criteria].label;
}

/**
 * Get criteria icon
 */
export function useCriteriaIcon(criteria: EvaluationCriteria) {
  return EVALUATION_CRITERIA_CONFIGS[criteria].icon;
}

/**
 * Get score badge color based on score value
 */
export function useScoreBadgeColor(score?: number): string {
  if (!score) return 'gray';
  if (score >= 90) return 'green';
  if (score >= 80) return 'blue';
  if (score >= 70) return 'yellow';
  if (score >= 60) return 'orange';
  return 'red';
}

/**
 * Get score grade (A, B, C, D, F)
 */
export function useScoreGrade(score?: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (!score) return 'F';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Check if evaluation is passing
 */
export function useIsPassing(score?: number, threshold: number = 70): boolean {
  return (score || 0) >= threshold;
}

/**
 * Get evaluation color based on status
 */
export function useEvaluationColor(evaluation: AgentEvaluation | EvaluationWithDetails): string {
  if (evaluation.status === EvaluationStatus.FAILED) return 'red';
  if (evaluation.status === EvaluationStatus.PENDING) return 'yellow';
  return useScoreBadgeColor(evaluation.overall_score);
}

/**
 * Format score display
 */
export function useScoreDisplay(score?: number): string {
  if (!score) return 'N/A';
  return `${score.toFixed(1)}%`;
}

/**
 * Get evaluation performance level
 */
export function usePerformanceLevel(score?: number): 'EXCELLENT' | 'GOOD' | 'SATISFACTORY' | 'NEEDS_IMPROVEMENT' | 'POOR' {
  if (!score) return 'POOR';
  if (score >= 90) return 'EXCELLENT';
  if (score >= 80) return 'GOOD';
  if (score >= 70) return 'SATISFACTORY';
  if (score >= 60) return 'NEEDS_IMPROVEMENT';
  return 'POOR';
}

// =====================================================
// CHART DATA HELPERS
// =====================================================

/**
 * Generate score trend chart data
 */
export function useScoreTrendChartData(evaluations: AgentEvaluation[]): ScoreTrendChartData[] {
  if (!evaluations || evaluations.length === 0) return [];

  const trendData: ScoreTrendChartData[] = [];

  evaluations.forEach((evaluation) => {
    if (evaluation.status !== EvaluationStatus.COMPLETED || !evaluation.overall_score) return;

    trendData.push({
      date: evaluation.evaluated_at || evaluation.created_at,
      overall_score: evaluation.overall_score,
      gpt_score: evaluation.source === EvaluationSource.GPT ? evaluation.overall_score : undefined,
      manual_score: evaluation.source === EvaluationSource.MANUAL ? evaluation.overall_score : undefined,
    });
  });

  return trendData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Generate criteria comparison chart data
 */
export function useCriteriaComparisonChartData(
  evaluation: EvaluationWithDetails,
  benchmark: number = 80
): CriteriaComparisonChartData[] {
  return evaluation.criteria_scores.map((criteriaScore) => ({
    criteria: criteriaScore.criteria,
    score: criteriaScore.score,
    benchmark,
    weight: criteriaScore.weight,
  }));
}

/**
 * Generate source distribution chart data
 */
export function useSourceDistributionChartData(evaluations: AgentEvaluation[]): SourceDistributionChartData[] {
  if (!evaluations || evaluations.length === 0) return [];

  const sourceMap = new Map<
    EvaluationSource,
    { count: number; totalScore: number }
  >();

  evaluations
    .filter((e) => e.status === EvaluationStatus.COMPLETED && e.overall_score)
    .forEach((evaluation) => {
      const current = sourceMap.get(evaluation.source) || { count: 0, totalScore: 0 };
      sourceMap.set(evaluation.source, {
        count: current.count + 1,
        totalScore: current.totalScore + (evaluation.overall_score || 0),
      });
    });

  const total = Array.from(sourceMap.values()).reduce((sum, item) => sum + item.count, 0);

  return Array.from(sourceMap.entries()).map(([source, data]) => ({
    source,
    count: data.count,
    avg_score: data.count > 0 ? data.totalScore / data.count : 0,
    percentage: (data.count / total) * 100,
  }));
}

/**
 * Generate performance distribution chart data
 */
export function usePerformanceDistributionChartData(evaluations: AgentEvaluation[]): PerformanceDistributionChartData[] {
  if (!evaluations || evaluations.length === 0) return [];

  const ranges = [
    { range: '90-100', min: 90, max: 100 },
    { range: '80-89', min: 80, max: 89 },
    { range: '70-79', min: 70, max: 79 },
    { range: '60-69', min: 60, max: 69 },
    { range: '0-59', min: 0, max: 59 },
  ];

  const completedEvaluations = evaluations.filter(
    (e) => e.status === EvaluationStatus.COMPLETED && e.overall_score !== undefined
  );

  const total = completedEvaluations.length;

  return ranges.map(({ range, min, max }) => {
    const count = completedEvaluations.filter(
      (e) => e.overall_score! >= min && e.overall_score! <= max
    ).length;

    return {
      score_range: range,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    };
  });
}

// =====================================================
// SUMMARY & ANALYSIS HOOKS
// =====================================================

/**
 * Get evaluation summary statistics
 */
export function useEvaluationSummary(evaluations: AgentEvaluation[] | undefined) {
  if (!evaluations) return null;

  const completed = evaluations.filter((e) => e.status === EvaluationStatus.COMPLETED);
  const withScores = completed.filter((e) => e.overall_score !== undefined);

  return {
    total: evaluations.length,
    completed: completed.length,
    pending: evaluations.filter((e) => e.status === EvaluationStatus.PENDING).length,
    failed: evaluations.filter((e) => e.status === EvaluationStatus.FAILED).length,
    avgScore: withScores.length > 0 ? withScores.reduce((sum, e) => sum + (e.overall_score || 0), 0) / withScores.length : 0,
    highPerformers: withScores.filter((e) => (e.overall_score || 0) >= 80).length,
    lowPerformers: withScores.filter((e) => (e.overall_score || 0) < 60).length,
  };
}

/**
 * Get top performing evaluations
 */
export function useTopPerformingEvaluations(evaluations: AgentEvaluation[] | undefined, limit = 5) {
  if (!evaluations) return [];

  return [...evaluations]
    .filter((e) => e.status === EvaluationStatus.COMPLETED && e.overall_score !== undefined)
    .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
    .slice(0, limit);
}

/**
 * Get lowest performing evaluations
 */
export function useLowestPerformingEvaluations(evaluations: AgentEvaluation[] | undefined, limit = 5) {
  if (!evaluations) return [];

  return [...evaluations]
    .filter((e) => e.status === EvaluationStatus.COMPLETED && e.overall_score !== undefined)
    .sort((a, b) => (a.overall_score || 0) - (b.overall_score || 0))
    .slice(0, limit);
}

/**
 * Get average score by criteria
 */
export function useAverageScoreByCriteria(evaluations: AgentEvaluation[] | undefined): Record<string, number> {
  if (!evaluations) return {};

  const criteriaMap = new Map<string, { sum: number; count: number }>();

  evaluations
    .filter((e) => e.status === EvaluationStatus.COMPLETED)
    .forEach((evaluation) => {
      Object.entries(evaluation.score_breakdown || {}).forEach(([criteria, score]) => {
        const current = criteriaMap.get(criteria) || { sum: 0, count: 0 };
        criteriaMap.set(criteria, {
          sum: current.sum + (score as number),
          count: current.count + 1,
        });
      });
    });

  const result: Record<string, number> = {};
  criteriaMap.forEach((value, key) => {
    result[key] = value.count > 0 ? value.sum / value.count : 0;
  });

  return result;
}

/**
 * Get improvement suggestions from evaluations
 */
export function useRunImprovementSuggestions(evaluations: EvaluationWithDetails[] | undefined): string[] {
  if (!evaluations || evaluations.length === 0) return [];

  const allSuggestions = new Set<string>();

  evaluations.forEach((evaluation) => {
    evaluation.improvement_suggestions?.forEach((suggestion) => {
      allSuggestions.add(suggestion);
    });
  });

  return Array.from(allSuggestions);
}

/**
 * Get common weaknesses across evaluations
 */
export function useCommonWeaknesses(evaluations: EvaluationWithDetails[] | undefined): string[] {
  if (!evaluations || evaluations.length === 0) return [];

  const weaknessMap = new Map<string, number>();

  evaluations.forEach((evaluation) => {
    evaluation.weaknesses?.forEach((weakness) => {
      weaknessMap.set(weakness, (weaknessMap.get(weakness) || 0) + 1);
    });
  });

  return Array.from(weaknessMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([weakness]) => weakness);
}

/**
 * Get common strengths across evaluations
 */
export function useCommonStrengths(evaluations: EvaluationWithDetails[] | undefined): string[] {
  if (!evaluations || evaluations.length === 0) return [];

  const strengthMap = new Map<string, number>();

  evaluations.forEach((evaluation) => {
    evaluation.strengths?.forEach((strength) => {
      strengthMap.set(strength, (strengthMap.get(strength) || 0) + 1);
    });
  });

  return Array.from(strengthMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([strength]) => strength);
}
