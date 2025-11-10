/**
 * Admin Metrics Service
 *
 * Aggregates business and infrastructure KPIs for executive dashboard.
 * Data sources:
 * - billing_usage_ledger (MRR, ARR)
 * - stripe_invoices (revenue)
 * - ai_usage_ledger (AI spend)
 * - organizations (active customers, churn)
 * - onboarding_state (trial conversions)
 * - Prometheus metrics (ops health)
 *
 * Sprint 75 - Track A: Executive Admin Console
 */

import { supabase } from '../config/supabase';
import { getMetrics } from './prometheus-metrics.service';

// ============================================================================
// Types
// ============================================================================

export interface AdminOverview {
  period: '7d' | '30d' | '90d';
  as_of: string;
  revenue_metrics: RevenueMetrics;
  customer_metrics: CustomerMetrics;
  trial_metrics: TrialMetrics;
  ops_metrics: OpsMetrics;
}

export interface RevenueMetrics {
  mrr: number;
  mrr_growth_percent: number;
  arr: number; // Run-rate ARR (MRR × 12)
  arpu: number; // Average revenue per user
  total_revenue: number;
  revenue_by_tier: {
    starter: number;
    pro: number;
    premium: number;
    enterprise: number;
  };
}

export interface CustomerMetrics {
  active_customers: number;
  new_customers: number;
  churned_customers: number;
  churn_rate_percent: number;
  ltv: number; // Lifetime value
  cac: number; // Customer acquisition cost
  ltv_cac_ratio: number;
  customers_by_tier: {
    starter: number;
    pro: number;
    premium: number;
    enterprise: number;
  };
}

export interface TrialMetrics {
  active_trials: number;
  trials_started: number;
  trials_converted: number;
  trials_expired: number;
  conversion_rate_percent: number;
  avg_days_to_convert: number;
}

export interface OpsMetrics {
  avg_api_latency_ms: number;
  error_rate_percent: number;
  cache_hit_rate_percent: number;
  uptime_percent: number;
  provider_health: {
    supabase: 'healthy' | 'degraded' | 'down';
    redis: 'healthy' | 'degraded' | 'down';
    openai: 'healthy' | 'degraded' | 'down';
    anthropic: 'healthy' | 'degraded' | 'down';
  };
  ai_metrics: {
    total_requests: number;
    total_tokens: number;
    total_cost_usd: number;
    avg_cost_per_request: number;
  };
}

export interface RevenueTrend {
  date: string;
  mrr: number;
  new_mrr: number;
  expansion_mrr: number;
  contraction_mrr: number;
  churn_mrr: number;
  net_new_mrr: number;
}

export interface FunnelMetrics {
  stage: string;
  count: number;
  conversion_rate: number;
  avg_time_in_stage_hours: number;
}

// ============================================================================
// Admin Metrics Service
// ============================================================================

/**
 * Get comprehensive admin overview for specified period
 */
export async function getAdminOverview(
  organizationId: string,
  period: '7d' | '30d' | '90d' = '30d'
): Promise<AdminOverview> {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [revenue, customers, trials, ops] = await Promise.all([
    getRevenueMetrics(organizationId, startDate),
    getCustomerMetrics(organizationId, startDate),
    getTrialMetrics(organizationId, startDate),
    getOpsMetrics(organizationId, startDate),
  ]);

  return {
    period,
    as_of: new Date().toISOString(),
    revenue_metrics: revenue,
    customer_metrics: customers,
    trial_metrics: trials,
    ops_metrics: ops,
  };
}

/**
 * Calculate MRR, ARR, ARPU, and revenue breakdown
 */
