# Edge Credentials Checklist

**Platform:** Pravado
**Version:** 1.0.0
**Last Updated:** 2025-11-17

---

## 📋 Overview

This checklist enumerates all secret keys, tokens, and credentials required for production deployment of the Pravado platform. Each credential should be stored securely using environment variables or a secrets management service (e.g., AWS Secrets Manager, HashiCorp Vault, 1Password).

---

## ✅ Required Credentials

### 🔑 Database & Storage

| Credential | Purpose | Where to Obtain | Format | Required |
|------------|---------|-----------------|--------|----------|
| `SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API | `https://xxx.supabase.co` | ✅ Critical |
| `SUPABASE_ANON_KEY` | Public anonymous key for client-side | Supabase Dashboard → Settings → API | `eyJhbGciOi...` (JWT) | ✅ Critical |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side key with admin privileges | Supabase Dashboard → Settings → API | `eyJhbGciOi...` (JWT) | ✅ Critical |
| `DATABASE_URL` | Direct PostgreSQL connection string | Supabase Dashboard → Settings → Database | `postgresql://postgres:...` | ✅ Critical |

**Security Notes:**
- Never commit `SERVICE_ROLE_KEY` to version control
- Rotate keys every 90 days
- Use separate keys for staging and production

---

### 🤖 AI Services

| Credential | Purpose | Where to Obtain | Format | Required |
|------------|---------|-----------------|--------|----------|
| `OPENAI_API_KEY` | OpenAI GPT-4 API access | platform.openai.com → API Keys | `sk-proj-...` or `sk-...` | ✅ Critical |
| `OPENAI_ORG_ID` | OpenAI organization ID | platform.openai.com → Settings | `org-...` | ⚠️  Recommended |
| `ANTHROPIC_API_KEY` | Claude API access (optional) | console.anthropic.com → API Keys | `sk-ant-...` | ⬜ Optional |

**Security Notes:**
- Monitor API usage and set spending limits
- Rotate keys every 90 days
- Enable key usage notifications
- Store in encrypted secrets manager

**Rate Limits:**
- OpenAI GPT-4: Check tier limits (tier 1: 10K TPM, tier 2: 50K TPM)
- Budget alerts recommended

---

### 🔐 Authentication & Security

| Credential | Purpose | Where to Obtain | Format | Required |
|------------|---------|-----------------|--------|----------|
| `JWT_SECRET` | Sign and verify JWT tokens | Generate random 32+ char string | Random string, min 32 chars | ✅ Critical |
| `SESSION_SECRET` | Sign session cookies | Generate random 32+ char string | Random string, min 32 chars | ✅ Critical |

**Generation Commands:**
```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Security Notes:**
- NEVER use default or example values
- Different secrets for staging and production
- Rotate every 6 months minimum
- Store in encrypted secrets manager

---

### 🪝 Webhooks

| Credential | Purpose | Where to Obtain | Format | Required |
|------------|---------|-----------------|--------|----------|
| `WEBHOOK_SECRET` | Verify webhook signatures | Your application settings | `whsec_...` | ⚠️  Recommended |
| `WEBHOOK_ENDPOINT_URL` | Your webhook receiver URL | Your infrastructure | `https://your-app.com/webhooks/pravado` | ⚠️  Recommended |

**Security Notes:**
- Always verify webhook signatures
- Use HTTPS only
- Implement replay attack prevention
- Log all webhook events

---

### 📧 Email & Notifications

| Credential | Purpose | Where to Obtain | Format | Required |
|------------|---------|-----------------|--------|----------|
| `EMAIL_API_KEY` | SendGrid/AWS SES/Postmark | Email provider dashboard | Provider-specific | ⚠️  Recommended |
| `EMAIL_FROM_ADDRESS` | Sender email address | Your domain configuration | `noreply@pravado.com` | ⚠️  Recommended |

**Supported Providers:**
- SendGrid: `SG.xxx...`
- AWS SES: AWS IAM credentials
- Postmark: Server API token
- Mailgun: API key

---

### 📊 Monitoring & Observability

| Credential | Purpose | Where to Obtain | Format | Required |
|------------|---------|-----------------|--------|----------|
| `SENTRY_DSN` | Error tracking | sentry.io → Project Settings | `https://xxx@sentry.io/xxx` | ⚠️  Recommended |
| `LOGDNA_KEY` | Log aggregation (optional) | logdna.com → Add Sources | API key | ⬜ Optional |
| `DATADOG_API_KEY` | APM & monitoring (optional) | datadoghq.com → API Keys | API key | ⬜ Optional |

**Security Notes:**
- DSN is safe to expose in client-side code
- API keys should be server-side only
- Configure sample rates for production (10-20%)

---

### ☁️ CDN & File Storage

| Credential | Purpose | Where to Obtain | Format | Required |
|------------|---------|-----------------|--------|----------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare Pages deployment | Cloudflare → My Profile → API Tokens | API token | ⚠️  Recommended |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account | Cloudflare → Account ID | Account ID | ⚠️  Recommended |
| `CDN_URL` | CDN base URL (if using external CDN) | Your CDN provider | `https://cdn.pravado.com` | ⬜ Optional |

**Security Notes:**
- Use scoped API tokens (minimum permissions)
- Separate tokens for different environments
- Enable token expiration

---

### 🔄 Redis & Caching

| Credential | Purpose | Where to Obtain | Format | Required |
|------------|---------|-----------------|--------|----------|
| `REDIS_URL` | Redis connection string | Upstash/Redis Labs/AWS ElastiCache | `redis://default:password@host:port` | ⬜ Optional |

