# Pravado Platform Architecture

## Overview

The Pravado platform is built as a modern monorepo using Turborepo, with clear separation between frontend, backend, and shared packages. This architecture enables rapid development, type safety, and code reuse across the entire application.

## Deployment Architecture

```
┌─────────────────────┐
│  Cloudflare Pages   │  ← Next.js Dashboard
│   (Frontend CDN)    │
└──────────┬──────────┘
           │
           ├─────────────────────────┐
           │                         │
           ▼                         ▼
┌─────────────────────┐   ┌──────────────────┐
│   Supabase Auth     │   │   API Backend    │
│   + PostgreSQL      │◄──┤  (Node.js/Express)│
└─────────────────────┘   └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │  Redis/Upstash   │
                          │   (Task Queue)   │
                          └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │  Agent Workers   │
                          │  (Background AI) │
                          └──────────────────┘
```

## Monorepo Structure

### Apps

#### `apps/dashboard`
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Design System
- **Deployment**: Cloudflare Pages (via `@cloudflare/next-on-pages`)
- **Features**:
  - Server-side rendering (SSR)
  - Static site generation (SSG) where applicable
  - Optimized for edge delivery
  - Supabase client for authentication and data fetching

#### `apps/api`
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + JWT
- **Queue**: BullMQ with Redis/Upstash
- **Deployment**: Any Node.js platform (Render, Fly.io, Railway)
- **Features**:
  - RESTful API endpoints
  - Row-Level Security (RLS) enforcement
  - Real-time subscriptions via Supabase
  - Agent task queue management

#### `apps/agents`
- **Purpose**: Background agent execution engine
- **Queue**: BullMQ worker consuming from Redis
- **AI Integration**: OpenAI, Anthropic Claude
- **Deployment**: Separate worker service
- **Features**:
  - Content generation
  - SEO optimization
  - Strategy planning
  - Competitor analysis

### Packages

#### `packages/shared-types`
- TypeScript interfaces and types
- Enums for status values, roles, permissions
- Database type definitions (generated from Supabase)
- API request/response shapes

#### `packages/utils`
- Date formatting and manipulation
- String utilities (slugify, truncate, etc.)
- Validators (email, URL, password strength)
- Array and object helpers
- Custom error classes

#### `packages/design-system`
- Atomic UI components (Button, Input, Card, Badge)
- Built on Tailwind CSS
- CVA (Class Variance Authority) for variants
- Storybook for component documentation
- Shared across dashboard and marketing sites

## Data Flow

### Standard Request Flow
```
User → Dashboard → API → Supabase → Response → Dashboard → User
```

### Agent Task Flow
```
User → Dashboard → API → Redis Queue → Agent Worker → Supabase → Notification
```

### Real-time Updates
```
Supabase Realtime → Dashboard (via subscription)
```

## Authentication & Authorization

### Supabase Auth Flow
1. User signs up/logs in via Supabase Auth
2. Supabase returns JWT access token
3. Dashboard stores token in httpOnly cookie
4. API validates token on each request
5. Row-Level Security (RLS) enforces data access

### Role-Based Access Control (RBAC)
- **ADMIN**: Full system access
- **MANAGER**: Campaign and team management
- **CONTRIBUTOR**: Content creation and editing
- **VIEWER**: Read-only access

Permissions are enforced via:
- RLS policies in Supabase
- Middleware checks in API
- UI-level guards in dashboard

## Database Architecture

### Supabase PostgreSQL Schema

**Core Tables**:
- `organizations` - Multi-tenant organization data
- `users` - User profiles (extends Supabase auth.users)
- `campaigns` - PR and content campaigns
- `content_items` - Generated and manual content
- `media_contacts` - PR contacts and journalists
- `keywords` - SEO keywords
- `keyword_clusters` - Grouped keyword sets
- `agent_tasks` - AI agent job tracking
- `agent_logs` - Detailed agent execution logs
- `strategies` - Marketing and PR strategies

**Row-Level Security (RLS)**:
All tables have RLS policies that restrict access to:
- User's own organization data
- Role-based permissions
- Owner-based access for sensitive operations

### Database Migrations
- Stored in `apps/api/supabase/migrations/`
- Applied via Supabase CLI
- Version controlled for reproducibility

## Agent System Architecture

### Task Queue System (BullMQ + Redis)

1. **Task Creation**:
   - User initiates action in dashboard
   - API creates `agent_task` record in Supabase
   - Task enqueued to Redis with priority

2. **Task Processing**:
   - Agent worker polls queue
   - Updates task status to `RUNNING`
   - Executes AI operations (OpenAI/Anthropic)
   - Logs progress to `agent_logs`

3. **Task Completion**:
   - Results stored in `agent_task.output`
   - Status updated to `COMPLETED` or `FAILED`
   - User notified via real-time subscription

### Agent Types

- **CONTENT_GENERATOR**: Blog posts, social media, press releases
- **SEO_OPTIMIZER**: Meta tags, keyword optimization
- **OUTREACH_COMPOSER**: Personalized PR emails
- **KEYWORD_RESEARCHER**: Keyword opportunities
- **STRATEGY_PLANNER**: Campaign strategy development
- **COMPETITOR_ANALYZER**: Competitive intelligence

## Security Measures

### Application Security
- HTTPS enforced in production
- Environment variables for secrets
- CORS configured for trusted origins
- Rate limiting on API endpoints
- Input validation with Joi schemas
- SQL injection prevention via Supabase client

### Authentication Security
- JWT with expiration
- Refresh token rotation
- Session management
- Password hashing (Supabase handles)
- MFA support (Supabase Auth)

### Data Security
- Row-Level Security (RLS) in database
- Organization-based data isolation
- Audit logs for sensitive operations
- Encrypted data at rest (Supabase)

## Scalability Considerations

### Horizontal Scaling
- **Frontend**: Cloudflare's global edge network
- **API**: Stateless design allows multiple instances
- **Workers**: Multiple agent worker instances
- **Database**: Supabase manages scaling

### Performance Optimization
- **Caching**: Redis for frequently accessed data
- **CDN**: Cloudflare for static assets and edge caching
- **Database**: Indexed queries, connection pooling
- **Queue**: Concurrent job processing

### Monitoring & Observability
- **Logging**: Pino structured logging
- **Errors**: Sentry for error tracking
- **Metrics**: Custom metrics for agent performance
- **Uptime**: Health check endpoints

## Deployment Strategy

### Continuous Integration/Deployment

**Pull Requests**:
- Linting and type checking
- Unit tests
- Build verification

**Main Branch**:
- Automatic deployment to staging
- Dashboard deployed to Cloudflare Pages
- API deployed to production hosting
- Database migrations applied automatically

### Environment Strategy
- **Development**: Local Supabase instance
- **Staging**: Supabase staging project
- **Production**: Supabase production project

## Future Architecture Considerations

- GraphQL API layer (if needed for complex queries)
- Event-driven architecture with webhooks
- Real-time collaboration features
- Analytics data pipeline
- Multi-region deployment for global performance

## Phase 7: Advanced Agent Intelligence (Sprint 67-68)

### Multi-LLM Router (Sprint 67)
- **Provider Registry**: Pluggable architecture supporting OpenAI and Anthropic
- **Routing Strategies**: latencyFirst, costFirst, forcedProvider
- **Automatic Fallback**: Resilient provider switching with retry logic
- **Cost Tracking**: Token-based estimation for budget optimization
- **Location**: `packages/utils/src/llm/`

### Media Opportunity Scanner (Sprint 67-68)
- **Proactive Monitoring**: Automated news feed scanning every 6 hours
- **Opportunity Scoring**: Multi-factor algorithm (relevance × visibility × freshness)
- **BullMQ Integration**: Cron-based scheduling with Redis queue
- **UI Components**: OpportunityList.tsx for dashboard display
- **Location**: `apps/agents/src/agents/pr/media-opportunity.agent.ts`

### Enrichment Pipeline (Sprint 68)
- **Pluggable Providers**: Interface-based design for extensibility
- **Clearbit Integration**: Primary enrichment source (priority 1)
- **WHOIS Integration**: Fallback provider (priority 2)
- **Automatic Fallback**: Chain of responsibility pattern
- **Location**: `apps/api/src/services/integrations/`

### Journalist Matching UI (Sprint 68)
- **Backend**: Existing getRecommendedTargets API
- **Frontend**: JournalistMatchTable.tsx component
- **Filtering**: Score, tier, outlet filtering
- **Actions**: Add to pitch queue workflow
- **Location**: `apps/dashboard/src/components/pr/`

### EVI Analytics (Sprint 68)
- **Composite Metric**: Exposure Visibility Index (EVI)
- **Formula**: 35% mediaReach + 25% engagement + 25% sentiment + 15% tierQuality
- **Grading**: A-F scale with trend indicators
- **Visualization**: EviCard.tsx with 7-day sparkline
- **Location**: `packages/utils/src/analytics/evi.ts`


## Phase 8: Dynamic LLM Strategy & Cost Guardrails (Sprint 69)

