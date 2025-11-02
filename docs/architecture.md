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
