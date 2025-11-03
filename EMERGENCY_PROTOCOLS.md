# Emergency Protocols

**Platform:** Pravado
**Version:** 1.0.0
**Last Updated:** 2025-11-17

---

## 🚨 Emergency Contacts

### On-Call Rotation

| Role | Primary | Backup | Phone | Email |
|------|---------|--------|-------|-------|
| Engineering Lead | TBD | TBD | TBD | TBD |
| DevOps Engineer | TBD | TBD | TBD | TBD |
| Product Manager | TBD | TBD | TBD | TBD |
| Security Officer | TBD | TBD | TBD | TBD |

### External Services

| Service | Support Contact | Phone | Portal |
|---------|----------------|-------|--------|
| Supabase | support@supabase.io | N/A | https://app.supabase.io |
| OpenAI | support@openai.com | N/A | https://platform.openai.com |
| StatusCake | support@statuscake.com | N/A | https://app.statuscake.com |

---

## 🔴 Emergency Lockdown Procedure

### When to Trigger Lockdown

- **Security Breach**: Unauthorized access detected
- **Data Integrity Issue**: Database corruption or inconsistency
- **Performance Degradation**: System unable to handle load
- **Critical Bug**: Production issue affecting all users
- **External Service Outage**: OpenAI or Supabase unavailable

### Lockdown Steps

#### 1. Enable System Lockdown (Immediate)

```bash
curl -X POST http://api.pravado.com/api/system/lockdown \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>" \
  -d '{
    "reason": "Emergency lockdown: [DESCRIBE ISSUE]",
    "actorId": "<YOUR_USER_ID>",
    "actorEmail": "admin@pravado.com",
    "affectedSystems": ["api", "webhooks", "agents", "conversations"]
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "System lockdown enabled",
  "timestamp": "2025-11-17T12:00:00.000Z"
}
```

#### 2. Verify Lockdown Status

```bash
curl http://api.pravado.com/api/system/status \
  -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>"
```

**Expected Response:**
```json
{
  "lockdown": {
    "isLocked": true,
    "reason": "Emergency lockdown: [ISSUE]",
    "lockedBy": "<YOUR_USER_ID>",
    "lockedAt": "2025-11-17T12:00:00.000Z",
    "affectedSystems": ["api", "webhooks", "agents", "conversations"]
  }
}
```

#### 3. Notify Stakeholders

**Email Template:**
```
Subject: [URGENT] Pravado Platform - System Lockdown Active

The Pravado platform is currently in emergency lockdown mode.

Issue: [DESCRIBE ISSUE]
Lockdown Initiated: [TIMESTAMP]
Initiated By: [NAME]
Affected Systems: API, Webhooks, Agents, Conversations

Impact:
- All API requests will return 503 Service Unavailable
- No new conversations can be created
- Webhooks are suspended
- Agent processing is paused

We are actively investigating and will provide updates every 30 minutes.

Next Update: [TIMESTAMP + 30 minutes]

Status Page: https://status.pravado.com
```

#### 4. Investigate and Resolve

- Check system health: `GET /api/system/health`
- Review recent audit logs
- Examine error logs in system_event_logs table
- Identify root cause
- Apply fix or rollback

#### 5. Disable Lockdown

```bash
curl -X POST http://api.pravado.com/api/system/unlock \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>" \
  -d '{
    "actorId": "<YOUR_USER_ID>",
    "actorEmail": "admin@pravado.com",
    "reason": "Issue resolved: [DESCRIBE RESOLUTION]"
  }'
```

#### 6. Post-Lockdown Verification

```bash
# Check system health
curl http://api.pravado.com/api/system/health

# Verify readiness
curl http://api.pravado.com/api/system/readiness

# Test critical endpoints
curl http://api.pravado.com/api/admin-access/roles \
  -H "Authorization: Bearer <TOKEN>"
```

#### 7. Notify Stakeholders (All Clear)

**Email Template:**
```
Subject: [RESOLVED] Pravado Platform - System Lockdown Lifted

The Pravado platform lockdown has been lifted and services are restored.

Resolution: [DESCRIBE WHAT WAS FIXED]
Lockdown Duration: [DURATION]
Services Restored: [TIMESTAMP]

All systems are operational. We will provide a detailed post-mortem within 24 hours.

Thank you for your patience.
```

---

## ⏪ Emergency Rollback Procedure

### When to Rollback