export async function getRevenueMetrics(
  organizationId: string,
  startDate: Date
): Promise<RevenueMetrics> {
  // Get current MRR from active subscriptions
  const { data: activeSubs, error: subsError } = await supabase
    .from('stripe_subscriptions')
    .select('amount, plan_tier, status')
    .eq('organization_id', organizationId)
    .eq('status', 'active');

  if (subsError) throw subsError;

  const currentMrr = activeSubs?.reduce((sum, sub) => sum + (sub.amount / 100), 0) || 0;

  // Get previous period MRR for growth calculation
  const prevPeriodStart = new Date(startDate);
  prevPeriodStart.setDate(prevPeriodStart.getDate() - (new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const { data: prevSubs } = await supabase
    .from('stripe_subscriptions')
    .select('amount')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .lte('created_at', prevPeriodStart.toISOString());

  const prevMrr = prevSubs?.reduce((sum, sub) => sum + (sub.amount / 100), 0) || 0;
  const mrrGrowth = prevMrr > 0 ? ((currentMrr - prevMrr) / prevMrr) * 100 : 0;

  // Calculate ARR (run-rate)
  const arr = currentMrr * 12;

  // Calculate ARPU (average revenue per user)
  const activeCustomerCount = activeSubs?.length || 1;
  const arpu = currentMrr / activeCustomerCount;

  // Get total revenue for period
  const { data: invoices } = await supabase
    .from('stripe_invoices')
    .select('amount_paid')
    .eq('organization_id', organizationId)
    .gte('created_at', startDate.toISOString())
    .eq('status', 'paid');

  const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.amount_paid / 100), 0) || 0;

  // Revenue by tier
  const revenueByTier = {
    starter: activeSubs?.filter(s => s.plan_tier === 'starter').reduce((sum, s) => sum + (s.amount / 100), 0) || 0,
    pro: activeSubs?.filter(s => s.plan_tier === 'pro').reduce((sum, s) => sum + (s.amount / 100), 0) || 0,
    premium: activeSubs?.filter(s => s.plan_tier === 'premium').reduce((sum, s) => sum + (s.amount / 100), 0) || 0,
    enterprise: activeSubs?.filter(s => s.plan_tier === 'enterprise').reduce((sum, s) => sum + (s.amount / 100), 0) || 0,
  };

  return {
    mrr: currentMrr,
    mrr_growth_percent: mrrGrowth,
    arr,
    arpu,
    total_revenue: totalRevenue,
    revenue_by_tier: revenueByTier,
  };
}

/**
 * Calculate customer counts, churn, LTV, CAC
 */
export async function getCustomerMetrics(
  organizationId: string,
  startDate: Date
): Promise<CustomerMetrics> {
  // Active customers (with active subscriptions)
  const { data: activeOrgs, error: activeError } = await supabase
    .from('organizations')
    .select('id, plan_tier, created_at')
    .eq('platform_organization_id', organizationId)
    .not('plan_tier', 'is', null);

  if (activeError) throw activeError;

  const activeCustomers = activeOrgs?.length || 0;

  // New customers in period
  const newCustomers = activeOrgs?.filter(org =>
    new Date(org.created_at) >= startDate
  ).length || 0;

  // Churned customers (subscriptions canceled in period)
  const { data: churned } = await supabase
    .from('stripe_subscriptions')
    .select('id')
    .eq('platform_organization_id', organizationId)
    .eq('status', 'canceled')
    .gte('canceled_at', startDate.toISOString());

  const churnedCustomers = churned?.length || 0;

  // Calculate churn rate
  const churnRate = activeCustomers > 0 ? (churnedCustomers / activeCustomers) * 100 : 0;

  // Customers by tier
  const customersByTier = {
    starter: activeOrgs?.filter(o => o.plan_tier === 'starter').length || 0,
    pro: activeOrgs?.filter(o => o.plan_tier === 'pro').length || 0,
    premium: activeOrgs?.filter(o => o.plan_tier === 'premium').length || 0,
    enterprise: activeOrgs?.filter(o => o.plan_tier === 'enterprise').length || 0,
  };

  // Calculate LTV (simplified: ARPU / churn_rate_monthly)
  // For more accurate LTV, use: ARPU × (1 / monthly_churn_rate) × gross_margin
  const monthlyChurnRate = churnRate / 100;
  const grossMargin = 0.964; // 96.4% from pricing validation
  const ltv = monthlyChurnRate > 0
    ? ((await getRevenueMetrics(organizationId, startDate)).arpu / monthlyChurnRate) * grossMargin
    : 0;

  // Calculate CAC (marketing spend / new customers)
  // Placeholder - should be pulled from marketing_spend table
  const estimatedMarketingSpend = 500000; // $500k from pricing validation
  const targetCustomers = 150; // Year 1 target
  const cac = estimatedMarketingSpend / targetCustomers;

  // LTV:CAC ratio
  const ltvCacRatio = cac > 0 ? ltv / cac : 0;

  return {
    active_customers: activeCustomers,
    new_customers: newCustomers,
    churned_customers: churnedCustomers,
    churn_rate_percent: churnRate,
    ltv,
    cac,
    ltv_cac_ratio: ltvCacRatio,
    customers_by_tier: customersByTier,
  };
}

/**
 * Calculate trial funnel metrics
 */
