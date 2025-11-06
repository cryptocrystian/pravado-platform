// =====================================================
// REPORTING HOOKS
// Sprint 29: AI-driven reporting and strategic insights
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  GenerateReportInput,
  CreateReportTemplateInput,
  UpdateReportTemplateInput,
  GeneratedReport,
  ReportTemplate,
  ReportSection,
  ReportType,
  ReportStatus,
  ReportSectionType,
  ChartConfig,
  MetricsSnapshot,
  REPORT_TYPE_CONFIGS,
  REPORT_STATUS_CONFIGS,
  REPORT_SECTION_TYPE_CONFIGS,
} from '@pravado/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Generate new report
 */
export function useGenerateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      campaignId: string;
      templateId?: string;
      periodStart?: string;
      periodEnd?: string;
    }) => {
      const res = await fetch(
        `${API_BASE}/reporting/campaign/${input.campaignId}/generate-report`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId: input.templateId,
            periodStart: input.periodStart,
            periodEnd: input.periodEnd,
          }),
        }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate report');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate campaign reports
      queryClient.invalidateQueries({ queryKey: ['campaign-report', variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-reports', variables.campaignId] });
    },
  });
}

/**
 * Retry failed report
 */
export function useRetryReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const res = await fetch(`${API_BASE}/reporting/report/${reportId}/retry`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to retry report');
      }
      return res.json();
    },
    onSuccess: (data, reportId) => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
    },
  });
}

/**
 * Generate quick campaign summary (without full report)
 */
export function useGenerateCampaignSummary() {
  return useMutation({
    mutationFn: async (input: {
      campaignId: string;
      periodStart?: string;
      periodEnd?: string;
      includeRecommendations?: boolean;
    }) => {
      const res = await fetch(`${API_BASE}/reporting/campaign/${input.campaignId}/summary`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          includeRecommendations: input.includeRecommendations,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate summary');
      }
      return res.json() as Promise<{ success: boolean; summary: string }>;
    },
  });
}

/**
 * Create report template
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<CreateReportTemplateInput, 'organizationId' | 'createdBy'>) => {
      const res = await fetch(`${API_BASE}/reporting/template`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create template');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
    },
  });
}

/**
 * Update report template
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateReportTemplateInput) => {
      const res = await fetch(`${API_BASE}/reporting/template/${input.templateId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update template');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      queryClient.invalidateQueries({ queryKey: ['report-template', variables.templateId] });
    },
  });
}

/**
 * Delete report template
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const res = await fetch(`${API_BASE}/reporting/template/${templateId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete template');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
    },
  });
}

// =====================================================
// QUERY HOOKS
// =====================================================

/**
 * Get latest report for a campaign
 */