### Cost-First Model Selection
- **Selector Algorithm**: `score = price*0.6 + latency*0.35/1000 + error*0.05`
- **Task-Tier Routing**: 8 canonical task categories with quality thresholds
- **Performance Floor**: Minimum quality scores prevent poor model selection
- **Graceful Degradation**: 80% → force cheapest, 95% → warn, 100% → deny
- **Location**: `packages/utils/src/llm/strategy/selector.ts`

### Budget Guardrails
- **Pre-flight Checks**: Budget, token limits, rate limits, concurrency
- **Database Functions**: `get_daily_spend()`, `get_remaining_budget()`, `can_afford_request()`
- **Progressive Controls**: Per-request limits, daily limits, concurrency caps
- **Trial Protections**: $2 daily max, $0.02 per-request max for free tiers
- **Location**: `apps/api/src/services/budget-guard.service.ts`

### Policy Management
- **Per-Tenant Policies**: Stored in `ai_policy` table with RLS
- **Task Overrides**: Custom minPerf and preferredModels per task category
- **Policy Merging**: Environment defaults + database policy
- **Trial Restrictions**: Hard caps enforce budget limits
- **Location**: `packages/utils/src/llm/strategy/policyConfig.ts`

### EWMA Telemetry
- **Real-time Metrics**: Latency and error rate tracking with EWMA (α=0.3)
- **In-Memory Store**: Provider:model keyed metrics (24h retention)
- **Circuit Breaker**: Automatic provider suppression at 50% error threshold
- **Performance Scoring**: Weighted metrics influence model selection
- **Location**: `packages/utils/src/llm/metrics/telemetry.ts`

### Usage Tracking
- **Comprehensive Ledger**: `ai_usage_ledger` table captures all requests
- **Full-Text Search**: Indexed on provider, model, organization, task category
- **Analytics Support**: Usage summaries, trends, cost breakdowns
- **Attribution**: Links to agent_type, user_id, task_category
- **Location**: Database table with API endpoints at `/api/ai-ops/usage/`

### Guardrails Middleware
- **Express Middleware**: Pre-flight enforcement in request pipeline
- **Rate Limiting**: Burst (10s) and sustained (1min) windows
- **Concurrency Tracking**: Active job counting per organization
- **Budget Enforcement**: Real-time cost estimation and denial
- **Location**: `apps/api/src/middleware/ai-guardrails.ts`

### Agent Runner Integration
- **Automatic Selection**: Task category inferred from agent type
- **Policy-Aware**: Organization policy loaded per execution
- **Guardrail Gated**: All requests pass through pre-flight checks
- **Telemetry Recording**: Post-execution metrics capture
- **Location**: `apps/agents/src/framework/agent-runner.ts`

### Admin Dashboard
- **Budget Status**: Real-time daily spend with visual indicators
- **Usage Trends**: 7-day spend chart with request counts
- **Policy Summary**: Current limits and configuration display
- **Telemetry Metrics**: Model performance with circuit-breaker alerts
- **Location**: `apps/dashboard/src/components/admin/CostControls.tsx`

### API Endpoints
- **Policy**: `GET /api/ai-ops/policy/:organizationId`
- **Budget State**: `GET /api/ai-ops/budget/:organizationId/state`
- **Usage Summary**: `GET /api/ai-ops/usage/:organizationId/summary`
- **Usage Trend**: `GET /api/ai-ops/usage/:organizationId/trend`
- **Telemetry**: `GET /api/ai-ops/telemetry/recent`
- **Guardrails**: `GET /api/ai-ops/guardrails/:organizationId/status`

### Quality Matrix (Configurable)
```typescript
'drafting-short': {
  'gpt-4o-mini': 0.75,     // Good quality, low cost
  'claude-3-haiku': 0.70,
  'gpt-4o': 0.90,
  'claude-3-sonnet': 0.85,
}
'pr-pitch': {
  'gpt-4o-mini': 0.60,     // Below threshold for critical tasks
  'claude-3-sonnet': 0.92, // Excellent for persuasive writing
  'gpt-4o': 0.88,
}
```

### Database Schema
- **ai_policy**: Per-tenant policy configuration with RLS
- **ai_usage_ledger**: Comprehensive usage tracking with full-text search
- **Indexes**: `organization_id`, `created_at`, `provider`, `model` for fast queries
- **Functions**: PostgreSQL helper functions for daily spend aggregation

### Environment Configuration
- `LLM_POLICY_MODE`: Policy mode (trial/balanced/custom)
- `LLM_MAX_DAILY_COST`: Max daily spend for paid orgs ($100)
- `LLM_TRIAL_MAX_DAILY_COST`: Max daily spend for trial orgs ($2)
- `LLM_MAX_COST_PER_REQUEST`: Per-request cost ceiling ($0.50)
- `LLM_TELEMETRY_EWMA_ALPHA`: EWMA smoothing factor (0.3)
- `LLM_ALLOWED_PROVIDERS`: Comma-separated provider list

## Phase 9: LLM Insights & Explainability Layer (Sprint 70)

### Prompt-Hash Response Caching
- **Cache Strategy**: SHA-256 hash of (prompt + model + temperature) as cache key
- **TTL Configuration**: 24-hour default expiration, configurable per-tenant
- **Redis Storage**: Cached responses stored in Upstash Redis with automatic expiration
- **Cache Metrics**: Hit rate tracking per organization with cost savings calculation
- **Location**: `apps/api/src/services/llm-cache.service.ts`

### Decision Explainability
- **Decision Logging**: All LLM routing decisions stored in `ai_decision_log` table
- **Transparency**: Provider selection reasoning, quality scores, cost estimates
- **Audit Trail**: Full request context, policy overrides, guardrail checks
- **Query Support**: Filter by organization, date range, model, decision type
- **Location**: Database table with API endpoints at `/api/ai-ops/explain/`

### Policy Auto-Adaptation
- **Nightly Analysis**: Automated review of provider performance at 02:00 UTC
- **Circuit Breaker**: Disable providers exceeding 50% error rate threshold
- **Auto-Recovery**: Re-enable providers dropping below 20% error rate
- **Adaptation Log**: Policy changes tracked with reasoning and rollback support
- **Location**: `apps/api/src/cron/policy-adaptation.cron.ts`

### Performance Benchmarking
- **Model Comparison**: Side-by-side quality and latency metrics per task category
- **Historical Trends**: 30-day rolling average for performance analysis
- **Cost-Quality Ratio**: Efficiency scoring for model selection validation
- **Provider Reliability**: Uptime and error rate tracking
- **Location**: `apps/api/src/services/llm-benchmark.service.ts`

### Admin Dashboard Enhancements
- **Decision Explorer**: Visual timeline of LLM routing decisions
- **Cache Performance**: Hit rate charts with cost savings projections
- **Policy Adaptation History**: Auto-tune events with before/after comparison
- **Provider Health**: Real-time circuit breaker status
- **Location**: `apps/dashboard/src/components/admin/ExplainabilityDashboard.tsx`

### API Endpoints
- **Decision Log**: `GET /api/ai-ops/explain/decisions/:organizationId`
- **Cache Stats**: `GET /api/ai-ops/explain/cache/:organizationId`
- **Adaptation History**: `GET /api/ai-ops/explain/adaptations`
- **Benchmark Report**: `GET /api/ai-ops/explain/benchmark/:taskCategory`

### Database Schema
- **ai_decision_log**: Stores LLM routing decisions with full context
- **ai_cache_stats**: Tracks cache hit/miss rates per organization
- **ai_policy_adaptations**: Records automatic policy adjustments

### Environment Configuration
- `ENABLE_LLM_CACHE`: Enable prompt-hash response caching (true)
- `LLM_CACHE_TTL_HOURS`: Cache expiration time (24 hours)
- `ENABLE_LLM_EXPLAINABILITY`: Enable decision logging (true)
- `ENABLE_POLICY_ADAPTATION`: Enable nightly auto-tuning (true)
- `POLICY_ADAPTATION_ERROR_THRESHOLD`: Provider disable threshold (0.5)
- `POLICY_ADAPTATION_RECOVERY_THRESHOLD`: Provider re-enable threshold (0.2)

## Phase 10: Automated Billing & Revenue Operations (Sprint 71-72)

### Usage Aggregation & Billing Ledger
- **Daily Aggregation**: Automated rollup of `ai_usage_ledger` to `billing_usage_ledger` per organization per day
- **Breakdowns**: JSONB storage of usage by provider, model, task category
- **Cache Metrics**: Hit rates, cost savings from caching tracked daily
- **Plan Tier Tracking**: Daily snapshot of organization plan tier for billing reconciliation
- **Location**: `apps/api/src/services/billing-ledger.service.ts`

### Stripe Integration
- **Customer Mapping**: 1:1 relationship between organizations and Stripe customers
- **Webhook Handlers**: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, `checkout.session.completed`
- **Event Idempotency**: Unique constraint on `stripe_event_id` prevents duplicate processing
- **Signature Verification**: HMAC SHA-256 verification of webhook signatures
- **Location**: `apps/api/src/services/stripe-webhooks.service.ts`

