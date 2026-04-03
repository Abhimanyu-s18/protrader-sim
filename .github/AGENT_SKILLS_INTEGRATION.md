---
name: Agent & Skill Integration Guide
description: How agents and skills work together, skill loading, and when skills are invoked
---

# Agent & Skill Integration Guide

This document explains **how the 14 agents interact with the 12 domain skills**, and what happens automatically when you invoke an agent.

---

## The Architecture

### Agents (Coordinators with Deep Context)

Agents are specialized AI coordinators, each with:

- ✅ Fluent knowledge of ProTraderSim's rules (BIGINT, layering, RBAC, formulas)
- ✅ Authority to make design decisions in their domain
- ✅ List of preferred tools they can access
- ✅ Responsibility to deliver production-ready work

**They are NOT code generators**—they're strategic thinkers who delegate implementation work.

**14 Agents**:

1. Orchestrator — Coordinator
2. Schema — Database design
3. Architect — System design & contracts
4. Coding — Express.js backend
5. Frontend — Next.js 15 React
6. UI/UX Designer — Interaction flows
7. Test — Unit & integration tests
8. Security — Auth, KYC, payments
9. Code Review — Final quality gate
10. Debug — Diagnosis & root cause
11. Performance — Latency & throughput
12. DevOps — Deployment & CI/CD
13. Documentation — READMEs, API docs
14. Research — Vendor evaluation, compliance

See [AGENTS.md](./AGENTS.md) for full registry.

### Skills (Best Practices & Patterns)

Skills are **reusable playbooks** for specific domains, stored in `.github/skills/*/SKILL.md`:

| Skill                      | Loaded By                       | Purpose                                                             |
| -------------------------- | ------------------------------- | ------------------------------------------------------------------- |
| `api-route-creation`       | Coding Agent                    | Express.js: validation, error handling, RBAC checks, response shape |
| `bigint-money-handling`    | Security, Coding, Test Agents   | Convert dollars↔cents, precision pitfalls, validation               |
| `database-schema-design`   | Schema Agent                    | Table design, BigInt use, relationships, indexes                    |
| `financial-calculations`   | Debug, Security, Test Agents    | P&L, margin, leverage formulas with BigInt proof                    |
| `kyc-compliance-flow`      | Security Agent                  | Document upload, review workflow, PII handling                      |
| `orm-query-optimization`   | Performance Agent               | N+1 detection, index strategy, Prisma patterns                      |
| `payment-integration`      | Security, Coding Agents         | Deposits, withdrawals, webhook security, idempotency                |
| `rbac-implementation`      | Security, Coding Agents         | Role hierarchy, permission checks, cascading access                 |
| `socket-io-real-time`      | Frontend, Performance Agents    | Room management, auth, subscription patterns, broadcasting          |
| `state-management-trading` | Frontend Agent                  | Zustand stores, React Query, Socket.io sync                         |
| `trading-calculations`     | Debug, Test Agents              | Position sizing, margin calls, stop-out, leverage limits            |
| `trading-ui-components`    | Frontend, UI/UX Designer Agents | Charts, tables, order forms, Terminal Precision design              |

---

## How Skills Load: The Automatic Process

When you invoke an agent, Copilot automatically loads relevant skills:

### Example 1: Invoke Coding Agent to Build POST /api/deposits

```
User: "Implement POST /api/deposits — traders submit USDT deposit via NowPayments"
```

**Copilot's Hidden Process**:

1. Routing: "This is backend code" → **Coding Agent**
2. Skill detection: "Mentions payment/deposit" → Load `payment-integration`
3. Skill detection: "API route" → Load `api-route-creation`
4. Skill detection: "Money amounts" → Load `bigint-money-handling`
5. Skill detection: "Business rules" → Load the Coding Agent's full ProTraderSim context

**Coding Agent then**:

- Reads all loaded skills
- Designs the route/service following each skill's patterns
- Implements: request validation, money parsing, DB transaction, email notification

