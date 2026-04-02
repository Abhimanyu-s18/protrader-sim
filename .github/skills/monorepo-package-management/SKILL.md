---
name: 'monorepo-package-management'
description: 'Use when: adding new packages to the monorepo, managing workspace dependencies, configuring Turborepo pipelines, resolving package linking issues, or optimizing build caching. Ensures consistent package structure and efficient monorepo operations. Primary agents: @devops, @architecture, @coding.'
---

# Skill: Monorepo Package Management

**Scope**: pnpm workspaces, Turborepo pipelines, package structure, dependency management
**Primary Agents**: @devops, @architecture, @coding
**When to Use**: Adding new packages, fixing workspace linking, optimizing builds, managing shared dependencies

---

## Core Principles

### 1. Workspace Structure

ProTraderSim uses pnpm workspaces with Turborepo for task orchestration:

```
protrader-sim/
├── apps/                    # Deployable applications
│   ├── api/                 # Express.js API (port 4000)
│   ├── web/                 # Marketing site (port 3000)
│   ├── auth/                # Auth flows (port 3001)
│   ├── platform/            # Trading dashboard (port 3002)
│   ├── admin/               # Admin panel (port 3003)
│   └── ib-portal/           # IB portal (port 3004)
├── packages/                # Shared packages
│   ├── config/              # ESLint, TypeScript, Tailwind configs
│   ├── db/                  # Prisma schema and client
│   ├── types/               # Shared TypeScript types
│   ├── utils/               # Utility functions
│   ├── ui/                  # Shared UI components
│   └── email/               # React Email templates
├── pnpm-workspace.yaml      # Workspace definition
├── turbo.json               # Turborepo configuration
└── package.json             # Root package.json
```

### 2. Package Dependency Rules

- **Apps depend on packages**: Never the reverse
- **Packages depend on packages**: Allowed with clear hierarchy
- **No circular dependencies**: Enforced by TypeScript
- **External dependencies**: Added to the package that uses them

```
apps/platform → packages/ui → packages/config
apps/api → packages/db → packages/types
apps/api → packages/utils → (no further deps)
```

### 3. Workspace Protocol

Use `workspace:*` for internal dependencies:

```json
{
  "dependencies": {
    "@protrader/types": "workspace:*",
    "@protrader/utils": "workspace:*",
    "@protrader/ui": "workspace:*"
  }
}
```

---

## Adding a New Package

### Step 1: Create Package Structure

```bash
# Create package directory
mkdir -p packages/new-package/src

# Create package.json
cat > packages/new-package/package.json << 'EOF'
{
  "name": "@protrader/new-package",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "import": "./src/index.ts",
      "require": "./src/index.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@protrader/config": "workspace:*",
    "typescript": "^5.4.0"
  }
}
EOF
```

### Step 2: Create TypeScript Config

```json
// packages/new-package/tsconfig.json
{
  "extends": "@protrader/config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 3: Create Source Files

```typescript
// packages/new-package/src/index.ts
export { exampleFunction } from './example.js'
export type { ExampleType } from './types.js'
```

### Step 4: Update Workspace

```yaml
# pnpm-workspace.yaml (usually already configured)
packages:
  - 'apps/*'
  - 'packages/*'
```

### Step 5: Install Dependencies

```bash
pnpm install
```

---

## Managing Dependencies

### Adding External Dependencies

```bash
# Add to specific package
pnpm add zod --filter @protrader/api

# Add dev dependency
pnpm add -D vitest --filter @protrader/api

# Add to multiple packages
pnpm add zod --filter @protrader/api --filter @protrader/platform
```

### Updating Dependencies

```bash
# Update all dependencies
pnpm update

# Update specific package
pnpm update zod

# Check for outdated packages
pnpm outdated
```

### Resolving Workspace Links

If workspace packages are not linking:

```bash
# Clean and reinstall
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
pnpm install

# Force relink
pnpm install --force
```

---

## Turborepo Configuration

### Pipeline Definition

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "globalEnv": ["NODE_ENV", "DATABASE_URL", "JWT_PUBLIC_KEY"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    }
  }
}
```

### Task Dependencies

The `^` prefix means "all dependencies":

