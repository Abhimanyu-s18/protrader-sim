# ✅ Phase 1 Skills Complete — ProTraderSim

**Status**: COMPLETED ✓  
**Date**: March 28, 2026  
**Location**: `.github/skills/`

---

## 🎯 Phase 1: Critical Skills (4 Total)

These foundational skills **block everything else**. All other features depend on these working correctly.

### 1. ✅ financial-calculations (8.8 KB)
**Purpose**: Master BigInt financial formulas— margins, P&L, equity, margin level, swaps

**Key Content**:
- Core formulas: Margin requirement, P&L (BUY/SELL), Margin Level, Equity, Swap charges
- Constants: PRICE_SCALE (100000n), BPS_SCALE (10000n), CENTS (100n)
- Implementation examples with full code patterns
- Edge case handling (zero leverage, negative values, large numbers)
- Testing checklist

**Primary Agents Enhanced**:
- 🎯 **Coding Agent** — Implement all trading calculations without rounding errors
- 🎯 **Architecture Agent** — Understand financial math constraints for database design
- 🎯 **Test Agent** — Write comprehensive tests for BigInt edge cases

**Usage**: `@coding` when implementing margin calculations, P&L formulas, or any trading math

---

### 2. ✅ bigint-money-handling (10.3 KB)
**Purpose**: Master safe conversion, storage, and validation of monetary values

**Key Content**:
- String ↔ Cents conversions (dollarsToCents, centsToDollars)
- Price conversions (PRICE_SCALE for 5 decimal places)
- Input validation patterns (Zod schemas)
- Database storage (BIGINT, never Decimal or balance fields)
- Common flows: Deposits, Withdrawals, Balance computation
- Helper functions from `packages/utils/src/money.ts`

**Primary Agents Enhanced**:
- 🎯 **Coding Agent** — Implement payments, deposits, withdrawals correctly
- 🎯 **Security Agent** — Validate all money inputs safely
- 🎯 **Test Agent** — Test edge cases (0, negative, 1M+)

**Usage**: `@coding` when handling deposits, withdrawals, balance checks, or API money responses

---

### 3. ✅ api-route-creation (12.4 KB)
**Purpose**: Master Express.js route creation with strict layering

**Key Content**:
- Layering rule: Routes (HTTP only) → Services (business logic) → Database
- Route structure template with all middleware
- Authentication (JWT RS256) & Authorization (RBAC)
- Input validation with Zod
- Response format (ApiResponse<T>, PaginatedResponse<T>)
- Error handling with ApiError class
- Rate limiting patterns
- Global error handler setup

**Primary Agents Enhanced**:
- 🎯 **Coding Agent** — Build API endpoints with proper layering
- 🎯 **Security Agent** — Implement auth, RBAC, rate limiting
- 🎯 **Architecture Agent** — Maintain consistent API design

**Usage**: `@coding` when building any API endpoint, route, or HTTP handler

---

### 4. ✅ database-schema-design (11.9 KB)
**Purpose**: Master Prisma schema design for PostgreSQL

**Key Content**:
- Core principles: BIGINT for money, BIGINT scaled for prices, no balance storage
- Complete ProTraderSim schema: Users, Trades, Instruments, Ledger, Deposits, Withdrawals, KYC, Staff
- Timestamp patterns (created_at, @updatedAt)
- Foreign key strategies (onDelete: Cascade)
- Index strategy (what to index, what not to)
- One-to-Many, One-to-One, Many-to-Many relationships
- Pre-PR checklist

**Primary Agents Enhanced**:
- 🎯 **Schema Agent** — Design tables, columns, relationships correctly
- 🎯 **Architecture Agent** — Understand database constraints
- 🎯 **Coding Agent** — Write proper Prisma relations in queries

**Usage**: `@schema` when designing tables, `@coding` when writing ORM queries

---

## 📊 Impact on All 14 Agents

| Agent | Skill | How It Helps |
|-------|-------|------------|
| **Orchestrator** | All 4 | Reference when routing complex tasks to specialists |
| **Research** | database-schema-design | Understand data model for research questions |
| **Architect** | All 4 | Foundation for all architecture decisions |
| **UI/UX Designer** | All 4 | Context on backend constraints affecting UX |
| **Frontend** | financial-calculations, bigint-money-handling, api-route-creation | Build correct trading UI bound to APIs |
| **Coding** | All 4 | Core foundation — use for every implementation |
| **Security** | bigint-money-handling, api-route-creation | Secure payment flows and API security |
| **Test** | financial-calculations, bigint-money-handling | Write comprehensive edge case tests |
| **Schema** | database-schema-design | Design all new tables and migrations |
| **Debug** | All 4 | Understand root causes of financial/API bugs |
| **Code-Review** | All 4 | Review against these standards |
| **Documentation** | All 4 | Document proper usage patterns |
| **Performance** | database-schema-design, api-route-creation | Optimize queries and endpoint latency |
| **DevOps** | database-schema-design | Understand migration strategies |

