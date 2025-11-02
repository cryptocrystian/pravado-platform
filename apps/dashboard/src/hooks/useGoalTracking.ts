// =====================================================
// UNIFIED GOAL TRACKING HOOKS
// Sprint 34: Multi-level goals, OKR snapshots, AI insights
// =====================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  Goal,
  GoalProgress,
  OkrSnapshot,
  GoalEvent,
  GoalWithProgress,
  GoalMetrics,
  GoalTimeline,
  GoalDashboard,
  GptGoalSummary,
  AlignmentValidation,
  StretchGoalRecommendations,
  CreateGoalInput,
  UpdateGoalInput,
  LogGoalEventInput,
  UpdateGoalProgressInput,
  CalculateGoalMetricsInput,
  GenerateOkrSnapshotInput,
  SummarizeGoalInput,
  ValidateAlignmentInput,
  RecommendStretchGoalsInput,
  GetGoalsInput,
  GetGoalTimelineInput,
  GetGoalDashboardInput,
  GoalScope,
  GoalType,
  GoalStatus,
  GoalEventType,
  RiskLevel,
  GOAL_SCOPE_CONFIGS,
  GOAL_TYPE_CONFIGS,
  GOAL_STATUS_CONFIGS,
  RISK_LEVEL_CONFIGS,
  GOAL_EVENT_TYPE_CONFIGS,
  GoalProgressChartData,
  GoalVelocityChartData,
  GoalCompletionChartData,
  RiskDistributionChartData,
} from '@pravado/shared-types';

// =====================================================
// API FUNCTIONS
// =====================================================

const goalTrackingApi = {
  // CRUD
  createGoal: (input: Omit<CreateGoalInput, 'organizationId'>) =>
    apiClient.post<{ goal: Goal }>('/goal-tracking/goals', input),

  updateGoal: (goalId: string, input: Omit<UpdateGoalInput, 'goalId'>) =>
    apiClient.put<{ goal: Goal }>(`/goal-tracking/goals/${goalId}`, input),

  getGoals: (params: Omit<GetGoalsInput, 'organizationId'>) =>
    apiClient.get<{ goals: Goal[]; total: number }>('/goal-tracking/goals', { params }),

  getGoalById: (goalId: string) =>
    apiClient.get<{ goal: GoalWithProgress }>(`/goal-tracking/goals/${goalId}`),

  // Progress Tracking
  logGoalEvent: (goalId: string, input: Omit<LogGoalEventInput, 'goalId' | 'triggeredBy'>) =>
    apiClient.post<{ eventId: string }>(`/goal-tracking/goals/${goalId}/events`, input),

  updateGoalProgress: (goalId: string, input: Omit<UpdateGoalProgressInput, 'goalId' | 'loggedBy'>) =>
    apiClient.post<{ progress: GoalProgress }>(`/goal-tracking/goals/${goalId}/progress`, input),

  calculateGoalMetrics: (goalId: string) =>
    apiClient.post<{ metrics: GoalMetrics }>(`/goal-tracking/goals/${goalId}/metrics/calculate`, {}),

  getGoalTimeline: (goalId: string, params: Omit<GetGoalTimelineInput, 'organizationId' | 'goalId'>) =>
    apiClient.get<{ timeline: GoalTimeline }>(`/goal-tracking/goals/${goalId}/timeline`, { params }),

  // OKR
  generateOkrSnapshot: (input: Omit<GenerateOkrSnapshotInput, 'organizationId'>) =>
    apiClient.post<{ snapshot: OkrSnapshot }>('/goal-tracking/okr/snapshot', input),

  // AI Insights
  summarizeGoal: (goalId: string) =>
    apiClient.post<{ summary: GptGoalSummary }>(`/goal-tracking/goals/${goalId}/summarize`, {}),

  validateAlignment: (goalId: string, input: Omit<ValidateAlignmentInput, 'organizationId' | 'goalId'>) =>
    apiClient.post<{ validation: AlignmentValidation }>(`/goal-tracking/goals/${goalId}/validate-alignment`, input),

  recommendStretchGoals: (input: Omit<RecommendStretchGoalsInput, 'organizationId'>) =>
    apiClient.post<{ recommendations: StretchGoalRecommendations }>('/goal-tracking/stretch-goals/recommend', input),

  // Dashboard
  getGoalDashboard: (params: Omit<GetGoalDashboardInput, 'organizationId'>) =>
    apiClient.get<{ dashboard: GoalDashboard }>('/goal-tracking/dashboard', { params }),
};

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Create goal
 */