export function useGetReport(campaignId: string | null, refetchInterval?: number) {
  return useQuery({
    queryKey: ['campaign-report', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;

      const res = await fetch(`${API_BASE}/reporting/campaign/${campaignId}/report`, {
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch report');
      }
      return res.json() as Promise<{ success: boolean; report: GeneratedReport }>;
    },
    enabled: !!campaignId,
    refetchInterval,
  });
}

/**
 * Get specific report by ID
 */
export function useGetReportById(campaignId: string | null, reportId: string | null) {
  return useQuery({
    queryKey: ['report', reportId],
    queryFn: async () => {
      if (!campaignId || !reportId) return null;

      const res = await fetch(
        `${API_BASE}/reporting/campaign/${campaignId}/report/${reportId}`,
        {
          credentials: 'include',
        }
      );
      if (!res.ok) throw new Error('Failed to fetch report');
      return res.json() as Promise<{ success: boolean; report: GeneratedReport }>;
    },
    enabled: !!campaignId && !!reportId,
  });
}

/**
 * Get report sections
 */
export function useGetReportSections(reportId: string | null) {
  return useQuery({
    queryKey: ['report-sections', reportId],
    queryFn: async () => {
      if (!reportId) return null;

      const res = await fetch(`${API_BASE}/reporting/report/${reportId}/sections`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch report sections');
      return res.json() as Promise<{
        success: boolean;
        sections: ReportSection[];
        total: number;
      }>;
    },
    enabled: !!reportId,
  });
}

/**
 * Get available report templates
 */
export function useGetTemplates(refetchInterval?: number) {
  return useQuery({
    queryKey: ['report-templates'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/reporting/templates`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch templates');
      return res.json() as Promise<{
        success: boolean;
        templates: ReportTemplate[];
        total: number;
      }>;
    },
    refetchInterval,
  });
}

// =====================================================
// HELPER HOOKS
// =====================================================

/**
 * Get report status color
 */
export function useReportStatusColor() {
  return (status: ReportStatus) => {
    return REPORT_STATUS_CONFIGS[status]?.color || '#6B7280';
  };
}

/**
 * Get report status icon
 */
export function useReportStatusIcon() {
  return (status: ReportStatus) => {
    return REPORT_STATUS_CONFIGS[status]?.icon || 'file-text';
  };
}

/**
 * Get report type color
 */
export function useReportTypeColor() {
  return (type: ReportType) => {
    return REPORT_TYPE_CONFIGS[type]?.color || '#6B7280';
  };
}

/**
 * Get report type icon
 */
export function useReportTypeIcon() {
  return (type: ReportType) => {
    return REPORT_TYPE_CONFIGS[type]?.icon || 'file-text';
  };
}

/**
 * Get section type icon
 */
export function useSectionTypeIcon() {
  return (type: ReportSectionType) => {
    return REPORT_SECTION_TYPE_CONFIGS[type]?.icon || 'file-text';
  };
}

/**
 * Check if report is generating
 */
export function useIsReportGenerating(campaignId: string | null) {
  const { data } = useGetReport(campaignId);

  if (!data || !data.report) return false;

  return data.report.status === 'GENERATING' || data.report.status === 'PENDING';
}

/**
 * Check if report is complete
 */
export function useIsReportComplete(campaignId: string | null) {
  const { data } = useGetReport(campaignId);

  if (!data || !data.report) return false;

  return data.report.status === 'COMPLETE';
}

/**
 * Check if report has failed
 */
export function useHasReportFailed(campaignId: string | null) {
  const { data } = useGetReport(campaignId);

  if (!data || !data.report) return false;

  return data.report.status === 'FAILED';
}

/**
 * Get report markdown content
 */
export function useReportMarkdown(campaignId: string | null) {
  const { data } = useGetReport(campaignId);

  if (!data || !data.report) return '';

  let markdown = `# ${data.report.title}\n\n`;

  if (data.report.executiveSummary) {
    markdown += `## Executive Summary\n\n${data.report.executiveSummary}\n\n`;
  }

  if (data.report.keyFindings && data.report.keyFindings.length > 0) {
    markdown += `## Key Findings\n\n`;
    data.report.keyFindings.forEach((finding) => {
      markdown += `- ${finding}\n`;
    });
    markdown += '\n';
  }

  // Add sections
  data.report.sections.forEach((section) => {
    markdown += `## ${section.title}\n\n${section.content}\n\n`;
  });

  if (data.report.strategicRecommendations && data.report.strategicRecommendations.length > 0) {
    markdown += `## Recommendations\n\n`;
    data.report.strategicRecommendations.forEach((rec, idx) => {
      markdown += `${idx + 1}. ${rec}\n`;
    });
    markdown += '\n';
  }

  return markdown;
}

/**
 * Get strategic insights from report
 */
export function useStrategicInsights(campaignId: string | null) {
  const { data } = useGetReport(campaignId);

  if (!data || !data.report) return null;

  return {
    insights: data.report.strategicRecommendations || [],
    count: data.report.strategicRecommendations?.length || 0,
  };
}

/**
 * Get agent performance insights from report
 */
export function useAgentPerformanceInsights(campaignId: string | null) {
  const { data } = useGetReport(campaignId);

  if (!data || !data.report) return null;

  return {
    summary: data.report.agentEffectivenessSummary || '',
    hasInsights: !!data.report.agentEffectivenessSummary,
  };
}

/**
 * Get report charts data
 */
export function useReportCharts(campaignId: string | null) {
  const { data } = useGetReport(campaignId);

  if (!data || !data.report) return [];

  return data.report.charts || [];
}

/**
 * Get report download URL (for PDF export)
 */
export function useReportDownloadUrl(campaignId: string | null) {
  const { data } = useGetReport(campaignId);

  if (!data || !data.report) return null;

  // In production, this would generate a PDF and return URL
  // For now, return markdown download
  const markdown = useReportMarkdown(campaignId);
  const blob = new Blob([markdown], { type: 'text/markdown' });
  return URL.createObjectURL(blob);
}

/**
 * Check if report is stale (older than 7 days)
 */
export function useIsReportStale(campaignId: string | null, daysThreshold: number = 7) {
  const { data } = useGetReport(campaignId);

  if (!data || !data.report) return false;

  const reportDate = new Date(data.report.createdAt);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - reportDate.getTime()) / (1000 * 60 * 60 * 24));

  return daysDiff > daysThreshold;
}

/**
 * Get report generation duration
 */
export function useReportGenerationDuration(campaignId: string | null) {
  const { data } = useGetReport(campaignId);

  if (!data || !data.report || !data.report.generationDurationMs) return null;

  const durationSeconds = Math.round(data.report.generationDurationMs / 1000);

  if (durationSeconds < 60) {
    return `${durationSeconds}s`;
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

/**
 * Get metrics snapshot from report
 */
export function useReportMetrics(campaignId: string | null) {
  const { data } = useGetReport(campaignId);

  if (!data || !data.report) return null;

  return data.report.metricsSnapshot;
}

/**
 * Get key findings count
 */
export function useKeyFindingsCount(campaignId: string | null) {
  const { data } = useGetReport(campaignId);

  if (!data || !data.report) return 0;

  return data.report.keyFindings?.length || 0;
}

/**
 * Get recommendations count
 */
export function useRecommendationsCount(campaignId: string | null) {
  const { data } = useGetReport(campaignId);

  if (!data || !data.report) return 0;

  return data.report.strategicRecommendations?.length || 0;
}

/**
 * Get report sections by type
 */
export function useReportSectionsByType(campaignId: string | null, type: ReportSectionType) {
  const { data } = useGetReport(campaignId);

  if (!data || !data.report) return [];

  return data.report.sections.filter((section) => section.type === type);
}

/**
 * Get default template for report type
 */
export function useDefaultTemplate(reportType: ReportType) {
  const { data } = useGetTemplates();

  if (!data || !data.templates) return null;

  return data.templates.find((t) => t.reportType === reportType && t.isDefault);
}

/**
 * Real-time report status (polling)
 */
export function useRealtimeReportStatus(campaignId: string | null) {
  return useGetReport(campaignId, 10000); // Poll every 10 seconds
}

/**
 * Get report completion percentage (estimate)
 */
export function useReportCompletionPercentage(campaignId: string | null) {
  const { data } = useGetReport(campaignId);

  if (!data || !data.report) return 0;

  switch (data.report.status) {
    case 'PENDING':
      return 10;
    case 'GENERATING':
      // Estimate based on time elapsed
      if (data.report.generationStartedAt) {
        const elapsed = Date.now() - new Date(data.report.generationStartedAt).getTime();
        const estimatedTotal = 60000; // Assume 60 seconds
        const percentage = Math.min(90, 10 + (elapsed / estimatedTotal) * 80);
        return Math.round(percentage);
      }
      return 50;
    case 'COMPLETE':
      return 100;
    case 'FAILED':
      return 0;
    default:
      return 0;
  }
}

/**
 * Format report period
 */
export function useFormatReportPeriod(campaignId: string | null) {
  const { data } = useGetReport(campaignId);

  if (!data || !data.report || !data.report.periodStart || !data.report.periodEnd) return '';

  const start = new Date(data.report.periodStart).toLocaleDateString();
  const end = new Date(data.report.periodEnd).toLocaleDateString();

  return `${start} - ${end}`;
}

/**
 * Check if report has charts
 */
export function useHasCharts(campaignId: string | null) {
  const { data } = useGetReport(campaignId);

  if (!data || !data.report) return false;

  return data.report.charts && data.report.charts.length > 0;
}

/**
 * Get report status text
 */
export function useReportStatusText() {
  return (status: ReportStatus) => {
    return REPORT_STATUS_CONFIGS[status]?.label || 'Unknown';
  };
}

/**
 * Get report type text
 */
export function useReportTypeText() {
  return (type: ReportType) => {
    return REPORT_TYPE_CONFIGS[type]?.label || 'Unknown';
  };
}
