---
name: 'ProTraderSim Skills Framework'
description: 'Master index and navigation guide for all ProTraderSim development skills.'
---

# ProTraderSim Skills Framework

**Location**: `.github/skills/`  
**Scope**: Workspace (team-shared)  
**Status**: Phase 1 ✅ Complete | Phase 2 ✅ Complete | Phase 3 ✅ Complete | Phase 4 ALMOST COMPLETE 🔄  
**Total Skills**: 27/28 Complete

---

## 🎯 Phase 1: Critical Skills (COMPLETE ✅)

These 4 foundational skills **block everything else**. Build all other features with these as your foundation.

### 1. 📐 **financial-calculations**

**Focus**: BigInt financial math — margins, P&L, equity, margin levels, swaps

```
File: financial-calculations/SKILL.md
Size: 8.8 KB | 347 lines
Primary Agents: @coding, @test, @architecture
When to Use: Implementing margin calculations, P&L formulas, leverage multipliers
Key Content: 6 core formulas, constants (PRICE_SCALE, BPS_SCALE), edge cases, testing checklist
Example: Margin = (units × contractSize × openRate × CENTS) / (leverage × PRICE_SCALE)
```

### 2. 💵 **bigint-money-handling**

**Focus**: Safe monetary conversions, storage, validation, ledger-based balance

```
File: bigint-money-handling/SKILL.md
Size: 10.3 KB | 397 lines
Primary Agents: @coding, @security, @test
When to Use: Deposits, withdrawals, balance computation, money API responses
Key Content: dollarsToCents, centsToDollars, Zod validation, ledger patterns, flows
Example: User deposits "100.50" → dollarsToCents("100.50") = 10050n ($100.50)
```

### 3. 🛣️ **api-route-creation**

**Focus**: Express.js routes with strict HTTP-only design, auth, validation, errors

```
File: api-route-creation/SKILL.md
Size: 12.4 KB | 481 lines
Primary Agents: @coding, @security, @architecture
When to Use: Building any REST API endpoint, route handler, middleware
Key Content: Layering rule, JWT auth, RBAC, Zod validation, ApiResponse<T>, error handling
Example: Route delegates to service; service contains all business logic
```

### 4. 🗄️ **database-schema-design**

**Focus**: Prisma schema with BIGINT money, proper indexes, relationships

```
File: database-schema-design/SKILL.md
Size: 11.9 KB | 460 lines
Primary Agents: @schema, @architecture, @coding
When to Use: Designing tables, migrations, relationships, optimizing queries
Key Content: 11-table schema (User, Trade, Instrument, Ledger, etc.), index strategy, FK patterns
Example: Store money as BIGINT cents; balance = SUM(ledger_transactions), never stored
```

---

## 📊 Phase 1 Stats

| Metric              | Value        |
| ------------------- | ------------ |
| **Skills Created**  | 4            |
| **Total Content**   | 43.4 KB      |
| **Total Lines**     | 1,685        |
| **Avg Skill Size**  | 10.85 KB     |
| **Code Examples**   | 25+          |
| **Checklists**      | 8            |
| **Common Mistakes** | 16           |
| **Schema Tables**   | 11           |
| **Completion**      | 100% Phase 1 |

---

## 🎓 How to Use Phase 1 Skills

### Direct Reference in Chat

```
@coding
Use financial-calculations to implement the margin formula
for opening a position with leverage.
```

### Agent Auto-Loading

```
@coding Build POST /api/deposits
→ Automatically loads: api-route-creation, bigint-money-handling, database-schema-design
```

### Code Review Against Standards

```
@code-review Check this trading endpoint
→ Validates against: api-route-creation, financial-calculations, bigint-money-handling
```

---

## 🔗 Agent Enhancement Matrix

**All 14 agents enhanced:**

```
Coding Agent            ████████████████████ (All 4 skills)
Schema Agent            █████████████        (Focus: database-schema-design)
Security Agent          ████████             (Focus: bigint-money-handling, api-route-creation)
Test Agent              ████████             (Focus: financial-calculations, bigint-money-handling)
Architect Agent         ████████████████████ (All 4 skills)
Code-Review Agent       ████████████████████ (All 4 skills)
Debug Agent             ████████████████████ (All 4 skills)
Documentation Agent     ████████████████████ (All 4 skills)
Performance Agent       ████████             (Focus: database-schema-design, api-route-creation)
Frontend Agent          ████████             (Focus: financial-calculations, bigint-money-handling, api-route-creation)
Orchestrator Agent      ████████████████████ (All 4 skills for routing)
Research Agent          █████████            (Focus: database-schema-design)
UI/UX Designer Agent    ████████████         (All 4 for context)
DevOps Agent            █████████            (Focus: database-schema-design)
```

---

