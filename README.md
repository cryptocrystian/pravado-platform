# Pravado Platform

**Version:** 1.0.0 | **Status:** Production Ready 🚀

AI-powered PR, content, and SEO orchestration platform with agentic workflows, role-based access control, content moderation, and production-grade monitoring.

---

## 📖 Table of Contents

- [Overview](#overview)
- [Core Features](#core-features)
- [Architecture](#architecture)
- [Multi-Tenant Model](#multi-tenant-model)
- [Admin Capabilities](#admin-capabilities)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Compatibility Matrix](#compatibility-matrix)
- [Documentation](#documentation)
- [Security](#security)
- [License](#license)

---

## 🎯 Overview

Pravado is a comprehensive, enterprise-grade platform designed to streamline and automate PR, content marketing, and SEO operations using advanced AI agents. The platform enables teams to orchestrate complex workflows, generate high-quality content, and execute data-driven strategies at scale with production-hardened security, moderation, and monitoring capabilities.

### Key Highlights

- ✅ **Production-Ready**: 600+ automated verification checks, 100% pass rate
- ✅ **Role-Based Access Control**: 5 hierarchical admin roles, 26 granular permissions
- ✅ **Content Moderation**: AI-powered abuse detection with configurable thresholds
- ✅ **Agent Debugging**: Detailed execution traces with performance insights
- ✅ **System Control**: Emergency lockdown, health monitoring, production flags
- ✅ **Multi-Tenant**: Complete tenant isolation with Row Level Security (RLS)
- ✅ **Comprehensive Audit Trail**: 90-day retention with CSV export

---

## 🚀 Core Features

### Content & Campaign Management
- **AI-Powered Content Generation**: Automated creation of blog posts, press releases, social media content
- **PR Campaign Management**: End-to-end PR campaigns with media contact tracking and outreach automation
- **SEO Optimization**: Keyword research, content optimization, and performance tracking
- **Multi-Channel Distribution**: Unified platform for websites, social media, email

### AI Agent System
- **Agentic Workflows**: Intelligent agents that plan, execute, and adapt strategies
- **Agent Orchestration**: Custom SAGE & AUTOMATE frameworks
- **Multi-Agent Collaboration**: Agents working together on complex tasks
- **Performance Tracking**: Real-time agent activity monitoring

### Admin & Security (Sprint 60)
- **Role-Based Access Control (RBAC)**: 5 hierarchical roles (super_admin, admin, analyst, support, moderator)
- **26 Granular Permissions**: Across 6 categories (analytics, moderation, debug, access_control, agents, system)
- **Admin Console**: 8-tab unified dashboard with nested navigation
- **Comprehensive Audit Trail**: All administrative actions logged with 90-day retention
- **User Management**: Assign/remove roles with approval workflow

### Content Moderation (Sprint 58)
- **Real-Time Moderation Queue**: Content review with filtering and bulk actions
- **AI-Powered Abuse Detection**: Configurable thresholds across 6 categories
  - Harassment, hate speech, violence, sexual content, spam, self-harm
- **Automated Moderation**: Auto-approve (0.2), Auto-reject (0.8), Escalation (0.9)
- **Escalation System**: Priority-based routing to appropriate admin roles
- **Complete Action History**: Full audit trail of all moderation decisions

### Agent Debugging & Explainability (Sprint 59)
- **Trace Logging**: Detailed execution traces for agent conversations
- **Debug Explorer**: Interactive trace viewer with search and filtering
- **Performance Insights**: Response time tracking and bottleneck identification
- **Error Tracking**: Comprehensive error logging and analysis
- **30-Day Retention**: Automatic cleanup of old trace data

### Production Hardening (Sprint 61)
- **System Lockdown**: Emergency lockdown mode affecting API, webhooks, agents, conversations
- **Production Flags**: 5 runtime-toggleable feature flags
  - `ENABLE_PUBLIC_API_ACCESS` - Control unauthenticated access
  - `DISABLE_MODERATION_AUTOFLOW` - Manual moderation override
  - `AUDIT_LOGGING_ENABLED` - Comprehensive logging (default: true)
  - `TRACE_LOGGING_ENABLED` - Debug traces (default: false)
  - `RATE_LIMIT_TUNING_MODE` - Testing without enforcement
- **Health Monitoring**: Multi-component checks (DB, Redis, OpenAI, Storage)
- **Configuration Sync**: Drift detection across 4 categories
- **70-Item Production Checklist**: 100% complete

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       PRAVADO PLATFORM                          │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Dashboard      │────▶│   API Gateway    │────▶│   Database       │
│  (Cloudflare)    │     │   (Node.js)      │     │   (Supabase)     │
│   Next.js 14     │     │   Express        │     │   PostgreSQL     │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
           ┌────────▼────┐  ┌────▼────┐  ┌─────▼──────┐
           │ AI Services │  │  Redis  │  │   Storage  │
           │   OpenAI    │  │  Queue  │  │  Supabase  │
           │  Anthropic  │  │  Cache  │  │    CDN     │
           └─────────────┘  └─────────┘  └────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     ADMIN CONSOLE (8 TABS)                      │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┤
│ Overview │ Tenants  │  Agents  │  Errors  │  Perf    │  Moder   │
├──────────┴──────────┴──────────┴──────────┴──────────┴──────────┤
│  Debug Tools       │  Access Controls                           │
└────────────────────┴───────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   SECURITY & MONITORING                         │
├──────────────────┬──────────────────┬─────────────────────────┤
│  Row Level       │   Audit Logs     │   Health Checks        │
│  Security (RLS)  │   90-day TTL     │   /api/system/health   │
└──────────────────┴──────────────────┴─────────────────────────┘
```

### Key Architectural Principles

1. **Multi-Tenant Isolation**: Complete data isolation using PostgreSQL Row Level Security (RLS)
2. **Microservices-Ready**: Modular design enables easy service extraction
3. **API-First**: All functionality exposed through RESTful APIs
4. **Event-Driven**: Redis queue for async task processing
5. **Stateless**: Horizontal scaling supported via stateless API design
6. **Zero-Downtime Deployments**: Health and readiness probes for orchestration

---

## 🏢 Multi-Tenant Model

Pravado implements a comprehensive multi-tenant architecture with complete data isolation:

### Tenant Isolation

```typescript
// All database tables include tenant_id
CREATE TABLE campaigns (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  ...
);

// Row Level Security (RLS) enforces isolation
CREATE POLICY tenant_isolation ON campaigns
  FOR ALL
  USING (tenant_id = auth.tenant_id());
```

### Features

- **Complete Data Isolation**: RLS policies on all 50+ tables
- **Per-Tenant Configuration**: Custom rate limits, moderation thresholds
- **Tenant-Level Analytics**: Isolated metrics and reporting
- **Shared Resources**: Optimized multi-tenant OpenAI usage
- **Cross-Tenant Admin**: Super admins can view all tenants

### Tenant Lifecycle

1. **Onboarding**: Automated tenant provisioning
2. **Configuration**: Custom settings and preferences
3. **Usage Tracking**: Per-tenant resource consumption
4. **Offboarding**: Secure data deletion with audit trail

---

## 👨‍💼 Admin Capabilities

### Role Hierarchy

```
┌──────────────────────────────────────────────────┐
│ SUPER ADMIN (Full System Control)               │
│ - All 26 permissions                            │
│ - Role management                               │
│ - System lockdown                               │
│ - Production flags                              │
└──────────────────────────────────────────────────┘
                    │
┌───────────────────┴──────────────────┐
│ ADMIN (Administrative Access)        │
│ - 20 permissions                     │
│ - User management                    │
│ - Analytics export                   │
│ - Agent management                   │
└──────────────────────────────────────┘
         │                    │
┌────────▼────────┐  ┌────────▼────────┐
│ ANALYST         │  │ SUPPORT         │
│ - 9 permissions │  │ - 8 permissions │
│ - Analytics     │  │ - Moderation    │
│ - Reports       │  │ - User support  │
└─────────────────┘  └─────────────────┘
                    │
          ┌─────────▼─────────┐
          │ MODERATOR         │
          │ - 5 permissions   │
          │ - Content review  │
          │ - Queue actions   │
          └───────────────────┘
```

### Admin Console Features

**8 Tabs:**
1. **Overview** - System metrics, tenant activity, real-time stats
2. **Tenant Activity** - Per-tenant usage, analytics, campaigns
3. **Agent Activity** - Agent performance, conversation logs
4. **Error Explorer** - System errors, debugging, logs
5. **Performance** - Response times, throughput, bottlenecks
6. **Moderation** - Content queue, actions, escalations
7. **Debug Tools** - Trace logs, execution details, search
8. **Access Controls** - Role assignment, permission matrix, audit trail

**Key Capabilities:**
- Real-time dashboard metrics
- CSV export for all data
- Advanced filtering and search
- Bulk actions for efficiency
- Comprehensive audit logging
- Multi-tab workflow support

---

## 💻 Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router) - Deployed to Cloudflare Pages
- **Language**: TypeScript 5.0+
- **Styling**: Tailwind CSS 3.3+, Material-UI (MUI) 5.14+
- **State Management**: React Query, Zustand
- **UI Components**: shadcn/ui, custom Material-UI components
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts, Chart.js

### Backend
- **Runtime**: Node.js 18.x+ with Express 4.18+
- **Database**: Supabase (PostgreSQL 15.x)
- **ORM/Client**: Supabase Client, native PostgreSQL functions
- **Queue**: Redis/Upstash with BullMQ (optional)
- **Authentication**: Supabase Auth (JWT)
- **File Storage**: Supabase Storage with CDN

### AI/ML
- **OpenAI**: GPT-4 Turbo Preview (primary)
- **Anthropic**: Claude 3 Opus (optional)
- **Agent Framework**: Custom SAGE & AUTOMATE orchestration
- **Embeddings**: OpenAI text-embedding-3-small
- **Vector Search**: pgvector extension (Supabase)

### Infrastructure
- **Frontend Hosting**: Cloudflare Pages
- **API Hosting**: Vercel, Railway, Render, Fly.io, AWS ECS
- **Database**: Supabase managed PostgreSQL
- **Cache/Queue**: Upstash Redis or self-hosted
- **CDN**: Cloudflare, Supabase Storage CDN
- **Monitoring**: Sentry, StatusCake, Datadog (optional)

### DevOps
- **Monorepo**: Turborepo for fast builds and caching
- **Package Manager**: pnpm with workspaces
- **Testing**: Vitest for unit tests, Playwright for E2E
- **Linting**: ESLint + Prettier
- **CI/CD**: GitHub Actions
- **Version Control**: Git with semantic versioning

---

## 📁 Project Structure

```
pravado-platform/
├── apps/
│   ├── api/                    # Express + Supabase backend
│   │   ├── src/
│   │   │   ├── config/        # productionFlags.ts, supabase.ts
│   │   │   ├── middleware/    # lockdown.middleware.ts, auth
│   │   │   ├── routes/        # system-control.ts, admin-access.ts
│   │   │   ├── services/      # systemControlService.ts, roleAccessService.ts
│   │   │   └── index.ts       # Express app entry point
│   │   ├── supabase/
│   │   │   └── migrations/    # 60+ SQL migration files
│   │   └── package.json
│   ├── dashboard/             # Next.js 14 frontend (Cloudflare Pages)
│   │   ├── src/
│   │   │   ├── components/    # UI components
│   │   │   │   ├── admin/
│   │   │   │   │   ├── access/      # RoleTag, PermissionMatrix, etc.
│   │   │   │   │   ├── debug/       # TraceViewer, DebugExplorer
│   │   │   │   │   └── moderation/  # ModerationQueue, ActionButtons
│   │   │   ├── hooks/         # useAdminAccessAPI, useDebugAPI
│   │   │   ├── pages/
│   │   │   │   ├── admin-console/   # 8-tab admin dashboard
│   │   │   │   │   ├── access/      # 3 access control tabs
│   │   │   │   │   ├── debug/       # 2 debug tabs
│   │   │   │   │   └── moderation/  # Moderation tabs
│   │   │   └── app/           # Next.js App Router
│   │   └── package.json
│   └── agents/                # Agent execution engine
│       ├── src/
│       │   ├── agents/        # Agent implementations
│       │   ├── prompts/       # Prompt templates
│       │   └── orchestration/ # SAGE & AUTOMATE
│       └── package.json
├── packages/
│   ├── shared-types/          # TypeScript types and interfaces
│   │   ├── src/
│   │   │   ├── admin-access.ts    # RBAC types
│   │   │   ├── moderation.ts      # Moderation types
│   │   │   ├── agent-debug.ts     # Debug types
│   │   │   └── system-control.ts  # System control types
│   │   └── package.json
│   ├── design-system/         # Shared UI components
│   └── utils/                 # Shared utilities
├── deployment/
│   ├── production-manifest.md      # Complete deployment guide
│   └── credentials-checklist.md    # All required secrets
├── docs/
│   ├── architecture.md        # Architecture overview
│   ├── agent_framework.md     # Agent system docs
│   └── design_system.md       # Design system docs
├── scripts/
│   ├── tag-v1.0.0.sh         # Git tagging script
│   ├── bootstrap-runtime.ts   # Runtime initialization
│   ├── sync-production-config.js  # Config sync
│   └── verify-sprint*.js      # Verification scripts
├── .config-sync.json         # Configuration snapshot
├── CHANGELOG.md              # v1.0.0 release notes
├── EMERGENCY_PROTOCOLS.md    # Emergency procedures
├── PRODUCTION_CHECKLIST.md   # 70-item checklist (100% complete)
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: 18.x or higher (LTS recommended)
- **pnpm**: 8.x or higher
- **PostgreSQL**: 15.x (via Supabase)
- **Redis**: Optional, for background jobs
- **OpenAI API Key**: Required for AI features

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_ORG/pravado-platform.git
cd pravado-platform

# 2. Install dependencies
pnpm install

# 3. Copy environment variables
cp .env.sample .env

# 4. Configure environment variables (see deployment/credentials-checklist.md)
# Required:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - OPENAI_API_KEY
# - JWT_SECRET
# - SESSION_SECRET

# 5. Set up Supabase project
cd apps/api
# Follow Supabase setup instructions

# 6. Apply database migrations
psql $DATABASE_URL < supabase/migrations/*.sql

# 7. Run configuration sync
node scripts/sync-production-config.js

# 8. Bootstrap runtime (populate default roles/permissions)
ts-node scripts/bootstrap-runtime.ts

# 9. Start development servers
cd ../..
pnpm dev

# API: http://localhost:3001
# Dashboard: http://localhost:3000
```

### Development

```bash
# Start all services
pnpm dev

# Start specific app
pnpm dev --filter api
pnpm dev --filter dashboard

# Run tests
pnpm test

# Run verification scripts
node scripts/verify-sprint61-phase5.8.js
node scripts/verify-sprint60-phase5.7-frontend.js

# Build for production
pnpm build
```

---

## 📦 Deployment

See [deployment/production-manifest.md](./deployment/production-manifest.md) for complete deployment instructions.

### Quick Deployment Guide

#### 1. Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Supabase project created
- [ ] OpenAI API key obtained
- [ ] Storage buckets created
- [ ] Domain names registered
- [ ] SSL certificates provisioned

#### 2. Database Setup

```bash
# Apply migrations
cd apps/api
psql $DATABASE_URL < supabase/migrations/*.sql

# Verify migrations
node scripts/verify-migrations.js

# Bootstrap runtime
ts-node scripts/bootstrap-runtime.ts
```

#### 3. API Deployment

**Recommended Platforms:** Vercel, Railway, Render, Fly.io, AWS ECS

```bash
cd apps/api
pnpm install --prod
pnpm build

# Set environment variables on hosting platform
# Deploy (platform-specific)

# Verify
curl https://api.pravado.com/api/system/health
curl https://api.pravado.com/api/system/readiness
```

#### 4. Frontend Deployment (Cloudflare Pages)

```bash
cd apps/dashboard
pnpm install --prod
pnpm build

# Deploy to Cloudflare Pages
# (Automatic via Git integration or manual upload)

# Verify
curl https://app.pravado.com
```

#### 5. Post-Deployment Verification

```bash
# System health
curl https://api.pravado.com/api/system/health | jq

# Production readiness
curl https://api.pravado.com/api/system/production-readiness | jq

# Configuration sync status
curl https://api.pravado.com/api/system/config-sync | jq
```

### Production Health Endpoints

| Endpoint | Purpose | Expected Status |
|----------|---------|-----------------|
| `GET /api/system/health` | Health check | 200 (healthy) |
| `GET /api/system/readiness` | Readiness probe | 200 (ready: true) |
| `GET /api/system/status` | Complete system status | 200 |
| `GET /api/system/production-readiness` | 70-item checklist | 200 (100%) |

---

## 🔧 Compatibility Matrix

| Component | Version | Minimum | Recommended |
|-----------|---------|---------|-------------|
| **Node.js** | 18.x - 20.x | 18.0.0 | 20.11.0 (LTS) |
| **pnpm** | 8.x - 9.x | 8.0.0 | 9.0.0 |
| **TypeScript** | 5.x | 5.0.0 | 5.3.3 |
| **React** | 18.x | 18.2.0 | 18.2.0 |
| **Next.js** | 14.x | 14.0.0 | 14.1.0 |
| **PostgreSQL** | 15.x | 15.0 | 15.5 (Supabase) |
| **Redis** | 7.x | 7.0.0 | 7.2.0 (optional) |
| **Material-UI** | 5.x | 5.14.0 | 5.15.0 |
| **Express** | 4.x | 4.18.0 | 4.18.2 |

### Browser Support

| Browser | Version |
|---------|---------|
| Chrome | Last 2 versions |
| Firefox | Last 2 versions |
| Safari | Last 2 versions |
| Edge | Last 2 versions |

### API Compatibility

- **OpenAI API**: Compatible with GPT-4 Turbo, GPT-4, GPT-3.5 Turbo
- **Anthropic API**: Compatible with Claude 3 Opus, Sonnet, Haiku
- **Supabase**: Compatible with v2.x PostgreSQL client

---

## 📚 Documentation

### User Guides
- [Setup Guide](./SETUP.md) - Complete setup instructions
- [Architecture Overview](./docs/architecture.md) - System architecture
- [Agent Framework](./docs/agent_framework.md) - AI agent system
- [Design System](./docs/design_system.md) - UI components and guidelines

### Operations
- [Production Deployment](./deployment/production-manifest.md) - Complete deployment guide
- [Production Checklist](./PRODUCTION_CHECKLIST.md) - 70-item readiness checklist
- [Emergency Protocols](./EMERGENCY_PROTOCOLS.md) - Emergency procedures
- [Credentials Checklist](./deployment/credentials-checklist.md) - All required secrets

### Development
- [CHANGELOG](./CHANGELOG.md) - Release notes and version history
- [Contributing](./CONTRIBUTING.md) - Contribution guidelines (if applicable)

### API Documentation
- System Control API - `/api/system/*` endpoints
- Admin Access API - `/api/admin-access/*` endpoints
- Moderation API - `/api/moderation/*` endpoints
- Agent Debug API - `/api/agent-debug/*` endpoints

---

## 🔒 Security

### Authentication & Authorization
- **JWT Tokens**: Bearer token authentication for all API requests
- **Role-Based Access Control**: 5 hierarchical roles with 26 granular permissions
- **Row Level Security (RLS)**: Database-level tenant isolation
- **Session Management**: Secure session handling with configurable expiration

### Data Protection
- **Encryption**: All data encrypted at rest (Supabase) and in transit (TLS 1.3)
- **Audit Logging**: Comprehensive logs of all administrative actions (90-day retention)
- **IP Tracking**: All system control actions logged with IP address
- **Secrets Management**: Environment variables, no hardcoded secrets

### Security Features
- **System Lockdown**: Emergency lockdown mode for security incidents
- **Production Flags**: Runtime control over security-sensitive features
- **Rate Limiting**: Configurable rate limits per endpoint type
- **Input Validation**: Zod schemas for all user inputs
- **CORS Protection**: Configurable CORS with credentials support
- **Security Headers**: Helmet.js for security headers

### Compliance
- **Audit Trail**: Complete audit logs for compliance reporting
- **Data Retention**: Configurable retention policies (audit: 90 days, traces: 30 days)
- **GDPR Considerations**: Data privacy controls and user data export
- **SOC 2 Ready**: Comprehensive logging and access controls

### Vulnerability Management
- **Dependency Scanning**: Automated dependency updates and vulnerability scanning
- **Security Updates**: Monthly security patch review
- **Penetration Testing**: Recommended annually
- **Incident Response**: See EMERGENCY_PROTOCOLS.md

---

## 📊 Monitoring & Observability

### Health Monitoring
- **Endpoint**: `GET /api/system/health`
- **Components**: Database, Redis, OpenAI API, Storage
- **Interval**: 60 seconds (recommended)
- **Alert Threshold**: 2 consecutive failures

### Error Tracking
- **Platform**: Sentry (recommended)
- **Sample Rate**: 10-20% in production
- **Alert Thresholds**:
  - Error rate > 10 errors/minute
  - 5xx rate > 1% of requests
  - Response time > 2 seconds (95th percentile)

### Metrics
- **API Response Times**: Tracked per endpoint
- **Database Query Performance**: Slow query logging (>1 second)
- **Agent Performance**: Execution time and success rate
- **Moderation Queue**: Queue depth and processing time
- **User Activity**: Active users, sessions, API calls

---

## 🆘 Support

### Emergency Contacts
See [EMERGENCY_PROTOCOLS.md](./EMERGENCY_PROTOCOLS.md) for on-call contacts and escalation procedures.

### Resources
- **Documentation**: See `docs/` directory
- **Issues**: GitHub Issues (if applicable)
- **Slack/Discord**: Internal team communication

### Common Issues
See [deployment/production-manifest.md](./deployment/production-manifest.md) → Troubleshooting section

---

## 📄 License

Proprietary - All rights reserved

© 2025 Pravado. Unauthorized copying, modification, or distribution is prohibited.

---

## 🎉 Acknowledgments

Built with ❤️ using:
- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Database and auth
- [OpenAI](https://openai.com/) - AI capabilities
- [Material-UI](https://mui.com/) - UI components
- [Turborepo](https://turbo.build/) - Monorepo management

🤖 Developed with assistance from [Claude Code](https://claude.com/claude-code)

---

**Version:** 1.0.0 | **Last Updated:** 2025-11-17 | **Status:** Production Ready ✅
