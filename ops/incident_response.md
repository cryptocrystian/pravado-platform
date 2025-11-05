# Pravado Platform - Incident Response Runbook

**Sprint 76 - Track D: Observability & SLOs**

This runbook provides step-by-step procedures for responding to production incidents in the Pravado platform.

## Table of Contents

1. [General Incident Response Process](#general-incident-response-process)
2. [API Performance Incidents](#api-performance-incidents)
3. [Error Rate Incidents](#error-rate-incidents)
4. [Cache Performance Incidents](#cache-performance-incidents)
5. [Database Incidents](#database-incidents)
6. [LLM Provider Incidents](#llm-provider-incidents)
7. [Mobile Push Notification Incidents](#mobile-push-notification-incidents)
8. [Infrastructure Incidents](#infrastructure-incidents)
9. [Escalation Procedures](#escalation-procedures)

---

## General Incident Response Process

### Incident Severity Levels

| Severity | Description | Response Time | Example |
|----------|-------------|---------------|---------|
| **Critical** | Service down or severely degraded | < 15 minutes | API down, database unreachable |
| **Warning** | Performance degraded but functional | < 1 hour | High latency, elevated error rate |
| **Info** | Operational issue, no user impact | < 4 hours | Cache miss ratio elevated |

### Standard Response Workflow

1. **Acknowledge** the alert in PagerDuty/Slack
2. **Assess** the impact and severity
3. **Communicate** to stakeholders (#engineering, #incidents Slack channels)
4. **Investigate** using logs, metrics, and traces
5. **Mitigate** the immediate issue (even if temporary)
6. **Resolve** the root cause
7. **Document** in incident report (Google Doc or Confluence)
8. **Post-mortem** within 48 hours for critical incidents

### Key Tools and Access

- **Metrics**: Prometheus (https://prometheus.pravado.com)
- **Logs**: Sentry (https://sentry.io/pravado)
- **Tracing**: Datadog APM (if configured)
- **Database**: Supabase Dashboard (https://app.supabase.com)
- **Stripe**: Stripe Dashboard (https://dashboard.stripe.com)
- **Cloudflare**: Cloudflare Dashboard (for dashboard deployments)
- **Slack**: #incidents, #engineering, #product channels

---

## API Performance Incidents

### High API Latency (p95 > 500ms)

**Alert**: `HighAPILatency`

**Symptoms**:
- Slow page loads for users
- Increased timeout errors
- Dashboard feels sluggish

**Investigation Steps**:

1. **Check current p95 latency**:
   ```promql
   histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="pravado-api"}[5m]))
   ```

2. **Identify slow endpoints**:
   ```promql
   topk(10, histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="pravado-api"}[5m])) by (route))
   ```

3. **Check database query performance**:
   ```promql
   histogram_quantile(0.95, rate(db_query_duration_seconds_bucket{job="pravado-api"}[5m])) by (query_type)
   ```

4. **Review Sentry for slow transaction traces**

**Common Causes & Fixes**:

| Cause | Fix |
|-------|-----|
| Slow database queries | Add indexes, optimize queries, review query plans |
| N+1 query problem | Implement batching or eager loading |
| External API slowness (OpenAI, Anthropic) | Implement timeouts, use async processing |
| High traffic spike | Scale up API instances horizontally |
| Memory leak | Restart API instances, investigate and fix leak |

**Immediate Mitigation**:

```bash
# Scale up API instances (if using Kubernetes/Docker Swarm)
kubectl scale deployment pravado-api --replicas=5

# Or restart API instances to clear potential memory leaks
pm2 restart pravado-api
```

---

### Critical API Latency (p95 > 2s)

**Alert**: `CriticalAPILatency`

**Symptoms**:
- Severe user experience degradation
- High timeout rate
- Customer complaints

**Immediate Actions**:

1. **Page on-call engineer** (automatic via PagerDuty)
2. **Post in #incidents Slack channel**:
   ```
   🚨 CRITICAL: API latency is extremely high (p95 > 2s)
   Impact: All users experiencing slow response times
   Investigating...
   ```

3. **Check if database is down or overloaded**:
   ```bash
   # Check Supabase dashboard for connection errors
   # Or test direct connection:
   psql $DATABASE_URL -c "SELECT NOW();"
   ```

4. **Implement circuit breaker** if external service is slow:
   - Temporarily disable non-critical LLM calls
   - Serve cached data where possible

5. **Scale aggressively**:
   ```bash
   kubectl scale deployment pravado-api --replicas=10
   ```

**If no improvement within 5 minutes**:
- Enable maintenance mode
- Route traffic to fallback page
- Escalate to CTO/VP Engineering

---

### Slow Database Queries

**Alert**: `SlowDatabaseQueries`

**Investigation**:

1. **Identify slow queries** in Supabase Dashboard → Performance
2. **Check for missing indexes**:
   ```sql
   SELECT schemaname, tablename, indexname
   FROM pg_indexes
   WHERE schemaname = 'public'
   ORDER BY tablename, indexname;
   ```

3. **Review query plans**:
   ```sql
   EXPLAIN ANALYZE SELECT * FROM organizations WHERE created_at > NOW() - INTERVAL '7 days';
   ```

**Common Fixes**:

```sql
-- Add missing indexes for frequently queried columns
CREATE INDEX idx_organizations_created_at ON organizations(created_at);
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);

-- Add composite indexes for common filters
CREATE INDEX idx_trials_org_status ON trial_lifecycle(organization_id, status);
CREATE INDEX idx_llm_logs_org_created ON llm_request_logs(organization_id, created_at DESC);
```

---

## Error Rate Incidents

### High API Error Rate (> 5%)

**Alert**: `HighAPIErrorRate`

**Investigation**:

1. **Check error breakdown by status code**:
   ```promql
   sum(rate(http_requests_total{job="pravado-api",status=~"5.."}[5m])) by (status, route)
   ```

2. **Review recent errors in Sentry** (https://sentry.io/pravado)

3. **Check error types**:
   - 500: Internal server errors (code bugs)
   - 502: Gateway errors (API crashed or unresponsive)
   - 503: Service unavailable (dependencies down)
   - 504: Gateway timeout (slow responses)

**Common Causes**:

| Status Code | Cause | Fix |
|-------------|-------|-----|
| 500 | Unhandled exception in code | Fix bug, deploy hotfix |
| 502 | API process crashed | Restart API, check logs for crash reason |
| 503 | Database or Redis down | Check Supabase/Redis health |
| 504 | Slow downstream service | Implement timeouts, use circuit breaker |

**Immediate Mitigation**:

1. **Restart affected API instances**:
   ```bash
   pm2 restart pravado-api
   ```

2. **Rollback recent deployment** if errors started after deploy:
   ```bash
   git revert HEAD
   pnpm build
   pm2 reload pravado-api
   ```

3. **Enable circuit breaker** for failing dependencies

---

### Critical API Error Rate (> 20%)

**Alert**: `CriticalAPIErrorRate`

**Immediate Actions**:

1. **Assume service is down** - treat as critical outage
2. **Post in #incidents**:
   ```
   🔴 OUTAGE: API error rate at {{ value }}%
   Impact: Most users cannot use the service
   Actions: Investigating and rolling back
   ```

3. **Rollback immediately** to last known good version:
   ```bash
   git checkout <last-good-commit>
   pnpm build
   pm2 reload pravado-api
   ```

4. **Check database connectivity**:
   ```bash
   psql $DATABASE_URL -c "SELECT 1;"
   ```

5. **If still failing**, enable maintenance mode:
   - Deploy static maintenance page to Cloudflare
   - Display ETA for resolution

---

### Database Connection Errors

**Alert**: `DatabaseConnectionErrors`

**Symptoms**:
- API returns 503 errors
- "Cannot connect to database" errors in logs

**Immediate Actions**:

1. **Check Supabase status**: https://status.supabase.com
2. **Test database connectivity**:
   ```bash
   psql $DATABASE_URL -c "SELECT NOW();"
   ```

3. **Check connection pool exhaustion**:
   ```promql
   db_connections_active / db_connections_max
   ```

**Fixes**:

If **connection pool exhausted**:
```javascript
// Increase max connections in apps/api/src/config/database.ts
const pool = new Pool({
  max: 50,  // Increase from 20 to 50
  connectionTimeoutMillis: 5000,
});
```

If **Supabase is down**:
- Contact Supabase support immediately
- Enable maintenance mode
- Consider failover to backup database (if configured)

---

## Cache Performance Incidents

### High Cache Miss Ratio (> 50%)

**Alert**: `HighCacheMissRatio`

**Impact**: Increased database load, slower response times

**Investigation**:

1. **Check cache miss ratio**:
   ```promql
   sum(rate(cache_misses_total{job="pravado-api"}[5m])) /
   sum(rate(cache_requests_total{job="pravado-api"}[5m]))
   ```

2. **Identify which cache keys are missing**:
   ```bash
   # Check Redis keys
   redis-cli --url $REDIS_URL KEYS "*"
   ```

3. **Check cache TTL configuration**:
   ```javascript
   // Review cache expiration times in code
   redis.set(key, value, 'EX', 3600);  // 1 hour
   ```

**Common Causes**:

- Redis restarted (all keys lost)
- Cache TTL too short
- Cache keys invalidated too aggressively
- New deployment cleared cache

**Fixes**:

1. **Warm up cache** for critical data:
   ```bash
   curl -X POST https://api.pravado.com/internal/cache/warmup
   ```

2. **Increase cache TTL** for stable data:
   ```javascript
   // Increase TTL for plan policies (changes rarely)
   await cachePlanPolicies(plans, 86400);  // 24 hours instead of 1 hour
   ```

3. **Add Redis persistence** to survive restarts:
   ```bash
   # In Redis config
   save 900 1      # Save after 900 seconds if 1 key changed
   save 300 10     # Save after 300 seconds if 10 keys changed
   ```

---

### Redis Connection Failure

**Alert**: `RedisConnectionFailure`

**Immediate Actions**:

1. **Check Redis status**:
   ```bash
   redis-cli --url $REDIS_URL PING
   ```

2. **If using Upstash**, check https://console.upstash.com

3. **Restart Redis** (if self-hosted):
   ```bash
   sudo systemctl restart redis
   ```

4. **Failover to in-memory cache** (temporary):
   ```javascript
   // In apps/api/src/services/cache.service.ts
   const USE_REDIS = process.env.REDIS_URL && redisClient.isReady;
   if (!USE_REDIS) {
     // Fallback to in-memory Map
     cache = new Map();
   }
   ```

**If Redis cannot be recovered within 15 minutes**:
- Deploy code changes to use in-memory caching
- Accept higher database load temporarily
- Provision new Redis instance

---

### Redis High Memory Usage (> 90%)

**Alert**: `RedisHighMemoryUsage`

**Actions**:

1. **Check memory usage**:
   ```bash
   redis-cli --url $REDIS_URL INFO memory
   ```

2. **Identify large keys**:
   ```bash
   redis-cli --url $REDIS_URL --bigkeys
   ```

3. **Clear expired keys manually**:
   ```bash
   redis-cli --url $REDIS_URL --scan --pattern "*" | xargs redis-cli --url $REDIS_URL DEL
   ```

4. **Scale up Redis instance** (Upstash or self-hosted)

5. **Implement cache eviction policy**:
   ```bash
   redis-cli CONFIG SET maxmemory-policy allkeys-lru
   ```

---

## Database Incidents

### Supabase Down

**Alert**: `SupabaseDown`

**Immediate Actions**:

1. **Check Supabase status page**: https://status.supabase.com
2. **Test connection**:
   ```bash
   psql $DATABASE_URL -c "SELECT 1;"
   ```

3. **Contact Supabase support**:
   - Email: support@supabase.com
   - Dashboard support chat
   - Twitter: @supabase (for status updates)

4. **Enable maintenance mode** immediately:
   ```
   🔴 OUTAGE: Database is unreachable
   All users affected
   ETA: Waiting for Supabase to restore service
   ```

5. **Monitor Supabase status page** for updates

**Recovery**:
- Once database is back, verify data integrity
- Test critical user flows (login, dashboard, subscriptions)
- Gradually allow traffic back

---

### High Database Connections (> 80% of max)

**Alert**: `HighDatabaseConnections`

**Actions**:

1. **Check current connections**:
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   ```

2. **Identify long-running queries**:
   ```sql
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query
   FROM pg_stat_activity
   WHERE state = 'active'
   ORDER BY duration DESC;
   ```

3. **Kill long-running queries** (if necessary):
   ```sql
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE pid = <problem_pid>;
   ```

4. **Increase connection pool size** in API:
   ```javascript
   max: 100  // Increase from 50 to 100
   ```

5. **Scale up database** if needed (Supabase dashboard)

---

## LLM Provider Incidents

### LLM Provider Down

**Alert**: `LLMProviderDown`

**Investigation**:

1. **Check provider status**:
   - OpenAI: https://status.openai.com
   - Anthropic: https://status.anthropic.com

2. **Test API connectivity**:
   ```bash
   curl -X POST https://api.openai.com/v1/chat/completions \
     -H "Authorization: Bearer $OPENAI_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model": "gpt-4", "messages": [{"role": "user", "content": "test"}]}'
   ```

**Mitigation**:

1. **Failover to alternate provider**:
   ```bash
   # Set environment variable to force Anthropic
   export LLM_ROUTING_STRATEGY="forcedProvider:anthropic"
   pm2 restart pravado-api
   ```

2. **Update routing configuration** in `apps/api/src/services/llm.service.ts`:
   ```javascript
   const provider = isOpenAIDown ? 'anthropic' : 'openai';
   ```

3. **Notify users** of degraded AI features (if both providers down)

---

### High LLM Costs (> $50/hour)

**Alert**: `HighLLMCost`

**Investigation**:

1. **Check cost breakdown**:
   ```promql
   sum(rate(llm_cost_usd_total[1h])) by (provider, model, organization_id)
   ```

2. **Identify high-usage organizations**:
   ```sql
   SELECT organization_id, SUM(cost_usd) as total_cost
   FROM llm_request_logs
   WHERE created_at > NOW() - INTERVAL '1 hour'
   GROUP BY organization_id
   ORDER BY total_cost DESC
   LIMIT 10;
   ```

**Actions**:

1. **Implement cost circuit breaker**:
   ```javascript
   if (hourlyLLMCost > 50) {
     // Switch to cheaper models
     const model = 'gpt-3.5-turbo';  // Instead of gpt-4
   }
   ```

2. **Throttle high-usage organizations**:
   ```javascript
   if (orgDailyCost > ORG_DAILY_LIMIT) {
     throw new Error('Daily LLM budget exceeded');
   }
   ```

3. **Review and optimize prompts** to reduce token usage

---

### LLM Rate Limit Exceeded

**Alert**: `LLMRateLimitExceeded`

**Mitigation**:

1. **Implement exponential backoff**:
   ```javascript
   async function callLLMWithRetry(prompt, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await llm.complete(prompt);
       } catch (error) {
         if (error.status === 429) {
           await sleep(Math.pow(2, i) * 1000);  // 1s, 2s, 4s
           continue;
         }
         throw error;
       }
     }
   }
   ```

2. **Switch to alternate provider**:
   ```javascript
   if (openaiRateLimited) {
     return await anthropic.complete(prompt);
   }
   ```

3. **Implement request queue** to smooth traffic

---

## Mobile Push Notification Incidents

### Push Notification Failures (> 20%)

**Alert**: `HighPushNotificationFailureRate`

**Investigation**:

1. **Check failure reasons**:
   ```promql
   sum(rate(push_notification_failures_total[5m])) by (error_type)
   ```

2. **Common error types**:
   - `DeviceNotRegistered`: Token is invalid or expired
   - `MessageTooBig`: Notification payload > 4KB
   - `MessageRateExceeded`: Too many notifications sent
   - `InvalidCredentials`: EXPO_ACCESS_TOKEN is wrong

**Fixes**:

```javascript
// Remove invalid tokens
if (error.type === 'DeviceNotRegistered') {
  await removePushToken(token);
}

// Reduce notification payload size
const notification = {
  title: 'Incident Alert',
  body: 'Critical issue detected',
  data: { screen: 'OpHealth', id: incidentId }  // Keep minimal
};
```

---

### Expo Push Service Down

**Alert**: `ExpoPushServiceDown`

**Actions**:

1. **Check Expo status**: https://status.expo.dev
2. **Verify EXPO_ACCESS_TOKEN** is valid
3. **Queue notifications** for retry when service recovers:
   ```javascript
   if (!expoPushAvailable) {
     await queueNotificationForRetry(notification);
   }
   ```

4. **Notify users via email** as fallback

---

## Infrastructure Incidents

### API Down

**Alert**: `APIDown`

**Immediate Actions**:

1. **Page on-call engineer** immediately
2. **Check server status**:
   ```bash
   ssh user@api-server
   pm2 status
   ```

3. **Check logs for crash reason**:
   ```bash
   pm2 logs pravado-api --lines 100
   ```

4. **Restart API**:
   ```bash
   pm2 restart pravado-api
   ```

5. **If restart fails**, check:
   - Disk space: `df -h`
   - Memory: `free -m`
   - CPU: `top`

6. **Deploy to new instance** if hardware failure suspected

---

### Dashboard Down

**Alert**: `DashboardDown`

**Actions**:

1. **Check Cloudflare Pages status**
2. **Verify deployment succeeded**:
   ```bash
   curl -I https://dashboard.pravado.com
   ```

3. **Rollback deployment** if recent deploy:
   - Go to Cloudflare Pages dashboard
   - Click "Rollback to previous deployment"

4. **Check build logs** for errors

---

### High CPU Usage (> 80%)

**Alert**: `HighCPUUsage`

**Investigation**:

1. **Identify CPU-intensive processes**:
   ```bash
   top -o %CPU
   ```

2. **Check for infinite loops or runaway processes**

3. **Profile Node.js CPU usage**:
   ```bash
   node --prof app.js
   node --prof-process isolate-*.log > processed.txt
   ```

**Mitigation**:

1. **Scale horizontally** (add more instances)
2. **Optimize hot code paths** identified in profiling
3. **Implement caching** for expensive computations

---

### High Memory Usage (> 85%)

**Alert**: `HighMemoryUsage`

**Investigation**:

1. **Check memory usage**:
   ```bash
   ps aux --sort=-%mem | head
   ```

2. **Profile Node.js memory**:
   ```bash
   node --inspect app.js
   # Connect Chrome DevTools to analyze heap
   ```

3. **Check for memory leaks**:
   - Review recent code changes
   - Look for unbounded arrays/objects
   - Check event listener cleanup

**Mitigation**:

1. **Restart affected instances** (temporary fix):
   ```bash
   pm2 restart pravado-api
   ```

2. **Increase memory allocation** (if needed):
   ```bash
   node --max-old-space-size=4096 app.js  # 4GB
   ```

3. **Fix memory leak** in code and deploy

---

### Disk Space Critically Low (< 10%)

**Alert**: `DiskSpaceLow`

**Immediate Actions**:

1. **Check disk usage**:
   ```bash
   df -h
   du -sh /* | sort -h
   ```

2. **Clear logs**:
   ```bash
   # Rotate and compress old logs
   pm2 flush
   find /var/log -name "*.log" -mtime +7 -delete
   ```

3. **Clear old Docker images** (if using Docker):
   ```bash
   docker system prune -a -f
   ```

4. **Expand disk size** on cloud provider

---

## Escalation Procedures

### Escalation Matrix

| Severity | Initial Response | Escalate After | Escalate To |
|----------|------------------|----------------|-------------|
| Critical | On-call engineer | 15 minutes | Engineering Lead → CTO |
| Warning | On-call engineer | 1 hour | Engineering Lead |
| Info | Async in Slack | 4 hours | Engineering Lead (if unresolved) |

### Contact Information

**On-Call Engineer**: PagerDuty rotation
**Engineering Lead**: @eng-lead in Slack
**CTO**: @cto in Slack, cto@pravado.com, +1-XXX-XXX-XXXX

### Incident Communication Template

**For #incidents Slack channel**:

```
🚨 [SEVERITY] Brief description

Impact: Who is affected and how
Status: What we know so far
Actions: What we're doing
ETA: Expected resolution time (best guess)

Updates: Will post every 15 minutes
```

**Example**:

```
🚨 CRITICAL: API experiencing high error rates

Impact: All users seeing 500 errors when loading dashboard
Status: Error rate at 45%, started 5 minutes ago after deploy
Actions: Rolling back deployment to v1.2.3
ETA: 5-10 minutes for rollback to complete

Updates: Will post every 5 minutes
```

---

## Post-Incident Actions

After resolving a critical incident:

1. **Write incident report** within 24 hours
2. **Schedule post-mortem** within 48 hours
3. **Create action items** to prevent recurrence
4. **Update runbook** with new learnings
5. **Thank the team** publicly for quick response

**Incident Report Template**: Use internal incident report template in Confluence/Google Docs

---

## Additional Resources

- Prometheus Dashboards: https://prometheus.pravado.com
- Sentry: https://sentry.io/pravado
- Supabase Dashboard: https://app.supabase.com
- Stripe Dashboard: https://dashboard.stripe.com
- Expo Dashboard: https://expo.dev
- #incidents Slack channel
- #engineering Slack channel

---

**Last Updated**: Sprint 76 (generated automatically)
**Maintained By**: Backend Team
**Review Frequency**: After each major incident
