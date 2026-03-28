# ProTraderSim — Copilot Agents

This directory contains specialized Copilot agents for different domains of the ProTraderSim codebase.

## Quick Reference

| Agent | File | Purpose | When to Use |
|-------|------|---------|-------------|
| **Financial Calculation** | `financial-calc.prompt.md` | BigInt money/price calculations | Any math involving money, prices, margin, P&L |
| **Database Schema** | `db-schema.prompt.md` | Prisma schema changes | Adding tables, fields, enums, indexes |
| **Socket.io Events** | `socket-events.prompt.md` | Real-time events | WebSocket events, room management, price feeds |
| **API Routes** | `api-route.prompt.md` | Express endpoints | New REST endpoints, route handlers |
| **UI Components** | `ui-component.prompt.md` | React components | Shared UI components with CVA variants |
| **KYC Compliance** | `kyc-compliance.prompt.md` | KYC document handling | File uploads, document review, compliance |
| **Trade Lifecycle** | `trade-lifecycle.prompt.md` | Trade operations | Open, modify, close trades, margin calls |

## Agent Selection Guide

### Working on...

**Financial calculations** (margin, P&L, swaps)
→ Use **Financial Calculation Agent**

**Database changes** (new tables, fields, relationships)
→ Use **Database Schema Agent**

**Real-time features** (price feeds, trade updates, notifications)
→ Use **Socket.io Events Agent**

**New API endpoints** (REST routes, handlers)
→ Use **API Routes Agent**

**UI components** (buttons, cards, inputs, modals)
→ Use **UI Components Agent**

**KYC features** (document upload, verification, compliance)
→ Use **KYC Compliance Agent**

**Trade operations** (opening, closing, modifying trades)
→ Use **Trade Lifecycle Agent**

## Common Workflows

### Adding a New Feature (e.g., "Trailing Stop")

1. **Database Schema Agent** — Add `trailingStopEnabled` field to `Trade` model
2. **Financial Calculation Agent** — Create `calcTrailingStop()` function
3. **Trade Lifecycle Agent** — Update trade modification logic
4. **Socket.io Events Agent** — Emit `trailing_stop:triggered` event
5. **API Routes Agent** — Add `PATCH /trades/:id/trailing-stop` endpoint

### Adding a New Instrument Type (e.g., "Crypto Futures")

1. **Database Schema Agent** — Add `FUTURES` to `AssetClass` enum
2. **Financial Calculation Agent** — Update margin formulas for futures
3. **Trade Lifecycle Agent** — Handle expiry/rollover logic
4. **Socket.io Events Agent** — Add futures price feed support

## Agent Conventions

Each agent follows this structure:

```markdown
---
name: Agent Name
description: What this agent does
applyTo: "glob/pattern/**/*.ts"
---

# Agent Name

## Critical Rules
- Non-negotiable requirements

## Patterns
- Code templates and examples

## Anti-Patterns
- What to reject

## Reference
- Tables, formulas, quick lookup
```

## Priority Order

When multiple agents could apply:

1. **Domain-specific agents** take precedence (e.g., KYC over API Routes for KYC endpoints)
2. **File location** determines the primary agent
3. **Explicit mention** in prompt overrides auto-detection

## Adding New Agents

To add a new agent:

1. Create `new-agent.prompt.md` in `.github/prompts/`
2. Include YAML frontmatter with `name`, `description`, `applyTo`
3. Follow the structure: Rules → Patterns → Anti-Patterns → Reference
4. Update this README

## Troubleshooting

**Agent not activating?**
- Check `applyTo` glob pattern matches your file
- Ensure file is saved (agents trigger on file open)
- Try explicitly mentioning the agent name in your prompt

**Conflicting agents?**
- Agents are applied in alphabetical order by filename
- Most specific `applyTo` pattern wins
- Use explicit agent mention: "Using the Financial Calculation Agent..."

## Related Documentation

- [Main Instructions](../copilot-instructions.md) — Project overview and conventions
- [CLAUDE.md](../../CLAUDE.md) — Comprehensive technical reference