export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: goalTrackingApi.createGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal-dashboard'] });
    },
  });
}

/**
 * Update goal
 */
export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ goalId, ...input }: { goalId: string } & Omit<UpdateGoalInput, 'goalId'>) =>
      goalTrackingApi.updateGoal(goalId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal', variables.goalId] });
      queryClient.invalidateQueries({ queryKey: ['goal-dashboard'] });
    },
  });
}

/**
 * Log goal event
 */
export function useLogGoalEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ goalId, ...input }: { goalId: string } & Omit<LogGoalEventInput, 'goalId' | 'triggeredBy'>) =>
      goalTrackingApi.logGoalEvent(goalId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['goal', variables.goalId] });
      queryClient.invalidateQueries({ queryKey: ['goal-timeline', variables.goalId] });
    },
  });
}

/**
 * Update goal progress
 */
export function useUpdateGoalProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ goalId, ...input }: { goalId: string } & Omit<UpdateGoalProgressInput, 'goalId' | 'loggedBy'>) =>
      goalTrackingApi.updateGoalProgress(goalId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['goal', variables.goalId] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal-timeline', variables.goalId] });
      queryClient.invalidateQueries({ queryKey: ['goal-dashboard'] });
    },
  });
}

/**
 * Calculate goal metrics
 */
export function useCalculateGoalMetrics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (goalId: string) => goalTrackingApi.calculateGoalMetrics(goalId),
    onSuccess: (_, goalId) => {
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
    },
  });
}

/**
 * Generate OKR snapshot
 */
export function useGenerateOkrSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: goalTrackingApi.generateOkrSnapshot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-dashboard'] });
    },
  });
}

/**
 * Summarize goal with GPT-4
 */
export function useSummarizeGoal() {
  return useMutation({
    mutationFn: (goalId: string) => goalTrackingApi.summarizeGoal(goalId),
  });
}

/**
 * Validate goal alignment with GPT-4
 */
export function useValidateAlignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ goalId, ...input }: { goalId: string } & Omit<ValidateAlignmentInput, 'organizationId' | 'goalId'>) =>
      goalTrackingApi.validateAlignment(goalId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['goal', variables.goalId] });
    },
  });
}

/**
 * Recommend stretch goals with GPT-4
 */
export function useRecommendStretchGoals() {
  return useMutation({
    mutationFn: goalTrackingApi.recommendStretchGoals,
  });
}

// =====================================================
// QUERY HOOKS
// =====================================================

/**
 * Get goals list
 */
export function useGoalList(params: Omit<GetGoalsInput, 'organizationId'> = {}) {
  return useQuery({
    queryKey: ['goals', params],
    queryFn: () => goalTrackingApi.getGoals(params),
    select: (data) => data.data,
  });
}

/**
 * Get goal by ID
 */
export function useGoalById(goalId: string | null) {
  return useQuery({
    queryKey: ['goal', goalId],
    queryFn: () => goalTrackingApi.getGoalById(goalId!),
    enabled: !!goalId,
    select: (data) => data.data.goal,
  });
}

/**
 * Get goal timeline
 */
export function useGoalTimeline(
  goalId: string | null,
  params: Omit<GetGoalTimelineInput, 'organizationId' | 'goalId'> = {}
) {
  return useQuery({
    queryKey: ['goal-timeline', goalId, params],
    queryFn: () => goalTrackingApi.getGoalTimeline(goalId!, params),
    enabled: !!goalId,
    select: (data) => data.data.timeline,
  });
}

/**
 * Get goal dashboard
 */
export function useGoalDashboard(params: Omit<GetGoalDashboardInput, 'organizationId'> = {}) {
  return useQuery({
    queryKey: ['goal-dashboard', params],
    queryFn: () => goalTrackingApi.getGoalDashboard(params),
    select: (data) => data.data.dashboard,
  });
}

// =====================================================
// FILTERED QUERY HOOKS
// =====================================================

/**
 * Get goals by scope
 */
export function useGoalsByScope(scope: GoalScope, scopeId: string) {
  return useGoalList({ scope, scopeId });
}