export async function getTrialMetrics(
  organizationId: string,
  startDate: Date
): Promise<TrialMetrics> {
  // Active trials (trial_end_date in future)
  const { data: activeTrials, error: activeError } = await supabase
    .from('organizations')
    .select('id, trial_start_date, trial_end_date')
    .eq('platform_organization_id', organizationId)
    .eq('in_trial', true)
    .gte('trial_end_date', new Date().toISOString());

  if (activeError) throw activeError;

  const activeTrialCount = activeTrials?.length || 0;

  // Trials started in period
  const { data: startedTrials } = await supabase
    .from('organizations')
    .select('id')
    .eq('platform_organization_id', organizationId)
    .gte('trial_start_date', startDate.toISOString());

  const trialsStarted = startedTrials?.length || 0;

  // Trials converted (in_trial = false, plan_tier not null, trial_start in period)
  const { data: convertedTrials } = await supabase
    .from('organizations')
    .select('id, trial_start_date, created_at')
    .eq('platform_organization_id', organizationId)
    .eq('in_trial', false)
    .not('plan_tier', 'is', null)
    .gte('trial_start_date', startDate.toISOString());

  const trialsConverted = convertedTrials?.length || 0;

  // Trials expired (trial_end_date < now, in_trial = false, plan_tier null)
  const { data: expiredTrials } = await supabase
    .from('organizations')
    .select('id')
    .eq('platform_organization_id', organizationId)
    .eq('in_trial', false)
    .is('plan_tier', null)
    .lt('trial_end_date', new Date().toISOString())
    .gte('trial_start_date', startDate.toISOString());

  const trialsExpired = expiredTrials?.length || 0;

  // Conversion rate
  const conversionRate = trialsStarted > 0 ? (trialsConverted / trialsStarted) * 100 : 0;

  // Average days to convert
  const avgDaysToConvert = convertedTrials?.reduce((sum, trial) => {
    const start = new Date(trial.trial_start_date);
    const converted = new Date(trial.created_at);
    const days = (converted.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return sum + days;
  }, 0) || 0;

  const avgDays = trialsConverted > 0 ? avgDaysToConvert / trialsConverted : 0;

  return {
    active_trials: activeTrialCount,
    trials_started: trialsStarted,
    trials_converted: trialsConverted,
    trials_expired: trialsExpired,
    conversion_rate_percent: conversionRate,
    avg_days_to_convert: avgDays,
  };
}

/**
 * Get operational health metrics
 */
export async function getOpsMetrics(
  organizationId: string,
  startDate: Date
): Promise<OpsMetrics> {
  // Get Prometheus metrics summary
  // This would call Prometheus API, but for now we'll use placeholder values
  // In production, parse Prometheus metrics from getMetrics()

  // Get AI usage from ai_usage_ledger
  const { data: aiUsage, error: aiError } = await supabase
    .from('ai_usage_ledger')
    .select('tokens_in, tokens_out, cost_usd, model, provider')
    .eq('organization_id', organizationId)
    .gte('created_at', startDate.toISOString());

  if (aiError) throw aiError;

  const totalRequests = aiUsage?.length || 0;
  const totalTokens = aiUsage?.reduce((sum, u) => sum + u.tokens_in + u.tokens_out, 0) || 0;
  const totalCost = aiUsage?.reduce((sum, u) => sum + u.cost_usd, 0) || 0;
  const avgCostPerRequest = totalRequests > 0 ? totalCost / totalRequests : 0;

  // Provider health from recent ai_ops_events
  const { data: opsEvents } = await supabase
    .from('ai_ops_events')
    .select('provider, event_type, created_at')
    .eq('organization_id', organizationId)
    .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
    .order('created_at', { ascending: false });

  const providerHealth = {
    supabase: 'healthy' as const,
    redis: 'healthy' as const,
    openai: getProviderStatus(opsEvents, 'openai'),
    anthropic: getProviderStatus(opsEvents, 'anthropic'),
  };

  // Placeholder ops metrics - should be pulled from Prometheus
  return {
    avg_api_latency_ms: 145,
    error_rate_percent: 0.3,
    cache_hit_rate_percent: 78.5,
    uptime_percent: 99.9,
    provider_health: providerHealth,
    ai_metrics: {
      total_requests: totalRequests,
      total_tokens: totalTokens,
      total_cost_usd: totalCost,
      avg_cost_per_request: avgCostPerRequest,
    },
  };
}

/**
 * Get revenue trends over time (daily MRR snapshots)
 */
export async function getRevenueTrends(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<RevenueTrend[]> {
  const trends: RevenueTrend[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];

    // Get MRR snapshot for this day
    const { data: subs } = await supabase
      .from('stripe_subscriptions')
      .select('amount, created_at, canceled_at, updated_at')
      .eq('organization_id', organizationId)
      .or(`status.eq.active,status.eq.canceled`)
      .lte('created_at', currentDate.toISOString());

    const activeSubs = subs?.filter(sub =>
      new Date(sub.created_at) <= currentDate &&
      (!sub.canceled_at || new Date(sub.canceled_at) > currentDate)
    ) || [];

    const mrr = activeSubs.reduce((sum, sub) => sum + (sub.amount / 100), 0);

    // Calculate MRR movements
    const newSubs = activeSubs.filter(sub =>
      new Date(sub.created_at).toISOString().split('T')[0] === dateStr
    );
    const newMrr = newSubs.reduce((sum, sub) => sum + (sub.amount / 100), 0);

    // Simplified - expansion/contraction would require upgrade/downgrade tracking
    const expansionMrr = 0;
    const contractionMrr = 0;

    const canceledSubs = subs?.filter(sub =>
      sub.canceled_at && new Date(sub.canceled_at).toISOString().split('T')[0] === dateStr
    ) || [];
    const churnMrr = canceledSubs.reduce((sum, sub) => sum + (sub.amount / 100), 0);

    const netNewMrr = newMrr + expansionMrr - contractionMrr - churnMrr;

    trends.push({
      date: dateStr,
      mrr,
      new_mrr: newMrr,
      expansion_mrr: expansionMrr,
      contraction_mrr: contractionMrr,
      churn_mrr: churnMrr,
      net_new_mrr: netNewMrr,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return trends;
}

/**
 * Get trial-to-paid funnel breakdown
 */
export async function getTrialFunnelMetrics(
  organizationId: string,
  startDate: Date
): Promise<FunnelMetrics[]> {
  // Define funnel stages
  const stages = [
    'trial_started',
    'onboarding_completed',
    'feature_activated',
    'upgrade_prompted',
    'payment_initiated',
    'trial_converted',
  ];

  const metrics: FunnelMetrics[] = [];

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];

    // Get count of organizations at this stage
    const { data: orgs } = await supabase
      .from('onboarding_state')
      .select('organization_id, current_stage, stage_started_at, stage_completed_at')
      .eq('platform_organization_id', organizationId)
      .gte('stage_started_at', startDate.toISOString());

    const atStage = orgs?.filter(o => o.current_stage === stage || hasPassedStage(o, stage)) || [];
    const count = atStage.length;

    // Conversion rate (percent of previous stage that made it here)
    const prevStageCount = i > 0 ? metrics[i - 1].count : count;
    const conversionRate = prevStageCount > 0 ? (count / prevStageCount) * 100 : 0;

    // Average time in stage
    const avgTimeHours = atStage.reduce((sum, o) => {
      if (!o.stage_started_at || !o.stage_completed_at) return sum;
      const start = new Date(o.stage_started_at);
      const end = new Date(o.stage_completed_at);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return sum + hours;
    }, 0) / (count || 1);

    metrics.push({
      stage,
      count,
      conversion_rate: conversionRate,
      avg_time_in_stage_hours: avgTimeHours,
    });
  }

  return metrics;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine provider health from recent ops events
 */
function getProviderStatus(
  events: any[] | null,
  provider: string
): 'healthy' | 'degraded' | 'down' {
  if (!events || events.length === 0) return 'healthy';

  const providerEvents = events.filter(e => e.provider === provider);

  if (providerEvents.length === 0) return 'healthy';

  // Check for recent errors
  const errorEvents = providerEvents.filter(e =>
    e.event_type === 'error' || e.event_type === 'timeout'
  );

  const errorRate = errorEvents.length / providerEvents.length;

  if (errorRate > 0.5) return 'down';
  if (errorRate > 0.2) return 'degraded';
  return 'healthy';
}

/**
 * Check if organization has passed a funnel stage
 */
function hasPassedStage(org: any, targetStage: string): boolean {
  const stageOrder = [
    'trial_started',
    'onboarding_completed',
    'feature_activated',
    'upgrade_prompted',
    'payment_initiated',
    'trial_converted',
  ];

  const currentIndex = stageOrder.indexOf(org.current_stage);
  const targetIndex = stageOrder.indexOf(targetStage);

  return currentIndex >= targetIndex;
}

/**
 * Calculate payback period (CAC / (ARPU × Gross Margin))
 */
export function calculatePaybackPeriod(
  cac: number,
  arpu: number,
  grossMargin: number = 0.964
): number {
  if (arpu === 0 || grossMargin === 0) return 0;
  return cac / (arpu * grossMargin);
}

/**
 * Calculate Net Revenue Retention (NRR)
 * NRR = (Starting MRR + Expansion - Contraction - Churn) / Starting MRR
 */
export async function calculateNRR(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const trends = await getRevenueTrends(organizationId, startDate, endDate);

  if (trends.length < 2) return 100;

  const startingMrr = trends[0].mrr;
  const endingMrr = trends[trends.length - 1].mrr;

  const totalExpansion = trends.reduce((sum, t) => sum + t.expansion_mrr, 0);
  const totalContraction = trends.reduce((sum, t) => sum + t.contraction_mrr, 0);
  const totalChurn = trends.reduce((sum, t) => sum + t.churn_mrr, 0);

  const nrr = startingMrr > 0
    ? ((startingMrr + totalExpansion - totalContraction - totalChurn) / startingMrr) * 100
    : 100;

  return nrr;
}
