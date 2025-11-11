# SLO Automation Runbook
## Pravado Platform Reliability Operations Guide

**Version:** 1.0.0
**Last Updated:** 2025-11-11
**Owner:** DevOps Team
**Sprint:** 83 - Post-Launch Reliability & SLO Automation

---

## Table of Contents

1. [Overview](#overview)
2. [SLO Definitions](#slo-definitions)
3. [Daily Operations](#daily-operations)
4. [Interpreting Metrics](#interpreting-metrics)
5. [Alert Response Workflows](#alert-response-workflows)
6. [Cost Anomaly Investigation](#cost-anomaly-investigation)
7. [Maintenance Procedures](#maintenance-procedures)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Escalation Procedures](#escalation-procedures)

---

## Overview

The Pravado Platform SLO automation system provides continuous monitoring and reporting of service reliability metrics. This runbook guides operators through daily workflows, incident response, and system maintenance.

### System Components

| Component | Purpose | Schedule |
|-----------|---------|----------|
| **slo_monitor.sh** | Collects daily metrics from Prometheus | Daily at 00:00 UTC (cron) |
| **ops_slo_metrics table** | Stores historical SLO data | Persistent storage |
| **weekly-ops-report.cron.ts** | Generates weekly summary reports | Mondays at 07:00 UTC |
| **cost-anomaly.service.ts** | Detects cost baseline violations | On-demand via API |
| **Prometheus alerts** | Real-time SLO violation detection | Continuous |
| **/admin/ops-history API** | Historical data retrieval | On-demand |

### Key Metrics

- **Uptime %** - Percentage of successful HTTP requests (2xx responses)
- **Average Latency** - Mean HTTP request duration in milliseconds
- **Error Rate %** - Percentage of server errors (5xx responses)
- **LLM Failure Rate %** - Percentage of LLM router failures

---

## SLO Definitions

### Service Level Objectives

| Metric | Target | Degraded Threshold | Critical Threshold |
|--------|--------|-------------------|-------------------|
| **Uptime** | ≥99.9% | <99.9% | <99.0% |
| **Latency** | <1500ms | >1500ms | >3000ms |
| **Error Rate** | <1% | >1% | >5% |
| **LLM Failure Rate** | <10% | >10% | >25% |

### Status Determination Logic

The SLO monitor determines overall system status based on these rules:

```bash
# Critical: Uptime below 99.9% OR Error Rate above 1%
if uptime < 99.9% OR error_rate > 1%:
  status = "critical"

# Degraded: Latency above 1500ms OR LLM Failure Rate above 10%
elif latency > 1500ms OR llm_failure_rate > 10%:
  status = "degraded"

# Healthy: All SLOs met
else:
  status = "healthy"
```

### Error Budget

**Monthly Error Budget:** 43.2 minutes of downtime per month (99.9% uptime)

**Budget Calculation:**
- Total minutes per month: 43,200 (30 days)
- Allowed downtime: 43.2 minutes
- Remaining budget = 43.2 - (actual downtime minutes)

**Budget Tracking:**
```sql
-- Query to calculate monthly error budget consumption
SELECT
  DATE_TRUNC('month', date) AS month,
  SUM((100 - uptime_percent) * 1440 / 100) AS downtime_minutes,
  43.2 - SUM((100 - uptime_percent) * 1440 / 100) AS remaining_budget
FROM ops_slo_metrics
WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY DATE_TRUNC('month', date);
```

---

## Daily Operations

### Morning Checklist (09:00 UTC)

**1. Review Yesterday's SLO Report**

```bash
# View latest daily report
cd /path/to/pravado-platform/ops/reports
cat slo_daily_report_$(date -d "yesterday" +%Y-%m-%d).md
```

**2. Check System Status**

Access the Ops Dashboard:
- URL: `https://dashboard.pravado.com/admin/ops-dashboard`
- Review real-time metrics
- Check alert status

**3. Verify Data Collection**

```bash
# Check if yesterday's metrics were stored
psql $DATABASE_URL -c "
  SELECT date, status, uptime_percent, avg_latency_ms, error_rate_percent
  FROM ops_slo_metrics
  WHERE date = CURRENT_DATE - INTERVAL '1 day';
"
```

**Expected Output:**
```
     date     |  status  | uptime_percent | avg_latency_ms | error_rate_percent
--------------+----------+----------------+----------------+--------------------
 2025-11-10   | healthy  |          99.95 |         342.50 |               0.45
```

**4. Review Active Alerts**

```bash
# Check Prometheus Alertmanager
curl -s http://alertmanager:9093/api/v1/alerts | jq '.data[] | select(.status.state == "firing")'
```

**5. Check Cost Anomalies**

```bash
# Query recent cost anomalies
curl -s https://api.pravado.com/api/v1/admin/ops-history?days=1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.anomalies'
```

### Weekly Review (Mondays 09:00 UTC)

**1. Review Weekly Ops Report**

```bash
# Check latest weekly report
cd ops/reports
cat weekly_$(date +%Y-%m-%d).md
```

**2. Analyze Trends**

- Compare weekly averages to previous weeks
- Identify patterns in degradations
- Review cost trends and anomalies

**3. Update Runbook**

- Document any new issues encountered
- Update troubleshooting steps
- Add lessons learned

---

## Interpreting Metrics

### Uptime Percentage

**What it measures:** Ratio of successful HTTP requests to total requests

**Healthy Range:** ≥99.9%

**Common Causes of Degradation:**
- Database connection pool exhaustion
- Upstream service failures (Supabase, LLM providers)
- Network connectivity issues
- Memory leaks causing process restarts

**Investigation Steps:**
```bash
# Check error logs for 5xx responses
kubectl logs -l app=pravado-api --since=24h | grep "500\|502\|503\|504"

# Review database connection metrics
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check LLM provider status
curl -s https://status.openai.com/api/v2/status.json | jq '.status.indicator'
```

### Average Latency

**What it measures:** Mean HTTP request duration in milliseconds

**Healthy Range:** <1500ms

**Common Causes of Degradation:**
- Slow database queries
- LLM provider latency spikes
- Unoptimized N+1 query patterns
- High memory usage causing GC pauses

**Investigation Steps:**
```bash
# Identify slow queries
psql $DATABASE_URL -c "
  SELECT query, mean_exec_time, calls
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"

# Check LLM provider latency
curl -s http://localhost:3001/metrics | grep "llm_router_request_duration_seconds"

# Review application logs for timeouts
kubectl logs -l app=pravado-api --since=1h | grep "timeout\|slow"
```

### Error Rate

**What it measures:** Percentage of HTTP requests returning 5xx status codes

**Healthy Range:** <1%

**Common Causes of Degradation:**
- Application bugs causing exceptions
- Database query failures
- LLM provider rate limiting
- Out of memory errors

**Investigation Steps:**
```bash
# Group errors by status code
kubectl logs -l app=pravado-api --since=24h | grep "error" | awk '{print $5}' | sort | uniq -c

# Check Sentry for error trends
# Visit https://sentry.io/pravado/api

# Review database error logs
psql $DATABASE_URL -c "SELECT * FROM pg_stat_database WHERE datname = 'pravado';"
```

### LLM Failure Rate

**What it measures:** Percentage of LLM router requests that failed

**Healthy Range:** <10%

**Common Causes of Degradation:**
- LLM provider outages
- Rate limit exhaustion
- Invalid API keys
- Network connectivity to providers
- Timeout configurations too aggressive

**Investigation Steps:**
```bash
# Check LLM router metrics
curl -s http://localhost:3001/metrics | grep "llm_router"

# Review LLM provider logs
kubectl logs -l app=pravado-api --since=1h | grep "llm_router" | grep "error"

# Check provider status pages
# - OpenAI: https://status.openai.com
# - Anthropic: https://status.anthropic.com
# - Google: https://status.cloud.google.com/vertex-ai

# Review rate limit metrics
curl -s http://localhost:3001/metrics | grep "rate_limit"
```

---

## Alert Response Workflows

### Alert: UptimeBelowSLO

**Severity:** Warning (if >99%, <99.9%) / Critical (if <99%)

**Response Time:**
- Warning: 15 minutes
- Critical: 5 minutes (immediate)

**Investigation Steps:**

1. **Check current status:**
   ```bash
   curl -s http://localhost:3001/health
   ```

2. **Review error logs:**
   ```bash
   kubectl logs -l app=pravado-api --tail=100 | grep "ERROR"
   ```

3. **Check database connectivity:**
   ```bash
   psql $DATABASE_URL -c "SELECT 1;"
   ```

4. **Verify upstream services:**
   ```bash
   curl -s https://supabase.com/api/health
   ```

**Remediation:**
- If database connection pool exhausted: Restart API pods
- If upstream service down: Implement circuit breaker, notify users
- If memory leak detected: Scale up pods, schedule restart

**Escalation:** If uptime drops below 99%, immediately escalate to on-call engineer.

---

### Alert: LatencyAboveSLO

**Severity:** Warning (if >1500ms, <3000ms) / Critical (if >3000ms)

**Response Time:**
- Warning: 30 minutes
- Critical: 15 minutes

**Investigation Steps:**

1. **Identify slow endpoints:**
   ```bash
   curl -s http://localhost:3001/metrics | grep "http_request_duration_seconds_sum"
   ```

2. **Check database query performance:**
   ```bash
   psql $DATABASE_URL -c "
     SELECT query, mean_exec_time, calls
     FROM pg_stat_statements
     WHERE mean_exec_time > 1000
     ORDER BY mean_exec_time DESC
     LIMIT 5;
   "
   ```

3. **Review LLM provider latency:**
   ```bash
   curl -s http://localhost:3001/metrics | grep "llm_router_request_duration"
   ```

**Remediation:**
- If database queries slow: Add indexes, optimize queries
- If LLM provider slow: Implement caching, increase timeout
- If high load: Scale horizontally

---

### Alert: ErrorRateAboveSLO

**Severity:** Critical (always)

**Response Time:** Immediate (5 minutes)

**Investigation Steps:**

1. **Identify error types:**
   ```bash
   kubectl logs -l app=pravado-api --since=5m | grep "5[0-9][0-9]" | head -20
   ```

2. **Check Sentry for stack traces:**
   - Visit Sentry dashboard
   - Review latest errors
   - Identify common patterns

3. **Check database health:**
   ```bash
   psql $DATABASE_URL -c "
     SELECT datname, numbackends, xact_commit, xact_rollback
     FROM pg_stat_database
     WHERE datname = 'pravado';
   "
   ```

**Remediation:**
- If application bug: Deploy hotfix immediately
- If database issue: Failover to replica
- If rate limiting: Implement backoff, contact provider

**Escalation:** Always escalate critical error rates to engineering lead.

---

### Alert: LLMFailureRateAboveSLO

**Severity:** Warning (if >10%, <25%) / Critical (if >25%)

**Response Time:**
- Warning: 15 minutes
- Critical: 10 minutes

**Investigation Steps:**

1. **Check LLM provider status:**
   ```bash
   # OpenAI
   curl -s https://status.openai.com/api/v2/status.json

   # Anthropic
   curl -s https://status.anthropic.com/api/v2/status.json
   ```

2. **Review LLM router metrics:**
   ```bash
   curl -s http://localhost:3001/metrics | grep "llm_router_failures_total"
   ```

3. **Check rate limits:**
   ```bash
   kubectl logs -l app=pravado-api --since=10m | grep "rate_limit"
   ```

**Remediation:**
- If provider outage: Enable fallback provider
- If rate limited: Implement queue, reduce traffic
- If authentication issue: Rotate API keys

---

### Alert: CostAnomalyDetected / CriticalCostAnomaly

**Severity:** Warning (>20% increase) / Critical (>40% increase)

**Response Time:**
- Warning: 1 hour
- Critical: 30 minutes

**Investigation Steps:**

1. **Identify affected organization:**
   ```bash
   curl -s https://api.pravado.com/api/v1/admin/ops-history?days=1 \
     -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.anomalies'
   ```

2. **Check usage patterns:**
   ```bash
   psql $DATABASE_URL -c "
     SELECT
       model_name,
       COUNT(*) AS request_count,
       SUM(estimated_cost_usd) AS total_cost
     FROM ai_usage_ledger
     WHERE organization_id = '<org-id>'
       AND created_at >= CURRENT_DATE
     GROUP BY model_name
     ORDER BY total_cost DESC;
   "
   ```

3. **Review recent campaigns:**
   ```bash
   psql $DATABASE_URL -c "
     SELECT id, name, status, created_at
     FROM pr_campaigns
     WHERE organization_id = '<org-id>'
       AND created_at >= CURRENT_DATE - INTERVAL '7 days'
     ORDER BY created_at DESC;
   "
   ```

**Remediation:**
- If legitimate usage spike: Document reason, adjust baseline
- If runaway automation: Pause campaign, investigate loop
- If potential abuse: Contact organization admin, review usage policies

**Follow-up Actions:**
- Notify organization of cost spike
- Review rate limiting policies
- Consider implementing spending limits

---

## Cost Anomaly Investigation

### Understanding Baselines

The cost anomaly detection system uses a **7-day rolling average** as the baseline:

```
Baseline = Average daily cost over previous 7 days
Threshold = Baseline × 1.2 (20% increase)
```

**Severity Levels:**
- **Warning:** 20-40% increase over baseline
- **Critical:** >40% increase over baseline

### Investigation Workflow

**Step 1: Confirm the Anomaly**

```bash
# Get detailed anomaly data
curl -s https://api.pravado.com/api/v1/admin/ops-history?days=7 \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.anomalies[] | select(.organization_id == "<org-id>")'
```

**Expected Output:**
```json
{
  "organization_id": "org-abc123",
  "date": "2025-11-11",
  "current_cost_usd": 150.00,
  "baseline_cost_usd": 100.00,
  "percent_increase": 50.00,
  "severity": "critical",
  "detected_at": "2025-11-11T12:00:00Z"
}
```

**Step 2: Analyze Usage Patterns**

```sql
-- Daily cost breakdown by model
SELECT
  DATE(created_at) AS date,
  model_name,
  COUNT(*) AS requests,
  SUM(input_tokens) AS total_input_tokens,
  SUM(output_tokens) AS total_output_tokens,
  SUM(estimated_cost_usd) AS daily_cost
FROM ai_usage_ledger
WHERE organization_id = '<org-id>'
  AND created_at >= CURRENT_DATE - INTERVAL '14 days'
GROUP BY DATE(created_at), model_name
ORDER BY date DESC, daily_cost DESC;
```

**Step 3: Identify Root Cause**

Common causes:
1. **New campaign launch** - Expected spike, adjust baseline
2. **Runaway automation** - Agent loop, infinite retries
3. **Model change** - Switched to more expensive model (e.g., GPT-4)
4. **Increased user activity** - Legitimate growth
5. **Bug or misconfiguration** - Duplicate requests, missing cache

**Step 4: Take Action**

| Root Cause | Action |
|------------|--------|
| New campaign | Document, monitor for 7 days to establish new baseline |
| Runaway automation | Pause agent, fix code, implement safeguards |
| Model change | Review if necessary, consider cheaper alternatives |
| Legitimate growth | Notify billing team, celebrate growth |
| Bug | Deploy fix immediately, review refund policy |

**Step 5: Communicate**

```bash
# Draft notification email
To: <org-admin-email>
Subject: Cost Increase Notification - <org-name>

Hi <org-admin-name>,

We detected a ${percent_increase}% increase in your AI usage costs on ${date}.

Current daily cost: $${current_cost}
Previous 7-day average: $${baseline_cost}

Potential causes:
- [List identified causes]

Recommended actions:
- [List recommendations]

Please contact support@pravado.io if you have questions.

Best regards,
Pravado Operations Team
```

---

## Maintenance Procedures

### Daily Maintenance

**1. Verify slo_monitor.sh Execution**

```bash
# Check if cron job ran successfully
grep "SLO Collection Complete" /var/log/syslog | tail -1

# Verify data was stored
psql $DATABASE_URL -c "
  SELECT date, status, created_at
  FROM ops_slo_metrics
  ORDER BY date DESC
  LIMIT 7;
"
```

**2. Check Disk Space for Reports**

```bash
# Check ops/reports directory size
du -sh /path/to/pravado-platform/ops/reports

# Archive old reports (keep last 90 days)
find /path/to/pravado-platform/ops/reports -name "*.md" -mtime +90 -delete
```

### Weekly Maintenance

**1. Review Weekly Report Accuracy**

```bash
# Manually verify weekly calculations
psql $DATABASE_URL -c "
  SELECT
    AVG(uptime_percent) AS avg_uptime,
    AVG(avg_latency_ms) AS avg_latency,
    AVG(error_rate_percent) AS avg_error_rate
  FROM ops_slo_metrics
  WHERE date >= CURRENT_DATE - INTERVAL '7 days';
"

# Compare with generated report
cat ops/reports/weekly_$(date +%Y-%m-%d).md
```

**2. Clean Up Old SLO Data**

```sql
-- Archive data older than 1 year
INSERT INTO ops_slo_metrics_archive
SELECT * FROM ops_slo_metrics
WHERE date < CURRENT_DATE - INTERVAL '1 year';

DELETE FROM ops_slo_metrics
WHERE date < CURRENT_DATE - INTERVAL '1 year';
```

### Monthly Maintenance

**1. Review SLO Thresholds**

- Analyze if thresholds are too strict or too loose
- Adjust Prometheus alert rules if needed
- Update runbook with new thresholds

**2. Update Cost Baselines**

If organization usage patterns change significantly:

```sql
-- Manually adjust baseline multiplier if needed
-- (Requires code change in cost-anomaly.service.ts)
-- Default: 1.2x (20% increase threshold)
-- Consider: 1.3x (30%) for high-growth orgs
```

**3. Generate Monthly SLO Report**

```bash
# Custom monthly report script
psql $DATABASE_URL -c "
  SELECT
    DATE_TRUNC('month', date) AS month,
    AVG(uptime_percent) AS avg_uptime,
    AVG(avg_latency_ms) AS avg_latency,
    AVG(error_rate_percent) AS avg_error_rate,
    COUNT(*) FILTER (WHERE status = 'healthy') AS healthy_days,
    COUNT(*) FILTER (WHERE status = 'degraded') AS degraded_days,
    COUNT(*) FILTER (WHERE status = 'critical') AS critical_days
  FROM ops_slo_metrics
  WHERE date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
    AND date < DATE_TRUNC('month', CURRENT_DATE)
  GROUP BY DATE_TRUNC('month', date);
"
```

---

## Troubleshooting Guide

### Problem: slo_monitor.sh Fails to Run

**Symptoms:**
- No daily report generated
- Missing row in ops_slo_metrics table
- Cron log shows error

**Diagnosis:**
```bash
# Check cron logs
grep "slo_monitor" /var/log/syslog | tail -20

# Run script manually to see error
cd /path/to/pravado-platform/ops
./slo_monitor.sh
```

**Common Causes & Solutions:**

1. **Missing environment variables:**
   ```bash
   # Add to crontab
   0 0 * * * export SUPABASE_URL=<url> && export SUPABASE_SERVICE_ROLE_KEY=<key> && /path/to/slo_monitor.sh
   ```

2. **Prometheus /metrics endpoint unreachable:**
   ```bash
   # Test connectivity
   curl -v http://localhost:3001/metrics

   # Fix: Ensure API is running and accessible
   kubectl get pods -l app=pravado-api
   ```

3. **Invalid Supabase credentials:**
   ```bash
   # Test Supabase connection
   curl -s "$SUPABASE_URL/rest/v1/ops_slo_metrics" \
     -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" | jq '.'
   ```

4. **Script permissions:**
   ```bash
   chmod +x /path/to/ops/slo_monitor.sh
   ```

---

### Problem: Weekly Report Not Generated

**Symptoms:**
- No weekly_<date>.md file in ops/reports
- Cron job shows error

**Diagnosis:**
```bash
# Check cron logs
grep "weekly-ops-report" /var/log/syslog | tail -20

# Run job manually
node /path/to/dist/jobs/weekly-ops-report.cron.js
```

**Common Causes & Solutions:**

1. **Insufficient SLO data:**
   ```sql
   -- Check if at least 7 days of data exist
   SELECT COUNT(*) FROM ops_slo_metrics
   WHERE date >= CURRENT_DATE - INTERVAL '7 days';
   ```
   **Solution:** Wait for slo_monitor.sh to collect more data

2. **Missing reports directory:**
   ```bash
   mkdir -p /path/to/ops/reports
   chmod 755 /path/to/ops/reports
   ```

3. **TypeScript compilation error:**
   ```bash
   cd /path/to/pravado-platform/apps/api
   pnpm run build
   ```

---

### Problem: Cost Anomalies Not Detected

**Symptoms:**
- /admin/ops-history returns empty anomalies array
- Known cost spikes not flagged

**Diagnosis:**
```bash
# Check if ledger data exists
psql $DATABASE_URL -c "
  SELECT
    DATE(created_at) AS date,
    SUM(estimated_cost_usd) AS daily_cost
  FROM ai_usage_ledger
  WHERE created_at >= CURRENT_DATE - INTERVAL '14 days'
  GROUP BY DATE(created_at)
  ORDER BY date DESC;
"

# Manually trigger detection
curl -s https://api.pravado.com/api/v1/admin/ops-history?days=7 \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.anomalies'
```

**Common Causes & Solutions:**

1. **Insufficient baseline data:**
   - Need at least 7 days of historical data
   - **Solution:** Wait for data accumulation

2. **Threshold too high:**
   - Current: 20% increase required
   - **Solution:** Adjust DAILY_INCREASE_PERCENT in cost-anomaly.service.ts

3. **Cost increase exactly 20%:**
   - Algorithm uses `>` not `>=`
   - **Solution:** Change comparison operator if needed

---

### Problem: Prometheus Alerts Not Firing

**Symptoms:**
- SLO violations not triggering alerts
- Alertmanager shows no firing alerts

**Diagnosis:**
```bash
# Check if Prometheus is scraping metrics
curl -s http://prometheus:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job == "pravado-api")'

# Verify alert rules loaded
curl -s http://prometheus:9090/api/v1/rules | jq '.data.groups[] | select(.name == "slo_compliance")'

# Check alert state
curl -s http://prometheus:9090/api/v1/alerts | jq '.data.alerts[] | select(.labels.component == "slo")'
```

**Common Causes & Solutions:**

1. **Alert rules not loaded:**
   ```bash
   # Reload Prometheus config
   curl -X POST http://prometheus:9090/-/reload

   # Or restart Prometheus
   kubectl rollout restart deployment/prometheus
   ```

2. **Metrics not exported:**
   ```bash
   # Check if metrics exist
   curl -s http://localhost:3001/metrics | grep "http_requests_total"
   ```

3. **Alert for clause not met:**
   - Alerts require sustained violations (1-5 minutes)
   - **Check:** Wait for for duration, then verify

4. **Alertmanager routing issue:**
   ```bash
   # Check Alertmanager config
   kubectl exec -it prometheus-alertmanager-0 -- cat /etc/alertmanager/alertmanager.yml
   ```

---

## Escalation Procedures

### Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| **P0 - Critical** | Complete outage, uptime <99% | 5 minutes | Immediate to on-call + engineering lead |
| **P1 - High** | Degraded performance, SLO violations | 15 minutes | On-call engineer |
| **P2 - Medium** | Warning alerts, approaching thresholds | 1 hour | DevOps team |
| **P3 - Low** | Informational, no user impact | Next business day | DevOps team |

### Escalation Path

```
1. On-Call DevOps Engineer (Slack: #ops-on-call)
   ↓ (if unresolved in 30 minutes)
2. Engineering Lead (Slack: @engineering-lead)
   ↓ (if unresolved in 1 hour)
3. CTO (Email: cto@pravado.io, Phone: XXX-XXX-XXXX)
```

### When to Escalate

**Immediate Escalation (P0):**
- Uptime drops below 99%
- Error rate exceeds 5%
- Complete LLM provider outage
- Data loss or corruption
- Security incident

**Standard Escalation (P1):**
- Uptime below 99.9% for >10 minutes
- Latency >3000ms sustained
- Error rate >1% sustained
- LLM failure rate >25%
- Cost anomaly exceeds 100% increase

**Inform Only (P2/P3):**
- Single SLO violation resolved quickly
- Cost anomaly with identified cause
- Planned maintenance impact

### Communication Templates

**P0 Incident:**
```
URGENT: P0 Incident - Pravado Platform Outage

Status: OUTAGE
Detected: <timestamp>
Impact: <description>
Affected Users: <estimate>

Actions Taken:
- <action 1>
- <action 2>

Next Steps:
- <step 1>
- <step 2>

ETA to Resolution: <estimate>

Incident Commander: <name>
```

**SLO Violation:**
```
SLO Violation Alert: <metric name>

Metric: <metric>
Current Value: <value>
Threshold: <threshold>
Duration: <duration>

Investigation: <summary>
Root Cause: <if identified>
Remediation: <actions taken>

Status: <investigating/identified/resolved>
```

---

## Appendix

### Useful Queries

**SLO Compliance Rate (Last 30 Days):**
```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'healthy') * 100.0 / COUNT(*) AS healthy_percent,
  COUNT(*) FILTER (WHERE status = 'degraded') * 100.0 / COUNT(*) AS degraded_percent,
  COUNT(*) FILTER (WHERE status = 'critical') * 100.0 / COUNT(*) AS critical_percent
FROM ops_slo_metrics
WHERE date >= CURRENT_DATE - INTERVAL '30 days';
```

**Top 10 Orgs by Cost:**
```sql
SELECT
  organization_id,
  SUM(estimated_cost_usd) AS total_cost,
  COUNT(*) AS request_count
FROM ai_usage_ledger
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY organization_id
ORDER BY total_cost DESC
LIMIT 10;
```

**Latency Percentiles:**
```sql
SELECT
  date,
  avg_latency_ms,
  MAX(avg_latency_ms) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS p99_7day
FROM ops_slo_metrics
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;
```

### Contact Information

| Role | Contact | Availability |
|------|---------|--------------|
| **On-Call Engineer** | Slack: #ops-on-call | 24/7 |
| **DevOps Team** | ops@pravado.io | Business hours |
| **Engineering Lead** | Slack: @engineering-lead | 24/7 (emergency) |
| **CTO** | cto@pravado.io | Escalations only |

### Related Documentation

- [S83_FINAL_REPORT.md](./S83_FINAL_REPORT.md) - Sprint 83 implementation details
- [DEV_LLMBestPractices.md](./DEV_LLMBestPractices.md) - LLM Router best practices
- [LLM_ROUTER_METRICS_IMPLEMENTATION.md](./LLM_ROUTER_METRICS_IMPLEMENTATION.md) - Metrics implementation guide
- Prometheus Documentation: https://prometheus.io/docs/
- Supabase Documentation: https://supabase.com/docs

---

**Document History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-11 | DevOps Team | Initial release for Sprint 83 |

**End of Runbook**