### Usage-Based Invoicing
- **Automatic Invoice Creation**: Daily cron job creates Stripe invoice items for unbilled usage
- **Billable Units**: Daily AI usage cost converted to invoice line items
- **Invoice Finalization**: Auto-finalize invoices after item creation
- **Reconciliation**: Mark usage as billed after `invoice.paid` webhook confirmation
- **Location**: `apps/api/src/services/invoicing.service.ts`

### Account Tier Management
- **Plan Tiers**: Trial ($2/day, OpenAI only), Pro ($100/day, multi-provider), Enterprise ($1000/day, dedicated)
- **Auto-Downgrade**: 3+ failed payments trigger automatic downgrade to Trial
- **Auto-Upgrade**: Successful checkout session activates paid tier
- **Usage Limits**: Daily cost, per-request cost, concurrent jobs enforced per tier
- **Location**: `apps/api/src/services/account-tier.service.ts`

### Billing Automation Cron
- **Schedule**: Daily at 01:00 UTC (configurable via `BILLING_CYCLE_CRON`)
- **Job Steps**: (1) Aggregate yesterday's usage, (2) Create invoices for unbilled usage, (3) Enforce tier limits
- **Error Handling**: Failed organizations logged but don't stop batch processing
- **Notifications**: System events logged to `ai_ops_events` table
- **Location**: `apps/api/src/cron/usage-billing.cron.ts`

### Admin Billing Console
- **Customer Management**: View all Stripe customers with payment status, failed payment counts
- **Invoice Dashboard**: Filter invoices by status (paid/unpaid/void), export to CSV
- **Manual Actions**: Add credit adjustments, void invoices, trigger billing cycle
- **Delinquency Tracking**: Organizations at risk (2+ failed payments) highlighted
- **Location**: `apps/dashboard/src/components/admin/BillingConsole.tsx`

### User Analytics Portal
- **Usage Reports**: 30-day cost breakdown by provider, model, task category
- **Trend Analysis**: Cost/request trends (increasing/decreasing/stable)
- **Cache Performance**: Hit rate impact on billing
- **Unbilled Usage**: Real-time view of pending charges
- **Location**: `apps/dashboard/src/components/reports/UsageReportDashboard.tsx`

### API Endpoints
- **Webhooks**: `POST /api/webhooks/stripe` (raw body parsing for signature verification)
- **Customers**: `GET /api/billing/customers`, `GET /api/billing/customers/:orgId`
- **Invoices**: `GET /api/billing/invoices`, `GET /api/billing/invoices/:orgId`
- **Revenue Metrics**: `GET /api/billing/metrics`
- **Manual Billing**: `POST /api/billing/trigger` (admin only)
- **Credit Adjustment**: `POST /api/billing/credit/:orgId` (admin only)
- **Void Invoice**: `POST /api/billing/invoice/:invoiceId/void` (admin only)

### Database Schema
- **stripe_customers**: Organization ↔ Stripe customer mapping with subscription status
- **stripe_invoices**: Invoice records with payment status and period dates
- **stripe_events**: Webhook event log with idempotency tracking
- **billing_usage_ledger**: Daily usage aggregations with billed flag
- **ai_ops_events**: Critical billing events (payment_success, payment_failed, plan_upgraded, plan_downgraded)

### Tier Limits Configuration
```typescript
trial: {
  maxDailyCost: 2.0,
  maxRequestCost: 0.02,
  maxTokensIn: 4000,
  maxTokensOut: 2000,
  maxConcurrentJobs: 2,
  allowedProviders: ['openai'],
  cacheTTLHours: 12,
}
pro: {
  maxDailyCost: 100.0,
  maxRequestCost: 0.5,
  maxTokensIn: 8000,
  maxTokensOut: 4000,
  maxConcurrentJobs: 10,
  allowedProviders: ['openai', 'anthropic'],
  cacheTTLHours: 24,
}
enterprise: {
  maxDailyCost: 1000.0,
  maxRequestCost: 2.0,
  maxTokensIn: 16000,
  maxTokensOut: 8000,
  maxConcurrentJobs: 50,
  allowedProviders: ['openai', 'anthropic'],
  cacheTTLHours: 72,
}
```

### Payment Lifecycle
```
Checkout → subscription.created → Plan Upgrade → Active Billing
↓
Monthly Invoice Created → invoice.paid → Mark Usage Billed
↓
Payment Failed → invoice.payment_failed → Increment Failed Count
↓
3+ Failures → Auto-Downgrade to Trial → Restrict Usage
↓
Payment Success → subscription.updated → Auto-Upgrade → Resume Full Access
```

### Environment Configuration
- `STRIPE_SECRET_KEY`: Stripe API key for customer/subscription management
- `STRIPE_WEBHOOK_SECRET`: Webhook signature verification secret (from Stripe Dashboard)
- `STRIPE_PRICE_TRIAL`: Stripe Price ID for Trial plan
- `STRIPE_PRICE_PRO`: Stripe Price ID for Pro plan
- `STRIPE_PRICE_ENTERPRISE`: Stripe Price ID for Enterprise plan
- `BILLING_CYCLE_CRON`: Cron schedule for daily billing job (default: "0 1 * * *")

## Phase 11: Customer Lifecycle Automation (Sprint 73)

### Self-Serve Signup Flow
- **Organization Provisioning**: Automated creation of organization, user, and trial setup in single transaction
- **Auth Integration**: Supabase Auth signup with email/password, automatic user profile creation
- **Stripe Customer**: Automatic Stripe customer creation on signup for future billing
- **Trial Initialization**: 7-day trial with $2 budget automatically provisioned
- **Location**: `apps/api/src/services/onboarding.service.ts`

### Onboarding Wizard
- **4-Step Process**: (1) Organization Setup, (2) API Keys Configuration, (3) First Agent Creation, (4) Usage Demo
- **Progress Tracking**: State saved to `onboarding_state` table with step completion flags
- **Trial Status Display**: Real-time days/budget remaining shown in wizard header
- **Auto-Completion**: Wizard marked complete when all steps finished
- **Location**: `apps/dashboard/src/components/onboarding/TrialOnboardingWizard.tsx`

### Trial Lifecycle Management
- **Duration**: 7 days (configurable via `TRIAL_DURATION_DAYS`)
- **Budget**: $2.00 USD (configurable via `TRIAL_BUDGET_USD`)
- **Grace Period**: 24 hours after expiry (configurable via `TRIAL_GRACE_PERIOD_HOURS`)
- **Auto-Expiry**: Trials automatically expire when time or budget exhausted
- **Job Blocking**: New AI jobs blocked after grace period ends
- **Location**: `apps/api/src/services/trial-lifecycle.service.ts`

### Budget Tracking & Warnings
- **Real-Time Tracking**: `updateTrialBudgetUsage()` called after each AI request
- **Warning Thresholds**: 80% (warning event), 95% (critical event), 100% (auto-expire)
- **Auto-Expiry**: Trial expired with `budget_limit` reason when budget exhausted
- **Grace Period**: 24-hour buffer before hard cutoff
- **Integration**: Called from AI execution middleware to track spend

### Email Automation (Mailgun)
- **Day 1 Email**: Welcome message with trial details and getting started steps
- **Day 3 Email**: Halfway tips and feature highlights
- **Day 7 Email**: Trial ending notification with upgrade prompt
- **Expired Email**: Grace period notification with urgent upgrade CTA
- **Feature Flag**: `ONBOARDING_EMAILS_ENABLED` to enable/disable emails
- **Location**: `apps/api/src/services/trial-lifecycle.service.ts`

### Upgrade Prompts
- **Trigger Conditions**: Budget >80%, <2 days remaining, trial expired
- **Display Modes**: Banner (dismissible) or modal (full-screen)
- **Tier Comparison**: Side-by-side Pro vs Enterprise feature comparison
- **Checkout Integration**: Creates Stripe checkout session on tier selection
- **Dismissal**: 24-hour localStorage-based dismissal to avoid prompt fatigue
- **Location**: `apps/dashboard/src/components/billing/UpgradePrompt.tsx`

### Marketing Webhooks (Optional)
- **Zapier/HubSpot Integration**: Sends trial lifecycle events to external CRM
- **Event Types**: `trial_started`, `trial_converted`, `trial_expired`
- **Payload**: Organization ID, event metadata, timestamp
- **Feature Flag**: `ZAPIER_WEBHOOK_URL` optional, silently skips if not configured
- **Location**: `trial-lifecycle.service.ts::sendMarketingWebhook()`

### Trial Expiry Cron Job
- **Schedule**: Every 6 hours (cron: `0 */6 * * *`)
- **Tasks**: (1) Expire trials reaching time limit, (2) End grace periods, (3) Send lifecycle emails
- **Email Triggers**: Check days since trial start, send if not already sent
- **Error Handling**: Individual trial failures logged, batch continues
- **Manual Trigger**: `triggerTrialExpiryCronManually()` for testing/admin
- **Location**: `apps/api/src/jobs/trial-expiry.cron.ts`

