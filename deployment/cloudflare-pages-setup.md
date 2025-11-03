# Cloudflare Pages Setup Guide

**Platform:** Pravado Dashboard
**Version:** 1.0.0
**Last Updated:** 2025-11-03

---

## 📋 Overview

This guide provides step-by-step instructions for deploying the Pravado dashboard to Cloudflare Pages with optimal configuration for performance, security, and reliability.

**Why Cloudflare Pages?**
- Global CDN with 300+ data centers
- Automatic SSL certificates
- Built-in DDoS protection
- Unlimited bandwidth on Pro plan
- Git integration for automatic deployments
- Preview deployments for pull requests
- Edge computing with Workers integration
- 99.99% uptime SLA

---

## 🚀 Quick Start

### Prerequisites

- Cloudflare account (free or paid)
- GitHub repository with Pravado platform code
- Node.js 20.x installed locally (for testing)
- pnpm 9.x installed locally

### 1. Connect GitHub Repository

1. Log in to Cloudflare Dashboard: https://dash.cloudflare.com
2. Navigate to **Pages** in the sidebar
3. Click **Create a project**
4. Click **Connect to Git**
5. Authorize Cloudflare to access your GitHub account
6. Select the `pravado-platform` repository
7. Click **Begin setup**

### 2. Configure Build Settings

**Framework preset:** None (manual configuration)

**Build command:**
```bash
pnpm install --frozen-lockfile && pnpm build --filter=@pravado/dashboard
```

**Build output directory:**
```
apps/dashboard/dist
```

**Root directory (optional):**
```
/
```

**Environment variables (build-time):**
| Variable | Value | Type |
|----------|-------|------|
| `NODE_VERSION` | `20.11.0` | Plain text |
| `PNPM_VERSION` | `9.0.0` | Plain text |
| `REACT_APP_API_URL` | `https://api.pravado.com` | Plain text |
| `REACT_APP_SUPABASE_URL` | `https://your-project.supabase.co` | Plain text |
| `REACT_APP_SUPABASE_ANON_KEY` | `eyJhbGciOi...` | Secret |
| `REACT_APP_SENTRY_DSN` | `https://...@sentry.io/...` | Secret |
| `REACT_APP_VERSION` | `1.0.0` | Plain text |
| `REACT_APP_ENV` | `production` | Plain text |

### 3. Configure Deployment Branches

**Production branch:** `main`
- Deploys to: `app.pravado.com`
- Triggered by: Push to main, Git tags `v*.*.*`

**Preview branch:** `develop` (or all branches)
- Deploys to: `[branch-name].pravado-dashboard.pages.dev`
- Triggered by: Push to any branch, Pull requests

### 4. Deploy

Click **Save and Deploy**

Initial deployment typically takes 2-5 minutes.

---

## ⚙️ Advanced Configuration

### Custom Domains

#### Add Production Domain

1. Navigate to **Pages** → `pravado-dashboard` → **Custom domains**
2. Click **Set up a custom domain**
3. Enter: `app.pravado.com`
4. Click **Continue**
5. Cloudflare will automatically provision SSL certificate
6. Wait for DNS propagation (typically 5-15 minutes)

#### Add Preview Domain

1. Click **Set up a custom domain**
2. Enter: `preview.pravado.com`
3. Map to: **Preview deployments**
4. Click **Continue**

#### DNS Configuration

In your Cloudflare DNS settings, add CNAME records:

```
app.pravado.com      CNAME  pravado-dashboard.pages.dev  (Proxied)
preview.pravado.com  CNAME  pravado-dashboard.pages.dev  (Proxied)
```

### Environment Variables

#### Production Environment

Navigate to **Settings** → **Environment variables** → **Production**

| Variable | Value | Secret? |
|----------|-------|---------|
| `REACT_APP_ENV` | `production` | No |
| `REACT_APP_API_URL` | `https://api.pravado.com` | No |
| `REACT_APP_SUPABASE_URL` | `https://xxx.supabase.co` | No |
| `REACT_APP_SUPABASE_ANON_KEY` | `eyJhbGciOi...` | Yes |
| `REACT_APP_SENTRY_DSN` | `https://...@sentry.io/...` | Yes |
| `REACT_APP_VERSION` | `1.0.0` | No |
| `REACT_APP_ENABLE_DEBUG` | `false` | No |
| `REACT_APP_ENABLE_ANALYTICS` | `true` | No |

#### Preview Environment

Navigate to **Settings** → **Environment variables** → **Preview**

Same as production, but:
- `REACT_APP_ENV` = `preview`
- `REACT_APP_API_URL` = `https://api-preview.pravado.com`
- `REACT_APP_ENABLE_DEBUG` = `true`

### Redirects and Headers

Cloudflare Pages supports `_redirects` and `_headers` files in the build output.