**Security Notes:**
- Always use TLS (rediss://)
- Strong password (20+ characters)
- Restrict network access
- Enable AUTH

---

### 🚀 Deployment Platforms

| Credential | Purpose | Where to Obtain | Format | Required |
|------------|---------|-----------------|--------|----------|
| `VERCEL_TOKEN` | Vercel deployments | vercel.com → Account → Tokens | Bearer token | ⬜ Optional |
| `RAILWAY_TOKEN` | Railway deployments | railway.app → Account → Tokens | API token | ⬜ Optional |
| `RENDER_API_KEY` | Render deployments | render.com → Account → API Keys | API key | ⬜ Optional |

---

## 🔒 Secrets Management Best Practices

### 1. Never Commit Secrets to Git

**❌ Don't:**
```javascript
const apiKey = "sk-proj-abc123..."; // NEVER!
```

**✅ Do:**
```javascript
const apiKey = process.env.OPENAI_API_KEY;
```

### 2. Use .env Files Locally (Gitignored)

```bash
# .env.local (NEVER commit this file)
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-proj-...
JWT_SECRET=...
```

**Ensure .gitignore includes:**
```
.env
.env.local
.env.*.local
*.key
*.pem
```

### 3. Use Environment Variables in Production

**Vercel:**
```bash
vercel env add DATABASE_URL production
```

**Railway:**
```bash
railway variables set DATABASE_URL=postgresql://...
```

**Render:**
- Dashboard → Environment → Add Environment Variable

### 4. Use Secrets Management Services

**Recommended Services:**
- **AWS Secrets Manager** - Enterprise-grade, automatic rotation
- **HashiCorp Vault** - Self-hosted, fine-grained access control
- **1Password** - Team password manager with CLI
- **Doppler** - Modern secrets management platform

**Example with AWS Secrets Manager:**
```javascript
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: "us-east-1" });
const response = await client.send(
  new GetSecretValueCommand({ SecretId: "pravado/production/openai-key" })
);
const secret = JSON.parse(response.SecretString);
```

### 5. Rotate Secrets Regularly

| Secret Type | Rotation Frequency |
|-------------|-------------------|
| Database passwords | 90 days |
| API keys | 90 days |
| JWT secrets | 180 days |
| Session secrets | 180 days |
| Webhook secrets | 90 days |
| Service account keys | 90 days |

### 6. Audit Access

- Log all secret access
- Monitor for unusual patterns
- Alert on unauthorized access attempts
- Review access logs monthly

### 7. Scope Permissions

- Use minimum required permissions
- Separate development/staging/production secrets
- Never share secrets across environments
- Use role-based access control

---

## ✅ Pre-Deployment Checklist

Before deploying to production, verify all credentials:

- [ ] `DATABASE_URL` - Valid and accessible
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Valid and has correct permissions
- [ ] `OPENAI_API_KEY` - Valid and within rate limits
- [ ] `JWT_SECRET` - Strong random string (32+ chars)
- [ ] `SESSION_SECRET` - Strong random string (32+ chars)
- [ ] `SENTRY_DSN` - Configured for error tracking
- [ ] Email credentials - Tested and working
- [ ] Webhook secrets - Configured if using webhooks
- [ ] All secrets stored securely (not in code)
- [ ] All .env files in .gitignore
- [ ] Staging and production secrets are different
- [ ] Secrets documented in this checklist
- [ ] Team has access to secrets manager
- [ ] Rotation schedule documented
- [ ] Emergency access procedures documented

---

## 🆘 Emergency Access

### If Credentials Are Compromised

**Immediate Actions:**

1. **Rotate the compromised credential immediately**
2. **Revoke old credential from provider**
3. **Update all deployments with new credential**
4. **Review access logs for unauthorized use**
5. **Notify security team**
6. **Document incident**

**Rotation Procedures:**

**Database:**
```bash
# 1. Create new password in Supabase
# 2. Update DATABASE_URL
# 3. Redeploy API
# 4. Verify connectivity
# 5. Revoke old password
```

**OpenAI API Key:**
```bash
# 1. Create new key in OpenAI dashboard
# 2. Update OPENAI_API_KEY
# 3. Redeploy API
# 4. Verify API calls work
# 5. Revoke old key
```

**JWT/Session Secrets:**
```bash
# 1. Generate new secrets
# 2. Update environment variables
# 3. Redeploy API
# 4. Note: All users will be logged out
# 5. Notify users of re-authentication requirement
```

### Emergency Contacts

See `EMERGENCY_PROTOCOLS.md` for on-call contacts and escalation procedures.

---

## 📝 Credential Inventory Template

Use this template to track your credentials:

| Credential | Status | Last Rotated | Next Rotation | Owner | Location |
|------------|--------|--------------|---------------|-------|----------|
| DATABASE_URL | ✅ Active | 2025-11-17 | 2026-02-17 | DevOps | AWS Secrets Manager |
| OPENAI_API_KEY | ✅ Active | 2025-11-17 | 2026-02-17 | Engineering | 1Password |
| JWT_SECRET | ✅ Active | 2025-11-17 | 2026-05-17 | Security | AWS Secrets Manager |
| ... | ... | ... | ... | ... | ... |

---

## 🔍 Verification Commands

Test credentials before deployment:

```bash
# Test Database
psql $DATABASE_URL -c "SELECT version();"

# Test OpenAI
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Test Supabase
curl $SUPABASE_URL/rest/v1/ \
  -H "apikey: $SUPABASE_ANON_KEY"

# Test Sentry
curl -X POST $SENTRY_DSN \
  -H "Content-Type: application/json" \
  -d '{"message":"Test message"}'
```

---

**Last Updated:** 2025-11-17
**Next Review:** 2026-02-17 (Quarterly)
**Owner:** DevOps Team