## 🚀 Phase 2: Core Functionality (COMPLETE ✅)

8 skills for feature implementation. Enhanced all 14 agents with advanced patterns.

| #   | Skill                        | Primary Agents             | Status      |
| --- | ---------------------------- | -------------------------- | ----------- |
| 5   | **rbac-implementation**      | @security, @coding         | ✅ Complete |
| 6   | **trading-calculations**     | @coding, @architecture     | ✅ Complete |
| 7   | **socket-io-real-time**      | @coding, @frontend         | ✅ Complete |
| 8   | **payment-integration**      | @coding, @security         | ✅ Complete |
| 9   | **kyc-compliance-flow**      | @security, @coding         | ✅ Complete |
| 10  | **state-management-trading** | @frontend, @architecture   | ✅ Complete |
| 11  | **trading-ui-components**    | @frontend, @ui-ux-designer | ✅ Complete |
| 12  | **orm-query-optimization**   | @coding, @performance      | ✅ Complete |

### Phase 2 Summary

- **Total Size**: ~96 KB | 3,800+ lines
- **Code Examples**: 60+
- **Checklists**: 16+ (2 per skill)
- **Common Mistakes**: 48+ (6 per skill)
- **Completion**: 100% Phase 2

### Phase 2 Skill Details

#### 5. 🔐 **rbac-implementation**

**Focus**: 4-tier role hierarchy, authorization middleware, permission checking

- 5-tier RBAC: SUPER_ADMIN → ADMIN → IB_TEAM_LEADER → AGENT → TRADER
- authorize() middleware pattern, service-level re-checking
- Permission tables (16 models), staff hierarchy
- Primary agents: @security, @coding

#### 6. 📈 **trading-calculations**

**Focus**: Advanced trading math — max position size, margin calls, stop-out, liquidation price

- 6 advanced formulas (max position, margin call trigger, stop-out, liquidation price, effective leverage, risk-reward)
- Leverage limits per account type (TRADER=500, VIP=1000)
- Position size limits, lifecycle (open → margin call → stop-out)
- BullMQ job for margin call processing
- Primary agents: @coding, @architecture

#### 7. 🔌 **socket-io-real-time**

**Focus**: WebSocket setup, room management, authentication, broadcasting

- Authentication via JWT in socket.handshake.auth
- Room patterns: user:{userId}, prices:{symbol}, admin:panel
- Price updates, account metrics, trade notifications
- Redis adapter for multi-server scaling
- Primary agents: @coding, @frontend

#### 8. 💳 **payment-integration**

**Focus**: NowPayments deposit/withdrawal, IPN webhook security, idempotency

- Complete deposit/withdrawal flow (3-step and 2-step)
- IPN webhook verification (HMAC-SHA512)
- Idempotency keys, rate limiting
- Ledger impact (money never stored, computed from SUM)
- Primary agents: @coding, @security

#### 9. 🪪 **kyc-compliance-flow**

**Focus**: KYC document upload (Cloudflare R2), admin review workflow, compliance

- File upload validation (JPEG, PNG, PDF, max 10MB)
- Secure R2 storage with metadata
- Admin review workflow (approve/reject/resubmit)
- PII protection (never log passport numbers)
- Primary agents: @security, @coding

#### 10. 🧠 **state-management-trading**

**Focus**: Zustand + React Query + Socket.io for real-time trading dashboards

- React Query (server state): useOpenPositions, useAccountMetrics
- Socket.io hooks: usePriceUpdates, useAccountMetricsSocket
- Zustand stores: priceStore, accountStore, uiStore
- Live position table with P&L recalculation
- Primary agents: @frontend, @architecture

#### 11. 📊 **trading-ui-components**

**Focus**: Terminal Precision design system, lightweight-charts, CVA, data tables

- Color palette: dark theme, professional (bullish green, bearish red)
- Lightweight-charts integration (candlesticks, volume, RSI)
- Order form (CVA variants, input validation)
- Data table with sorting, filtering, P&L highlighting
- Primary agents: @frontend, @ui-ux-designer

#### 12. ⚡ **orm-query-optimization**

**Focus**: Prisma + PostgreSQL optimization, eliminate N+1, index strategy

- N+1 query elimination (include vs. loop-in-query)
- Aggregate patterns for balance/metrics
- Index strategy (single-column, composite indexes)
- Dashboard query optimization (~500ms → ~40ms)
- Primary agents: @coding, @performance

---

## 📚 Phase 3: Quality & Testing (COMPLETE ✅)

8 skills for robustness. 8 of 8 complete.

