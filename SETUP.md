# Pravado Platform - Setup Guide

## Quick Start

### Prerequisites
- Node.js 18.x or higher
- pnpm 8.x or higher
- Supabase CLI
- Docker (for local Supabase)
- Redis (local or Upstash)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd pravado-platform
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Configure environment variables**
```bash
cp .env.sample .env
# Edit .env with your configuration
```

4. **Start Supabase locally**
```bash
cd apps/api
supabase start
# Note the anon key and service role key from output
```

5. **Generate database types**
```bash
pnpm db:types
```

6. **Start development servers**
```bash
# In separate terminals:
pnpm dev
```

## Project Structure

```
pravado-platform/
├── apps/
│   ├── api/              # Express + Supabase backend
│   ├── dashboard/        # Next.js 14 frontend (Cloudflare Pages)
│   └── agents/           # Agent execution engine
├── packages/
│   ├── design-system/    # Shared UI components
│   ├── shared-types/     # TypeScript types
│   └── utils/            # Shared utilities
└── docs/                 # Documentation
```

## Deployment

### Backend API
Deploy to any Node.js hosting platform. Configure Supabase production credentials.

### Frontend Dashboard
Deploy to Cloudflare Pages:
```bash
cd apps/dashboard
pnpm build
# Connect to Cloudflare Pages via dashboard or CLI
```

### Database
Use Supabase managed PostgreSQL or self-host.

## Development Workflow

1. Create feature branch
2. Make changes
3. Run tests: `pnpm test`
4. Run linting: `pnpm lint`
5. Build: `pnpm build`
6. Create pull request

## Additional Resources

- [Architecture Documentation](./docs/ARCHITECTURE.md)
- [Agent Framework](./docs/AGENT_FRAMEWORK.md)
- [Design System](./docs/DESIGN_SYSTEM.md)
