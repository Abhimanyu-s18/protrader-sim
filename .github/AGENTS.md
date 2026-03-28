---
name: "ProTrader Agent Framework"
description: "Master registry and coordination guide for the ProTrader AI agent ecosystem."
---

# ProTrader Agent Framework

## 🎯 Overview

This framework provides **7 specialized AI agents** that work together to optimize development of the ProTrader CFD trading platform. Each agent has deep expertise in a specific domain and coordinates with others through a central Orchestrator Agent.

**Key Principle**: Use the Orchestrator Agent as the entry point for complex tasks. It will automatically route to specialized agents and coordinate results.

---

## 👥 Agent Roster

### Tier 1: Coordination & Planning
| # | Agent | Role | Specialization | Location |
|---|-------|------|----------------|----------|
| 1 | **Orchestrator** ⭐ | Master coordinator | Task decomposition, agent routing, result aggregation, SLA tracking | [orchestrator.agent.md](orchestrator.agent.md) |

### Tier 2: Discovery & Architecture
| # | Agent | Role | Specialization | Location |
|---|-------|------|----------------|----------|
| 2 | **Research** | Market intelligence | Competitor analysis, regulatory tracking, vendor evaluation | [research.agent.md](research.agent.md) |
| 3 | **Architect** | System design | Architecture decisions, capacity planning, disaster recovery | [architect.agent.md](architect.agent.md) |

### Tier 3: Design & Frontend
| # | Agent | Role | Specialization | Location |
|---|-------|------|----------------|----------|
| 4 | **UI/UX Designer** | User experience | A/B testing, mobile patterns, dark mode, user analytics | [ui-ux-designer.agent.md](ui-ux-designer.agent.md) |
| 5 | **Frontend** | React/Next.js development | Performance budgets, accessibility scoring, state management | [frontend.agent.md](frontend.agent.md) |

### Tier 4: Backend Implementation
| # | Agent | Role | Specialization | Location |
|---|-------|------|----------------|----------|
| 6 | **Coding** | Backend implementation | Code generation, multi-database, advanced error handling | [coding.agent.md](coding.agent.md) |

### Tier 5: Quality & Operations
| # | Agent | Role | Specialization | Location |
|---|-------|------|----------------|----------|
| 7 | **Security** | Compliance & security | Vulnerability scanning, regulatory compliance, secrets management | [security.agent.md](security.agent.md) |
| 8 | **Test** | Quality assurance | Test generation, financial validation, coverage analysis | [test.agent.md](test.agent.md) |
| 9 | **Schema** | Data management | Database design, migrations, query optimization | [schema.agent.md](schema.agent.md) |
| 10 | **Debug** | Troubleshooting | Error diagnosis, root cause, regression analysis | [debug.agent.md](debug.agent.md) |
| 11 | **Code Review** | Quality gates | Static analysis, PR review, performance anti-patterns | [code-review.agent.md](code-review.agent.md) |
| 12 | **Documentation** | Knowledge mgmt | API docs, READMEs, changelogs, onboarding | [documentation.agent.md](documentation.agent.md) |
| 13 | **Performance** | Optimization | Profiling, latency tuning, load testing | [performance.agent.md](performance.agent.md) |
| 14 | **DevOps** | Deployment | CI/CD, infrastructure, secrets rotation | [devops.agent.md](devops.agent.md) |

**Total**: **14 specialized agents** covering full SDLC + Operations.

---

## 🚀 Quick Start

### For Feature Implementation
```
You: "Build a trailing stop loss feature"
       ↓
Orchestrator analyzes request
       ↓
├─ Research Agent: Gather best practices
├─ Architect Agent: Design schema & APIs
├─ UI/UX Designer: Design interaction flows
├─ Frontend Agent: Build React components
├─ Coding Agent: Implement APIs & database
       ↓
Result: Feature spec, design doc, component specs, code review checklist
```

### For Problem Solving
```
You: "The dashboard is loading slowly"
       ↓
Orchestrator analyzes
       ↓
├─ Research Agent: Gather performance benchmarks
├─ Architect Agent: Identify bottlenecks
├─ Coding Agent: Profile and optimize
       ↓
Result: Root cause analysis + optimization PR
```