/**
 * Get goals by type
 */
export function useGoalsByType(goalType: GoalType) {
  return useGoalList({ goalType });
}

/**
 * Get goals by status
 */
export function useGoalsByStatus(status: GoalStatus) {
  return useGoalList({ status });
}

/**
 * Get active goals
 */
export function useActiveGoals(params: Omit<GetGoalsInput, 'organizationId' | 'status'> = {}) {
  return useGoalList({ ...params, status: GoalStatus.ACTIVE });
}

/**
 * Get completed goals
 */
export function useCompletedGoals(params: Omit<GetGoalsInput, 'organizationId' | 'status'> = {}) {
  return useGoalList({ ...params, status: GoalStatus.COMPLETED });
}

/**
 * Get at-risk goals
 */
export function useAtRiskGoals(params: Omit<GetGoalsInput, 'organizationId' | 'status'> = {}) {
  return useGoalList({ ...params, status: GoalStatus.AT_RISK });
}

/**
 * Get organization goals
 */
export function useOrgGoals(scopeId: string) {
  return useGoalList({ scope: GoalScope.ORG, scopeId });
}

/**
 * Get team goals
 */
export function useTeamGoals(scopeId: string) {
  return useGoalList({ scope: GoalScope.TEAM, scopeId });
}

/**
 * Get user goals
 */
export function useUserGoals(scopeId: string) {
  return useGoalList({ scope: GoalScope.USER, scopeId });
}

/**
 * Get campaign goals
 */
export function useCampaignGoals(scopeId: string) {
  return useGoalList({ scope: GoalScope.CAMPAIGN, scopeId });
}

/**
 * Get parent goals (goals without parents)
 */
export function useParentGoals(params: Omit<GetGoalsInput, 'organizationId' | 'parentGoalId'> = {}) {
  return useGoalList({ ...params, parentGoalId: null });
}

/**
 * Get child goals
 */
export function useChildGoals(parentGoalId: string) {
  return useGoalList({ parentGoalId });
}

// =====================================================
// CONFIGURATION HOOKS
// =====================================================

/**
 * Get goal scope configuration
 */
export function useGoalScopeConfig(scope: GoalScope) {
  return GOAL_SCOPE_CONFIGS[scope];
}

/**
 * Get goal type configuration
 */
export function useGoalTypeConfig(goalType: GoalType) {
  return GOAL_TYPE_CONFIGS[goalType];
}

/**
 * Get goal status configuration
 */
export function useGoalStatusConfig(status: GoalStatus) {
  return GOAL_STATUS_CONFIGS[status];
}

/**
 * Get risk level configuration
 */
export function useRiskLevelConfig(riskLevel: RiskLevel) {
  return RISK_LEVEL_CONFIGS[riskLevel];
}

/**
 * Get goal event type configuration
 */
export function useGoalEventTypeConfig(eventType: GoalEventType) {
  return GOAL_EVENT_TYPE_CONFIGS[eventType];
}

/**
 * Get all goal scopes
 */
export function useGoalScopes() {
  return Object.values(GoalScope);
}

/**
 * Get all goal types
 */
export function useGoalTypes() {
  return Object.values(GoalType);
}

/**
 * Get all goal statuses
 */
export function useGoalStatuses() {
  return Object.values(GoalStatus);
}

/**
 * Get all risk levels
 */
export function useRiskLevels() {
  return Object.values(RiskLevel);
}

// =====================================================
// HELPER HOOKS
// =====================================================

/**
 * Get scope color
 */
export function useScopeColor(scope: GoalScope) {
  return GOAL_SCOPE_CONFIGS[scope].color;
}

/**
 * Get scope label
 */
export function useScopeLabel(scope: GoalScope) {
  return GOAL_SCOPE_CONFIGS[scope].label;
}

/**
 * Get scope icon
 */
export function useScopeIcon(scope: GoalScope) {
  return GOAL_SCOPE_CONFIGS[scope].icon;
}

/**
 * Get goal type color
 */
export function useGoalTypeColor(goalType: GoalType) {
  return GOAL_TYPE_CONFIGS[goalType].color;
}

/**
 * Get goal type label
 */
export function useGoalTypeLabel(goalType: GoalType) {
  return GOAL_TYPE_CONFIGS[goalType].label;
}