### Invite Code System
- **Generation**: 8-char org ID prefix + 4-char random suffix (e.g., "abc12345-XY7Z")
- **Storage**: Stored in organization `billing_metadata` JSONB field
- **Validation**: Signup flow validates invite code before provisioning
- **Team Onboarding**: Team members join existing organization via invite
- **Location**: `onboarding.service.ts::generateInviteCode()`, `validateInviteCode()`

### Database Schema
- **onboarding_state**: Wizard progress, trial dates, budget tracking, grace period state
- **trial_activity_log**: Audit trail of trial lifecycle events (signup, step completion, expiry)
- **stripe_customers**: Billing email for trial notifications
- **organizations**: Plan tier tracking (trial → pro → enterprise)

### PostgreSQL Functions
- `initialize_onboarding_state()`: Create trial state on org creation
- `complete_onboarding_step()`: Mark wizard steps complete
- `get_trial_status()`: Get active trial status with days/budget remaining
- `update_trial_budget_usage()`: Increment budget, auto-expire if exhausted
- `expire_trial()`: Mark trial expired with grace period
- `end_grace_period()`: Disable new jobs after grace period
- `convert_trial_to_paid()`: Mark successful conversion
- `get_expiring_trials()`: Find trials expiring within X hours
- `get_grace_period_organizations()`: Find orgs in grace period

### API Endpoints
- **Signup**: `POST /onboarding/signup` - Create organization with trial
- **Wizard State**: `GET /onboarding/:orgId/state` - Get wizard progress
- **Complete Step**: `POST /onboarding/:orgId/step/:stepNumber` - Mark step done
- **Progress**: `GET /onboarding/:orgId/progress` - Get completion percentage
- **Trial Status**: `GET /onboarding/:orgId/trial-status` - Get days/budget remaining
- **Upgrade Prompt**: `GET /onboarding/:orgId/upgrade-prompt` - Check if should show
- **Can Execute**: `GET /onboarding/:orgId/can-execute` - Check if trial allows jobs
- **Checkout Link**: `POST /onboarding/:orgId/checkout-link` - Create Stripe session
- **Invite Code**: `POST /onboarding/:orgId/invite-code` - Generate invite
- **Validate Invite**: `POST /onboarding/validate-invite` - Validate invite code

### Frontend Hooks (React Query)
- `useOnboardingState()`: Wizard progress and trial dates
- `useTrialStatus()`: Days/budget remaining (auto-refresh every 60s)
- `useOnboardingProgress()`: Completion percentage
- `useUpgradePrompt()`: Check if should prompt upgrade
- `useCanExecuteJobs()`: Check if trial allows new jobs
- `useSignup()`: Create organization mutation
- `useCompleteStep()`: Mark wizard step complete mutation
- `useCreateCheckoutLink()`: Generate Stripe checkout URL
- `useGenerateInviteCode()`: Create invite code mutation
- `useValidateInviteCode()`: Validate invite mutation

### Trial Conversion Flow
```
Signup → Trial Provisioned → Onboarding Wizard → Active Trial
↓
Budget Warning (80%) → Upgrade Prompt Shown
↓
User Clicks Upgrade → Stripe Checkout Session → Payment Success
↓
checkout.session.completed Webhook → convert_trial_to_paid()
↓
Plan Tier Updated (trial → pro) → Full Access Enabled
```

### Grace Period Lifecycle
```
Trial Expires (7 days or $2 budget) → Grace Period Starts (24 hours)
↓
in_grace_period = true, trial_expired_email_sent = true
↓
Grace Period Active → New Jobs Allowed (degraded UX)
↓
Grace Period Ends (24 hours elapsed) → end_grace_period()
↓
in_grace_period = false → New Jobs Blocked → Hard Paywall
```

### Environment Configuration
- `TRIAL_DURATION_DAYS`: Trial period duration (default: 7 days)
- `TRIAL_GRACE_PERIOD_HOURS`: Grace period after expiry (default: 24 hours)
- `TRIAL_BUDGET_USD`: Trial budget in USD (default: $2.00)
- `ONBOARDING_EMAILS_ENABLED`: Enable/disable trial lifecycle emails (default: false)
- `MAILGUN_API_KEY`: Mailgun API key for email sending
- `MAILGUN_DOMAIN`: Verified Mailgun domain
- `ZAPIER_WEBHOOK_URL`: Optional webhook URL for marketing automation


## Phase 12: Production Hardening & Observability (Sprint 74)

### Health Check Endpoints
- **/api/health**: Lightweight health check for load balancers (DB ping only)
- **/api/status**: Comprehensive system status with DB, Redis, LLM, memory checks
- **/api/ready**: Kubernetes readiness probe (critical dependencies)
- **/api/live**: Kubernetes liveness probe (process alive)
- **Location**: `apps/api/src/routes/health.routes.ts`

### Error Tracking & Observability
- **Sentry Integration**: Error tracking, performance monitoring, distributed tracing
- **Automatic Context**: User ID, organization ID, request details attached to errors
- **Breadcrumb Filtering**: Noise reduction for health checks and common errors
- **Performance Transactions**: Track slow operations and bottlenecks
- **Location**: `apps/api/src/services/observability.service.ts`

### Prometheus Metrics
- **HTTP Metrics**: Request count, duration, size (request/response)
- **AI Metrics**: Request count, duration, tokens used, cost by provider/model
- **Database Metrics**: Query count, duration by operation/table
- **Redis Metrics**: Command count, duration, cache hit/miss rates
- **Business Metrics**: Active trials, conversions, subscriptions, revenue
- **Endpoint**: `GET /metrics` (Prometheus scraping format)
- **Location**: `apps/api/src/services/prometheus-metrics.service.ts`

### Rate Limiting
- **Default**: 100 requests/minute per user/IP
- **Auth Endpoints**: 5 requests/minute per IP (login/signup)
- **AI Operations**: 20 requests/minute per organization
- **Webhooks**: 30 requests/minute per source
- **Signup**: 3 signups/hour per IP
- **Storage**: Redis-backed for distributed rate limiting
- **Location**: `apps/api/src/middleware/rate-limit.ts`

### Docker Deployment
- **Multi-Stage Builds**: Optimized production images with minimal attack surface
- **Non-Root User**: Runs as nodejs:nodejs (UID 1001)
- **Health Checks**: Built-in Docker healthchecks for container orchestration
- **Signal Handling**: dumb-init for proper SIGTERM/SIGKILL handling
- **Files**: `docker/Dockerfile.api`, `docker/Dockerfile.dashboard`

### Kubernetes Manifests
- **API Deployment**: 2 replicas, liveness/readiness probes, resource limits
- **Dashboard Deployment**: 2 replicas, Cloudflare-compatible
- **Services**: LoadBalancer type for external access
- **Secrets**: Database, Redis URLs via Kubernetes secrets
- **Files**: `k8s/api-deployment.yaml`, `k8s/dashboard-deployment.yaml`

### Environment Configuration
- `SENTRY_DSN`: Sentry error tracking DSN
- `DATADOG_API_KEY`: Datadog monitoring API key (optional)
- `PROMETHEUS_ENDPOINT`: Prometheus metrics path (default: /metrics)
- `RATE_LIMIT_WINDOW_MS`: Rate limit window in milliseconds (default: 60000)
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window (default: 100)
- `DEPLOY_ENV`: Deployment environment (development/staging/production)


## Phase 13: Executive Admin Console + Validated Pricing + Mobile Foundation (Sprint 75)

**Goal**: Reach public launch readiness with founder KPI dashboard, validated 4-tier pricing from PVS-01, and mobile app foundation.

### Track A: Executive Admin Console (Founder View)

#### Backend Services

**Admin Metrics Service** (`apps/api/src/services/admin-metrics.service.ts`):
- Aggregates business KPIs across subscriptions, invoices, trials, and AI usage
- Calculates MRR (Monthly Recurring Revenue), ARR (Annual Run Rate), ARPU (Average Revenue Per User)
- Computes LTV (Lifetime Value), CAC (Customer Acquisition Cost), LTV:CAC ratio
- Tracks NRR (Net Revenue Retention) for cohort analysis
- Monitors operational health (API latency, error rates, cache hit rates, uptime)
- Provider health status (Supabase, Redis, OpenAI, Anthropic)

**Key Functions**:
```typescript
export async function getAdminOverview(
  organizationId: string,
  period: '7d' | '30d' | '90d' = '30d'
): Promise<AdminOverview>

export async function getRevenueMetrics(organizationId: string, startDate: Date): Promise<RevenueMetrics>
export async function getCustomerMetrics(organizationId: string, startDate: Date): Promise<CustomerMetrics>
export async function getTrialMetrics(organizationId: string, startDate: Date): Promise<TrialMetrics>
export async function getOpsMetrics(organizationId: string, startDate: Date): Promise<OpsMetrics>
export async function getRevenueTrends(organizationId: string, startDate: Date, endDate: Date): Promise<RevenueTrend[]>
export async function calculateNRR(organizationId: string, startDate: Date, endDate: Date): Promise<number>
```

