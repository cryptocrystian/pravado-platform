// =====================================================
// REPORTING ENGINE
// Sprint 29: AI-driven reporting and strategic insights
// =====================================================

import { EventEmitter } from 'events';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import type {
  GeneratedReport,
  ReportTemplate,
  ReportSection,
  ReportSectionType,
  MetricsSnapshot,
  PerformanceSummary,
  AgentEffectivenessSummary,
  AgentPerformance,
  StrategicInsight,
  SentimentTrendAnalysis,
  LeadFunnelAnalysis,
  GenerateReportInput,
  ReportStatus,
  ReportType,
  ChartConfig,
} from '@pravado/shared-types';
import { timelineEngine } from '../timeline/timeline-engine';

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Report Engine
 * Manages AI-driven report generation and insights
 */
export class ReportEngine extends EventEmitter {
  // =====================================================
  // REPORT GENERATION
  // =====================================================

  /**
   * Generate comprehensive campaign report
   */
  async generateCampaignReport(input: GenerateReportInput): Promise<GeneratedReport> {
    try {
      // Create report record with PENDING status
      const { data: reportData, error: createError } = await supabase.rpc(
        'generate_campaign_report',
        {
          p_campaign_id: input.campaignId,
          p_organization_id: input.organizationId,
          p_user_id: input.requestedBy,
          p_template_id: input.templateId,
          p_period_start: input.periodStart,
          p_period_end: input.periodEnd,
        }
      );

      if (createError) {
        throw new Error(`Failed to create report: ${createError.message}`);
      }

      const reportId = reportData;

      // Update status to GENERATING
      await supabase
        .from('generated_reports')
        .update({ status: 'GENERATING' })
        .eq('id', reportId);

      this.emit('report-generation-started', { reportId });

      try {
        // Get metrics snapshot
        const metrics = await this.getMetricsSnapshot(
          input.campaignId!,
          input.organizationId,
          input.periodStart,
          input.periodEnd
        );

        // Generate each section with GPT
        const executiveSummary = await this.generateExecutiveSummary(metrics, input);
        const performanceAnalysis = await this.summarizePerformanceTrends(metrics, input);
        const agentEffectiveness = await this.summarizeAgentEffectiveness(metrics, input);
        const sentimentAnalysis = await this.summarizeSentimentTrends(metrics, input);
        const strategicInsights = await this.generateStrategyInsights(metrics, input);

        // Extract key findings and recommendations
        const keyFindings = this.extractKeyFindings(
          executiveSummary,
          performanceAnalysis,
          sentimentAnalysis
        );
        const recommendations = this.extractRecommendations(
          performanceAnalysis,
          agentEffectiveness,
          strategicInsights
        );

        // Build report sections
        const sections = await this.buildReportSections(
          executiveSummary,
          performanceAnalysis,
          agentEffectiveness,
          sentimentAnalysis,
          strategicInsights,
          metrics
        );

        // Generate chart configurations
        const charts = this.generateCharts(metrics);

        // Complete the report
        await supabase.rpc('complete_report_generation', {
          p_report_id: reportId,
          p_executive_summary: executiveSummary,
          p_key_findings: keyFindings,
          p_recommendations: recommendations,
          p_performance_analysis: performanceAnalysis,
          p_agent_effectiveness: agentEffectiveness,
          p_sentiment_analysis: sentimentAnalysis,
          p_sections: sections,
          p_charts: charts,
          p_metrics_snapshot: metrics,
        });

        // Get the completed report
        const report = await this.getReport(reportId, input.organizationId);

        if (!report) {
          throw new Error('Report not found after completion');
        }

        // Log to timeline
        if (input.campaignId) {
          await timelineEngine.logEvent({
            organizationId: input.organizationId,
            campaignId: input.campaignId,
            eventType: 'DECISION_MADE',
            title: 'Campaign report generated',
            description: `${report.title} - ${keyFindings.length} key findings identified`,
            metadata: {
              reportId: report.id,
              reportType: report.reportType,
              findingsCount: keyFindings.length,
              recommendationsCount: recommendations.length,
            },
          });
        }

        this.emit('report-generation-completed', { reportId, report });

        return report;
      } catch (error: any) {
        // Mark report as failed
        await supabase.rpc('fail_report_generation', {
          p_report_id: reportId,
          p_error_message: error.message,
        });

        this.emit('report-generation-failed', { reportId, error: error.message });

        throw error;
      }
    } catch (error: any) {
      console.error('Report generation error:', error);
      throw error;
    }
  }