/**
 * Get goal type icon
 */
export function useGoalTypeIcon(goalType: GoalType) {
  return GOAL_TYPE_CONFIGS[goalType].icon;
}

/**
 * Get status color
 */
export function useStatusColor(status: GoalStatus) {
  return GOAL_STATUS_CONFIGS[status].color;
}

/**
 * Get status label
 */
export function useStatusLabel(status: GoalStatus) {
  return GOAL_STATUS_CONFIGS[status].label;
}

/**
 * Get status icon
 */
export function useStatusIcon(status: GoalStatus) {
  return GOAL_STATUS_CONFIGS[status].icon;
}

/**
 * Get risk level color
 */
export function useRiskLevelColor(riskLevel: RiskLevel) {
  return RISK_LEVEL_CONFIGS[riskLevel].color;
}

/**
 * Get risk level label
 */
export function useRiskLevelLabel(riskLevel: RiskLevel) {
  return RISK_LEVEL_CONFIGS[riskLevel].label;
}

/**
 * Get risk level icon
 */
export function useRiskLevelIcon(riskLevel: RiskLevel) {
  return RISK_LEVEL_CONFIGS[riskLevel].icon;
}

/**
 * Calculate completion percentage
 */
export function useCompletionPercentage(currentValue: number, targetValue: number) {
  if (targetValue === 0) return 0;
  return Math.min((currentValue / targetValue) * 100, 100);
}

/**
 * Calculate days remaining
 */
export function useDaysRemaining(endDate: string) {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Check if goal is overdue
 */
export function useIsOverdue(endDate: string, status: GoalStatus) {
  if (status === GoalStatus.COMPLETED) return false;
  const end = new Date(endDate);
  const now = new Date();
  return now > end;
}

/**
 * Format goal progress display
 */
export function useGoalProgressDisplay(goal: Goal | GoalWithProgress) {
  const percentage = useCompletionPercentage(goal.current_value, goal.target_value);
  return `${goal.current_value} / ${goal.target_value} ${goal.unit} (${percentage.toFixed(1)}%)`;
}

/**
 * Get goal urgency level
 */
export function useGoalUrgency(goal: Goal | GoalWithProgress): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  const daysRemaining = useDaysRemaining(goal.end_date);
  const completionPercentage = useCompletionPercentage(goal.current_value, goal.target_value);

  if (daysRemaining <= 3 && completionPercentage < 75) return 'CRITICAL';
  if (daysRemaining <= 7 && completionPercentage < 50) return 'HIGH';
  if (daysRemaining <= 14 && completionPercentage < 25) return 'MEDIUM';
  return 'LOW';
}

// =====================================================
// CHART DATA HELPERS
// =====================================================

/**
 * Generate goal progress chart data
 */