- **Critical Bug Introduced**: New deployment has critical issues
- **Performance Regression**: Significant performance degradation
- **Data Corruption**: Deployment causes data integrity issues
- **Failed Migration**: Database migration failed or corrupted data

### Rollback Decision Matrix

| Severity | Impact | Rollback? | Timeline |
|----------|--------|-----------|----------|
| Critical | All users | **YES** | Immediate (<15 min) |
| High | >50% users | **YES** | <30 min |
| Medium | <50% users | Consider | <1 hour |
| Low | <10% users | Patch forward | Next deploy |

### Rollback Steps

#### 1. Initiate Emergency Lockdown

Follow lockdown procedure above to prevent further damage.

#### 2. Identify Target Version

```bash
# Get current version
curl http://api.pravado.com/api/system/version

# Check git tags for previous stable version
git tag -l "v*" | sort -V | tail -n 5
```

#### 3. Database Rollback (If Required)

**CRITICAL**: Only rollback database if migration caused corruption.

```bash
# Connect to database
psql $DATABASE_URL

# List recent migrations
SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 10;

# Rollback specific migration
# WARNING: This will LOSE DATA from that migration
DROP TABLE [table_created_in_migration];

# Mark migration as not applied
DELETE FROM schema_migrations WHERE version = '[migration_version]';
```

**⚠️ Database rollbacks can cause data loss. Backup first!**

#### 4. Application Rollback

```bash
# Checkout previous stable version
git checkout v0.9.0  # Or whatever the last stable version was

# Install dependencies
pnpm install

# Build application
pnpm build

# Restart services
pm2 restart pravado-api
pm2 restart pravado-dashboard

# Or if using Docker
docker-compose down
docker-compose up -d
```

#### 5. Verify Rollback

```bash
# Check version
curl http://api.pravado.com/api/system/version
# Should show previous version

# Check health
curl http://api.pravado.com/api/system/health
# Should return status: "healthy"

# Test critical flows
# - User login
# - Admin console access
# - API endpoint responses
```

#### 6. Disable Lockdown

Once verified, disable lockdown following steps in lockdown procedure.

#### 7. Post-Rollback Actions

- [ ] Document what went wrong
- [ ] Create incident post-mortem
- [ ] Update deployment checklist
- [ ] Fix issue in development
- [ ] Test fix extensively
- [ ] Schedule new deployment

### Rollback Timeline

| Step | Target Time | Responsible |
|------|-------------|-------------|
| Lockdown initiated | T+0 | On-call engineer |
| Rollback decision | T+5 min | Engineering lead |
| Database rollback (if needed) | T+15 min | DevOps engineer |
| Application rollback | T+30 min | DevOps engineer |
| Verification complete | T+45 min | Engineering lead |
| Lockdown lifted | T+60 min | On-call engineer |
| Stakeholder update | T+90 min | Product manager |

**Total Rollback Window: 1 hour**

---

## 🧊 System Freeze Protocol

### When to Freeze

- **Pre-Major Release**: Before deploying significant changes
- **Peak Traffic Period**: During known high-traffic events
- **Investigation**: When diagnosing complex production issues
- **Compliance Audit**: During security or compliance reviews

### Freeze Types

#### 1. Code Freeze

**Restrictions:**
- No new deployments
- No database migrations
- Emergency fixes only (with approval)

**Duration:** Typically 24-48 hours

**Announcement:**
```
🧊 CODE FREEZE ACTIVE

Start: [DATE] [TIME]
End: [DATE] [TIME]
Reason: [REASON]

No deployments allowed except emergency fixes approved by Engineering Lead.

Contact: [NAME] ([EMAIL])
```

#### 2. Configuration Freeze

**Restrictions:**
- No production flag changes
- No rate limit modifications
- No threshold adjustments

**Duration:** Typically during investigation

**Announcement:**
```
🔒 CONFIGURATION FREEZE ACTIVE

Start: [DATE] [TIME]
End: [DATE] [TIME]
Reason: [REASON]

No configuration changes without approval from [ROLE].

Contact: [NAME] ([EMAIL])
```

#### 3. Feature Freeze

**Restrictions:**
- No new features enabled
- No feature flag changes
- Bug fixes and stability improvements only

**Duration:** Typically pre-launch

**Announcement:**
```
⛔ FEATURE FREEZE ACTIVE

Start: [DATE] [TIME]
End: [DATE] [TIME]
Reason: [REASON]

Only critical bug fixes allowed. All new features paused.

Contact: [NAME] ([EMAIL])
```

