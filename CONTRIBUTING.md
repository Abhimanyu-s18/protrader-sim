# Contributing to ProTraderSim

Thank you for contributing to **ProTraderSim** — a regulated, multi-asset offshore CFD simulation trading platform.

> **Regulated Platform**: This project operates under FSC Mauritius + FSA Seychelles licensing. All contributions must maintain strict financial precision, security, and compliance standards.

---

## Quick Start

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/protrader-sim.git
cd protrader-sim

# 2. Install dependencies
pnpm install

# 3. Start local infrastructure
docker compose up -d

# 4. Set up environment
cp .env.example apps/api/.env.local
# Fill in all values (see docs/Development & Operations/PTS-ENV-001_Environment_Setup.md)

# 5. Initialize database
pnpm db:migrate && pnpm db:seed

# 6. Start all apps
pnpm dev
```

---

## Development Workflow

### 1. Branch Naming

```
feature/descriptive-name      # New features
fix/descriptive-name          # Bug fixes
docs/descriptive-name         # Documentation updates
refactor/descriptive-name     # Code refactoring
perf/descriptive-name         # Performance improvements
```

### 2. Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

feat(api): add trailing stop loss endpoint
fix(platform): correct margin calculation for JPY pairs
docs(readme): update environment setup instructions
perf(api): optimize position listing query
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`

### 3. Pull Request Process

1. **Create PR** against `develop` branch (never `main`)
2. **Fill PR template** with:
   - What changed and why
   - Testing performed
   - Screenshots (for UI changes)
   - Database migrations included
3. **Request review** from at least one team member
4. **Address feedback** and update PR
5. **Squash merge** once approved

---

## Code Standards

### TypeScript

- Strict mode enabled with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`
- No `any` types — use proper type definitions
- Prefer early returns over nested conditionals
- Add JSDoc comments on all exported functions

### Financial Precision (CRITICAL)

- **All money**: `BIGINT` cents (e.g., `$100.50` = `10050n`)
- **All prices**: `BIGINT` scaled ×100000 (e.g., `1.08500` = `108500n`)
- **Never use**: `Decimal`, `Float`, `Double`, or `number` for financial calculations
- **Division is ALWAYS LAST** — multiply first, divide last

See [bigint-money-handling skill](.github/skills/bigint-money-handling/SKILL.md) for details.

### Code Style

- Prettier formatting (no semicolons, single quotes, 2 spaces)
- ESLint rules enforced (run `pnpm lint` before committing)
- Consistent error handling with `ApiResponse<T>` wrapper

---

## Testing

```bash
# Run all tests
pnpm test

# Test specific app
pnpm --filter @protrader/api test

