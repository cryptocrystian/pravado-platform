// =====================================================
// WEEKLY OPS REPORT CRON JOB
// Sprint 83: Post-Launch Reliability & SLO Automation
// =====================================================

import { supabase } from '../config/supabase';
import { logger } from '../lib/logger';
import { captureException } from '../services/observability.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Generate weekly ops report
 *
 * Runs every Monday at 07:00 UTC
 * Compiles previous week SLO and cost data
 * Renders Markdown report to ops/reports/weekly_<date>.md
 *
 * To schedule with cron:
 * 0 7 * * 1 node dist/jobs/weekly-ops-report.cron.js
 */
export async function generateWeeklyOpsReport(): Promise<void> {
  try {
    logger.info('[Weekly Ops Report] Starting generation...');

    const reportDate = new Date();
    const dateStr = reportDate.toISOString().split('T')[0];

    // Calculate last week's date range
    const endDate = new Date(reportDate);
    endDate.setDate(endDate.getDate() - 1); // Yesterday
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6); // 7 days ago

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    logger.info('[Weekly Ops Report] Report period', {
      start: startDateStr,
      end: endDateStr,
    });

    // 1. Fetch SLO metrics for the week
    const { data: sloData, error: sloError } = await supabase
      .from('ops_slo_metrics')
      .select('*')
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('date', { ascending: true });

    if (sloError) {
      logger.error('[Weekly Ops Report] Failed to fetch SLO data', { error: sloError });
      throw sloError;
    }

    // 2. Fetch cost data for the week
    const { data: ledgerData, error: ledgerError } = await supabase
      .from('ai_usage_ledger')
      .select('estimated_cost_usd, created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (ledgerError) {
      logger.error('[Weekly Ops Report] Failed to fetch ledger data', { error: ledgerError });
      throw ledgerError;
    }

    // Calculate metrics
    const totalCost = ledgerData?.reduce((sum, r) => sum + (r.estimated_cost_usd || 0), 0) || 0;
    const totalRequests = ledgerData?.length || 0;

    const avgUptime = sloData?.length
      ? sloData.reduce((sum, d) => sum + Number(d.uptime_percent), 0) / sloData.length
      : 0;

    const avgLatency = sloData?.length
      ? sloData.reduce((sum, d) => sum + Number(d.avg_latency_ms), 0) / sloData.length
      : 0;

    const avgErrorRate = sloData?.length
      ? sloData.reduce((sum, d) => sum + Number(d.error_rate_percent), 0) / sloData.length
      : 0;

    const avgLLMFailureRate = sloData?.length
      ? sloData.reduce((sum, d) => sum + Number(d.llm_failure_rate_percent), 0) / sloData.length
      : 0;

    // Count days by status
    const healthyDays = sloData?.filter((d) => d.status === 'healthy').length || 0;
    const degradedDays = sloData?.filter((d) => d.status === 'degraded').length || 0;
    const criticalDays = sloData?.filter((d) => d.status === 'critical').length || 0;

    // Check SLO compliance
    const slosMet = {
      uptime: avgUptime >= 99.9,
      latency: avgLatency < 1500,
      errorRate: avgErrorRate < 1.0,
      llmFailureRate: avgLLMFailureRate < 10.0,
    };

    const allSlosMet = Object.values(slosMet).every((met) => met);

    // 3. Generate Markdown report
    const report = `# Weekly Ops Report
**Week Ending:** ${endDateStr}
**Report Generated:** ${reportDate.toISOString()}

---

## Executive Summary

${allSlosMet ? '✅ **All SLOs met this week**' : '⚠️ **Some SLOs were not met**'}

- **Period:** ${startDateStr} to ${endDateStr}
- **Days Tracked:** ${sloData?.length || 0}
- **Healthy Days:** ${healthyDays} | **Degraded Days:** ${degradedDays} | **Critical Days:** ${criticalDays}

---

## SLO Compliance

| Metric | Average | Target | Status |
|--------|---------|--------|--------|
| **Uptime** | ${avgUptime.toFixed(2)}% | ≥99.9% | ${slosMet.uptime ? '✅ Met' : '❌ Not Met'} |
| **Avg Latency** | ${avgLatency.toFixed(2)}ms | <1500ms | ${slosMet.latency ? '✅ Met' : '⚠️ Not Met'} |
| **Error Rate** | ${avgErrorRate.toFixed(2)}% | <1% | ${slosMet.errorRate ? '✅ Met' : '❌ Not Met'} |
| **LLM Failure Rate** | ${avgLLMFailureRate.toFixed(2)}% | <10% | ${slosMet.llmFailureRate ? '✅ Met' : '⚠️ Not Met'} |

---

## Cost & Usage

- **Total LLM Requests:** ${totalRequests.toLocaleString()}
- **Total Cost:** $${totalCost.toFixed(2)}
- **Average Daily Cost:** $${(totalCost / 7).toFixed(2)}
- **Cost per 1K Requests:** $${totalRequests > 0 ? ((totalCost / totalRequests) * 1000).toFixed(2) : '0.00'}

---

## Daily Breakdown

| Date | Uptime | Latency (ms) | Error Rate | LLM Failures | Status |
|------|--------|--------------|------------|--------------|--------|
${sloData?.map((d) => `| ${d.date} | ${d.uptime_percent}% | ${d.avg_latency_ms} | ${d.error_rate_percent}% | ${d.llm_failure_rate_percent}% | ${d.status.toUpperCase()} |`).join('\n') || '| No data | - | - | - | - | - |'}

---

## Recommendations

${
  !allSlosMet
    ? `### Action Items

${!slosMet.uptime ? '- 🚨 **Uptime below target** - Investigate service stability and implement redundancy\n' : ''}${!slosMet.latency ? '- ⚠️ **High latency** - Review database queries and LLM provider performance\n' : ''}${!slosMet.errorRate ? '- 🚨 **High error rate** - Analyze error logs and implement fixes\n' : ''}${!slosMet.llmFailureRate ? '- ⚠️ **High LLM failure rate** - Check provider status and rate limits\n' : ''}`
    : `- ✅ Continue monitoring and maintain current operational practices
- 📊 Review cost optimization opportunities
- 🔍 Proactively identify potential bottlenecks`
}

---

## Next Week Goals

1. Maintain ${allSlosMet ? 'SLO compliance' : 'and improve SLO metrics'}
2. Monitor cost trends and optimize usage
3. Review and update alert thresholds if needed
4. Continue daily SLO monitoring

---

**Report Status:** Automated
**Contact:** ops@pravado.io
**Dashboard:** /admin/ops-dashboard
`;

    // 4. Save report to file
    const reportsDir = path.join(process.cwd(), 'ops', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, `weekly_${dateStr}.md`);
    fs.writeFileSync(reportPath, report, 'utf-8');

    logger.info('[Weekly Ops Report] Report generated successfully', {
      path: reportPath,
      slo_met: allSlosMet,
      total_cost: totalCost,
    });

    // 5. (Optional) Send email via Mailgun
    // Note: Mailgun integration would go here
    // For now, just log that report is ready
    logger.info('[Weekly Ops Report] Email sending skipped (Mailgun not configured)');

    logger.info('[Weekly Ops Report] Generation complete');
  } catch (error) {
    logger.error('[Weekly Ops Report] Failed to generate report', { error });
    captureException(error as Error, { context: 'weekly-ops-report' });
    throw error;
  }
}

// If running directly (node dist/jobs/weekly-ops-report.cron.js)
if (require.main === module) {
  generateWeeklyOpsReport()
    .then(() => {
      console.log('✅ Weekly ops report generated successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to generate weekly ops report:', error);
      process.exit(1);
    });
}