```json
{
  "build": {
    "dependsOn": ["^build"] // Build dependencies first
  }
}
```

### Caching

```bash
# View cache status
pnpm turbo status

# Clear cache
pnpm turbo prune

# Run with cache disabled
pnpm turbo build --no-cache
```

---

## Common Issues and Fixes

### Issue 1: Package Not Found

**Symptoms**: `Cannot find module '@protrader/types'`

**Diagnosis**:

```bash
# Check if package is in workspace
pnpm list -r --depth=0

# Check workspace links
ls -la node_modules/@protrader/
```

**Fix**:

```bash
# Reinstall workspace
pnpm install

# Verify package.json exports
cat packages/types/package.json | grep exports
```

### Issue 2: Type Errors Across Packages

**Symptoms**: Type errors in dependent packages after changes

**Diagnosis**:

```bash
# Build dependencies first
pnpm turbo build --filter=@protrader/types

# Then check dependent package
pnpm typecheck --filter=@protrader/api
```

**Fix**:

```bash
# Rebuild entire dependency chain
pnpm turbo build --filter=@protrader/api...
```

### Issue 3: Circular Dependencies

**Symptoms**: TypeScript errors, runtime import failures

**Diagnosis**:

```bash
# Detect circular dependencies
npx madge --circular --extensions ts packages/
```

**Fix**:

- Extract shared types to `@protrader/types`
- Create utility package for shared functions
- Use dependency injection instead of direct imports

### Issue 4: Build Cache Stale

**Symptoms**: Changes not reflected after rebuild

**Fix**:

```bash
# Clear Turborepo cache
rm -rf .turbo

# Clear pnpm cache
pnpm store prune

# Rebuild from scratch
pnpm turbo build --no-cache
```

---

## Package Structure Guidelines

### Shared Types Package (`@protrader/types`)

```
packages/types/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts          # Re-exports all types
    ├── api.ts            # API response types
    ├── models.ts         # Database model types
    └── enums.ts          # Shared enums
```

### Shared Utils Package (`@protrader/utils`)

```
packages/utils/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts          # Re-exports all utilities
    ├── money.ts          # Money formatting
    ├── price.ts          # Price scaling
    └── api.ts            # API client utilities
```

### UI Components Package (`@protrader/ui`)

```
packages/ui/
├── package.json
├── tsconfig.json
├── tailwind.config.ts    # Shared Tailwind config
└── src/
    ├── index.ts          # Re-exports all components
    ├── components/       # UI components
    ├── hooks/            # Shared hooks
    └── lib/              # Internal utilities
```

---

## Best Practices

### 1. Keep Packages Focused

Each package should have a single responsibility:

- `@protrader/types` — Type definitions only
- `@protrader/utils` — Utility functions only
- `@protrader/ui` — UI components only

### 2. Use Explicit Exports

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./components/*": "./src/components/*.ts"
  }
}
```

### 3. Avoid Deep Imports

```typescript
// GOOD: Import from package root
import { Button } from '@protrader/ui'

// BAD: Deep import into package internals
import { Button } from '@protrader/ui/src/components/button'
```

### 4. Version Packages Together

All packages use version `0.0.0` — they are released together with the apps.

### 5. Document Package Contracts

Each package should have clear exports and documented APIs:

```typescript
// packages/types/src/index.ts
/**
 * Shared TypeScript types for ProTraderSim
 *
 * @packageDocumentation
 * @module @protrader/types
 */

export type { ApiResponse, ApiError } from './api.js'
export type { User, Trade, Instrument } from './models.js'
export type { TradeDirection, TradeStatus } from './enums.js'
```

---

## Commands Reference

```bash
# Install all dependencies
pnpm install

# Run command in specific package
pnpm --filter @protrader/api dev

# Run command in package and dependencies
pnpm --filter @protrader/api... build

# Run command across all packages
pnpm -r typecheck

# Turborepo commands
pnpm turbo build          # Build all
pnpm turbo dev            # Run all dev servers
pnpm turbo lint           # Lint all
pnpm turbo test           # Test all

# Dependency management
pnpm add <pkg> --filter @protrader/api
pnpm remove <pkg> --filter @protrader/api
pnpm update --filter @protrader/api
```