  /**
   * Get metrics snapshot for a campaign
   */
  private async getMetricsSnapshot(
    campaignId: string,
    organizationId: string,
    periodStart?: string,
    periodEnd?: string
  ): Promise<MetricsSnapshot> {
    const { data, error } = await supabase.rpc('summarize_campaign_metrics', {
      p_campaign_id: campaignId,
      p_organization_id: organizationId,
      p_period_start: periodStart,
      p_period_end: periodEnd,
    });

    if (error) {
      throw new Error(`Failed to get metrics snapshot: ${error.message}`);
    }

    return data as MetricsSnapshot;
  }

  // =====================================================
  // GPT-POWERED SUMMARIES
  // =====================================================

  /**
   * Generate executive summary
   */
  private async generateExecutiveSummary(
    metrics: MetricsSnapshot,
    input: GenerateReportInput
  ): Promise<string> {
    const prompt = this.buildExecutiveSummaryPrompt(metrics);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert PR and marketing analyst creating executive summaries for campaign performance reports. Be concise, data-driven, and actionable.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return completion.choices[0].message.content || '';
  }

  /**
   * Summarize performance trends (GPT-powered)
   */
  async summarizePerformanceTrends(
    metrics: MetricsSnapshot,
    input: GenerateReportInput
  ): Promise<string> {
    const prompt = this.buildPerformanceTrendsPrompt(metrics);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert data analyst evaluating campaign performance trends. Identify patterns, correlations, and actionable insights from the data.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    return completion.choices[0].message.content || '';
  }