# Run single test file
cd apps/api && pnpm jest src/services/trading.test.ts
```

**Testing Requirements**:

- Unit tests for all service functions
- Integration tests for API endpoints
- Financial calculation tests are highest priority
- Aim for >80% coverage on critical paths

---

## Architecture Overview

### Apps (6 total)

| App         | Port | Purpose                         |
| ----------- | ---- | ------------------------------- |
| `web`       | 3000 | Public marketing site           |
| `auth`      | 3001 | Login/Register/KYC flows        |
| `platform`  | 3002 | Trading dashboard (main UI)     |
| `admin`     | 3003 | Back-office admin panel         |
| `ib-portal` | 3004 | IB Agent/Team Leader portal     |
| `api`       | 4000 | Express.js REST API + Socket.io |

### Shared Packages

- `packages/config` — ESLint, TypeScript, Tailwind configs
- `packages/db` — Prisma schema and client
- `packages/types` — Shared TypeScript types
- `packages/utils` — Utility functions
- `packages/ui` — Shared UI components
- `packages/email` — React Email templates

### Layering Rules

```
Routes (HTTP only) → Services (business logic) → Database
```

- Routes handle HTTP request/response only
- Services contain all business logic
- No business logic in route handlers

---

## Documentation

### Technical Specifications

Full specifications are in `docs/`:

- [System Architecture](docs/Core%20Technical%20Specifications/PTS-ARCH-001_System_Architecture.md)
- [API Specification](docs/Core%20Technical%20Specifications/PTS-API-001_API_Specification.md)
- [Database Schema](docs/Core%20Technical%20Specifications/PTS-DB-001_Database_Schema.md)
- [Trading Calculations](docs/Core%20Technical%20Specifications/PTS-CALC-001_Trading_Calculations.md)
- [Environment Setup](docs/Development%20&%20Operations/PTS-ENV-001_Environment_Setup.md)
- [Data Dictionary](docs/Development%20&%20Operations/PTS-DATA-001_Data_Dictionary.md)

### Development Guides

- [Common Workflows](.github/COMMON_WORKFLOWS.md) — Step-by-step how-tos
- [Troubleshooting](.github/TROUBLESHOOTING.md) — Diagnosis & fixes
- [Quick Reference](.github/QUICK_REFERENCE.md) — 1-page agent selector

---

## AI Agent Integration

This project uses a specialized AI agent framework for development assistance.

### Available Agents (14 total)

| Agent          | Purpose                                  |
| -------------- | ---------------------------------------- |
| Orchestrator   | Master coordinator for complex tasks     |
| Architect      | System design & architecture decisions   |
| Coding         | Backend implementation (Express.js)      |
| Frontend       | Next.js 15 React components              |
| Schema         | Database design & Prisma migrations      |
| Security       | Compliance & security auditing           |
| Test           | Unit/integration/E2E test generation     |
| Debug          | Systematic bug diagnosis                 |
| Performance    | Bottleneck identification & optimization |
| DevOps         | CI/CD & infrastructure management        |
| Documentation  | Technical documentation                  |
| Code-Review    | Pull request reviews                     |
| UI/UX Designer | User experience & interface design       |
| Research       | Technical & regulatory research          |

### Available Skills (12 total)

Skills provide domain-specific knowledge for agents:

- `financial-calculations` — BigInt financial math
- `bigint-money-handling` — Safe monetary operations
- `api-route-creation` — Express.js route patterns
- `database-schema-design` — Prisma schema best practices
- `trading-calculations` — Margin, P&L, leverage formulas
- `socket-io-real-time` — WebSocket implementation
- `state-management-trading` — Frontend state patterns
- `trading-ui-components` — UI component library
- `payment-integration` — NowPayments integration
- `kyc-compliance-flow` — KYC document handling
- `rbac-implementation` — Role-based access control
- `orm-query-optimization` — Prisma query performance

See [Agent Skills Integration](.github/AGENT_SKILLS_INTEGRATION.md) for usage details.

---

## Database Migrations

When modifying the schema:

1. Edit `packages/db/prisma/schema.prisma`
2. Generate migration: `pnpm db:migrate`
3. Update types if needed: `pnpm db:generate`
4. Test migration locally before PR

**Never** modify production database directly — use migrations only.

---

## Deployment

### Environments

| Environment | Purpose     | Deployment                  |
| ----------- | ----------- | --------------------------- |
| Local       | Development | `docker compose up -d`      |
| Staging     | Testing     | Railway (auto-deploy on PR) |
| Production  | Live        | AWS ECS eu-west-1 (manual)  |

### CI/CD Pipeline

GitHub Actions runs on every PR:

- Lint & type-check
- Unit & integration tests
- Build verification
- Security scanning

See [.github/workflows/ci.yml](.github/workflows/ci.yml) for pipeline details.

---

## Getting Help

- **Architecture questions**: See [System Architecture](docs/Core%20Technical%20Specifications/PTS-ARCH-001_System_Architecture.md)
- **API questions**: See [API Specification](docs/Core%20Technical%20Specifications/PTS-API-001_API_Specification.md)
- **Calculation questions**: See [Trading Calculations](docs/Core%20Technical%20Specifications/PTS-CALC-001_Trading_Calculations.md)
- **Troubleshooting**: See [Troubleshooting Guide](.github/TROUBLESHOOTING.md)
- **Common tasks**: See [Common Workflows](.github/COMMON_WORKFLOWS.md)

---

## Code of Conduct

- Write clean, readable code over clever code
- Handle loading and error states in all UI components
- Never commit directly to `main`
- Respect the 4-role staff hierarchy: SUPER_ADMIN → ADMIN → IB_TEAM_LEADER → AGENT
- All financial operations must be auditable

---

## License

Proprietary — All rights reserved. This is a regulated financial platform.
