---
name: "ProTrader Agent Quick Reference"
description: "Quick activation guide for the ProTrader AI agent framework."
---

# ProTrader Agent Quick Reference (14-Agent Framework)

## 🚀 Start Here: Agent Selection Matrix

```
What's your task?

┌─ Unclear/Multi-step?           → Orchestrator (master router)
│
├─ Market/competitive research?  → Research Agent
│
├─ System/database design?       → Architect Agent
│
├─ UX/interaction design?        → UI/UX Designer Agent
│
├─ React/Next.js component?      → Frontend Agent
│
├─ Express API/backend?          → Coding Agent
│
├─ Security/compliance audit?    → Security Agent
│
├─ Need tests?                   → Test Agent
│
├─ Database migration?           → Schema Agent
│
├─ Bug squashing?                → Debug Agent
│
├─ Code review?                  → Code Review Agent
│
├─ Write documentation?          → Documentation Agent
│
├─ Performance issue?            → Performance Agent
│
└─ Deploy/CI-CD?                 → DevOps Agent
```

---

## 📋 Agent Quick Reference (14 Agents)

### Tier 1: Master Coordination
| Agent | Activation Keywords | Use When |
|-------|---------------------|----------|
| **Orchestrator** | plan, build end-to-end, multi-step, design system, unclear scope | Complex feature requiring many steps; you're not sure where to start |

### Tier 2: Discovery & Architecture
| Agent | Activation Keywords | Use When |
|-------|---------------------|----------|
| **Research** | research, competitor, benchmark, market, vendor, best practices | Need data-driven insights; market analysis; vendor evaluation |
| **Architect** | design, architecture, scalability, schema, API contract, system design | Planning system structure; designing database; tech decisions |

### Tier 3: Design & Frontend
| Agent | Activation Keywords | Use When |
|-------|---------------------|----------|
| **UI/UX Designer** | ui design, ux, user flow, wireframe, interaction, mobile layout | Need interaction flows; mobile optimization; accessibility audit |
| **Frontend** | build component, react, next.js, page, form, real-time | Building React components; implementing pages; Socket.io integration |

### Tier 4: Backend Implementation
| Agent | Activation Keywords | Use When |
|-------|---------------------|----------|
| **Coding** | implement api, backend, migration, database, calculation, job queue | Building Express endpoints; database migrations; background jobs |

### Tier 5: Quality & Operations
| Agent | Activation Keywords | Use When |
|-------|---------------------|----------|
| **Security** | audit, vulnerability, compliance, KYC, secrets, encryption | Security audit; compliance check; vulnerability scan; KYC review |
| **Test** | test, unit test, e2e, coverage, precision validation, financial test | Need test suite; coverage analysis; financial precision validation |
| **Schema** | database design, migration, query, index, ledger, transaction | Design/modify database schema; optimize queries; ledger architecture |
| **Debug** | debug, bug, error, root cause, diagnosis, stack trace | Fix bugs; diagnose errors; find root cause; regression analysis |
| **Code Review** | code review, pr review, quality gate, static analysis, performance | Review PR; quality gates; security scanning; performance check |
| **Documentation** | documentation, api docs, readme, changelog, onboarding, adr | Write API docs; create READMEs; document decisions; changelogs |
| **Performance** | optimize, performance, profiling, latency, load test, benchmark | Performance optimization; load testing; latency reduction; profiling |
| **DevOps** | deploy, ci/cd, pipeline, infrastructure, kubernetes, blue-green | Deploy to production; CI/CD setup; infrastructure; secrets rotation |

---

## 🎯 Common Tasks → Agent Mapping

| Task | Primary Agent | Support Agents |
|------|---------------|----------------|
| Implement new trading feature | Orchestrator | Research → Architect → Frontend/Coding |
| Fix dashboard performance | Performance | Debug, Frontend, Architect |
| Add KYC requirements | Architect | Security, Schema, Frontend, Coding |
| Deploy to production | DevOps | Code Review, Security, Documentation |
| Fix margin calculation bug | Debug | Architect, Test, Coding |
| Build order entry form | Frontend | UI/UX Designer, Coding |
| Audit for compliance | Security | Code Review, Schema, Documentation |
| Add real-time price feed | Architect | Frontend, Coding, Socket.io patterns |
| Reduce API response time | Performance | Schema, Debug, Coding |
| Write API documentation | Documentation | Frontend, Coding |
| Optimize database queries | Schema | Debug, Performance, Coding |
| Create test suite | Test | Coding, Schema, Debug |