| #   | Skill                                | Primary Agent          | Status      |
| --- | ------------------------------------ | ---------------------- | ----------- |
| 13  | **testing-financial-features**       | @test, @coding         | ✅ Complete |
| 14  | **api-integration-testing**          | @test, @coding         | ✅ Complete |
| 15  | **typescript-type-safety**           | @coding, @architecture | ✅ Complete |
| 16  | **api-response-design**              | @architecture, @coding | ✅ Complete |
| 17  | **error-handling-patterns**          | @security, @coding     | ✅ Complete |
| 18  | **e2e-trading-flows**                | @test, @frontend       | ✅ Complete |
| 19  | **troubleshooting-financial-errors** | @debug, @coding        | ✅ Complete |
| 20  | **performance-profiling-api**        | @performance, @debug   | ✅ Complete |

### Phase 3 Skill Details

#### 13. 🧪 **testing-financial-features**

**Focus**: Unit tests, property-based tests, and integration tests for financial calculations

- BigInt precision validation, edge case coverage (zero, negative, max values)
- P&L symmetry testing (BUY vs SELL), margin call/stop-out thresholds
- Property-based tests with fast-check for financial invariants
- Test coverage requirements (100% for calculations.ts, 90%+ for services)
- Primary agents: @test, @coding, @security

#### 14. 🔗 **api-integration-testing**

**Focus**: Integration tests for API endpoints with real database interactions

- Supertest HTTP testing with real service layer
- Authentication and authorization testing patterns
- Multi-step workflow tests (deposit, trade, withdrawal flows)
- Rate limiting and pagination testing
- Test data isolation and cleanup patterns
- Primary agents: @test, @coding

#### 15. 🛡️ **typescript-type-safety**

**Focus**: Strict TypeScript enforcement, eliminating `any`, type-safe API design

- `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` compliance
- Branded types for financial values (MoneyString, PriceString)
- Discriminated unions for state management
- Type guards over type assertions
- Primary agents: @coding, @architecture, @code-review

#### 16. 📦 **api-response-design**

**Focus**: Consistent API response shapes, error formats, pagination patterns

- `ApiResponse<T>` wrapper for all success responses
- `ApiError` shape with `error_code`, `message`, `details`
- Cursor-based pagination with `next_cursor` and `has_more`
- HTTP status code mapping to error types
- Primary agents: @architecture, @coding, @code-review

#### 17. ⚠️ **error-handling-patterns**

**Focus**: Custom error hierarchy, layered error handling, API error responses

- AppError base class with domain-specific errors (InsufficientMargin, PositionAlreadyClosed, etc.)
- Route → Service → Data layer error transformation
- Global error handler middleware with Prisma/Zod error handling
- Async error boundaries, retry patterns, structured logging
- Primary agents: @security, @coding, @debug

#### 18. 🔄 **e2e-trading-flows**

**Focus**: End-to-end tests for complete trading workflows using Playwright

- Full user journey testing (register → deposit → trade → withdraw)
- Real-time price update verification via WebSocket
- Margin call and stop-out flow testing
- KYC document upload flow testing
- IB commission tracking verification
- Primary agents: @test, @frontend

#### 19. 🔍 **troubleshooting-financial-errors**

**Focus**: Systematic diagnosis of financial calculation errors, balance discrepancies, P&L issues

- 5-step diagnosis flow: Input → Formula → Precision → Division order → Output
- Common errors: Wrong margin, incorrect P&L sign, balance mismatch, swap rate errors
- BigInt precision verification, property-based testing for financial invariants
- Production debugging with verification endpoints
- Primary agents: @debug, @coding, @test

#### 20. ⚡ **performance-profiling-api**

**Focus**: API performance profiling, bottleneck identification, and optimization

- Response time tracking middleware, Prisma query logging
- Clinic.js profiling, k6 load testing
- N+1 query elimination, caching strategies, connection pool optimization
- Performance targets (P95 <100ms for simple endpoints)
- Primary agents: @performance, @debug

---

## 📚 Phase 4: Infrastructure & Compliance (ALMOST COMPLETE 🔄)

8 skills for operations. 7 of 8 complete.

| #   | Skill                             | Primary Agent          | Status      |
| --- | --------------------------------- | ---------------------- | ----------- |
| 21  | **socket-io-debugging**           | @debug, @frontend      | ✅ Complete |
| 22  | **secrets-and-env-vars**          | @security, @devops     | ✅ Complete |
| 23  | **authentication-jwt-flow**       | @security, @coding     | ✅ Complete |
| 24  | **regulatory-compliance**         | @research, @security   | ✅ Complete |
| 25  | **monorepo-package-management**   | @devops, @architecture | ✅ Complete |
| 26  | **docker-local-development**      | @devops                | ✅ Complete |
| 27  | **deployment-railway-ecs**        | @devops                | ✅ Complete |
| 28  | **[Reserved for emerging needs]** | TBD                    | 📋 Reserved |

### Phase 4 Skill Details

#### 21. 🔌 **socket-io-debugging**

