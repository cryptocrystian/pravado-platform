# Pravado Agent Framework (AUTOMATE)

This document explains the internal orchestration system for Pravado’s autonomous and copilot agents. It is powered by a queue-first architecture and governed by the SAGE framework and AUTOMATE runtime.

---

## 🧠 Agent Philosophy

Agents are autonomous services that complete modular tasks:
- Strategy planning
- Content drafting
- Outreach generation
- QA review
- SEO optimization
- Orchestration + escalation

Each agent:
- Receives inputs in a normalized structure
- Uses LLM + logic for decision-making
- Logs each action with metadata
- Can call other agents recursively

---

## 🔁 Agent Lifecycle

1. **Task Received** (via Redis)
2. **Context Built** (`AgentContext`)
3. **LLM Call or Plan Execution** (`AgentPlan`)
4. **Output Returned** (`AgentOutput`)
5. **Escalation Logic Checked**
6. **Log Persisted**

---

## 🧱 Agent Types

| Agent                 | Function                            |
|-----------------------|-------------------------------------|
| `StrategySynthAgent`  | Onboarding → strategy plan          |
| `QAValidatorAgent`    | Tone, SEO, structure validation     |
| `OutreachAgent`       | Targeted email/pitch writing        |
| `CiteMindAgent`       | Format for podcast + LLM ingestion  |
| `ContentDraftAgent`   | Writes articles, posts, PRs         |
| `SEOOptimizerAgent`   | Metadata + structural fixes         |

---

## 🧩 Shared Types

| Type              | Description                              |
|-------------------|------------------------------------------|
| `AgentTask`       | Payload submitted to queue               |
| `AgentContext`    | Includes user, campaign, tone, etc       |
| `AgentPlan`       | Multi-step strategy or sub-tasks         |
| `AgentOutput`     | Final result or escalated decision       |
| `AgentLog`        | DB persistence of all decisions          |

---

## 🛠 Integration Notes

- Agents are triggered via frontend actions, cron jobs, or internal events.
- All agents follow the `AUTOMATE.run(task: AgentTask)` API.
- Fallback logic supports multiple LLMs (GPT-4, Claude, etc).
- Supports reactive (copilot) and proactive (autonomous) flows.

---