---

## 💬 Agent Activation Examples

### Direct Activation (specific agent)
```
Frontend: "Build the trading dashboard React component"
Coding: "Implement POST /trades endpoint with validation"
Security: "Audit JWT RS256 implementation in Socket.io"
Test: "Generate Jest tests for BigInt margin calculations"
```

### Orchestrator Activation (complex tasks)
```
"Build a complete trailing stop loss feature from scratch"
"Debug the real-time price sync and fix it"
"Implement KYC document upload with all compliance checks"
"Optimize the entire trading flow from order → execution"
```

### Sequential Activation
```
1. Research: "What do competitors offer for leverage?"
2. Architect: "Design leverage settings in the schema and API"
3. Frontend: "Build the leverage selector component"
4. Coding: "Implement leverage validation in the API"
5. Test: "Generate tests for all leverage edge cases"
6. Security: "Audit leverage limits against regulatory requirements"
```

### Parallel Activation
```
Frontend: "Build the order form component"    [parallel]
Coding: "Implement the create trade endpoint" [parallel]
       ↓ (both join)
Test: "Generate tests for the form + API"
```

---

## 🚀 Multi-Agent Workflows

### Workflow: Build New Trading Feature
```
Step 1: Orchestrator
└─ "Plan implementation of trailing stop loss feature"

Step 2: Research + Architect (parallel)
├─ "What features do competitors have?"
└─ "Design the database schema and API contracts"

Step 3: UI/UX Designer
└─ "Design the interaction flow and mobile layout"

Step 4: Frontend + Coding (parallel)
├─ "Build the React components and forms"
└─ "Implement the API endpoints and migrations"

Step 5: Test + Security (parallel)
├─ "Generate comprehensive test suite"
└─ "Security audit of the implementation"

Step 6: Code Review
└─ "Quality gates and final validation"

Step 7: DevOps
└─ "Deploy to staging then production"

Step 8: Documentation
└─ "Write API docs and user guide"
```

### Workflow: Fix Production Bug
```
Step 1: Debug Agent
└─ "Analyze stack trace and find root cause"

Step 2: If calculation bug:
├─ Architect: "Verify the formula"
└─ Coding: "Fix the BigInt arithmetic"

Step 3: If database issue:
└─ Schema: "Analyze query plans and indexes"

Step 4: If performance issue:
└─ Performance: "Profile and optimize"

Step 5: Test Agent
└─ "Generate regression tests"

Step 6: Code Review
└─ "Verify fix doesn't break anything"

Step 7: DevOps
└─ "Deploy hotfix to production"
```

### Workflow: Regulatory Compliance Update
```
Step 1: Research Agent
└─ "What's the new FSC requirement?"

Step 2: Architect Agent
└─ "How does this affect database, API, UI?"

Step 3: Security Agent
└─ "Compliance audit against new requirements"

Step 4: Multi-agent implementation (as needed)
├─ Schema: "Update database schema"
├─ Coding: "Implement backend validation"
├─ Frontend: "Update UI/forms"
└─ Test: "Test all compliance scenarios"

Step 5: Code Review
└─ "Ensure all requirements met"

Step 6: Documentation
└─ "Document compliance changes"

Step 7: DevOps
└─ "Deploy compliance update"
```

---

## 🎚️ Agent Intensity Levels

| Level | Task Example | Agent(s) |
|-------|--------------|----------|
| ⚡ **Light** | Fix button styling | Frontend |
| 🔧 **Medium** | Build new dashboard page | UI/UX + Frontend |
| ⚙️ **Heavy** | Implement real-time prices | Architect → Frontend + Coding |
| 🚀 **Complex** | New asset class (Crypto) | Orchestrator → All agents |

---

## 🛠️ Pro Tips

### Tip 1: Provide Rich Context
```
❌ "Build the dashboard"
✅ "Build a trading dashboard with live positions, account metrics (balance, 
   margin, equity), and real-time P&L using Socket.io price updates, 
   showing as a grid with ability to close positions"
```

### Tip 2: Reference ProTrader Patterns
```
✅ "Implement BigInt margin calculation using the formula in 
   apps/api/src/lib/calculations.ts, ensure all arithmetic happens before division"

✅ "Use the Socket.io room pattern from apps/api/src/lib/socket.ts for 
   broadcasting price updates to subscribed users"
```