---

## 📋 Common Agent Use Cases

### Research Agent → When You Need:
- ✅ Competitor benchmarking (features, performance, UI/UX)
- ✅ Market research (trader workflows, pain points)
- ✅ Technology landscape (CFD platforms, real-time systems)
- ✅ Regulatory guidance (FSC Mauritius, FSA Seychelles)
- ✅ Data source evaluation (market feeds, API costs)

**Activation**: Ask about market expectations, competitor features, compliance requirements

---

### Architect Agent → When You Need:
- ✅ System architecture design (monolith vs microservices)
- ✅ Database schema planning (ledger-based balance, trade lifecycle)
- ✅ API contract definition (REST endpoints, request/response shapes)
- ✅ Real-time architecture (Socket.io rooms, event patterns)
- ✅ Financial calculation strategy (BigInt workflows, precision validation)
- ✅ Scalability analysis (RPS estimates, concurrent connections)
- ✅ Failure mode analysis (margin calls, circuit breakers)

**Activation**: Ask to design a feature, evaluate architecture decisions, analyze scalability

---

### UI/UX Designer Agent → When You Need:
- ✅ User journey mapping (steps from goal to completion)
- ✅ Interaction design (gesture, keyboard, real-time feedback)
- ✅ Wireframes & prototypes (desktop, tablet, mobile layouts)
- ✅ Accessibility audit (WCAG compliance, keyboard navigation)
- ✅ Design system specifications (colors, typography, spacing)
- ✅ Mobile optimization (touch-friendly components, responsive)

**Activation**: Ask to design a screen/flow, optimize UX, improve accessibility

---

### Frontend Agent → When You Need:
- ✅ React components (functional, hooks, lifecycle)
- ✅ Next.js pages & routing (Server Components, data fetching)
- ✅ Form implementation (validation, error display, submission)
- ✅ Client state management (Zustand stores, React Query)
- ✅ Real-time integration (Socket.io subscriptions, price updates)
- ✅ Chart integration (TradingView lightweight-charts)
- ✅ TypeScript typing (safe, no `any`, strict mode)

**Activation**: Ask to build a component, implement a page, add a form

---

### Coding Agent → When You Need:
- ✅ API endpoint implementation (REST routes, validation, error handling)
- ✅ Database migrations (schema changes, Prisma models)
- ✅ Financial calculations (BigInt arithmetic, P&L, margin)
- ✅ Socket.io services (real-time events, room management)
- ✅ Job queue tasks (BullMQ processors for async work)
- ✅ Service integrations (NowPayments, Twelve Data API)
- ✅ Code optimization (performance, memory, query efficiency)

**Activation**: Ask to implement an API, write a migration, optimize a calculation

---

## 🔄 Agent Coordination Patterns

### Pattern 1: Sequential Dependency (Standard Feature Flow)
```
Research Agent
      ↓ (market insights)
Architect Agent
      ↓ (API contracts, DB schema)
UI/UX Designer + Frontend Agent (parallel)
      ↓
Coding Agent
      ↓
Tests & Review
```

### Pattern 2: Parallel Specialization
```
Orchestrator
│
├─→ UI/UX Designer (interaction flows)
├─→ Frontend Agent (React implementation)  [waits for UI/UX]
└─→ Coding Agent (API implementation)      [independent]
```

### Pattern 3: Troubleshooting & Optimization
```
Orchestrator
│
├─→ Research Agent (baseline performance, competitor comparison)
├─→ Architect Agent (bottleneck identification)
└─→ Coding Agent (profiling & optimization)
```

---

## 📚 Agent Interaction Guidelines

### Invoking an Agent
1. **Simply ask** – "Design a trailing stop loss feature" → Orchestrator routes
2. **Be specific** – "Audit accessibility on the trading dashboard" → UI/UX Designer
3. **Provide context** – Reference existing code, architecture docs, or assumptions
4. **Give constraints** – Performance targets, regulatory limits, tech stack

### Interpreting Agent Output
- **Research Agent** → Brief with citations, feature matrix, compliance checklist
- **Architect Agent** → ADR, schema sketch, API contract, scalability estimate
- **UI/UX Designer** → Wireframes, user journey, interaction specs, accessibility checklist
- **Frontend Agent** → React components, hooks, type definitions, integration points
- **Coding Agent** → API routes, migrations, service code, tests