#### Create `apps/dashboard/public/_redirects`

```
# SPA Fallback
/*  /index.html  200

# API Proxy (optional)
/api/*  https://api.pravado.com/:splat  200
```

#### Create `apps/dashboard/public/_headers`

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.pravado.com https://*.supabase.co;

/static/*
  Cache-Control: public, max-age=31536000, immutable

/*.js
  Cache-Control: public, max-age=31536000, immutable

/*.css
  Cache-Control: public, max-age=31536000, immutable

/index.html
  Cache-Control: public, max-age=0, must-revalidate
```

### Functions (Cloudflare Workers Integration)

For advanced features like edge API proxying, create Workers in `apps/dashboard/functions/`:

#### Create `apps/dashboard/functions/api/[[path]].ts`

```typescript
export async function onRequest(context: EventContext<any, any, any>) {
  const { request, env } = context;

  const url = new URL(request.url);
  const apiUrl = new URL(url.pathname.replace('/api', ''), env.API_URL || 'https://api.pravado.com');

  // Forward query parameters
  apiUrl.search = url.search;

  // Create new request
  const apiRequest = new Request(apiUrl.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  // Forward to API
  const response = await fetch(apiRequest);

  // Add CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle OPTIONS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Return response with CORS
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...Object.fromEntries(response.headers),
      ...corsHeaders,
    },
  });
}
```

### Build Caching

Enable build caching to speed up deployments:

1. Navigate to **Settings** → **Builds & deployments**
2. Enable **Build caching**
3. Configure cache directories:
   ```
   node_modules
   .pnpm-store
   apps/dashboard/node_modules
   apps/dashboard/.next (if using Next.js)
   ```

### Access Control

Restrict access to preview deployments:

1. Navigate to **Settings** → **Access policies**
2. Click **Add a policy**
3. Select **Allow** for team members
4. Configure email domains or specific emails:
   ```
   *@pravado.com
   contractor@example.com
   ```
5. Enable **Require authentication**

### Deployment Notifications

Set up notifications for deployment status:

#### Slack

1. Navigate to **Settings** → **Notifications**
2. Click **Add webhook**
3. Select **Slack**
4. Enter Slack webhook URL
5. Choose events:
   - Deployment started
   - Deployment succeeded
   - Deployment failed

#### Email

1. Navigate to **Settings** → **Notifications**
2. Click **Add email**
3. Enter email addresses
4. Choose events

### Analytics

Enable Cloudflare Web Analytics:

1. Navigate to **Analytics**
2. Click **Enable Web Analytics**
3. Add the analytics script to your app (automatically injected by Cloudflare)
4. View metrics:
   - Page views
   - Unique visitors
   - Core Web Vitals
   - Geographic distribution

---

## 🔧 CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/deploy-dashboard.yml`:

```yaml
name: Deploy Dashboard to Cloudflare Pages

on:
  push:
    branches:
      - main
      - develop
  pull_request:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build dashboard
        run: pnpm build --filter=@pravado/dashboard
        env:
          REACT_APP_API_URL: ${{ secrets.REACT_APP_API_URL }}
          REACT_APP_SUPABASE_URL: ${{ secrets.REACT_APP_SUPABASE_URL }}
          REACT_APP_SUPABASE_ANON_KEY: ${{ secrets.REACT_APP_SUPABASE_ANON_KEY }}

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: pravado-dashboard
          directory: apps/dashboard/dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
          branch: ${{ github.ref_name }}
```

### Required GitHub Secrets

| Secret | How to Obtain |
|--------|---------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare Dashboard → My Profile → API Tokens → Create Token (Edit Cloudflare Pages) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → Account ID (in URL or sidebar) |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |

---

## 🔒 Security Hardening

### Content Security Policy

Update CSP in `_headers`:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'sha256-[HASH]'; style-src 'self' 'sha256-[HASH]'; img-src 'self' data: https:; connect-src 'self' https://api.pravado.com https://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
```

Generate hashes for inline scripts/styles:

```bash
echo -n "YOUR_INLINE_SCRIPT" | openssl dgst -sha256 -binary | openssl base64
```

### Subresource Integrity (SRI)

For external scripts, use SRI hashes:

```html
<script
  src="https://cdn.example.com/lib.js"
  integrity="sha384-ABC123..."
  crossorigin="anonymous">
</script>
```

### Security Headers Checklist

- [x] `X-Frame-Options: DENY`
- [x] `X-Content-Type-Options: nosniff`
- [x] `X-XSS-Protection: 1; mode=block`
- [x] `Referrer-Policy: strict-origin-when-cross-origin`
- [x] `Content-Security-Policy`
- [x] `Permissions-Policy`
- [x] `Strict-Transport-Security` (auto-enabled by Cloudflare)

---

## 📊 Monitoring & Observability

### Performance Monitoring

**Cloudflare Analytics:**
- Core Web Vitals (LCP, FID, CLS)
- Page load time
- Time to first byte (TTFB)
- Geographic distribution

**Sentry Performance Monitoring:**

Add to `apps/dashboard/src/index.tsx`:

```typescript
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.REACT_APP_ENV,
  integrations: [new BrowserTracing()],
  tracesSampleRate: 0.1, // 10% of transactions
});
```

### Error Tracking

Configure Sentry error boundaries:

```typescript
import { ErrorBoundary } from '@sentry/react';

function App() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <YourApp />
    </ErrorBoundary>
  );
}
```

### Uptime Monitoring

Use external service (UptimeRobot, Pingdom, StatusCake):

- Monitor: `https://app.pravado.com/`
- Interval: 60 seconds
- Alert threshold: 2 consecutive failures
- Alert channels: Email, Slack, PagerDuty

---

## 🚀 Deployment Workflow

### Production Deployment

1. **Create release branch:**
   ```bash
   git checkout -b release/v1.0.0
   ```

2. **Update version:**
   ```bash
   # Update package.json
   # Update REACT_APP_VERSION in Cloudflare
   ```

3. **Test locally:**
   ```bash
   pnpm build --filter=@pravado/dashboard
   pnpm preview --filter=@pravado/dashboard
   ```

4. **Merge to main:**
   ```bash
   git checkout main
   git merge release/v1.0.0
   git push origin main
   ```

5. **Tag release:**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

6. **Monitor deployment:**
   - Cloudflare Pages dashboard
   - Check build logs
   - Verify deployment status

7. **Smoke test:**
   - Visit `https://app.pravado.com`
   - Test login
   - Verify API connectivity
   - Check all 8 admin tabs load

### Preview Deployment

1. **Create feature branch:**
   ```bash
   git checkout -b feature/new-dashboard
   ```

2. **Make changes and commit:**
   ```bash
   git add .
   git commit -m "Add new dashboard feature"
   ```

3. **Push to GitHub:**
   ```bash
   git push origin feature/new-dashboard
   ```

4. **Automatic preview deployment:**
   - Cloudflare creates preview at: `feature-new-dashboard.pravado-dashboard.pages.dev`
   - Comment added to PR with preview URL

5. **Review and test:**
   - Click preview URL
   - Test changes
   - Share with team for review

6. **Merge when ready:**
   ```bash
   # After PR approval
   git checkout main
   git merge feature/new-dashboard
   git push origin main
   ```

---

## 🐛 Troubleshooting

### Build Failures

**Issue:** `pnpm: command not found`

**Solution:** Add to build command:
```bash
npm install -g pnpm@9 && pnpm install --frozen-lockfile && pnpm build --filter=@pravado/dashboard
```

**Issue:** `Module not found` errors

**Solution:**
1. Clear build cache in Cloudflare Pages settings
2. Verify all dependencies in `package.json`
3. Check import paths are correct

**Issue:** Build timeout (30 minutes)

**Solution:**
1. Optimize build process
2. Remove unnecessary dependencies
3. Use build caching
4. Contact Cloudflare support for timeout increase

### Deployment Issues

**Issue:** 404 on routes after deployment

**Solution:** Verify `_redirects` file:
```
/*  /index.html  200
```

**Issue:** CORS errors when calling API

**Solution:**
1. Check API CORS configuration
2. Verify `REACT_APP_API_URL` is correct
3. Add CORS headers in `_headers` or use Workers proxy

**Issue:** Environment variables not loading

**Solution:**
1. Verify variables set in Cloudflare Pages settings
2. Rebuild after adding new variables
3. Check variable names start with `REACT_APP_` (for Create React App)

### Performance Issues

**Issue:** Slow page load times

**Solution:**
1. Enable compression in build config
2. Implement code splitting
3. Use lazy loading for routes
4. Optimize images (use WebP, responsive images)
5. Enable Cloudflare Argo for faster routing

**Issue:** Large bundle size

**Solution:**
1. Analyze bundle: `pnpm build --filter=@pravado/dashboard --analyze`
2. Remove unused dependencies
3. Use dynamic imports
4. Enable tree shaking

---

## 📚 Additional Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Workers Integration](https://developers.cloudflare.com/pages/platform/functions/)
- [Custom Domains Guide](https://developers.cloudflare.com/pages/platform/custom-domains/)
- [Build Configuration](https://developers.cloudflare.com/pages/platform/build-configuration/)
- [Redirects and Headers](https://developers.cloudflare.com/pages/platform/redirects/)

---

**Last Updated:** 2025-11-03
**Version:** 1.0.0
**Maintained By:** Pravado DevOps Team
