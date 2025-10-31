# Pravado AI Platform

Pravado is an AI-first, multi-pillar brand growth platform designed to unify Public Relations, Content Marketing, and SEO into an intelligent orchestration engine. Built for flexibility, it adapts to solopreneurs, SMBs, and enterprises via Autopilot (automated), Copilot (AI-assisted), and Manual (expert-led) workflows.

This monorepo hosts the full codebase for the platform — backend services, frontend apps, agent orchestration, and shared systems.

---

## 🧭 Overview

- 🧠 **AI-Orchestrated Workflows** – PR, SEO, and Content powered by autonomous agents and LLMs
- 🛠 **Composable Design System** – Shared UI library powered by Tailwind + shadcn/ui
- 🔒 **Enterprise-Ready Architecture** – RBAC, audit logs, multi-tenant structure
- 🚀 **Trial-Onboarding Intelligence** – Automated strategic setup in 14-day free trial
- 📡 **Real-Time Agent System** – Modular execution and escalation via AUTOMATE
- 🎙 **CiteMind Engine** – Converts content into podcast/audio, submits to AI indexes and media

---

## 📁 Monorepo Structure

apps/
├── dashboard # Next.js 14 web application
├── api # Node.js backend w/ Prisma, Redis, Auth
├── agents # Agent task execution engine
packages/
├── design-system # Shared UI component library
├── shared-types # Global TypeScript types/interfaces
├── utils # Shared logic (date, parsing, validators)
docs/
├── ARCHITECTURE.md # System design and modular breakdown
├── AGENT_FRAMEWORK.md# AI orchestration and agent lifecycle
├── DESIGN_SYSTEM.md # UI standards and token usage

yaml
Copy code

---

## 🧪 Tech Stack

| Layer       | Tech Stack                         |
|-------------|------------------------------------|
| Frontend    | Next.js 14 (App Router), Tailwind, shadcn/ui |
| Backend     | Node.js, Express or Fastify, Prisma, PostgreSQL |
| Agents      | TypeScript + OpenAI API + Redis queues |
| Infra       | Redis, S3, Postgres, Vercel, Render/Fly.io |
| Dev Tools   | Turborepo, Jest/Vitest, Storybook  |

---

## 🔐 Core Principles

- **Real Data Only**: Absolutely no mock data in production flows
- **Agent-First Execution**: Modular, queueable, and auditable AI agents
- **Trial-Driven Value**: Trial onboarding generates strategic plans + instant ROI
- **Secure by Default**: Role-based permissions, campaign sandboxing, anti-spam protection
- **Extensibility**: Designed for white-labeling and future integrations

---

## 🧠 AI Agent Roles

| Agent                 | Role Description                                |
|-----------------------|--------------------------------------------------|
| `DraftAgent`          | Writes articles, press releases, briefs         |
| `QAValidatorAgent`    | Validates tone, clarity, SEO, style guides      |
| `OutreachAgent`       | Generates targeted outreach emails              |
| `CiteMindAgent`       | Formats content for podcast + LLM indexing      |
| `StrategySynthAgent`  | Synthesizes onboarding into strategic plans     |

---

## 🚧 Getting Started

```bash
# Clone repo
git clone https://github.com/your-org/pravado-core.git
cd pravado-core

# Install packages
pnpm install

# Setup env
cp .env.sample .env

# Run dev
pnpm dev
📚 Documentation
ARCHITECTURE.md — Full system breakdown

AGENT_FRAMEWORK.md — Agent lifecycle + orchestration

DESIGN_SYSTEM.md — UI usage and token rules

👥 Maintainers
Founder: @yourname

Lead Architect: [@yourAIassistant 🤖]

📃 License
All code is © Pravado, Inc. IP protection in progress.
Do not copy, fork, or redistribute without written consent.