### When Agents Can't Help
If an agent lacks context or the task is outside scope:
- It will suggest similar agents or alternative approaches
- Escalate to Orchestrator with more context
- Combine agents for complex problems (e.g., "Design + implement")

---

## 🏛️ ProTrader Platform Context (Embedded in All Agents)

Each agent deeply understands:

### Financial Precision
- **Prices**: BIGINT scaled ×100000 (5 decimals)
- **Money**: BIGINT cents (never Float/Decimal)
- **BPS**: 10000 units = 100% (margins, commissions)
- **Golden Rule**: Division ALWAYS last in calculations

### Trading Domain
- **Leverage**: 1:1 to 1:500 per instrument
- **Margin Call**: Triggered at 10% equity remaining
- **Stop Out**: 5% remaining (forced position close)
- **Trade Lifecycle**: PENDING → OPEN → CLOSED (by user, stop loss, margin call, admin)
- **Multi-asset**: Forex (100,000 contract), Stocks (1 contract), Crypto (varies)

### Architecture Reality
- **Tech Stack**: Turborepo, Next.js 15, Express.js, PostgreSQL 17, Redis 7, Socket.io
- **6 Next.js Apps**: web, auth, platform (dashboard), admin, ib-portal
- **1 Express API**: Serves all frontends on port 4000
- **Real-time**: Socket.io for prices, trades, notifications
- **Jobs**: BullMQ for margin calls, swaps, settlement

### Regulatory Constraints
- **FSC Mauritius** + **FSA Seychelles** regulated
- **KYC Required**: Identity + address verification
- **AML Compliance**: Position limits, withdrawal delays
- **Trade Transparency**: Audit logs, execution rationale

---

## 🎯 Success Criteria

Your ProTrader agent framework is working well when:

✅ **Feature requests** decompose cleanly into research → design → implementation  
✅ **Architecture decisions** are data-driven (competitor analysis, scalability studies)  
✅ **UI/UX improvements** follow trader workflows, not guesses  
✅ **Code quality** maintains 100% financial precision (all BigInt math)  
✅ **Real-time systems** scale to 1000+ concurrent traders without latency  
✅ **Regulatory compliance** is baked into design, not bolted on afterward  

---

## 🔗 File Organization

```
.vscode/agents/
├── AGENTS.md                    ← This file (master registry)
├── QUICK_REFERENCE.md           ← Quick activation guide
│
├── orchestrator.agent.md        ← Master coordinator (START HERE)
├── research.agent.md            ← Market intelligence (v1.1)
├── architect.agent.md           ← System design (v1.1)
│
├── ui-ux-designer.agent.md      ← Interaction design (v1.1)
├── frontend.agent.md            ← React/Next.js development (v1.1)
│
├── coding.agent.md              ← Backend implementation (v1.1)
│
├── security.agent.md            ← Compliance & security (v1.0)
├── test.agent.md                ← QA & test generation (v1.0)
├── schema.agent.md              ← Database design (v1.0)
├── debug.agent.md               ← Error diagnosis (v1.0)
├── code-review.agent.md         ← PR review & quality gates (v1.0)
├── documentation.agent.md       ← API docs & knowledge mgmt (v1.0)
├── performance.agent.md         ← Optimization & profiling (v1.0)
└── devops.agent.md              ← CI/CD & infrastructure (v1.0)
```

**14 agents total** | **6 agents at v1.1** | **8 agents at v1.0** | All production-ready

Each `.agent.md` file has:
- **YAML frontmatter** – Name, description, keywords for agent activation
- **Role & Context** – What the agent does and ProTrader-specific knowledge
- **Capabilities** – Detailed list of what this agent can help with
- **Patterns & Examples** – Code samples and design artifacts
- **Integration Points** – How it connects with other agents
- **Tool Preferences** – Which tools this agent uses/avoids
- **🚀 Advanced Capabilities** – (v1.1 only) Additional features in enhancements

---

## 🎯 Task Routing Examples