```typescript
// Implements per api-route-creation skill
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['TRADER']),
  validateMiddleware(CreateDepositSchema), // Validation from api-route-creation
  async (req, res) => {
    const result = await depositService.createDeposit(req.user.id, req.body)
    res.json(successResponseShape) // Response shape per api-route-creation
  },
)

// Service implements per payment-integration & bigint-money-handling skills
const depositAmountCents = parseMoney(req.body.amount_usd) // BigInt conversion
const deposit = await createDepositInDbAndNowPayments(depositAmountCents)
// ... webhook verification, idempotency, etc. per payment-integration skill
```

### Example 2: Invoke Performance Agent on Slow Endpoint

```
User: "GET /api/positions takes 1.2s, target <200ms. Traders see 50 open trades + live prices"
```

**Copilot's Hidden Process**:

1. Routing: "Performance issue" → **Performance Agent**
2. Skill detection: "Database query" → Load `orm-query-optimization`
3. Skill detection: "Real-time updates" → Load `socket-io-real-time`
4. Skill detection: "Financial data" → Load `financial-calculations` context

**Performance Agent then**:

- Uses orm-query-optimization to find N+1 patterns
- Suggests indexes per database-schema-design principles
- Reviews Socket.io broadcast pattern per socket-io-real-time
- Delivers: optimized query + proof (before/after latency)

---

## Manual Skill Loading (Advanced)

If an agent doesn't automatically load a skill, **you can request it explicitly**:

```
User: "Optimize the trades endpoint. Also make sure we're following proper RBAC."

→ Performance Agent loads orm-query-optimization (automatic)
→ You ask Performance Agent to "review rbac-implementation skill"
→ Performance Agent re-reads rbac-implementation SKILL.md
→ Performance Agent adds RBAC checks to the optimized query
```

---

## Skill Content Structure

Each `.github/skills/*/SKILL.md` contains:

```markdown
# [Skill Name] Skill

## Overview

[When to use, what it covers]

## Anti-Patterns ❌

[Common mistakes & why they're wrong]

- If-else hell instead of early returns
- Mixing Money and Price scales
- N+1 queries in Prisma

## Patterns ✅

[Best practices with code examples]

- Validation → Service → Database layering
- BigInt.toString() when serializing to JSON
- Efficient Prisma includes to prevent N+1

## Checklist

[ ] All money in BIGINT cents
[ ] All prices in BIGINT scaled ×100000
[ ] Division is always last
[ ] No Decimal/Float types
[etc.]

## Code Examples

[Real ProTraderSim examples showing the pattern]
```

---

## Agent-to-Skill Mapping

### Data & Database Layer

**Schema Agent** reads:

- database-schema-design (table design, BigInt, normalization, indexing)
- financial-calculations (for computed fields & audit trails)

### Backend API

**Coding Agent** reads:

- api-route-creation (Express.js patterns, validation, error handling)
- bigint-money-handling (money parsing, precision, validation)
- financial-calculations (when implementing FIL formulas)
- trading-calculations (when opening/closing positions)
- orm-query-optimization (for efficient Prisma queries)
- rbac-implementation (role checks in routes)
- payment-integration (for deposits/withdrawals)
- socket-io-real-time (for broadcasting position updates)

### Frontend/UI

**Frontend Agent** reads:

- trading-ui-components (charts, tables, order forms)
- state-management-trading (Zustand stores, React Query, Socket.io)
- socket-io-real-time (subscription patterns)
- api-route-creation (to understand API contracts)

**UI/UX Designer** reads:

- trading-ui-components (design patterns, accessibility)
- state-management-trading (to understand interaction complexity)

### Quality & Security

**Security Agent** reads:

- rbac-implementation (permission enforcement)
- kyc-compliance-flow (document handling, PII)
- payment-integration (webhooks, idempotency)
- api-route-creation (input validation)
- bigint-money-handling (precision validation)

**Test Agent** reads:

- financial-calculations (for test cases)
- trading-calculations (for edge cases)
- bigint-money-handling (for precision tests)
- api-route-creation (for E2E test patterns)