### Tip 3: Stack for Complex Work
```
✅ "First, design the mobile order entry (UI/UX Designer). 
   Then build the React component (Frontend). 
   Finally, implement the API validation (Coding Agent)."
```

### Tip 4: Parallel for Independent Paths
```
✅ "Meanwhile, while Frontend builds the form, have Coding implement the 
   API endpoint — they don't depend on each other, just need to match contracts."
```

### Tip 5: Verify Financial Logic
```
⚠️ Always verify with Architect or Coding when:
   - Calculating margin required
   - Computing P&L
   - Processing deposits/withdrawals
   - Applying swaps or commissions
   - Using leverage calculations
```

### Tip 6: Use Quality Gates Before Prod
```
✅ Before ANY production deployment:
   1. Code Review Agent (quality gates)
   2. Security Agent (compliance + vulns)
   3. Test Agent (coverage + edge cases)
   4. Performance Agent (latency targets)
   5. Then DevOps: deploy
```

---

## 🚨 Critical Rules (All Agents Enforce)

```
🔴 NEVER:
   ❌ Use Float/Decimal for prices or money
   ❌ Divide before multiplying (precision loss)
   ❌ Store balance in users table
   ❌ Calculate margin on frontend
   ❌ Hardcode secrets in code
   ❌ Skip KYC encryption in storage
   ❌ Deploy without code review
   ❌ Change trade logic without testing

✅ ALWAYS:
   ✅ Use BigInt (prices ×100000, money in cents)
   ✅ Multiply before dividing
   ✅ Compute balance from ledger
   ✅ Margin authorization on server
   ✅ Env vars only for secrets
   ✅ AES-256-GCM + R2 for KYC
   ✅ Code Review before prod
   ✅ Test both simulation + live
```

---

## 🏁 Quick Start Example

**Your request**: "I need to add a withdrawal feature"

**Step 1**: Ask Orchestrator
```
"Plan implementation of crypto withdrawal feature end-to-end"
→ Orchestrator breaks it down into steps
```

**Step 2**: Research + Architect (parallel)
```
Research: "What withdrawal flows do competitors have?"
Architect: "Design the withdrawal schema and API"
```

**Step 3**: Frontend + Coding (parallel)
```
Frontend: "Build the withdrawal form"
Coding: "Implement the withdrawal endpoint and NowPayments integration"
```

**Step 4**: Testing + Security (parallel)
```
Test: "Generate tests for withdrawal flows"
Security: "Verify compliance with withdrawal limits and delays"
```

**Step 5**: Code Review + Documentation
```
Code Review: "Validate PR for quality"
Documentation: "Document withdrawal API"
```

**Step 6**: Deploy
```
DevOps: "Deploy to production with monitoring"
```

✅ Done!

---

## ❓ FAQ

**Q: Do I need Orchestrator for everything?**  
A: No. For focused tasks ("Build a button"), go direct. Use Orchestrator for complex multi-step work.

**Q: Can agents work in parallel?**  
A: Yes! Frontend and Coding can work simultaneously if independent. List them together in parallel.

**Q: What if my request fails?**  
A: Add more context (code samples, requirements, constraints). If still unclear, escalate to Orchestrator.

**Q: Which agent should I start with?**  
A: Use the matrix above. When in doubt, use **Orchestrator**.

**Q: How are the agents different from each other?**  
A: Each is specialized:
- **Research** = market analysis
- **Architect** = system design
- **UI/UX** = user experience  
- **Frontend** = React code
- **Coding** = Express API
- **Security** = audits
- **Test** = quality assurance
- **Schema** = database
- **Debug** = troubleshooting
- **Code Review** = quality gates
- **Documentation** = guides
- **Performance** = optimization
- **DevOps** = deployment

---

## 📞 Escalation Path

```
Request too vague/complex
        ↓
Add context (code, requirements, constraints)
        ↓
Still unclear?
        ↓
→ Ask Orchestrator Agent
  (it routes to appropriate specialist(s))
```

---

**Framework Version**: 2.0 (14-agent framework)  
**Last Updated**: With v1.1 enhancements (6 core agents) + 8 specialists  
**Status**: 🟢 Production Ready

**Next**: Pick a task, find the agent above, and activate!