**Focus**: Systematic diagnosis of WebSocket issues, real-time update failures, room management

- Connection → Authentication → Subscription → Broadcast → Payload diagnosis flow
- Room membership verification and monitoring
- Common issues: CORS, JWT mismatch, symbol name case-sensitivity, memory leaks
- Production debugging with Redis adapter monitoring
- Primary agents: @debug, @frontend, @coding

#### 22. 🔐 **secrets-and-env-vars**

**Focus**: Environment variable management, secret storage, credential rotation

- `.env.example` templates, secret storage per environment (local/Railway/AWS)
- JWT key rotation, database password rotation, API key rotation procedures
- Environment validation at startup, secure logging practices
- Primary agents: @security, @devops

#### 23. 🔑 **authentication-jwt-flow**

**Focus**: JWT RS256 authentication, token verification, key management

- RSA key pair generation, JWT middleware with token revocation
- Login/logout endpoints, Socket.io WebSocket authentication
- Frontend integration with auth hooks and API client
- Rate limiting on auth endpoints, security best practices
- Primary agents: @security, @coding

#### 24. ⚖️ **regulatory-compliance**

**Focus**: FSC Mauritius and FSA Seychelles compliance requirements for CFD simulation trading

- KYC/AML obligations, client fund segregation, risk disclosure requirements
- Transaction reporting, PII protection, IB transparency
- Compliance implementation checklist, common mistakes to avoid
- Primary agents: @research, @security, @architecture

#### 25. 📦 **monorepo-package-management**

**Focus**: pnpm workspaces, Turborepo pipelines, package structure, dependency management

- Adding new packages, workspace dependency rules, Turborepo task configuration
- Common issues: package linking, circular dependencies, stale build cache
- Package structure guidelines for types, utils, UI components
- Primary agents: @devops, @architecture, @coding

#### 26. 🐳 **docker-local-development**

**Focus**: Docker Compose setup for local development infrastructure

- PostgreSQL 17, Redis 7, Mailhog, Redis Commander configuration
- Database management (migrations, seeding, backup/restore)
- Troubleshooting common Docker issues (port conflicts, connection failures)
- Development workflow and performance tips for macOS
- Primary agents: @devops

#### 27. 🚀 **deployment-railway-ecs**

**Focus**: Railway staging, AWS ECS production, CI/CD pipelines, zero-downtime deployments

- Railway configuration, Docker optimization, health checks
- ECS Fargate task definitions, ECR image management, ALB configuration
- GitHub Actions CI/CD with automated testing, building, and deployment
- Database migration deployment patterns, rollback strategies, secret rotation
- Primary agents: @devops, @security, @architecture

---

## ✅ Using Skills in Your Workflow

### Quick Start

**1. Reference in Chat**

```
I need to build a withdrawal endpoint.
Use: @coding
Loads: api-route-creation, bigint-money-handling, database-schema-design
```

**2. Follow Checklists**

```
Before merging:
□ financial-calculations checklist
□ api-route-creation checklist
□ bigint-money-handling checklist
```

**3. Validate Against Standards**

```
@code-review Check this for financial correctness
Validates: financial-calculations, bigint-money-handling
```

---

## 🔗 Skill Dependencies

```
financial-calculations ──┬──→ Used by: Coding, Test, Architecture
                         └──→ Enables: Correct trading math
                                       Position calculations
                                       P&L accuracy

bigint-money-handling   ──┬──→ Used by: Coding, Security, Test
                         └──→ Enables: Safe payments
                                       Ledger integrity
                                       Balance correctness

api-route-creation      ──┬──→ Used by: Coding, Security, Architecture
                         └──→ Enables: All REST endpoints
                                       Proper HTTP layering
                                       Secure APIs

database-schema-design  ──┬──→ Used by: Schema, Architecture,
                         │           Coding, Performance
                         └──→ Enables: Proper data modeling
                                       Migration safety
                                       Query optimization
```

---

## 🎉 What's Next?

### Option 1: Build Phase 2 Skills

```
@orchestrator Generate Phase 2 skills—we need rbac-implementation,
socket-io-real-time, payment-integration, and state-management-trading
```

### Option 2: Deep Dive Phase 1

```
@coding Use financial-calculations to implement margin logic
```

### Option 3: Enhance a Skill

```
Update financial-calculations with additional edge case:
"What happens when leverage = 0?"
```

---

## 📞 Support

Need to:

- **Reference a skill?** Use `@[agent-name]` and mention the skill
- **Update a skill?** Edit the corresponding SKILL.md file
- **Add a new skill?** Follow the SKILL.md template in this directory
- **Report an issue?** Include skill name and specific section

---

**Status**: Phase 1 ✅ COMPLETE | Ready for Phase 2  
**Last Updated**: March 28, 2026  
**Maintained By**: ProTrader AI Development Team