### Freeze Management

#### Requesting Exception

1. Create freeze exception request
2. Include business justification
3. Document risk assessment
4. Get approval from freeze owner
5. Document in system_event_logs

#### Lifting Freeze

```bash
# Update freeze status
curl -X POST http://api.pravado.com/api/system/flags/SYSTEM_FREEZE \
  -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>" \
  -d '{
    "value": false,
    "actorId": "<YOUR_USER_ID>",
    "reason": "Freeze period ended successfully"
  }'

# Announce via email/Slack
```

---

## 📊 Incident Response Checklist

### Detection (0-5 minutes)

- [ ] Alert received or issue reported
- [ ] Severity assessed (Critical/High/Medium/Low)
- [ ] On-call engineer notified
- [ ] Incident tracking ticket created

### Investigation (5-15 minutes)

- [ ] System health checked
- [ ] Recent deployments reviewed
- [ ] Error logs examined
- [ ] Scope of impact determined
- [ ] Root cause hypothesis formed

### Containment (15-30 minutes)

- [ ] Lockdown initiated (if critical)
- [ ] Affected users identified
- [ ] Temporary mitigation applied
- [ ] Stakeholders notified

### Resolution (30-60 minutes)

- [ ] Permanent fix applied OR rollback initiated
- [ ] Fix verified in production
- [ ] Lockdown lifted
- [ ] Services restored
- [ ] Stakeholders notified

### Post-Incident (1-24 hours)

- [ ] Detailed timeline documented
- [ ] Post-mortem scheduled
- [ ] Action items created
- [ ] Process improvements identified
- [ ] Documentation updated

---

## 🔧 Emergency Toolbox

### Quick Diagnostic Commands

```bash
# System health
curl http://api.pravado.com/api/system/health | jq

# Recent errors (database)
psql $DATABASE_URL -c "SELECT * FROM system_event_logs WHERE event_type LIKE '%error%' ORDER BY timestamp DESC LIMIT 20;"

# Active sessions
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';"

# Queue depths
psql $DATABASE_URL -c "SELECT status, COUNT(*) FROM moderation_queue GROUP BY status;"

# Recent admin actions
psql $DATABASE_URL -c "SELECT * FROM role_audit_logs ORDER BY timestamp DESC LIMIT 20;"
```

### Emergency Flag Toggles

```bash
# Disable public API access
curl -X PUT http://api.pravado.com/api/system/flags/ENABLE_PUBLIC_API_ACCESS \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"value": false, "actorId": "admin", "reason": "Emergency"}'

# Disable auto-moderation
curl -X PUT http://api.pravado.com/api/system/flags/DISABLE_MODERATION_AUTOFLOW \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"value": true, "actorId": "admin", "reason": "Emergency"}'

# Enable trace logging for debugging
curl -X PUT http://api.pravado.com/api/system/flags/TRACE_LOGGING_ENABLED \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"value": true, "actorId": "admin", "reason": "Emergency investigation"}'
```

---

## 📝 Post-Mortem Template

```markdown
# Incident Post-Mortem

**Date:** [DATE]
**Duration:** [START] - [END]
**Severity:** [Critical/High/Medium/Low]
**Incident Commander:** [NAME]

## Summary

[Brief description of what happened]

## Timeline

| Time | Event |
|------|-------|
| T+0 | [Initial detection] |
| T+5 | [Investigation began] |
| T+15 | [Lockdown initiated] |
| T+30 | [Resolution applied] |
| T+60 | [Services restored] |

## Root Cause

[Detailed explanation of what caused the incident]

## Impact

- **Users Affected:** [NUMBER or PERCENTAGE]
- **Duration:** [TIME]
- **Services Impacted:** [LIST]
- **Data Loss:** [YES/NO - DESCRIBE]

## Resolution

[What was done to fix the issue]

## What Went Well

- [POSITIVE OBSERVATION]

## What Went Poorly

- [AREA FOR IMPROVEMENT]

## Action Items

- [ ] [ACTION 1] - Owner: [NAME] - Due: [DATE]
- [ ] [ACTION 2] - Owner: [NAME] - Due: [DATE]

## Preventive Measures

[How we will prevent this from happening again]
```

---

**Last Updated:** 2025-11-17
**Next Review:** 2026-02-17 (Quarterly)
