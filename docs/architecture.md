# Pravado Architecture Overview

This document outlines the high-level system architecture for Pravado's AI-first orchestration platform. It uses a modular monorepo structure to enable scalable, secure, and AI-integrated development across frontend, backend, and agent layers.

---

## 🧱 Monorepo Structure

apps/
├── dashboard # Next.js frontend app
├── api # Node.js + Express/Fastify backend with Prisma
├── agents # AI agent runner app
packages/
├── design-system # Shared Tailwind + shadcn UI components
├── shared-types # TypeScript types for FE/BE/Agents
├── utils # Shared utilities

markdown
Copy code

---

## 🛠 Backend (apps/api)

- **Framework**: Node.js (Express or Fastify)
- **ORM**: Prisma (PostgreSQL)
- **Auth**: JWT with RBAC roles
- **Queue**: Redis for agent task execution
- **Middleware**:
  - Auth
  - API rate limiter
  - Agent task logging
  - Retry and escalation controller

---

## 🎨 Frontend (apps/dashboard)

- **Framework**: Next.js 14+ (App Router)
- **Styling**: TailwindCSS, shadcn/ui
- **Component Source**: `packages/design-system`
- **Routing**: File-based routing w/ layout slots
- **State Management**: React Server Components (RSC) with optional client providers

---

## 🤖 Agents (apps/agents)

- **Language**: TypeScript
- **LLMs**: OpenAI GPT-4 (with fallback to Claude if needed)
- **Orchestration**: AUTOMATE runtime with shared types
- **Execution Flow**:
  1. Receives task via Redis queue
  2. Builds AgentContext
  3. Calls planning LLM or continues strategy
  4. Escalates or returns AgentOutput
- **Logging**: Each step is persisted for audit + feedback

---

## 🗃 Database Models

Key Prisma schemas include:

- `User`, `Account`, `Role`
- `Contact` (media, influencer, KOL)
- `Campaign`, `ContentItem`, `PressRelease`
- `SEOKeywordCluster`, `SEOAudit`
- `AgentTaskLog`, `AgentEscalation`
- `StrategyPlan`, `ContentCalendarEvent`

---

## 🔐 Security Layers

- Enforced RBAC via middleware
- API throttling for abuse prevention
- Audit logs of agent and human actions
- Multi-tenant ready

---
