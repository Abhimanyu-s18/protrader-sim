---
name: .github Documentation Index
description: Master index of all workspace instruction and reference documents
---

# ProTraderSim `.github` Documentation Index

**Complete guide to all documentation in the `.github/` directory.**

Navigate directly to what you need:

---

## 📚 Core Documentation (Start Here)

### For New Developers
1. **[WORKSPACE_INSTRUCTIONS.md](./WORKSPACE_INSTRUCTIONS.md)** ← START HERE
   - 30-minute onboarding  
   - Architecture overview
   - Quick commands
   - Financial precision rules
   - Key files to know

### For Using Agents
2. **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** — 1-page agent selector
   - Decision tree: "What do I want to do?"
   - 14 agents with activation keywords
   - Quick selection matrix

3. **[AGENTS.md](./AGENTS.md)** — Complete agent registry
   - All 14 agents listed
   - Tier 1-5 organization
   - Full descriptions
   - Links to individual agent files

4. **[AGENT_SKILLS_INTEGRATION.md](./AGENT_SKILLS_INTEGRATION.md)** — How it all works
   - Architecture of agents + skills
   - Skill loading process
   - Agent-to-skill mapping
   - Manual skill invocation

---

## 🛠️ Task Guides

### [COMMON_WORKFLOWS.md](./COMMON_WORKFLOWS.md) — Step-by-step how-tos
Pick your task 👇