#### API Endpoints

**Admin Metrics Routes** (`apps/api/src/routes/admin-metrics.routes.ts`):
- **GET /api/admin-metrics/overview** - Comprehensive KPI overview (revenue, customers, trials, ops)
  - Query params: `period` (7d | 30d | 90d)
  - RBAC: Platform admin only (is_platform_admin = true)
  - Returns: RevenueMetrics, CustomerMetrics, TrialMetrics, OpsMetrics, AI metrics

- **GET /api/admin-metrics/revenue** - Revenue-specific metrics and historical trends
  - Returns: MRR/ARR/ARPU, revenue by tier, historical MRR trends

- **GET /api/admin-metrics/funnels** - Trial-to-paid conversion funnel analysis
  - Returns: Trial starts, conversions, drop-off points, conversion rate

- **GET /api/admin-metrics/ops** - Operational health and infrastructure metrics
  - Returns: API latency, error rates, provider health, AI usage costs

- **GET /api/admin-metrics/calculations** - Calculation transparency endpoint
  - Returns: How LTV, CAC, NRR, churn are calculated with formulas

**RBAC Protection**:
```typescript
async function requirePlatformAdmin(req: Request, res: Response, next: Function) {
  const { data: user } = await supabase
    .from('users')
    .select('is_platform_admin')
    .eq('id', userId)
    .single();

  if (!user?.is_platform_admin) {
    return res.status(403).json({ error: 'Forbidden - Platform admin access required' });
  }
  next();
}
```

### Track B: Validated Pricing Rollout (Balanced Model)

#### Pricing Structure

**4-Tier Pricing** (from PVS-01 validation, Sweet Spot Index: 81.6):

| Tier | Monthly | Annual (25% discount) | Target Audience |
|------|---------|----------------------|-----------------|
| **Starter** | $149 | $1,341/year ($112/mo) | Solo PR professionals, freelancers |
| **Pro** ⭐ | $599 | $5,391/year ($449/mo) | Small agencies, 3-10 users |
| **Premium** | $1,499 | $13,491/year ($1,124/mo) | Mid-size agencies, podcast syndication |
| **Enterprise** | $5,000+ | $45,000+/year ($3,750+/mo) | Large agencies, custom pricing |

**⭐ Pro Tier** is the recommended tier for trial conversions (highest conversion likelihood × margin score).

#### Feature Limits by Tier

| Feature | Starter | Pro | Premium | Enterprise |
|---------|---------|-----|---------|------------|
| Journalist Contacts | 5,000 | 50,000 | 100,000 | Unlimited |
| AI Generations/mo | 500 | 2,000 | 5,000 | Unlimited |
| Media Searches/mo | 50 | 200 | 500 | Unlimited |
| Max Users | 1 | 3 | 10 | Unlimited |
| Podcast Syndications/mo | 0 | 10 | 25 | Unlimited |
| CiteMind Queries/mo | - | 50 | 200 | Unlimited |
| API Access | ❌ | ❌ | ❌ | ✅ |
| White-Label Reports | ❌ | ❌ | ✅ | ✅ |
| Custom Integrations | ❌ | ❌ | ✅ | ✅ |
| Dedicated CSM | ❌ | ❌ | ❌ | ✅ |
| SLA Uptime | - | 99.5% | 99.9% | 99.95% |

#### Database Infrastructure

**Migration**: `apps/api/supabase/migrations/20251115000001_plan_policies_expansion.sql`
- Added 16 new columns to `plan_policies` table:
  - Feature limits: journalist_contacts_limit, ai_generations_monthly, media_searches_monthly, storage_gb_limit, max_users, podcast_syndications_monthly, citemind_queries_monthly
  - Feature flags: api_access, white_label_reports, custom_integrations, dedicated_csm
  - Pricing: monthly_price_usd, annual_price_usd, stripe_price_id_monthly, stripe_price_id_annual

**New Tables**:
- **feature_usage_snapshots**: Daily usage tracking with auto-calculated utilization percentages
- **tier_pricing_history**: Historical pricing records for auditing and analysis
- **trial_configurations**: Trial period settings and budget limits
- **tier_change_log**: Audit trail of upgrades/downgrades with reasons

**PostgreSQL Functions**:
```sql
CREATE FUNCTION check_upgrade_triggers(org_id UUID)
RETURNS TABLE (should_upgrade BOOLEAN, reason TEXT, recommended_tier VARCHAR(50))
-- Returns upgrade recommendation when usage >= 80% of any limit

CREATE FUNCTION calculate_usage_utilization()
RETURNS TRIGGER
-- Auto-calculates utilization percentages on feature_usage_snapshots insert/update

CREATE FUNCTION get_next_tier(current_tier VARCHAR(50))
RETURNS VARCHAR(50)
-- Returns next tier in hierarchy: starter → pro → premium → enterprise
```

**Seed Data**: `apps/api/supabase/seed/20251115000001_plan_policies_balanced.sql`
- Inserts Balanced Model pricing for all 4 tiers
- Sets Pro tier as recommended (is_recommended = true)
- Configures feature limits and flags

#### Service Updates

**Account Tier Service** (`apps/api/src/services/account-tier.service.ts`):
- Updated from 3-tier to 4-tier system
- Changed tier type: `'trial' | 'pro' | 'enterprise'` → `'starter' | 'pro' | 'premium' | 'enterprise'`
- Added Stripe price ID mapping functions:
  ```typescript
  export function mapStripePriceToTier(stripePriceId: string): PlanTier | null
  export function mapTierToStripePrices(tier: PlanTier): { monthly: string | undefined; annual: string | undefined }
  export function isAnnualPrice(stripePriceId: string): boolean
  ```
- Added tier hierarchy helpers:
  ```typescript
  export function getTierHierarchy(): PlanTier[]
  export function getNextTier(currentTier: PlanTier): PlanTier | null
  export function getPreviousTier(currentTier: PlanTier): PlanTier | null
  ```
- Updated tier limits for LLM usage:
  - Starter: $5/day, OpenAI only (gpt-4o-mini primarily)
  - Pro: $100/day, OpenAI + Anthropic
  - Premium: $500/day, 12K input tokens
  - Enterprise: $2000/day, 32K input tokens

#### Upgrade Triggers

**Automatic Upgrade Prompts**:
- Triggered when utilization >= 80% of any feature limit
- Returns recommended next tier and reason
- Integrated with mobile alerts and billing notifications
- Example triggers:
  - "Approaching journalist contact limit (80% used)" → Recommend Pro
  - "AI generation quota at 85%" → Recommend Premium
  - "3 users (limit: 3), add more users?" → Recommend Premium

### Track C: Mobile App Foundation

#### Mobile API Design

**Design Principles**:
- **Compact JSON**: Abbreviated field names to reduce bandwidth (mrr, arr, f, u, l, p)
- **API Versioning**: x-mobile-api-version header for schema evolution
- **Stable Contracts**: Mobile clients need predictable schemas
- **Bandwidth Optimization**: Round numbers appropriately, use 0/1 for booleans

#### Mobile Endpoints

**Mobile Summary API** (`apps/api/src/routes/mobile/summary.routes.ts`):

- **GET /api/mobile/summary** - Compact KPI dashboard
  ```json
  {
    "success": true,
    "data": {
      "mrr": 127407,
      "arr": 1528884,
      "arpu": 750,
      "growth": 12.5,
      "customers": 150,
      "new": 23,
      "churn": 2.1,
      "trials": {
        "active": 12,
        "conv": 32.0,
        "days": 3
      },
      "health": {
        "api": 145,
        "err": 0.3,
        "cache": 94.5,
        "uptime": 99.9
      },
      "providers": {
        "db": 1,
        "redis": 1,
        "openai": 1,
        "anthropic": 0
      },
      "ai": {
        "reqs": 15234,
        "cost": 234.56,
        "avg": 0.0154
      },
      "period": "30d",
      "ts": "2025-01-05T10:00:00Z"
    },
    "v": "1"
  }
  ```

- **GET /api/mobile/usage** - Feature usage with limits
  ```json
  {
    "success": true,
    "data": [
      { "f": "Contacts", "u": 450, "l": 5000, "p": 9, "warn": false, "max": false },
      { "f": "AI", "u": 320, "l": 500, "p": 64, "warn": false, "max": false },
      { "f": "Searches", "u": 42, "l": 50, "p": 84, "warn": true, "max": false }
    ],
    "v": "1"
  }
  ```
  - `f`: Feature name
  - `u`: Used count
  - `l`: Limit (null = unlimited)
  - `p`: Utilization percent
  - `warn`: Approaching limit (>= 80%)
  - `max`: At limit (>= 100%)

- **GET /api/mobile/tier** - Current plan info
  ```json
  {
    "tier": "pro",
    "price": 599,
    "next": "premium",
    "features": {
      "api": false,
      "wl": false,
      "ci": false,
      "csm": false
    },
    "limits": {
      "contacts": 50000,
      "ai": 2000,
      "searches": 200,
      "users": 3,
      "podcast": 10,
      "citemind": 50
    }
  }
  ```