  /**
   * Summarize agent effectiveness (GPT-powered)
   */
  async summarizeAgentEffectiveness(
    metrics: MetricsSnapshot,
    input: GenerateReportInput
  ): Promise<string> {
    const prompt = this.buildAgentEffectivenessPrompt(metrics);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert in AI agent performance evaluation. Analyze agent efficiency, success patterns, and optimization opportunities.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 600,
    });

    return completion.choices[0].message.content || '';
  }

  /**
   * Summarize sentiment trends
   */
  private async summarizeSentimentTrends(
    metrics: MetricsSnapshot,
    input: GenerateReportInput
  ): Promise<string> {
    const prompt = this.buildSentimentTrendsPrompt(metrics);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert in sentiment analysis and relationship management. Evaluate contact sentiment patterns and their implications.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 600,
    });

    return completion.choices[0].message.content || '';
  }

  /**
   * Generate strategic insights (GPT-powered)
   */
  async generateStrategyInsights(
    metrics: MetricsSnapshot,
    input: GenerateReportInput
  ): Promise<string> {
    const prompt = this.buildStrategyInsightsPrompt(metrics);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content:
            'You are a strategic PR consultant providing high-level insights and recommendations. Focus on opportunities, risks, and strategic optimizations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 1000,
    });

    return completion.choices[0].message.content || '';
  }

  // =====================================================
  // PROMPT BUILDERS
  // =====================================================

  private buildExecutiveSummaryPrompt(metrics: MetricsSnapshot): string {
    let prompt = 'Create a concise executive summary for this campaign performance report.\n\n';

    prompt += '**Campaign Period:**\n';
    prompt += `${new Date(metrics.period.start).toLocaleDateString()} - ${new Date(metrics.period.end).toLocaleDateString()}\n\n`;

    prompt += '**Key Metrics:**\n';
    if (metrics.contacts) {
      prompt += `- Total Contacts: ${metrics.contacts.total}\n`;
      prompt += `- Qualified Leads: ${metrics.contacts.qualified}\n`;
    }
    if (metrics.outreach) {
      prompt += `- Pitches Sent: ${metrics.outreach.pitches}\n`;
      prompt += `- Placements Secured: ${metrics.outreach.placements}\n`;
      prompt += `- Conversion Rate: ${metrics.outreach.conversionRate}%\n`;
    }
    if (metrics.leadScoring) {
      prompt += `- Average Lead Score: ${metrics.leadScoring.avgScore}/100\n`;
      prompt += `- Qualification Rate: ${metrics.leadScoring.qualificationRate}%\n`;
    }
    if (metrics.sentiment) {
      prompt += `- Average Sentiment: ${metrics.sentiment.avgScore}/100\n`;
    }
    if (metrics.tasks) {
      prompt += `- Task Completion Rate: ${metrics.tasks.completionRate}%\n`;
    }

    prompt += '\nProvide a 3-4 sentence summary highlighting:\n';
    prompt += '1. Overall campaign performance\n';
    prompt += '2. Most significant achievement\n';
    prompt += '3. Key area for improvement\n';
    prompt += '4. Strategic recommendation\n';

    return prompt;
  }

  private buildPerformanceTrendsPrompt(metrics: MetricsSnapshot): string {
    let prompt = 'Analyze the following campaign performance metrics and identify key trends.\n\n';

    prompt += '**Outreach Performance:**\n';
    if (metrics.outreach) {
      prompt += `- Pitches: ${metrics.outreach.pitches}\n`;
      prompt += `- Placements: ${metrics.outreach.placements}\n`;
      prompt += `- Conversion Rate: ${metrics.outreach.conversionRate}%\n`;
      if (metrics.outreach.replyRate) {
        prompt += `- Reply Rate: ${metrics.outreach.replyRate}%\n`;
      }
      if (metrics.outreach.openRate) {
        prompt += `- Open Rate: ${metrics.outreach.openRate}%\n`;
      }
    }

    prompt += '\n**Lead Quality:**\n';
    if (metrics.leadScoring) {
      prompt += `- Average Score: ${metrics.leadScoring.avgScore}/100\n`;
      prompt += `- Green (≥70): ${metrics.leadScoring.greenCount}\n`;
      prompt += `- Amber (40-69): ${metrics.leadScoring.amberCount}\n`;
      prompt += `- Red (<40): ${metrics.leadScoring.redCount}\n`;
      prompt += `- Qualification Rate: ${metrics.leadScoring.qualificationRate}%\n`;
    }

    prompt += '\n**Contact Engagement:**\n';
    if (metrics.contacts) {
      prompt += `- Total Contacts: ${metrics.contacts.total}\n`;
      prompt += `- Qualified: ${metrics.contacts.qualified}\n`;
      prompt += `- Disqualified: ${metrics.contacts.disqualified}\n`;
    }

    prompt += '\nAnalyze:\n';
    prompt += '1. What patterns emerge from this data?\n';
    prompt += '2. Which metrics are performing well vs poorly?\n';
    prompt += '3. What correlations exist between different metrics?\n';
    prompt += '4. What specific actions would improve performance?\n';

    return prompt;
  }

  private buildAgentEffectivenessPrompt(metrics: MetricsSnapshot): string {
    let prompt = 'Evaluate AI agent performance and effectiveness.\n\n';

    if (metrics.agents) {
      prompt += '**Agent Metrics:**\n';
      prompt += `- Total Runs: ${metrics.agents.totalRuns}\n`;
      prompt += `- Successful Runs: ${metrics.agents.successfulRuns}\n`;
      prompt += `- Failed Runs: ${metrics.agents.failedRuns}\n`;
      prompt += `- Success Rate: ${metrics.agents.successRate}%\n`;
      prompt += `- Avg Execution Time: ${metrics.agents.avgExecutionTime}ms\n\n`;
    }

    if (metrics.tasks) {
      prompt += '**Task Performance:**\n';
      prompt += `- Total Tasks: ${metrics.tasks.total}\n`;
      prompt += `- Completed: ${metrics.tasks.completed}\n`;
      prompt += `- Pending: ${metrics.tasks.pending}\n`;
      prompt += `- Failed: ${metrics.tasks.failed}\n`;
      prompt += `- Completion Rate: ${metrics.tasks.completionRate}%\n\n`;
    }

    prompt += 'Analyze:\n';
    prompt += '1. Are agents executing efficiently?\n';
    prompt += '2. What patterns suggest optimization opportunities?\n';
    prompt += '3. Are there bottlenecks or failure patterns?\n';
    prompt += '4. What improvements would have the highest impact?\n';

    return prompt;
  }

  private buildSentimentTrendsPrompt(metrics: MetricsSnapshot): string {
    let prompt = 'Analyze sentiment trends and relationship health.\n\n';

    if (metrics.sentiment) {
      prompt += '**Sentiment Metrics:**\n';
      prompt += `- Average Sentiment: ${metrics.sentiment.avgScore}/100\n`;
      prompt += `- Positive: ${metrics.sentiment.positiveCount}\n`;
      prompt += `- Neutral: ${metrics.sentiment.neutralCount}\n`;
      prompt += `- Negative: ${metrics.sentiment.negativeCount}\n`;
      prompt += `- Trend: ${metrics.sentiment.trendDirection}\n\n`;
    }

    prompt += 'Analyze:\n';
    prompt += '1. What does the sentiment distribution indicate about relationship health?\n';
    prompt += '2. Are there concerning patterns or red flags?\n';
    prompt += '3. What factors might be driving sentiment trends?\n';
    prompt += '4. What actions would improve sentiment?\n';

    return prompt;
  }

  private buildStrategyInsightsPrompt(metrics: MetricsSnapshot): string {
    let prompt = 'Based on all campaign metrics, provide strategic insights and recommendations.\n\n';

    prompt += '**Complete Metrics Overview:**\n';
    prompt += JSON.stringify(metrics, null, 2);
    prompt += '\n\n';

    prompt += 'Provide strategic analysis covering:\n\n';
    prompt += '1. **Opportunities:** What untapped opportunities exist?\n';
    prompt += '2. **Risks:** What trends or patterns pose risks?\n';
    prompt += '3. **Optimizations:** What tactical improvements would drive results?\n';
    prompt += '4. **Strategic Recommendations:** What high-level changes should be made?\n\n';

    prompt += 'Be specific, data-driven, and actionable. Prioritize by potential impact.';

    return prompt;
  }

  // =====================================================
  // REPORT COMPILATION
  // =====================================================

  /**
   * Build report sections
   */
  private async buildReportSections(
    executiveSummary: string,
    performanceAnalysis: string,
    agentEffectiveness: string,
    sentimentAnalysis: string,
    strategicInsights: string,
    metrics: MetricsSnapshot
  ): Promise<ReportSection[]> {
    const sections: ReportSection[] = [];

    sections.push({
      type: 'EXECUTIVE_SUMMARY',
      title: 'Executive Summary',
      content: executiveSummary,
      order: 1,
    });

    sections.push({
      type: 'METRICS_OVERVIEW',
      title: 'Key Metrics',
      content: this.formatMetricsOverview(metrics),
      order: 2,
    });

    sections.push({
      type: 'PERFORMANCE_ANALYSIS',
      title: 'Performance Analysis',
      content: performanceAnalysis,
      order: 3,
    });

    sections.push({
      type: 'SENTIMENT_ANALYSIS',
      title: 'Sentiment Analysis',
      content: sentimentAnalysis,
      order: 4,
    });

    sections.push({
      type: 'AGENT_EFFECTIVENESS',
      title: 'Agent Performance',
      content: agentEffectiveness,
      order: 5,
    });

    sections.push({
      type: 'STRATEGIC_INSIGHTS',
      title: 'Strategic Insights',
      content: strategicInsights,
      order: 6,
    });

    return sections;
  }

  /**
   * Format metrics overview section
   */
  private formatMetricsOverview(metrics: MetricsSnapshot): string {
    let content = '## Campaign Metrics Overview\n\n';

    if (metrics.contacts) {
      content += '### Contacts\n';
      content += `- Total: **${metrics.contacts.total}**\n`;
      content += `- Qualified: **${metrics.contacts.qualified}**\n`;
      content += `- Disqualified: **${metrics.contacts.disqualified}**\n\n`;
    }

    if (metrics.outreach) {
      content += '### Outreach\n';
      content += `- Pitches: **${metrics.outreach.pitches}**\n`;
      content += `- Placements: **${metrics.outreach.placements}**\n`;
      content += `- Conversion Rate: **${metrics.outreach.conversionRate}%**\n\n`;
    }

    if (metrics.leadScoring) {
      content += '### Lead Scoring\n';
      content += `- Average Score: **${metrics.leadScoring.avgScore}/100**\n`;
      content += `- Qualification Rate: **${metrics.leadScoring.qualificationRate}%**\n`;
      content += `- Distribution: ${metrics.leadScoring.greenCount} Green, ${metrics.leadScoring.amberCount} Amber, ${metrics.leadScoring.redCount} Red\n\n`;
    }

    if (metrics.sentiment) {
      content += '### Sentiment\n';
      content += `- Average: **${metrics.sentiment.avgScore}/100**\n`;
      content += `- Trend: **${metrics.sentiment.trendDirection}**\n\n`;
    }

    if (metrics.agents) {
      content += '### Agent Performance\n';
      content += `- Total Runs: **${metrics.agents.totalRuns}**\n`;
      content += `- Success Rate: **${metrics.agents.successRate}%**\n\n`;
    }

    if (metrics.tasks) {
      content += '### Tasks\n';
      content += `- Total: **${metrics.tasks.total}**\n`;
      content += `- Completion Rate: **${metrics.tasks.completionRate}%**\n\n`;
    }

    return content;
  }

  /**
   * Extract key findings from summaries
   */
  private extractKeyFindings(
    executiveSummary: string,
    performanceAnalysis: string,
    sentimentAnalysis: string
  ): string[] {
    // Simple extraction - in production, could use GPT to extract
    const findings: string[] = [];

    // Extract from executive summary
    const summaryLines = executiveSummary.split('\n').filter((l) => l.trim());
    if (summaryLines.length > 0) {
      findings.push(summaryLines[0]);
    }

    // Extract key performance points
    const perfLines = performanceAnalysis.split('\n').filter((l) => l.includes('%') || l.includes('performing'));
    findings.push(...perfLines.slice(0, 2));

    // Extract sentiment insight
    const sentimentLines = sentimentAnalysis.split('\n').filter((l) => l.trim());
    if (sentimentLines.length > 0) {
      findings.push(sentimentLines[0]);
    }

    return findings.slice(0, 5); // Top 5 findings
  }

  /**
   * Extract recommendations from analyses
   */
  private extractRecommendations(
    performanceAnalysis: string,
    agentEffectiveness: string,
    strategicInsights: string
  ): string[] {
    const recommendations: string[] = [];

    // Simple extraction - look for action-oriented phrases
    const allText = [performanceAnalysis, agentEffectiveness, strategicInsights].join('\n');
    const lines = allText.split('\n');

    for (const line of lines) {
      if (
        line.toLowerCase().includes('recommend') ||
        line.toLowerCase().includes('should') ||
        line.toLowerCase().includes('consider') ||
        line.toLowerCase().includes('improve')
      ) {
        recommendations.push(line.trim());
      }
    }

    return recommendations.slice(0, 5); // Top 5 recommendations
  }

  /**
   * Generate chart configurations
   */
  private generateCharts(metrics: MetricsSnapshot): ChartConfig[] {
    const charts: ChartConfig[] = [];

    // Lead distribution chart
    if (metrics.leadScoring) {
      charts.push({
        id: 'lead-rag-distribution',
        type: 'doughnut',
        title: 'Lead Score Distribution',
        data: {
          labels: ['Green (≥70)', 'Amber (40-69)', 'Red (<40)'],
          datasets: [
            {
              label: 'Leads',
              data: [
                metrics.leadScoring.greenCount,
                metrics.leadScoring.amberCount,
                metrics.leadScoring.redCount,
              ],
              backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
            },
          ],
        },
      });
    }

    // Outreach conversion funnel
    if (metrics.outreach) {
      charts.push({
        id: 'outreach-funnel',
        type: 'bar',
        title: 'Outreach Funnel',
        data: {
          labels: ['Pitches', 'Placements'],
          datasets: [
            {
              label: 'Count',
              data: [metrics.outreach.pitches, metrics.outreach.placements],
              backgroundColor: ['#3B82F6', '#10B981'],
            },
          ],
        },
      });
    }

    // Sentiment distribution
    if (metrics.sentiment) {
      charts.push({
        id: 'sentiment-distribution',
        type: 'pie',
        title: 'Sentiment Distribution',
        data: {
          labels: ['Positive', 'Neutral', 'Negative'],
          datasets: [
            {
              label: 'Contacts',
              data: [
                metrics.sentiment.positiveCount,
                metrics.sentiment.neutralCount,
                metrics.sentiment.negativeCount,
              ],
              backgroundColor: ['#10B981', '#6B7280', '#EF4444'],
            },
          ],
        },
      });
    }

    return charts;
  }

  // =====================================================
  // REPORT RETRIEVAL
  // =====================================================

  /**
   * Get report by ID
   */
  async getReport(reportId: string, organizationId: string): Promise<GeneratedReport | null> {
    const { data, error } = await supabase
      .from('generated_reports')
      .select('*')
      .eq('id', reportId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapReportFromDb(data);
  }

  /**
   * Get latest campaign report
   */
  async getLatestCampaignReport(
    campaignId: string,
    organizationId: string
  ): Promise<GeneratedReport | null> {
    const { data, error } = await supabase
      .from('generated_reports')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('organization_id', organizationId)
      .eq('status', 'COMPLETE')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapReportFromDb(data);
  }

  /**
   * Retry failed report
   */
  async retryReport(reportId: string, organizationId: string): Promise<GeneratedReport> {
    // Get the original report
    const report = await this.getReport(reportId, organizationId);

    if (!report) {
      throw new Error('Report not found');
    }

    if (report.status !== 'FAILED') {
      throw new Error('Can only retry failed reports');
    }

    // Generate new report with same parameters
    return this.generateCampaignReport({
      campaignId: report.campaignId,
      strategyId: report.strategyId,
      organizationId: report.organizationId,
      reportType: report.reportType,
      templateId: report.templateId,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      requestedBy: report.requestedBy,
    });
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private mapReportFromDb(data: any): GeneratedReport {
    return {
      id: data.id,
      organizationId: data.organization_id,
      reportType: data.report_type,
      templateId: data.template_id,
      campaignId: data.campaign_id,
      strategyId: data.strategy_id,
      title: data.title,
      status: data.status,
      executiveSummary: data.executive_summary,
      keyFindings: data.key_findings || [],
      strategicRecommendations: data.strategic_recommendations || [],
      performanceAnalysis: data.performance_analysis,
      agentEffectivenessSummary: data.agent_effectiveness_summary,
      sentimentAnalysis: data.sentiment_analysis,
      metricsSnapshot: data.metrics_snapshot || {},
      sections: data.sections || [],
      charts: data.charts || [],
      generationStartedAt: data.generation_started_at,
      generationCompletedAt: data.generation_completed_at,
      generationDurationMs: data.generation_duration_ms,
      errorMessage: data.error_message,
      retryCount: data.retry_count || 0,
      periodStart: data.period_start,
      periodEnd: data.period_end,
      requestedBy: data.requested_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

// Singleton instance
export const reportEngine = new ReportEngine();