| I Want To... | Location |
|---|---|
| Add a new API endpoint | [Workflow 1](./COMMON_WORKFLOWS.md#add-api-endpoint) |
| Create a new database table | [Workflow 2](./COMMON_WORKFLOWS.md#create-db-table) |
| Fix a financial calculation bug | [Workflow 3](./COMMON_WORKFLOWS.md#fix-calc-bug) |
| Optimize a slow query/endpoint | [Workflow 4](./COMMON_WORKFLOWS.md#optimize-query) |
| Build a new frontend feature | [Workflow 5](./COMMON_WORKFLOWS.md#build-frontend-feature) |
| Implement KYC document upload | [Workflow 6](./COMMON_WORKFLOWS.md#kyc-upload) |
| Build a deposit/withdrawal flow | [Workflow 7](./COMMON_WORKFLOWS.md#payment-flow) |
| Handle Socket.io real-time feature | [Workflow 8](./COMMON_WORKFLOWS.md#socket-feature) |
| Debug a production error | [Workflow 9](./COMMON_WORKFLOWS.md#debug-production) |
| Write comprehensive tests | [Workflow 10](./COMMON_WORKFLOWS.md#write-tests) |

---

## 🐛 Troubleshooting

### [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) — Diagnosis & fixes
Pick your symptom 👇

| Issue | Location |
|---|---|
| Environment & setup problems | [Section](./TROUBLESHOOTING.md#env-setup) |
| Database errors | [Section](./TROUBLESHOOTING.md#database) |
| API errors (500, 401, 400, 429) | [Section](./TROUBLESHOOTING.md#api-errors) |
| Financial calculation bugs | [Section](./TROUBLESHOOTING.md#calc-errors) |
| Socket.io & real-time issues | [Section](./TROUBLESHOOTING.md#socket-io) |
| Frontend component issues | [Section](./TROUBLESHOOTING.md#frontend) |
| Authentication & RBAC problems | [Section](./TROUBLESHOOTING.md#auth-rbac) |
| Payment & deposit issues | [Section](./TROUBLESHOOTING.md#payment) |
| Deployment & production errors | [Section](./TROUBLESHOOTING.md#deployment) |

---

## 🤖 Agent Files

Individual system prompts for each specialized agent.

### Tier 1: Coordination
- **[Orchestrator.agent.md](./agents/Orchestrator.agent.md)** — Master coordinator for multi-step tasks

### Tier 2-3: Architecture & Design
- **[Architect.agent.md](./agents/Architect.agent.md)** — System design & contracts
- **[Research.agent.md](./agents/Research.agent.md)** — Vendor research, compliance
- **[UI-UX-Designer.agent.md](./agents/UI-UX-Designer.agent.md)** — Interaction flows, wireframes

### Tier 3-4: Implementation
- **[Coding.agent.md](./agents/Coding.agent.md)** — Express.js backend implementation
- **[Frontend.agent.md](./agents/Frontend.agent.md)** — Next.js 15 React components
- **[Schema.agent.md](./agents/Schema.agent.md)** — Database design & migrations

### Tier 5: Quality
- **[Test.agent.md](./agents/Test.agent.md)** — Unit & integration tests
- **[Security.agent.md](./agents/Security.agent.md)** — Auth, KYC, payment security
- **[Code-Review.agent.md](./agents/Code-Review.agent.md)** — PR reviews & quality gates
- **[Debug.agent.md](./agents/Debug.agent.md)** — Error diagnosis & root cause
- **[Performance.agent.md](./agents/Performance.agent.md)** — Latency & throughput optimization
- **[Documentation.agent.md](./agents/Documentation.agent.md)** — READMEs, API docs
- **[Devops.agent.md](./agents/Devops.agent.md)** — Deployment & CI/CD

---

## 🎯 Domain Skills

Best practices & patterns for specialized areas. These load automatically with agents, but you can read them independently.

### Database & Data
- **[database-schema-design](./skills/database-schema-design/SKILL.md)** — Table design, BigInt, normalization, indexing

### Financial & Trading  
- **[bigint-money-handling](./skills/bigint-money-handling/SKILL.md)** — Convert dollars↔cents, precision, validation
- **[financial-calculations](./skills/financial-calculations/SKILL.md)** — P&L, margin, leverage with BigInt
- **[trading-calculations](./skills/trading-calculations/SKILL.md)** — Position sizing, margin calls, stop-out

### Backend API
- **[api-route-creation](./skills/api-route-creation/SKILL.md)** — Express.js: validation, error handling, responses
- **[orm-query-optimization](./skills/orm-query-optimization/SKILL.md)** — Prisma patterns, N+1 detection, indexes
- **[rbac-implementation](./skills/rbac-implementation/SKILL.md)** — Role hierarchy, permission checks

### Real-Time & Frontend
- **[socket-io-real-time](./skills/socket-io-real-time/SKILL.md)** — Room management, auth, subscription patterns
- **[state-management-trading](./skills/state-management-trading/SKILL.md)** — Zustand, React Query, Socket.io sync
- **[trading-ui-components](./skills/trading-ui-components/SKILL.md)** — Charts, tables, order forms, Terminal Precision

### Security & Compliance
- **[kyc-compliance-flow](./skills/kyc-compliance-flow/SKILL.md)** — Document upload, review, PII handling
- **[payment-integration](./skills/payment-integration/SKILL.md)** — Deposits, withdrawals, webhooks, idempotency

---

## 📖 Project Documentation

**See also**:
- `../../CLAUDE.md` — Developer identity & code preferences
- `../../docs/` — Business, compliance, and technical specs
  - Core Technical Specifications (API, database, calculations)
  - Compliance & Operations (KYC, trading rules)
  - UI/UX Specifications
  - Development Roadmap

---

## Quick Jump

**I'm...**

- [**New to ProTraderSim**](./WORKSPACE_INSTRUCTIONS.md#onboarding) → 30-minute onboarding
- [**Building a feature**](./COMMON_WORKFLOWS.md) → Find your workflow
- [**Stuck on an error**](./TROUBLESHOOTING.md) → Diagnosis & fix
- [**Picking an agent**](./QUICK_REFERENCE.md) → Quick selector
- [**Learning agent framework**](./AGENT_SKILLS_INTEGRATION.md) → Deep dive
- [**Reviewing code**](./agents/Code-Review.agent.md) → Invoke Code Review Agent
- [**Writing tests**](./agents/Test.agent.md) → Invoke Test Agent

---

## Using This Index

1. **Find your task/problem** in the tables above
2. **Click the link** to jump to the relevant section
3. **Follow the guide** step-by-step
4. **Invoke agents** as instructed in each workflow
5. **For new issues** → Add them to [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) or tell the team

---

## File Structure

```
.github/
├── INDEX.md                              ← You are here
├── WORKSPACE_INSTRUCTIONS.md             ← Start here (new devs)
├── QUICK_REFERENCE.md                    ← 1-page agent selector
├── AGENTS.md                             ← 14-agent registry
├── AGENT_SKILLS_INTEGRATION.md           ← How skills load with agents
├── COMMON_WORKFLOWS.md                   ← 10 step-by-step guides
├── TROUBLESHOOTING.md                    ← Error diagnosis & fixes
├── copilot-instructions.md               ← Project context for Copilot (linked from WORKSPACE_INSTRUCTIONS.md)
├── agents/                               ← 14 specialized agent system prompts
│   ├── Orchestrator.agent.md
│   ├── Architect.agent.md
│   ├── Research.agent.md
│   ├── UI-UX-Designer.agent.md
│   ├── Coding.agent.md
│   ├── Frontend.agent.md
│   ├── Schema.agent.md
│   ├── Test.agent.md
│   ├── Security.agent.md
│   ├── Code-Review.agent.md
│   ├── Debug.agent.md
│   ├── Performance.agent.md
│   ├── Documentation.agent.md
│   └── Devops.agent.md
└── skills/                               ← 12 domain-specific best practices
    ├── database-schema-design/SKILL.md
    ├── bigint-money-handling/SKILL.md
    ├── financial-calculations/SKILL.md
    ├── trading-calculations/SKILL.md
    ├── api-route-creation/SKILL.md
    ├── orm-query-optimization/SKILL.md
    ├── rbac-implementation/SKILL.md
    ├── socket-io-real-time/SKILL.md
    ├── state-management-trading/SKILL.md
    ├── trading-ui-components/SKILL.md
    ├── kyc-compliance-flow/SKILL.md
    └── payment-integration/SKILL.md
```

---

## Feedback & Updates

- **Found an issue not covered?** → Add to [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Need a new workflow?** → Create in [COMMON_WORKFLOWS.md](./COMMON_WORKFLOWS.md)
- **Found a broken link?** → File an issue
- **Agent or skill changed?** → Update the relevant `.agent.md` or `SKILL.md`

---

**Last updated**: March 28, 2026