**Mobile Alerts API** (`apps/api/src/routes/mobile/alerts.routes.ts`):

- **GET /api/mobile/alerts** - Operational and billing alerts
  - Query params: `limit` (default 20, max 50), `unread_only` (true/false), `type` (ops/billing/system)
  - Returns compact alert array:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "uuid",
        "type": "ops",
        "severity": "warning",
        "title": "High API Latency",
        "msg": "API response time 450ms (threshold: 200ms)",
        "ts": "2025-01-05T10:30:00Z",
        "read": false,
        "action": "view_ops_health"
      },
      {
        "id": "uuid",
        "type": "billing",
        "severity": "warning",
        "title": "Upgrade Recommended",
        "msg": "Approaching AI generation limit (85% used)",
        "ts": "2025-01-05T09:15:00Z",
        "read": false,
        "action": "upgrade_plan"
      }
    ],
    "count": 2,
    "unread": 2,
    "v": "1"
  }
  ```

- **POST /api/mobile/alerts/:id/read** - Mark single alert as read
- **POST /api/mobile/alerts/read-all** - Mark all alerts as read

**Alert Types**:
- **ops**: Operational alerts from ai_ops_events (errors, timeouts, rate limits)
- **billing**: Payment failures, upgrade prompts, renewal reminders
- **system**: System notifications (maintenance, updates)

**Alert Severities**: info, warning, error, critical

**Alert Actions**:
- `view_ops_health`: Navigate to ops health dashboard
- `upgrade_plan`: Navigate to pricing/upgrade page
- `update_payment`: Navigate to payment settings

#### Alert Generation Logic

**Ops Alerts** (from ai_ops_events table):
```typescript
async function getOpsAlerts(organizationId, limit, unreadOnly) {
  const { data: events } = await supabase
    .from('ai_ops_events')
    .select('id, event_type, provider, created_at, metadata')
    .in('event_type', ['error', 'timeout', 'rate_limit']);

  return events.map(event => ({
    type: 'ops',
    severity: event.event_type === 'error' ? 'error' : 'warning',
    title: `${capitalize(provider)} ${event_type}`,
    msg: getOpsAlertMessage(event),
    action: 'view_ops_health',
  }));
}
```

**Billing Alerts** (from upgrade checks and Stripe data):
```typescript
async function getBillingAlerts(organizationId, limit) {
  // Check upgrade triggers
  const upgradeCheck = await shouldPromptUpgrade(organizationId);
  if (upgradeCheck.should_upgrade) {
    alerts.push({
      type: 'billing',
      severity: 'warning',
      title: 'Upgrade Recommended',
      msg: upgradeCheck.reason,
      action: 'upgrade_plan',
    });
  }

  // Check payment failures
  const { data: customer } = await supabase
    .from('stripe_customers')
    .select('failed_payment_count')
    .eq('organization_id', organizationId)
    .single();

  if (customer?.failed_payment_count > 0) {
    alerts.push({
      type: 'billing',
      severity: customer.failed_payment_count >= 2 ? 'error' : 'warning',
      title: 'Payment Issue',
      msg: `${customer.failed_payment_count} failed payment(s)`,
      action: 'update_payment',
    });
  }

  // Check upcoming renewal (7 days)
  // ...
}
```

### Environment Configuration

**Stripe Pricing** (Balanced Model):
```bash
# Monthly Price IDs
STRIPE_PRICE_STARTER="price_YOUR_STARTER_MONTHLY_ID"     # $149/mo
STRIPE_PRICE_PRO="price_YOUR_PRO_MONTHLY_ID"             # $599/mo (RECOMMENDED)
STRIPE_PRICE_PREMIUM="price_YOUR_PREMIUM_MONTHLY_ID"     # $1,499/mo
STRIPE_PRICE_ENTERPRISE="price_YOUR_ENTERPRISE_MONTHLY_ID" # $5,000+/mo

# Annual Price IDs (25% discount)
STRIPE_PRICE_STARTER_ANNUAL="price_YOUR_STARTER_ANNUAL_ID"     # $1,341/year
STRIPE_PRICE_PRO_ANNUAL="price_YOUR_PRO_ANNUAL_ID"             # $5,391/year
STRIPE_PRICE_PREMIUM_ANNUAL="price_YOUR_PREMIUM_ANNUAL_ID"     # $13,491/year
STRIPE_PRICE_ENTERPRISE_ANNUAL="price_YOUR_ENTERPRISE_ANNUAL_ID" # $45,000/year
```

**Mobile Configuration**:
```bash
# Mobile API
MOBILE_API_VERSION="1"               # API version for x-mobile-api-version header
MOBILE_ENABLE_ALERTS="true"          # Enable mobile push notifications

# Expo Configuration
EXPO_PROJECT_ID=""                   # Expo project ID from expo.dev
EXPO_PUBLIC_API_URL="https://api.pravado.com" # Production API URL
EXPO_PUSH_TOKEN=""                   # Push notification token (Sprint 76)
```

### Manual Setup Steps

1. **Create Stripe Products & Prices**:
   - Create 4 products in Stripe Dashboard (Starter, Pro, Premium, Enterprise)
   - Create 8 prices (monthly + annual for each tier)
   - Update .env with actual Stripe price IDs

2. **Run Database Migrations**:
   ```bash
   cd apps/api
   supabase migration up
   ```

3. **Seed Balanced Model Pricing**:
   ```bash
   psql $DATABASE_URL < supabase/seed/20251115000001_plan_policies_balanced.sql
   ```

4. **Update plan_policies with Stripe Price IDs**:
   ```sql
   UPDATE plan_policies
   SET stripe_price_id_monthly = 'price_xxx',
       stripe_price_id_annual = 'price_yyy'
   WHERE tier = 'pro';
   ```

5. **Test Admin Metrics** (requires platform admin):
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3001/api/admin-metrics/overview?period=30d
   ```

6. **Verify RBAC**: Test with non-admin user (should get 403 Forbidden)

7. **Test Mobile APIs**:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3001/api/mobile/summary?period=30d

   curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3001/api/mobile/alerts?limit=20
   ```

### Frontend Implementation (Sprint 75 v1.1)

**Web Dashboard - Executive Admin Console** (COMPLETED):
- ✅ `apps/dashboard/src/app/admin/executive/page.tsx` - Founder KPI dashboard with RBAC
- ✅ `apps/dashboard/src/components/admin/tiles/KpiTiles.tsx` - Revenue, customer, trial metrics
- ✅ `apps/dashboard/src/components/admin/charts/RevenueTrends.tsx` - MRR/ARR historical charts
- ✅ `apps/dashboard/src/components/admin/charts/OpsHealth.tsx` - API latency, error rates, provider health
- ✅ `apps/dashboard/src/components/admin/funnels/TrialToPaid.tsx` - Conversion funnel visualization
- ✅ `apps/dashboard/src/hooks/useAdminMetrics.ts` - React Query hooks for admin APIs

**Web Dashboard - Pricing & Plans** (COMPLETED):
- ✅ `apps/dashboard/src/app/pricing/page.tsx` - 4-tier pricing comparison with monthly/annual toggle
- ✅ `apps/dashboard/src/components/billing/PlanControls.tsx` - Upgrade CTAs and usage tracking
- ✅ `apps/dashboard/src/hooks/usePlans.ts` - Plan management and Stripe checkout hooks

**Mobile App - Expo React Native** (COMPLETED):
- ✅ `apps/mobile/package.json` - Expo 50, React Native 0.73.2, React Navigation, React Query
- ✅ `apps/mobile/app.json` - Expo configuration with bundle identifiers
- ✅ `apps/mobile/eas.json` - EAS Build configuration for development, preview, production
- ✅ `apps/mobile/App.tsx` - Main app with tab navigation and auth
- ✅ `apps/mobile/src/services/auth/supabaseAuth.ts` - Supabase PKCE authentication
- ✅ `apps/mobile/src/services/api.ts` - Mobile API client with x-mobile-api-version header
- ✅ `apps/mobile/src/hooks/useMobileData.ts` - React Query hooks for mobile APIs
- ✅ `apps/mobile/src/components/KpiTile.tsx` - Reusable KPI tile component
- ✅ `apps/mobile/src/screens/Dashboard.tsx` - KPI dashboard with real-time metrics
- ✅ `apps/mobile/src/screens/OpHealth.tsx` - Provider health and alerts

### UI/UX Notes

**Executive Dashboard** (apps/dashboard/src/app/admin/executive/page.tsx):
- Clean, modern interface with Tailwind CSS
- Time period selector (7/30/90 days) affects all metrics
- RBAC enforcement: Shows "Insufficient Privileges" error for non-platform admins
- Real-time data refresh every 60 seconds
- Responsive grid layout for mobile/tablet/desktop
- Color-coded status indicators (green/yellow/red)
- Comprehensive metrics breakdown by tier

**Pricing Page** (apps/dashboard/src/app/pricing/page.tsx):
- Gradient background (gray-50 to blue-50)
- 4-tier card layout with hover effects
- Monthly/Annual billing toggle with "Save 25%" badge
- Feature comparison checkmarks
- Stripe checkout integration on "Start Free Trial" buttons
- FAQ section for common questions
- Enterprise tier shows "Contact Sales" CTA

**Mobile App** (apps/mobile):
- Native iOS and Android support via Expo
- Bottom tab navigation (Dashboard | Ops Health)
- Pull-to-refresh on all screens
- Supabase authentication with SecureStore session persistence
- Compact field names for bandwidth optimization
- Real-time metrics with 30-60s refresh intervals
- Alert notifications with read/unread status
- Provider status with color-coded health indicators

### Pending Tasks (from Sprint 75)

- **Stripe Setup**: Create products and prices in Stripe Dashboard for 4 tiers → COMPLETED in Sprint 76
- **Mobile Assets**: Add icon.png, splash.png, adaptive-icon.png, favicon.png to apps/mobile/assets/ → COMPLETED in Sprint 76
- **Mobile Build**: Configure EAS Build with Expo project ID → COMPLETED in Sprint 76
- **Push Notifications**: Set up Expo push notifications (deferred to Sprint 76) → COMPLETED in Sprint 76
- **End-to-End Testing**: Test checkout flows and mobile authentication → COMPLETED in Sprint 76
- **Performance Optimization**: Implement virtualized lists for large datasets → ONGOING

---

## Phase 14: Launch Readiness - Mobile Notifications, QA, Observability (Sprint 76)

**Goal**: Complete final production readiness with mobile push notifications, comprehensive testing, observability infrastructure, and operational runbooks.

### Track A: Mobile Notifications + Offline Support + Deep Linking

#### Backend Infrastructure

**Push Notification Service** (`apps/api/src/services/push.service.ts`):
- Integrates with Expo Push Notifications API
- Topic-based notification segmentation (ops_incident, billing_event, trial_threshold, plan_upgrade)
- Push token management with organization and user association
- Device platform tracking (iOS, Android)

**Key Functions**:
```typescript
export async function registerPushToken(
  userId: string,
  organizationId: string,
  token: string,
  platform: 'ios' | 'android',
  topics: NotificationTopic[] = []
): Promise<PushToken>

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void>

