# Production Deployment Manifest

**Platform:** Pravado
**Version:** 1.0.0
**Configuration Version:** 1.0.0
**Last Updated:** 2025-11-17

---

## 📋 Overview

This manifest contains all environment variables, configuration parameters, and deployment instructions required to deploy the Pravado platform to production.

---

## 🔐 Environment Variables

### Core Application

```bash
# Node Environment
NODE_ENV=production
PORT=3001

# Application
APP_NAME="Pravado Platform"
APP_VERSION="1.0.0"
API_URL=https://api.pravado.com
DASHBOARD_URL=https://app.pravado.com
```

### Database (Supabase)

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database Direct Connection
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.your-project.supabase.co:5432/postgres

# Connection Pool Settings
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=2000
```

### AI Services

```bash
# OpenAI
OPENAI_API_KEY=sk-proj-...
OPENAI_ORG_ID=org-...
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_MAX_TOKENS=4096
OPENAI_TEMPERATURE=0.7

# Anthropic (Claude) - Optional
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-opus-20240229
```

### Storage & CDN

```bash
# Supabase Storage
STORAGE_URL=https://your-project.supabase.co/storage/v1
STORAGE_BUCKET=uploads

# File Upload Limits
MAX_FILE_SIZE_MB=50
ALLOWED_FILE_TYPES=image/*,application/pdf,text/*

# CDN Configuration (if using external CDN)
CDN_URL=https://cdn.pravado.com
CDN_ENABLED=true
```

### Authentication & Security

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-min-32-chars
SESSION_MAX_AGE_MS=604800000  # 7 days

# CORS Configuration
CORS_ORIGIN=https://app.pravado.com,https://www.pravado.com
CORS_CREDENTIALS=true

# Security Headers
HELMET_ENABLED=true
CSP_ENABLED=true
```

### Production Flags (System Control)

```bash
# API Access
ENABLE_PUBLIC_API_ACCESS=false

# Moderation
DISABLE_MODERATION_AUTOFLOW=false

# Logging
AUDIT_LOGGING_ENABLED=true
TRACE_LOGGING_ENABLED=false

# Rate Limiting
RATE_LIMIT_TUNING_MODE=false
```

### Rate Limiting

```bash
# API Rate Limits
RATE_LIMIT_API_WINDOW_MS=60000
RATE_LIMIT_API_MAX_REQUESTS=100

# Agent Rate Limits
RATE_LIMIT_AGENT_WINDOW_MS=60000
RATE_LIMIT_AGENT_MAX_REQUESTS=50

# Webhook Rate Limits
RATE_LIMIT_WEBHOOK_WINDOW_MS=60000
RATE_LIMIT_WEBHOOK_MAX_REQUESTS=30

# Export Rate Limits
RATE_LIMIT_EXPORT_WINDOW_MS=3600000
RATE_LIMIT_EXPORT_MAX_REQUESTS=10
```

### Moderation & Abuse Detection

```bash
# Abuse Detection Thresholds
ABUSE_AUTO_BLOCK_THRESHOLD=0.95
ABUSE_REVIEW_THRESHOLD=0.75
ABUSE_RETENTION_DAYS=90

# Moderation Thresholds
MODERATION_AUTO_APPROVE=0.2
MODERATION_AUTO_REJECT=0.8
MODERATION_ESCALATION=0.9

# Moderation Categories
MODERATION_CATEGORIES=harassment,hate_speech,violence,sexual,spam,self_harm
```

### Webhooks

```bash
# Webhook Configuration
WEBHOOK_MAX_RETRIES=3
WEBHOOK_RETRY_DELAYS=1000,5000,15000
WEBHOOK_TIMEOUT_MS=10000
WEBHOOK_SUCCESS_CODES=200,201,202,204

# Webhook Endpoints (configure per tenant)
WEBHOOK_ENDPOINT_URL=https://your-app.com/webhooks/pravado
WEBHOOK_SECRET=whsec_...
```

### Monitoring & Observability

```bash
# Sentry (Error Tracking)
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1

# LogDNA / DataDog / NewRelic (optional)
LOG_LEVEL=info
LOG_FORMAT=json

# Health Check Configuration
HEALTH_CHECK_INTERVAL_MS=30000
HEALTH_CHECK_TIMEOUT_MS=5000
```

### Redis (Optional - for caching/sessions)

```bash
# Redis Configuration
REDIS_URL=redis://default:password@redis.pravado.com:6379
REDIS_TLS_ENABLED=true
REDIS_MAX_RETRIES=3
REDIS_CONNECT_TIMEOUT_MS=5000

# Cache Configuration
CACHE_TTL_SECONDS=3600
CACHE_ENABLED=true
```

### Email & Notifications

```bash
# SendGrid / AWS SES / Postmark
EMAIL_PROVIDER=sendgrid
EMAIL_API_KEY=SG....
EMAIL_FROM_ADDRESS=noreply@pravado.com
EMAIL_FROM_NAME="Pravado Platform"

# Email Templates
EMAIL_TEMPLATES_DIR=./templates/email
```

### Background Jobs (Optional)

```bash
# Bull Queue / Agenda / BeeQueue
QUEUE_ENABLED=true
QUEUE_REDIS_URL=redis://default:password@redis.pravado.com:6379

# Job Configuration
JOB_CONCURRENCY=5
JOB_MAX_ATTEMPTS=3
JOB_BACKOFF_MS=5000
```

---

## 🏗️ Infrastructure Configuration

### Cloudflare Pages (Frontend)

```yaml
# wrangler.toml or Pages settings
name: pravado-dashboard
production_branch: main
build:
  command: pnpm build
  output_directory: apps/dashboard/dist
  root_directory: /
env:
  NODE_VERSION: 18
  REACT_APP_API_URL: https://api.pravado.com
  REACT_APP_SUPABASE_URL: https://your-project.supabase.co
  REACT_APP_SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
routes:
  - include: /*
    exclude:
      - /api/*
```

### API Deployment (Node.js)

**Recommended Platforms:**
- Vercel
- Railway
- Render
- AWS ECS/Fargate
- Google Cloud Run
- Fly.io

**Runtime Requirements:**
```yaml
Runtime: Node.js 18.x or higher
Memory: 512MB minimum, 1GB recommended
CPU: 1 vCPU minimum
Disk: 1GB minimum
Healthcheck: GET /api/system/health
Readiness: GET /api/system/readiness
```

### Supabase Configuration

**Database Settings:**
```yaml
PostgreSQL Version: 15.x
Connection Pooler: Enabled (Transaction mode)
RLS: Enabled on all tables
Backups: Daily automated backups
Point-in-time recovery: Enabled
```

**Storage Settings:**
```yaml
Buckets:
  - uploads (public)
  - private-documents (private)
File size limit: 50MB
Allowed types: images, PDFs, documents
```

**Authentication:**
```yaml
Providers:
  - Email/Password
  - Google OAuth
  - GitHub OAuth (optional)
Session duration: 7 days
Refresh token expiry: 30 days
```

---

## 📦 Deployment Steps

### 1. Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations tested
- [ ] Supabase project created and configured
- [ ] OpenAI API key obtained and tested
- [ ] Storage buckets created
- [ ] Domain names registered
- [ ] SSL certificates provisioned
- [ ] CORS origins configured
- [ ] Webhook endpoints configured
- [ ] Email service configured
- [ ] Error tracking (Sentry) configured

### 2. Database Setup

```bash
# 1. Set DATABASE_URL environment variable
export DATABASE_URL=postgresql://postgres:[PASSWORD]@db.your-project.supabase.co:5432/postgres

# 2. Apply all migrations
cd apps/api
psql $DATABASE_URL < supabase/migrations/*.sql

# 3. Verify migrations
node scripts/verify-migrations.js

# 4. Run configuration sync
node scripts/sync-production-config.js

# 5. Bootstrap runtime
node scripts/bootstrap-runtime.ts
```

### 3. API Deployment

```bash
# 1. Build the API
cd apps/api
pnpm install --prod
pnpm build

# 2. Set environment variables on hosting platform

# 3. Deploy
# (Platform-specific deployment command)

# 4. Verify health
curl https://api.pravado.com/api/system/health
curl https://api.pravado.com/api/system/readiness

# 5. Check production readiness
curl https://api.pravado.com/api/system/production-readiness
```

### 4. Frontend Deployment

```bash
# 1. Build the dashboard
cd apps/dashboard
pnpm install --prod
pnpm build

# 2. Deploy to Cloudflare Pages
# (Automatic via Git integration or manual upload)

# 3. Verify deployment
curl https://app.pravado.com
```

### 5. Post-Deployment Verification

```bash
# 1. System health check
curl https://api.pravado.com/api/system/health | jq

# 2. System status
curl https://api.pravado.com/api/system/status | jq

# 3. Configuration sync status
curl https://api.pravado.com/api/system/config-sync | jq

# 4. Production readiness report
curl https://api.pravado.com/api/system/production-readiness | jq

# 5. Test admin login
# Navigate to https://app.pravado.com and log in

# 6. Test API endpoints
curl -H "Authorization: Bearer <token>" \
  https://api.pravado.com/api/admin-access/roles | jq
```

---

## 🔄 Continuous Deployment

### GitHub Actions Workflow

```yaml
name: Production Deployment

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  deploy-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: pnpm install
      - run: pnpm build
      - run: pnpm test
      - name: Deploy to production
        # Platform-specific deployment step

  deploy-dashboard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: pnpm install
      - run: pnpm build
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: pravado-dashboard
          directory: apps/dashboard/dist
```

---

## 🚨 Emergency Procedures

### Rollback

See `EMERGENCY_PROTOCOLS.md` for detailed rollback procedures.

**Quick Rollback:**
```bash
# 1. Enable system lockdown
curl -X POST https://api.pravado.com/api/system/lockdown \
  -H "Authorization: Bearer <token>" \
  -d '{"reason":"Emergency rollback","actorId":"admin"}'

# 2. Rollback to previous version
git checkout v0.9.0
# ... redeploy previous version

# 3. Disable lockdown
curl -X POST https://api.pravado.com/api/system/unlock \
  -H "Authorization: Bearer <token>" \
  -d '{"actorId":"admin"}'
```

### System Lockdown

```bash
# Enable lockdown
curl -X POST https://api.pravado.com/api/system/lockdown \
  -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Emergency maintenance",
    "actorId": "admin-user-id",
    "actorEmail": "admin@pravado.com",
    "affectedSystems": ["api", "webhooks", "agents", "conversations"]
  }'

# Disable lockdown
curl -X POST https://api.pravado.com/api/system/unlock \
  -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "actorId": "admin-user-id",
    "actorEmail": "admin@pravado.com"
  }'
```

---

## 📊 Monitoring & Alerts

### Health Monitoring

Configure uptime monitoring (StatusCake, Pingdom, UptimeRobot):

- **Endpoint:** `GET https://api.pravado.com/api/system/health`
- **Interval:** 60 seconds
- **Timeout:** 10 seconds
- **Expected Status:** 200
- **Alert Threshold:** 2 consecutive failures

### Error Tracking

Configure Sentry alerts:

- **Error Rate Threshold:** > 10 errors/minute
- **Response Time Threshold:** > 2 seconds (95th percentile)
- **4xx Rate Threshold:** > 5% of requests
- **5xx Rate Threshold:** > 1% of requests

### Database Monitoring

Monitor via Supabase Dashboard:

- **Connection Pool Usage:** < 80%
- **Query Duration:** < 200ms (95th percentile)
- **Slow Queries:** Alert on queries > 1 second
- **Database Size:** Alert at 80% capacity

---

## 📝 Configuration Versions

| Component | Version | Config File |
|-----------|---------|-------------|
| Platform | 1.0.0 | package.json |
| Configuration | 1.0.0 | .config-sync.json |
| Database Schema | 20251117 | Latest migration |
| Production Flags | 1.0.0 | productionFlags.ts |
| Admin Roles | 1.0.0 | DEFAULT_ROLE_PERMISSIONS |
| Abuse Detection | 1.0.0 | ABUSE_DETECTION_CONFIG |
| Rate Limits | 1.0.0 | RATE_LIMIT_CONFIG |
| Moderation | 1.0.0 | MODERATION_THRESHOLDS |

---

## ✅ Deployment Verification

After deployment, verify all systems are operational:

- [ ] Health check returns status: "healthy"
- [ ] Readiness check returns ready: true
- [ ] Database connection successful
- [ ] OpenAI API accessible
- [ ] Storage accessible
- [ ] Admin login functional
- [ ] API authentication working
- [ ] All 5 admin roles exist
- [ ] All 26 permissions exist
- [ ] Audit logging active
- [ ] Moderation queue accessible
- [ ] Rate limiting active
- [ ] Production flags set correctly
- [ ] Configuration sync shows no drift
- [ ] Production readiness report shows 100%

---

## 🆘 Support & Troubleshooting

### Common Issues

**Issue:** Database connection fails
```bash
# Check DATABASE_URL format
echo $DATABASE_URL

# Test direct connection
psql $DATABASE_URL -c "SELECT version();"

# Check Supabase dashboard for outages
```

**Issue:** OpenAI API errors
```bash
# Verify API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check quota limits in OpenAI dashboard
```

**Issue:** 503 Service Unavailable
```bash
# Check if system is in lockdown
curl https://api.pravado.com/api/system/status

# If locked, unlock:
curl -X POST https://api.pravado.com/api/system/unlock \
  -H "Authorization: Bearer <token>" \
  -d '{"actorId":"admin"}'
```

### Contact

- **Emergency:** See EMERGENCY_PROTOCOLS.md
- **Documentation:** See docs/ directory
- **Issues:** GitHub Issues

---

**Last Updated:** 2025-11-17
**Next Review:** 2026-02-17 (Quarterly)
