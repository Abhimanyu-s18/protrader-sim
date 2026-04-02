---
name: 'typescript-type-safety'
description: 'Use when: enforcing strict TypeScript compliance, eliminating any types, fixing type errors, designing type-safe APIs, or ensuring noUncheckedIndexedAccess and exactOptionalPropertyTypes compliance. Ensures zero runtime type errors through compile-time guarantees. Primary agents: @coding, @architecture, @code-review.'
---

# Skill: TypeScript Type Safety

**Scope**: Strict TypeScript enforcement, type design, eliminating unsafe patterns
**Primary Agents**: @coding, @architecture, @code-review
**When to Use**: Writing new code, reviewing PRs, fixing type errors, designing APIs

---

## Core Principles

### 1. Strict Mode is Non-Negotiable

ProTraderSim uses the strictest TypeScript configuration possible:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

**What this means**:

- `array[0]` returns `T | undefined`, not `T`
- `{ foo?: string }` cannot be assigned `{ foo: undefined }` — must omit the key entirely
- No implicit `any` anywhere — every type must be explicit

### 2. Never Use `any`

```typescript
// WRONG: Loses all type safety
const data: any = await fetch('/api/users')

// CORRECT: Explicit type
const data: ApiResponse<User[]> = await fetch('/api/users')

// CORRECT: Use unknown if type is truly uncertain
const data: unknown = await fetch('/api/users')
if (isUserResponse(data)) {
  // data is now ApiResponse<User[]>
}
```

### 3. Type Guards Over Type Assertions

```typescript
// WRONG: Unsafe assertion
const user = response.data as User

// CORRECT: Type guard validates at runtime
function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' && data !== null && 'id' in data && 'email' in data && 'role' in data
  )
}

if (isUser(response.data)) {
  // response.data is now User
}
```

---

## Common Patterns

### API Response Types

All API responses use the `ApiResponse<T>` wrapper:

```typescript
// packages/types/src/index.ts
export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  next_cursor: string | null
  has_more: boolean
}
```

**Usage in routes**:

```typescript
import type { ApiResponse } from '@protrader/types'

router.get('/users', authenticate, async (req, res) => {
  const users: User[] = await userService.findAll()
  const response: ApiResponse<User[]> = { data: users }
  res.json(response)
})
```

### Handling `noUncheckedIndexedAccess`

When accessing arrays or objects by key, always handle `undefined`:

```typescript
// WRONG: Assumes index exists
const firstUser = users[0]
console.log(firstUser.email) // Type error: Object is possibly undefined

// CORRECT: Handle undefined
const firstUser = users[0]
if (!firstUser) {
  throw new NotFoundError('No users found')
}
console.log(firstUser.email)

// CORRECT: Optional chaining
const userName = users[0]?.name ?? 'Unknown'
```

### Handling `exactOptionalPropertyTypes`

Optional properties cannot be explicitly set to `undefined`:

```typescript
interface CreateUserInput {
  email: string
  name?: string
}

// WRONG: Cannot assign undefined to optional property
const input: CreateUserInput = {
  email: 'test@example.com',
  name: undefined, // Type error
}

// CORRECT: Omit the property entirely
const input: CreateUserInput = {
  email: 'test@example.com',
}

// CORRECT: Conditional assignment
const input: CreateUserInput = {
  email: 'test@example.com',
  ...(name && { name }),
}
```

### Discriminated Unions for State

Use discriminated unions instead of boolean flags:

```typescript
// WRONG: Boolean flags lead to impossible states
interface TradeState {
  isLoading: boolean
  isError: boolean
  data?: Trade[]
  error?: Error
}

// CORRECT: Discriminated union prevents impossible states
type TradeState =
  | { status: 'loading' }
  | { status: 'success'; data: Trade[] }
  | { status: 'error'; error: Error }

// Usage
switch (state.status) {
  case 'loading':
    return <Spinner />
  case 'success':
    return <TradeTable data={state.data} />
  case 'error':
    return <ErrorMessage error={state.error} />
}
```

### Branded Types for Financial Values

Prevent mixing up different types of numbers:

```typescript
// packages/types/src/index.ts
export type MoneyString = string & { readonly __brand: 'MoneyString' }
export type PriceString = string & { readonly __brand: 'PriceString' }
export type UserId = string & { readonly __brand: 'UserId' }

// Usage
function formatMoney(amount: MoneyString): string {
  // Implementation
}

const balance: MoneyString = '10050' as MoneyString
formatMoney(balance) // ✅
formatMoney('not-branded') // ❌ Type error
```

---

## Type Design Checklist

When creating new types:

- [ ] No `any` types used anywhere
- [ ] All indexed access handles `undefined` (arrays, Record types)
- [ ] Optional properties not explicitly set to `undefined`
- [ ] Discriminated unions used for mutually exclusive states
- [ ] Branded types for financial values (MoneyString, PriceString)
- [ ] Type guards for runtime validation of unknown data
- [ ] Generic types constrained with `extends` where appropriate
- [ ] No type assertions (`as Type`) without runtime validation
- [ ] All function parameters and return types explicit
- [ ] Enums preferred over string unions for fixed sets (Prisma compatibility)

---

## Common Mistakes

### 1. Using `any` in Catch Blocks

```typescript
// WRONG
catch (error: any) {
  console.log(error.message)
}

// CORRECT
catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error'
  console.log(message)
}
```

### 2. Ignoring `noUncheckedIndexedAccess`

```typescript
// WRONG
const instrument = instruments.find((i) => i.symbol === 'EURUSD')
console.log(instrument.pipDecimalPlaces) // Could be undefined

// CORRECT
const instrument = instruments.find((i) => i.symbol === 'EURUSD')
if (!instrument) {
  throw new NotFoundError('Instrument not found')
}
console.log(instrument.pipDecimalPlaces)
```

### 3. Type Assertions Without Validation

```typescript
// WRONG
const user = JSON.parse(request.body) as User

// CORRECT
const parsed = z.object({ id: z.string(), email: z.string() }).parse(JSON.parse(request.body))
const user: User = parsed
```

### 4. Mixing Optional and Undefined

```typescript
// WRONG
interface Config {
  timeout?: number
}
const config: Config = { timeout: undefined }

// CORRECT
const config: Config = {}
// Or if you need to explicitly clear it:
const { timeout, ...rest } = config
```

---

## Migration Guide: Fixing Type Errors

### Step 1: Eliminate `any`

Search for `any` and replace with proper types:

```bash
# Find all any types
grep -r ": any" apps/ packages/
```

### Step 2: Handle Indexed Access

Add null checks for all array/object access:

```typescript
// Before
const value = map[key]

// After
const value = map[key]
if (value === undefined) {
  throw new Error(`Key ${key} not found`)
}
```

### Step 3: Fix Optional Properties

Remove explicit `undefined` assignments:

```typescript
// Before
const input = { email: 'test@example.com', name: undefined }

// After
const input = { email: 'test@example.com' }
```

---

## Code Review Checklist

When reviewing code for type safety:

- [ ] No `any` types in the diff
- [ ] All catch blocks use `unknown`
- [ ] Array/object access handles `undefined`
- [ ] No unsafe type assertions without validation
- [ ] Discriminated unions used for state management
- [ ] Financial values use branded types
- [ ] All function signatures have explicit types
- [ ] No implicit `any` from missing return types