export async function sendPushToTopic(
  topic: NotificationTopic,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void>

// Specific notification triggers
export async function sendOpsIncidentAlert(organizationId: string, provider: string, incident: any)
export async function sendBillingAlert(userId: string, title: string, message: string, action?: string)
export async function sendTrialThresholdAlert(userId: string, daysRemaining: number)
export async function sendUpgradeRecommendation(userId: string, reason: string, recommendedTier: string)
```

**Push Token Storage** (Supabase `push_tokens` table):
- Columns: id, user_id, organization_id, token, platform, topics, active, last_used_at, created_at
- RLS policies for multi-tenant security
- Automatic token deactivation when registering new tokens

**API Endpoints** (`apps/api/src/routes/mobile/push.routes.ts`):

- **POST /api/mobile/push/register** - Register device push token
  - Body: `{ token: string, platform: 'ios'|'android', topics?: NotificationTopic[] }`
  - Validates Expo token format: `ExponentPushToken[...]`
  - Returns: `{ success: true, data: { id, token, platform, topics, active } }`

- **POST /api/mobile/push/topics** - Update topic subscriptions
  - Body: `{ tokenId: string, topics: NotificationTopic[] }`
  - Valid topics: ops_incident, billing_event, trial_threshold, plan_upgrade

- **POST /api/mobile/push/test** - Send test notification (development only)
  - Body: `{ title: string, body: string, data?: object }`
  - Only available in NODE_ENV !== 'production'

**Environment Variables**:
```bash
EXPO_ACCESS_TOKEN=""  # Expo access token for sending push notifications (from expo.dev)
```

#### Mobile Client Implementation

**Notification Service** (`apps/mobile/src/services/notify.ts`):
- Request push notification permissions (iOS/Android)
- Retrieve Expo push token
- Register token with backend API
- Handle foreground and background notifications
- Deep linking from notification data to app screens

**Key Functions**:
```typescript
export async function requestNotificationPermissions(): Promise<boolean>
export async function getExpoPushToken(): Promise<string | null>
export async function registerPushToken(topics?: NotificationTopic[]): Promise<{ success: boolean; tokenId?: string }>
export async function updateTopicSubscriptions(tokenId: string, topics: NotificationTopic[]): Promise<boolean>
export function getNavigationFromNotification(notification): { screen?: string; params?: any } | null
export function addNotificationReceivedListener(callback)
export function addNotificationResponseReceivedListener(callback)
export async function sendTestNotification(title, body, data?): Promise<boolean>
```

**Offline Cache Service** (`apps/mobile/src/services/offline.ts`):
- AsyncStorage-based cache with 24-hour TTL
- Cached data: summary, alerts, usage, tier info
- Automatic expiration and cleanup
- Generic cache functions for extensibility

**Key Functions**:
```typescript
export async function cacheData<T>(key: string, data: T): Promise<void>
export async function getCachedData<T>(key: string): Promise<T | null>
export async function clearCache(key: string): Promise<void>
export async function clearAllCache(): Promise<void>

// Specific cache functions
export async function cacheSummary(summary: any): Promise<void>
export async function getCachedSummary(): Promise<any | null>
export async function cacheAlerts(alerts: any): Promise<void>
export async function getCachedAlerts(): Promise<any | null>
```

**Deep Linking** (`apps/mobile/App.tsx` + `app.json`):
- Custom URL scheme: `pravado://`
- Notification-driven navigation to specific screens
- Navigation ref integration with React Navigation
- Handles app opened from background and cold start

**app.json Configuration**:
```json
{
  "expo": {
    "scheme": "pravado",
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    },
    "android": {
      "permissions": ["NOTIFICATIONS", "RECEIVE_BOOT_COMPLETED"],
      "useNextNotificationsApi": true
    },
    "plugins": [
      ["expo-notifications", {
        "icon": "./assets/notification-icon.png",
        "color": "#3B82F6"
      }]
    ],
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#3B82F6",
      "androidMode": "default",
      "androidCollapsedTitle": "Pravado"
    }
  }
}
```

**Mobile App Assets** (`apps/mobile/assets/`):
- README.md with asset specifications (1024x1024 icon, 1284x2778 splash, etc.)
- Placeholder structure for: icon.png, splash.png, adaptive-icon.png, notification-icon.png, favicon.png
- Design guidelines for iOS and Android compliance
- Asset optimization recommendations

### Track B: Stripe Setup Documentation

**Comprehensive Setup Guide** (`SETUP.md` - Stripe Section):
- Step-by-step Stripe product creation (4 products × 2 prices = 8 total)
- Pricing details with 25% annual discount calculations
- Environment variable configuration with examples
- Webhook endpoint setup (development and production)
- Stripe Customer Portal configuration
- Test checkout flow procedures
- Production launch checklist

**Stripe Products**:
- Starter: $149/mo, $1,341/year
- Pro: $599/mo, $5,391/year (Recommended)
- Premium: $1,499/mo, $13,491/year
- Enterprise: $5,000/mo, $45,000/year

**Updated .env.sample**:
```bash
# Stripe API Keys
STRIPE_SECRET_KEY="sk_test_xxxxx"
STRIPE_PUBLISHABLE_KEY="pk_test_xxxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxxx"
STRIPE_CUSTOMER_PORTAL_URL="https://billing.stripe.com/p/login/test_xxxxx"

# Monthly Price IDs
STRIPE_PRICE_STARTER_MONTHLY="price_xxxStarter_Monthly"
STRIPE_PRICE_PRO_MONTHLY="price_xxxPro_Monthly"
STRIPE_PRICE_PREMIUM_MONTHLY="price_xxxPremium_Monthly"
STRIPE_PRICE_ENTERPRISE_MONTHLY="price_xxxEnterprise_Monthly"

# Annual Price IDs
STRIPE_PRICE_STARTER_ANNUAL="price_xxxStarter_Annual"
STRIPE_PRICE_PRO_ANNUAL="price_xxxPro_Annual"
STRIPE_PRICE_PREMIUM_ANNUAL="price_xxxPremium_Annual"
STRIPE_PRICE_ENTERPRISE_ANNUAL="price_xxxEnterprise_Annual"

# Expo Push Notifications
EXPO_ACCESS_TOKEN=""
EXPO_PUBLIC_SUPABASE_URL=""
EXPO_PUBLIC_SUPABASE_ANON_KEY=""
```

### Track C: E2E Testing + Accessibility

**Playwright E2E Tests** (`apps/dashboard/tests/e2e/pricing-checkout.spec.ts`):
- Comprehensive pricing page tests (4-tier display, monthly/annual toggle)
- Accessibility checks (ARIA labels, keyboard navigation, heading hierarchy)
- Checkout flow testing (authenticated and unauthenticated)
- Mobile responsiveness tests (viewport testing)
- Performance metrics (page load < 3s, DOMContentLoaded < 1s)
- Error handling tests (Stripe API failures)

**Test Coverage**:
- ✅ Pricing page displays 4 tiers with correct prices
- ✅ Monthly/annual toggle with 25% discount badge
- ✅ Accessibility: ARIA labels, keyboard navigation, proper heading hierarchy
- ✅ Mobile responsiveness: vertical stacking, tappable buttons (44px minimum)
- ✅ Performance: Load time < 3s
- ✅ Error handling: Graceful Stripe API error messages

**Playwright Configuration** (`apps/dashboard/playwright.config.ts`):
- Multi-browser testing (Chromium, Firefox, WebKit)
- Mobile viewport testing (Pixel 5, iPhone 12)
- Screenshot and video on failure
- HTML and JSON reporters
- Web server auto-start for local testing

**Accessibility Documentation** (`docs/accessibility.md`):
- WCAG 2.1 Level AA compliance guidelines
- Color contrast requirements (4.5:1 for text, 3:1 for large text)
- ARIA label requirements for icon buttons
- Keyboard navigation standards (Tab, Shift+Tab, Enter, Escape)
- Form accessibility (labels, error announcements, required fields)
- Skip navigation link implementation
- Landmark regions (header, nav, main, aside, footer)
- Screen reader testing procedures (NVDA, JAWS, VoiceOver)

**Accessibility Improvements**:
- ✅ Document color contrast standards and fixes
- ✅ ARIA label examples for icon buttons
- ✅ Keyboard navigation focus management
- ✅ Form accessibility with error announcements
- ✅ Skip navigation link implementation
- ✅ Reduced motion and high contrast mode support
- ✅ Automated axe-core testing integration

### Track D: Observability & Operational Runbooks

**Prometheus Alert Configuration** (`ops/prometheus_alerts.yml`):

**Alert Categories**:
1. **API Performance** (HighAPILatency, CriticalAPILatency, SlowDatabaseQueries)
2. **Error Rates** (HighAPIErrorRate, CriticalAPIErrorRate, DatabaseConnectionErrors)
3. **Cache Performance** (HighCacheMissRatio, RedisConnectionFailure, RedisHighMemoryUsage)
4. **Billing Events** (BillingFailureSpike, StripeWebhookFailures, TrialConversionDropOff, HighChurnRate)
5. **LLM Providers** (LLMProviderDown, HighLLMCost, LLMRateLimitExceeded)
6. **Database Health** (SupabaseDown, HighDatabaseConnections)
7. **Mobile Notifications** (HighPushNotificationFailureRate, ExpoPushServiceDown)
8. **Availability** (APIDown, DashboardDown, HealthCheckFailing)
9. **Resource Utilization** (HighCPUUsage, HighMemoryUsage, DiskSpaceLow)

**Alert Thresholds**:
- API p95 latency: Warning at 500ms, Critical at 2s
- Error rate: Warning at 5%, Critical at 20%
- Cache miss ratio: Warning at 50%
- Billing failure rate: Critical at 10%
- LLM cost: Warning at $50/hour ($1,200/day)
- Database connections: Warning at 80% of max
- Disk space: Critical at < 10% remaining

**Incident Response Runbook** (`ops/incident_response.md`):

**Coverage**:
- General incident response workflow (Acknowledge → Assess → Communicate → Investigate → Mitigate → Resolve → Document)
- Severity levels (Critical < 15min, Warning < 1hr, Info < 4hr)
- API performance incidents (high latency, slow database queries)
- Error rate incidents (5xx errors, database connection failures)
- Cache performance incidents (high miss ratio, Redis failures)
- Database incidents (Supabase down, connection exhaustion)
- LLM provider incidents (provider down, high costs, rate limits)
- Mobile push notification incidents (high failure rate, Expo down)
- Infrastructure incidents (API/dashboard down, high CPU/memory, disk space)
- Escalation matrix and contact information

**Billing Operations Runbook** (`ops/billing_ops.md`):

**Coverage**:
- Daily operations checklist (check failure rates, review MRR/ARR, monitor trials)
- Billing incident response (failure spikes, webhook failures)
- Common billing issues (upgrade failures, double charges, subscription sync)
- Trial management (threshold alerts, conversion optimization, trial extensions)
- Subscription management (manual creation, downgrades, cancellations with refunds)
- Payment failure handling (automatic retry logic, manual retries, payment method updates)
- Refunds and credits (full/partial refunds, Stripe credits)
- Revenue operations (MRR/ARR calculation, churn analysis)
- Escalation procedures and support tiers

### Key Metrics and SLOs

**Service Level Objectives (Sprint 76)**:

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API p95 Latency | < 200ms | > 500ms (warning), > 2s (critical) |
| API Error Rate | < 1% | > 5% (warning), > 20% (critical) |
| Cache Hit Ratio | > 85% | < 50% (warning) |
| API Uptime | 99.9% | < 99.5% (critical) |
| Billing Success Rate | > 95% | < 90% (critical) |
| Trial-to-Paid Conversion | > 15% | < 5% (warning) |
| Monthly Churn Rate | < 5% | > 10% (warning) |
| Push Notification Success | > 95% | < 80% (warning) |

### Files Created/Updated (Sprint 76)

**Track A - Mobile Notifications + Offline**:
- ✅ `apps/api/src/services/push.service.ts` (317 lines) - Expo push notification service
- ✅ `apps/api/src/routes/mobile/push.routes.ts` (208 lines) - Push token registration API
- ✅ `apps/mobile/src/services/notify.ts` (185 lines) - Client-side push notification handling
- ✅ `apps/mobile/src/services/offline.ts` (148 lines) - AsyncStorage cache with 24h TTL
- ✅ `apps/mobile/app.json` - Updated with deep linking, push config, permissions
- ✅ `apps/mobile/package.json` - Added expo-notifications, expo-device, expo-linking, @react-native-async-storage/async-storage
- ✅ `apps/mobile/App.tsx` - Deep linking integration, notification listeners, auto push token registration
- ✅ `apps/mobile/assets/README.md` - Asset specifications (icon, splash, adaptive-icon, etc.)

**Track B - Stripe Documentation**:
- ✅ `SETUP.md` - Added comprehensive Stripe setup section (258 lines)
- ✅ `.env.sample` - Updated with Stripe and Expo environment variables

**Track C - Testing + Accessibility**:
- ✅ `apps/dashboard/playwright.config.ts` - Playwright configuration for E2E testing
- ✅ `apps/dashboard/tests/e2e/pricing-checkout.spec.ts` (200+ lines) - Comprehensive pricing page tests
- ✅ `docs/accessibility.md` (400+ lines) - WCAG 2.1 Level AA compliance guidelines

**Track D - Observability + Runbooks**:
- ✅ `ops/prometheus_alerts.yml` (350+ lines) - 30+ alert rules across 9 categories
- ✅ `ops/incident_response.md` (600+ lines) - Comprehensive incident runbook
- ✅ `ops/billing_ops.md` (550+ lines) - Billing operations and troubleshooting guide

**Total Lines Added**: ~2,800 lines across 16 files

### Deployment Checklist

**Pre-Launch**:
- [ ] Create Stripe products and prices (4 products × 2 prices)
- [ ] Configure Stripe webhooks (production endpoint)
- [ ] Set up Expo access token for push notifications
- [ ] Create mobile app assets (icon, splash, adaptive-icon)
- [ ] Configure EAS Build with Expo project ID
- [ ] Run database migrations (push_tokens table)
- [ ] Set all environment variables in production
- [ ] Run Playwright E2E tests (expect 100% pass)
- [ ] Run Lighthouse audit on /pricing (target: 95+ accessibility)
- [ ] Load Prometheus alert rules
- [ ] Test incident escalation procedures
- [ ] Configure PagerDuty integration
- [ ] Train support team on billing ops runbook

**Launch Day**:
- [ ] Deploy API with push notification endpoints
- [ ] Deploy dashboard with Playwright tests passing
- [ ] Submit mobile app to App Store (iOS) and Play Store (Android)
- [ ] Enable Prometheus alerts
- [ ] Monitor metrics dashboard for anomalies
- [ ] Have on-call engineer ready for incidents

**Post-Launch**:
- [ ] Monitor trial-to-paid conversion rates (target: > 15%)
- [ ] Track mobile app downloads and active users
- [ ] Review billing failure rates (target: < 5%)
- [ ] Analyze push notification open rates
- [ ] Conduct weekly incident review meetings
- [ ] Update runbooks based on new learnings
- [ ] Optimize API performance based on p95 latency
- [ ] Scale infrastructure as needed

### Technical Debt and Future Improvements

**Sprint 77+**:
- Implement rate limiting on mobile APIs (prevent abuse)
- Add Redis caching layer for mobile endpoints (reduce DB load)
- Create mobile app Detox tests (native UI testing)
- Implement Lighthouse CI in GitHub Actions (automated performance testing)
- Add Sentry release tagging for better error tracking
- Create executive dashboard PDF export feature
- Implement A/B testing framework for pricing experiments
- Add real-time Stripe webhook verification (prevent replay attacks)
- Create automated billing reconciliation reports
- Implement customer health scoring (predict churn)

---