| User Request | Route | Agents Invoked |
|--------------|-------|----------------|
| "Design a new feature" | Standard Feature Flow | Research → Architect → UI/UX → Frontend → Coding |
| "Fix dashboard lag" | Performance Optimization | Performance → Debug → Coding |
| "Implement KYC upload" | Full Stack Feature | Architect → UI/UX → Frontend → Coding → Security → Test |
| "Audit code for compliance" | Quality Gates | Code Review → Security → Test |
| "Deploy to production" | CI/CD Pipeline | DevOps → Security → Code Review → Documentation |
| "Create test suite" | Quality Assurance | Test → Coding → Debug |
| "Add database column" | Schema Migration | Schema → Architect → Coding → DevOps |

---

## 💡 Pro Tips

1. **Always start with Orchestrator** – For ambiguous or multi-step tasks, let it decompose and route
2. **Be direct with specialists** – "Build the order form component" → Frontend Agent directly
3. **Combine agents for complex work** – "Design AND implement KYC" → UI/UX → Frontend → Coding (sequence)
4. **Reference existing code** – Agents are context-aware; mention ProTrader patterns and constraints
5. **Provide constraints upfront** – Performance targets, deadline, regulatory limits
6. **Review quality gates** – Always involve Code Review, Security, Test agents before production release

---

## 🚨 Critical Rules ALL Agents Follow

🔴 **NEVER violate these** (enforced in every agent):
- ❌ No Float for prices or money → ✅ **Always BigInt** (prices ×100000, money in cents)
- ❌ No division before multiplication → ✅ **Multiply first, divide last** (precision rule)
- ❌ No changing trade logic without test → ✅ **Both simulation + live test required**
- ❌ No secrets in code → ✅ **Use env vars only (secrets scanning on every PR)**
- ❌ No KYC outside encryption → ✅ **Cloudflare R2 + AES-256-GCM + TLS**
- ❌ No margin calc in frontend → ✅ **Server-side authoritative (Express API)**
- ❌ No unvalidated inputs → ✅ **Prisma + Zod validation on all endpoints**

---

## 📖 Recommended Reading Order

1. [QUICK_REFERENCE.md](QUICK_REFERENCE.md) ← Start here (2 min overview)
2. [orchestrator.agent.md](orchestrator.agent.md) ← Master coordinator
3. [architect.agent.md](architect.agent.md) ← Understand ProTrader architecture
4. [code-review.agent.md](code-review.agent.md) ← Quality gates before release
5. Other agents as needed for your current task

---

## 🔍 Agent Specialization at a Glance

| Agent | When to Use | Typical Output |
|-------|------------|-----------------|
| **Orchestrator** | Any multi-part task or unclear scope | Decomposition plan + agent routes |
| **Research** | Need competitive/market/vendor data | Brief with citations + feature matrix |
| **Architect** | Designing system, database, or APIs | ADR + schema sketch + API contract |
| **UI/UX Designer** | Design user interactions & flows | Wireframes + user journey + a11y checklist |
| **Frontend** | Build React/Next.js apps | Components + hooks + TypeScript types |
| **Coding** | Implement APIs, migrations, services | Route handlers + migrations + services |
| **Security** | Audit compliance, vulnerabilities | Vulns + security checklist + fixes |
| **Test** | Generate tests, validate precision | Jest/Playwright tests + coverage report |
| **Schema** | Design/modify database | Migrations + indexes + query plans |
| **Debug** | Fix bugs, find root cause | Stack trace analysis + repro steps + fix |
| **Code Review** | PR review before merge | Quality gates checklist + violations |
| **Documentation** | Write API docs, READMEs, guides | API docs + examples + changelogs |
| **Performance** | Optimize speed, latency, memory | Profiling results + optimizations + benchmarks |
| **DevOps** | Deploy, configure CI/CD | CI/CD pipeline + deploy scripts + runbooks |

---

**Framework Version**: 2.0 (14 agents, full SDLC + Operations coverage)  
**Last Updated**: Post-enhancement (all 6 core agents at v1.1, 8 specialists at v1.0)  
**Status**: 🟢 Production Ready  

**Entry Point**: Use [orchestrator.agent.md](orchestrator.agent.md) for all requests
