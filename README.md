# Pravado Platform

AI-powered PR, content, and SEO orchestration platform with agentic workflows.

## Overview

Pravado is a comprehensive platform designed to streamline and automate PR, content marketing, and SEO operations using advanced AI agents. The platform enables teams to orchestrate complex workflows, generate high-quality content, and execute data-driven strategies at scale.

## Core Features

- **AI-Powered Content Generation**: Automated creation of blog posts, press releases, social media content, and more
- **PR Campaign Management**: End-to-end management of PR campaigns with media contact tracking and outreach automation
- **SEO Optimization**: Keyword research, content optimization, and performance tracking
- **Agentic Workflows**: Intelligent agents that can plan, execute, and adapt strategies based on performance data
- **Multi-Channel Distribution**: Unified platform for managing content across websites, social media, email, and more

## Technology Stack

### Frontend
- **Next.js 14** (App Router) - Deployed to **Cloudflare Pages**
- TypeScript
- Tailwind CSS
- shadcn/ui components
- React Query for data fetching
- Zustand for state management

### Backend
- **Node.js** with Express
- **Supabase** (PostgreSQL database + Authentication)
- **Redis/Upstash** (Queue management with BullMQ)
- Supabase Row-Level Security (RLS)

### AI/ML
- OpenAI GPT-4
- Anthropic Claude
- Custom agent orchestration framework (SAGE & AUTOMATE)

### Infrastructure
- **Frontend**: Cloudflare Pages
- **Backend API**: Node.js hosting (Render/Fly.io/Railway)
- **Database**: Supabase managed PostgreSQL
- **Queue**: Redis (Upstash or self-hosted)

## Project Structure

```
pravado-platform/
├── apps/
│   ├── api/              # Express + Supabase backend
│   ├── dashboard/        # Next.js 14 frontend (Cloudflare Pages)
│   └── agents/           # Agent execution engine
├── packages/
│   ├── design-system/    # Shared UI components (Button, Input, Card, etc.)
│   ├── shared-types/     # TypeScript types and interfaces
│   └── utils/            # Shared utilities (date, format, validators, etc.)
├── docs/                 # Documentation
└── .github/workflows/    # CI/CD pipelines
```

## Getting Started

See [SETUP.md](./SETUP.md) for detailed setup instructions.

### Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.sample .env

# Start Supabase locally
cd apps/api && supabase start

# Generate database types
pnpm db:types

# Start all services in development mode
pnpm dev
```

## Documentation

- [Setup Guide](./SETUP.md)
- [Architecture Overview](./docs/architecture.md)
- [Agent Framework](./docs/agent_framework.md)
- [Design System](./docs/design_system.md)

## Key Technologies

- **Monorepo**: Turborepo for fast builds and caching
- **Package Manager**: pnpm with workspaces
- **Testing**: Vitest for unit tests
- **Linting**: ESLint + Prettier
- **Type Safety**: Full TypeScript coverage across all packages

## Deployment

### Frontend (Cloudflare Pages)
The Next.js dashboard is optimized for deployment to Cloudflare Pages using `@cloudflare/next-on-pages`.

```bash
cd apps/dashboard
pnpm pages:build
pnpm pages:deploy
```

### Backend API
Deploy to any Node.js hosting platform. Ensure Supabase production credentials are configured.

### Agent Worker
Run as a separate service that processes agent tasks from the Redis queue.

## Contributing

This is a private repository. Please ensure all changes go through PR review before merging to main.

## License

Proprietary - All rights reserved
