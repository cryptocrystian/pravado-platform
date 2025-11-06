// =====================================================
// AI COST CONTROLS DASHBOARD
// Sprint 69: Dynamic LLM Strategy Manager
// =====================================================

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  useBudgetState,
  usePolicyWithUsage,
  useUsageTrend,
  useRecentTelemetry,
  useGuardrailStatus,
  useCircuitBrokenModels,
} from '@/hooks/useAIPolicy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertCircle,
  CheckCircle,
  TrendingUp,
  DollarSign,
  Zap,
  Shield,
  Clock,
  AlertTriangle
} from 'lucide-react';

// =====================================================
// BUDGET STATUS CARD
// =====================================================

function BudgetStatusCard({ organizationId }: { organizationId: string }) {
  const { data: budgetState, isLoading } = useBudgetState(organizationId);

  if (isLoading || !budgetState) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Daily Budget Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-orange-600';
      case 'exceeded': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-orange-500';
      case 'exceeded': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Daily Budget Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-baseline">
          <div>
            <p className="text-sm text-gray-600">Spend Today</p>
            <p className={`text-3xl font-bold ${getStatusColor(budgetState.status)}`}>
              ${budgetState.dailyCost.toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">of ${budgetState.maxDailyCost.toFixed(2)}</p>
            <Badge variant={budgetState.status === 'normal' ? 'default' : 'destructive'}>
              {budgetState.usagePercent.toFixed(1)}%
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <Progress
            value={Math.min(budgetState.usagePercent, 100)}
            className="h-3"
          />
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              Remaining: ${budgetState.remainingBudget.toFixed(2)}
            </span>
            <span className={getStatusColor(budgetState.status)}>
              {budgetState.status.toUpperCase()}
            </span>
          </div>
        </div>

        {budgetState.status !== 'normal' && (
          <Alert variant={budgetState.status === 'exceeded' ? 'destructive' : 'default'}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
              {budgetState.status === 'exceeded' ? 'Budget Exceeded' : 'Budget Warning'}
            </AlertTitle>
            <AlertDescription>
              {budgetState.status === 'exceeded'
                ? 'Daily budget limit has been exceeded. New requests will be denied.'
                : budgetState.status === 'critical'
                ? 'Critical budget usage. Forcing cheapest models for all requests.'
                : 'High budget usage. Monitoring closely and optimizing costs.'}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// =====================================================
// USAGE TREND CARD
// =====================================================

function UsageTrendCard({ organizationId }: { organizationId: string }) {
  const { data: trendData, isLoading } = useUsageTrend(organizationId, 7);

  if (isLoading || !trendData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            7-Day Usage Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-48 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  const maxSpend = Math.max(...trendData.trend.map(t => t.spend), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          7-Day Usage Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {trendData.trend.map((day) => (
            <div key={day.date} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <span className="font-medium">
                  ${day.spend.toFixed(2)} ({day.requests} requests)
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${(day.spend / maxSpend) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Weekly Total</span>
            <span className="font-bold text-blue-900">
              ${trendData.trend.reduce((sum, t) => sum + t.spend, 0).toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// POLICY SUMMARY CARD
// =====================================================

function PolicySummaryCard({ organizationId }: { organizationId: string }) {
  const { data: policyData, isLoading } = usePolicyWithUsage(organizationId);

  if (isLoading || !policyData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Policy Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const policy = policyData.policy;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Policy Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-600">Mode</p>
            <Badge variant={policy.trialMode ? 'secondary' : 'default'}>
              {policy.trialMode ? 'Trial' : 'Production'}
            </Badge>
          </div>
          <div>
            <p className="text-gray-600">Daily Limit</p>
            <p className="font-semibold">${policy.maxDailyCostUsd.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-600">Request Limit</p>
            <p className="font-semibold">${policy.maxRequestCostUsd.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-gray-600">Max Concurrent</p>
            <p className="font-semibold">{policy.maxConcurrentJobs}</p>
          </div>
          <div>
            <p className="text-gray-600">Input Tokens</p>
            <p className="font-semibold">{policy.maxTokensInput.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-600">Output Tokens</p>
            <p className="font-semibold">{policy.maxTokensOutput.toLocaleString()}</p>
          </div>
        </div>

        <div className="pt-3 border-t">
          <p className="text-sm text-gray-600 mb-2">Allowed Providers</p>
          <div className="flex gap-2 flex-wrap">
            {policy.allowedProviders.map((provider) => (
              <Badge key={provider} variant="outline">
                {provider}
              </Badge>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t">
          <p className="text-sm text-gray-600 mb-2">Rate Limits</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Burst:</span>{' '}
              <span className="font-medium">{policy.burstRateLimit}/10s</span>
            </div>
            <div>
              <span className="text-gray-600">Sustained:</span>{' '}
              <span className="font-medium">{policy.sustainedRateLimit}/min</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// TELEMETRY CARD
// =====================================================

function TelemetryCard() {
  const { data: telemetry, isLoading } = useRecentTelemetry();
  const { data: circuitBroken } = useCircuitBrokenModels();

  if (isLoading || !telemetry) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Model Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const metrics = Object.values(telemetry);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Model Performance (Last 24h)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {circuitBroken && circuitBroken.brokenModels.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Circuit Breakers Active</AlertTitle>
            <AlertDescription>
              {circuitBroken.brokenModels.length} model(s) circuit-broken due to high error rates
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {metrics.slice(0, 10).map((metric) => (
            <div key={`${metric.provider}:${metric.model}`} className="p-3 border rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium">{metric.model}</p>
                  <p className="text-xs text-gray-600">{metric.provider}</p>
                </div>
                <Badge variant={metric.errorRate > 0.3 ? 'destructive' : 'default'}>
                  {metric.requestCount} requests
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Latency:</span>{' '}
                  <span className="font-medium">{metric.latencyMs.toFixed(0)}ms</span>
                </div>
                <div>
                  <span className="text-gray-600">Error Rate:</span>{' '}
                  <span className={`font-medium ${metric.errorRate > 0.3 ? 'text-red-600' : 'text-green-600'}`}>
                    {(metric.errorRate * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {metrics.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Zap className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No telemetry data available yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =====================================================
// GUARDRAIL STATUS CARD
// =====================================================

function GuardrailStatusCard({ organizationId }: { organizationId: string }) {
  const { data: guardrails, isLoading } = useGuardrailStatus(organizationId);

  if (isLoading || !guardrails) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Guardrail Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Real-Time Guardrails
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Active Concurrency</span>
            <Badge>{guardrails.concurrency}</Badge>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Rate Limit Usage</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2 bg-gray-50 rounded">
              <p className="text-xs text-gray-600">Burst Window</p>
              <p className="text-lg font-semibold">{guardrails.rateLimit.burstCount}</p>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <p className="text-xs text-gray-600">Sustained Window</p>
              <p className="text-lg font-semibold">{guardrails.rateLimit.sustainedCount}</p>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t">
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>All guardrails operational</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// MAIN DASHBOARD COMPONENT
// =====================================================

export default function CostControlsDashboard() {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  if (!organizationId) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Organization Required</AlertTitle>
          <AlertDescription>
            Please select an organization to view AI cost controls.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">AI Cost Controls</h1>
        <p className="text-gray-600">
          Monitor and manage AI spending, policies, and performance in real-time.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <BudgetStatusCard organizationId={organizationId} />
        </div>
        <div>
          <GuardrailStatusCard organizationId={organizationId} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UsageTrendCard organizationId={organizationId} />
        <PolicySummaryCard organizationId={organizationId} />
      </div>

      <div>
        <TelemetryCard />
      </div>
    </div>
  );
}