**Performance Agent** reads:

- orm-query-optimization (for query analysis)
- socket-io-real-time (for broadcast efficiency)

### Support

**Debug Agent** reads:

- financial-calculations (when diagnosing calc errors)
- trading-calculations (position/margin issues)
- orm-query-optimization (slow query diagnosis)
- socket-io-real-time (connection issues)

**Architect Agent** reads:

- All 12 skills (to understand constraints when designing)

---

## When Skills DON'T Auto-Load

If an agent doesn't load a relevant skill, it's usually:

1. **Your prompt was too vague**
   - Instead of: "Fix the dashboard"
   - Try: "The positions page shows stale prices after disconnect. Check Socket.io subscription."
   - → Performance Agent now knows to load socket-io-real-time

2. **The skill is tangential to the main task**
   - Performance Agent doesn't auto-load rbac-implementation
   - But you can request: "Also verify RBAC per rbac-implementation skill"

3. **You're touching an unusual code path**
   - If you're refactoring the WebSocket server, mention socket-io-real-time explicitly

---

## Skill Dependencies & Ordering

Some skills build on others. When agents load multiple skills, they're applied in this order:

```
1. Database constraints (database-schema-design)
2. Financial precision (bigint-money-handling, financial-calculations)
3. Business rules (trading-calculations, rbac-implementation)
4. API contracts (api-route-creation)
5. Real-time sync (socket-io-real-time, state-management-trading)
6. Performance (orm-query-optimization)
7. Quality gates (code-review checklist)
```

**Example**: When Coding Agent builds a trade opening endpoint:

1. Database schema is locked (Schema Agent already designed it)
2. Financial calcs are reviewed (margin, leverage, stop-out via skills)
3. RBAC is enforced (traders can only open for themselves)
4. API validation runs (request shape via api-route-creation)
5. Position updates broadcast via Socket.io
6. Query is optimized (no N+1)

---

## Testing Skill Invocation

If you want to **verify a skill is being used**, ask the agent explicitly:

```
User: "Implement the trade closing endpoint. Show me the orm-query-optimization pattern you use."

→ Agent: "Here's the optimized query with .include() to prevent N+1..."
```

Or:

```
User: "Build the KYC upload form. Walk me through the kyc-compliance-flow skill you're applying."

→ Security Agent: "Per kyc-compliance-flow:
  1. File validation (max 5MB, PDF/JPG only)
  2. Upload to Cloudflare R2 with encrypted path
  3. Store reference + hash in database
  4. [etc.]"
```

---

## Troubleshooting Skill Issues

### Symptom: Agent ignores a pattern I want

**Diagnosis**: Skill is either not loading, or agent chose a different approach.

**Fix**:

```
User: "Use the socket-io-real-time skill pattern for subscriptions — specifically the re-subscription on disconnect."
```

### Symptom: Financial calc is wrong

**Diagnosis**: Agent didn't fully apply BigInt patterns from bigint-money-handling.

**Fix**:

1. Ask agent: "Show me the BigInt conversion per bigint-money-handling skill"
2. Check: Does division happen last?
3. Check: Are all types BigInt (not number/Decimal)?

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for more.

---

## Creating New Skills (Maintainers Only)

To add a skill (e.g., after discovering a new critical pattern):

1. Create `.github/skills/my-domain/SKILL.md`
2. Structure: Overview → Anti-patterns ❌ → Patterns ✅ → Code examples
3. Extract it from proven working code in ProTraderSim
4. Document when to use (e.g., "Coding Agent loads this for payment flows")
5. Update the Agent-to-Skill mapping in this file
6. Announce in team Slack/docs

---

## Quick Links

- [AGENTS.md](./AGENTS.md) — Full agent registry
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) — Quick agent selector
- [Skills Directory](./skills/) — All 12 skills
- [WORKSPACE_INSTRUCTIONS.md](./WORKSPACE_INSTRUCTIONS.md) — Onboarding & workflows
