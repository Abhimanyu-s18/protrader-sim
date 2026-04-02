# Changelog

All notable changes to ProTraderSim will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

<!-- Add unreleased changes below this line -->

### Added

<!-- Unreleased features will be added here -->

### Changed

<!-- Pending changes will be added here -->

### Deprecated

<!-- Nothing deprecated yet -->

### Removed

<!-- Nothing removed yet -->

### Fixed

<!-- Pending fixes will be added here -->

### Security

<!-- Unreleased security improvements will be added here -->

---

## Version History

### Version 0.1.0 — 2026-04-02

**Initial Release**

#### Added

- Initial project setup with Turborepo monorepo structure
- 6 applications: web, auth, platform, admin, ib-portal, api
- PostgreSQL 17 database with Prisma ORM
- Redis 7 caching layer
- Socket.io real-time price feeds
- BullMQ job queue system
- 14 specialized AI agents for development assistance
- 12 domain-specific skills for AI agents
- NowPayments crypto payment integration
- Cloudflare R2 KYC document storage
- Resend email notification system
- Twelve Data market data integration
- 4-role staff RBAC system (SUPER_ADMIN → ADMIN → IB_TEAM_LEADER → AGENT)
- IB commission tracking per trade
- BIGINT-based financial calculations (cents for money, scaled for prices)
- Ledger-based balance computation (balance never stored directly)
- Trading engine with margin, P&L, and leverage calculations
- Admin back-office panel
- IB portal for agent and team leader management

#### Core Platform

- Multi-asset CFD simulation trading platform
- Support for Forex (40 pairs), Stocks (15), Indices (3), Commodities (2), Crypto (10)
- Real-time price updates via Socket.io
- Position management with stop loss and take profit
- Margin call and stop-out mechanisms
- IB (Introducing Broker) commission model

#### Technical Stack

- Next.js 15 (App Router) for all frontend apps
- Express.js for REST API
- PostgreSQL 17 with Prisma ORM
- Redis 7 for caching
- BullMQ for background jobs
- TypeScript strict mode throughout

#### Infrastructure

- Docker Compose for local development
- Supabase for production database (eu-west-1)
- ElastiCache for production Redis
- GitHub Actions CI/CD pipeline
- Railway for staging deployments
- AWS ECS for production deployments

#### Documentation

- Complete technical specifications (14 documents)
- AI agent framework (14 agents)
- Domain skills library (12 skills)
- Developer onboarding guides
- Common workflows and troubleshooting guides

#### Security

- JWT RS256 asymmetric key authentication
- Rate limiting (100 req/min global, 10 req/15min on auth)
- Input validation with Zod
- Cloudflare R2 secure KYC storage
- NowPayments webhook signature verification
- RBAC enforcement on all admin endpoints

---

## How to Update This File

When making changes:

1. Add entries under `[Unreleased]` section during development
2. Use the following categories:
   - `Added` for new features
   - `Changed` for changes in existing functionality
   - `Deprecated` for soon-to-be removed features
   - `Removed` for now removed features
   - `Fixed` for bug fixes
   - `Security` for security improvements

3. When releasing a version:
   - Replace `[Unreleased]` with version number and date
   - Add new `[Unreleased]` section above it
   - Update the version history section below

---

## Links

[Unreleased]: https://github.com/actual-org-name/protrader-sim/compare/v0.1.0...HEAD

- [GitHub Releases](https://github.com/actual-org-name/protrader-sim/releases)
- [Pull Requests](https://github.com/actual-org-name/protrader-sim/pulls)
- [Issues](https://github.com/actual-org-name/protrader-sim/issues)