export function useGoalProgressChartData(goal: GoalWithProgress): GoalProgressChartData[] {
  if (!goal.progress_history || goal.progress_history.length === 0) {
    return [];
  }

  const startDate = new Date(goal.start_date);
  const endDate = new Date(goal.end_date);
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  return goal.progress_history.map((progress) => {
    const date = new Date(progress.recorded_at);
    const daysSinceStart = Math.ceil((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const expectedProgress = (daysSinceStart / totalDays) * goal.target_value;

    return {
      date: progress.recorded_at,
      actual: progress.value,
      target: expectedProgress,
      projected: goal.progress_velocity
        ? progress.value + (goal.progress_velocity * (totalDays - daysSinceStart))
        : undefined,
    };
  }).reverse();
}

/**
 * Generate goal velocity chart data
 */
export function useGoalVelocityChartData(goal: GoalWithProgress): GoalVelocityChartData[] {
  if (!goal.progress_history || goal.progress_history.length < 2) {
    return [];
  }

  const velocities: GoalVelocityChartData[] = [];
  const history = [...goal.progress_history].reverse();

  for (let i = 1; i < history.length; i++) {
    const current = history[i];
    const previous = history[i - 1];
    const timeDiff = new Date(current.recorded_at).getTime() - new Date(previous.recorded_at).getTime();
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    const velocity = daysDiff > 0 ? current.delta / daysDiff : 0;

    velocities.push({
      period: current.recorded_at,
      velocity,
      avg_velocity: goal.progress_velocity || 0,
    });
  }

  return velocities;
}

/**
 * Generate goal completion by type chart data
 */
export function useGoalCompletionByTypeChartData(dashboard: GoalDashboard): GoalCompletionChartData[] {
  return dashboard.by_type.map((typeData) => {
    const statusData = dashboard.by_status.filter((s) => {
      // This is a simplified version - in a real implementation,
      // you'd need to join goals by type AND status
      return true;
    });

    return {
      goal_type: typeData.goal_type,
      completed: statusData.find((s) => s.status === GoalStatus.COMPLETED)?.count || 0,
      active: statusData.find((s) => s.status === GoalStatus.ACTIVE)?.count || 0,
      at_risk: statusData.find((s) => s.status === GoalStatus.AT_RISK)?.count || 0,
    };
  });
}

/**
 * Generate risk distribution chart data
 */
export function useRiskDistributionChartData(goals: Goal[]): RiskDistributionChartData[] {
  const riskCounts = new Map<RiskLevel, number>();

  goals.forEach((goal) => {
    if (goal.risk_level) {
      riskCounts.set(goal.risk_level, (riskCounts.get(goal.risk_level) || 0) + 1);
    }
  });

  const total = goals.length;

  return Array.from(riskCounts.entries()).map(([risk_level, count]) => ({
    risk_level,
    count,
    percentage: (count / total) * 100,
  }));
}

// =====================================================
// DASHBOARD SUMMARY HOOKS
// =====================================================

/**
 * Get goals summary stats
 */
export function useGoalsSummary(goals: Goal[] | undefined) {
  if (!goals) return null;

  return {
    total: goals.length,
    active: goals.filter((g) => g.status === GoalStatus.ACTIVE || g.status === GoalStatus.ON_TRACK).length,
    completed: goals.filter((g) => g.status === GoalStatus.COMPLETED).length,
    atRisk: goals.filter((g) => g.status === GoalStatus.AT_RISK).length,
    failed: goals.filter((g) => g.status === GoalStatus.FAILED).length,
    avgCompletion:
      goals.reduce((sum, g) => sum + useCompletionPercentage(g.current_value, g.target_value), 0) / goals.length,
  };
}

/**
 * Get top performing goals
 */
export function useTopPerformingGoals(goals: Goal[] | undefined, limit = 5) {
  if (!goals) return [];

  return [...goals]
    .filter((g) => g.target_value > 0)
    .sort((a, b) => {
      const aCompletion = useCompletionPercentage(a.current_value, a.target_value);
      const bCompletion = useCompletionPercentage(b.current_value, b.target_value);
      return bCompletion - aCompletion;
    })
    .slice(0, limit);
}

/**
 * Get goals needing attention
 */
export function useGoalsNeedingAttention(goals: Goal[] | undefined, limit = 5) {
  if (!goals) return [];

  return [...goals]
    .filter((g) => g.status === GoalStatus.AT_RISK || g.risk_level === 'HIGH' || g.risk_level === 'CRITICAL')
    .sort((a, b) => {
      const aRisk = RISK_LEVEL_CONFIGS[a.risk_level || RiskLevel.LOW].threshold;
      const bRisk = RISK_LEVEL_CONFIGS[b.risk_level || RiskLevel.LOW].threshold;
      return aRisk - bRisk;
    })
    .slice(0, limit);
}

/**
 * Get overdue goals
 */
export function useOverdueGoals(goals: Goal[] | undefined) {
  if (!goals) return [];

  return goals.filter((g) => useIsOverdue(g.end_date, g.status));
}

/**
 * Get goals by priority (based on urgency and risk)
 */
export function useGoalsByPriority(goals: Goal[] | undefined) {
  if (!goals) return { critical: [], high: [], medium: [], low: [] };

  const prioritized = {
    critical: [] as Goal[],
    high: [] as Goal[],
    medium: [] as Goal[],
    low: [] as Goal[],
  };

  goals.forEach((goal) => {
    const urgency = useGoalUrgency(goal);
    if (urgency === 'CRITICAL') prioritized.critical.push(goal);
    else if (urgency === 'HIGH') prioritized.high.push(goal);
    else if (urgency === 'MEDIUM') prioritized.medium.push(goal);
    else prioritized.low.push(goal);
  });

  return prioritized;
}