---

## 🎓 Example Usage Chains

### Feature: Build "Deposit Endpoint"

```
1. @schema — Use database-schema-design
   → Create DepositRequest table (BIGINT cents)
   
2. @coding — Use api-route-creation + bigint-money-handling
   → Build POST /api/deposits route
   → Validate amount with Zod
   → Call depositService
   
3. @coding — Use bigint-money-handling + financial-calculations
   → Implement depositService.createDeposit()
   → Convert $100.50 → 10050n cents
   → Create ledger entry
   → Update balance
   
4. @test — Use bigint-money-handling
   → Test edge cases (0, $999999.99, negative)
   → Test ledger atomicity
```

### Feature: "Buy Position with Leverage"

```
1. @schema — Use database-schema-design
   → Ensure Trade & Instrument tables have right fields
   
2. @architect — Use financial-calculations
   → Design margin requirements: leverage formula
   → Design position struct
   
3. @coding — Use financial-calculations + api-route-creation
   → Build POST /api/positions route with auth
   → Implement openPosition service
   → Calculate margin: (units × contractSize × price × CENTS) / (leverage × PRICE_SCALE)
   
4. @test — Use financial-calculations + bigint-money-handling
   → Test margin = $1000 with 1.5 lot size, 500 leverage
   → Test insufficient margin rejection
   → Test with extreme prices (0.1 pips, 100 pips)
```

---

## 🔗 Skill Interdependencies

```
financial-calculations
    ↓
    └─→ Used by: Coding, Test, Architecture
        Enables: margin calcs, P&L, equity
        
bigint-money-handling
    ↓
    └─→ Used by: Coding, Security, Test
        Enables: deposits, withdrawals, balance
        
api-route-creation
    ↓
    └─→ Used by: Coding, Security, Architecture
        Enables: all REST endpoints
        
database-schema-design
    ↓
    └─→ Used by: Schema, Architecture, Coding, Performance
        Enables: all data persistence
```

---

## ✅ Quality Metrics

| Metric | Value |
|--------|-------|
| Total Skills Created | 4 |
| Total Content Size | 43.4 KB |
| Avg Skill Size | 10.85 KB |
| Code Examples | 25+ |
| Checklists | 8 |
| Common Mistakes | 16 |
| Formulas Documented | 6 |
| Schema Tables | 11 |

---

## 🚀 Next Steps

### Phase 2 (8 skills) — Ready When You Are
- rbac-implementation (Role-based access control)
- trading-calculations (Advanced formulas)
- socket-io-real-time (WebSocket setup)
- payment-integration (NowPayments flow)
- kyc-compliance-flow (Document handling)
- state-management-trading (Zustand + React Query)
- trading-ui-components (Charts, tables, forms)

### Phase 3 (8 skills) — Quality & Testing
- testing-financial-features (Unit/integration tests)
- api-integration-testing (Route testing)
- typescript-type-safety (Type guards)
- api-response-design (Response formats)
- error-handling-patterns (Standardized errors)
- e2e-trading-flows (Playwright)
- orm-query-optimization (Prisma efficiency)
- troubleshooting-financial-errors (Debugging)

### Phase 4 (8 skills) — Supportive
- socket-io-debugging, performance-profiling-api
- secrets-and-env-vars, authentication-jwt-flow
- regulatory-compliance, monorepo-package-management
- docker-local-development, deployment-railway-ecs

---

## 📝 How to Use These Skills

1. **In Chat**: Reference directly
   ```
   @coding Use the financial-calculations skill to implement margin math
   ```

2. **In Agent Prompts**: Agents automatically load relevant skills
   ```
   @coding Build POST /api/positions
   → Coding agent loads: api-route-creation, financial-calculations, bigint-money-handling
   ```

3. **In Code Reviews**: Check against skill checklists
   ```
   @code-review Review new trading endpoint
   → Validates against api-route-creation + bigint-money-handling standards
   ```

---

## 🎉 Success Summary

✅ **Phase 1 Complete**
- 4 skills covering financial math, money handling, API structure, database design
- 43.4 KB of comprehensive documentation, checklists, examples
- Supporting all 14 agents with foundational knowledge
- Ready for Phase 2 implementation

All skills are **workspace-scoped** (.github/skills/) and ready for team collaboration.

**Proceed to Phase 2?** Reply `proceed` or specify which Phase 2 skills to build first.
