---
name: bigint-money-handling
description: "Use when: converting between dollars and cents, storing/retrieving money values, validating monetary inputs, or formatting money for display. Ensures BigInt precision throughout payment flows, deposits, withdrawals, and API responses. Primary agents: Coding, Security, Test."
---

# BigInt Money Handling — ProTraderSim

Master the safe conversion, storage, and validation of all monetary values in ProTraderSim. **All money is stored as BIGINT cents in the database.** Never use Float, Decimal, or Number.

---

## 🏦 Core Principle

**Single Source of Truth**: All money flows through the `ledger_transactions` table.

```
User Balance = SUM(debit - credit) from ALL ledger_transactions for that user
              (Never stored directly — always computed)
```

Example ledger entry:
```sql
id | user_id | type       | amount_cents | balance_after_cents | created_at
---|---------|------------|--------------|---------------------|----
1  | 123     | DEPOSIT    | 500000       | 500000               | 2026-03-01
2  | 123     | TRADE_LOSS | 25000        | 475000               | 2026-03-02
3  | 123     | WITHDRAWAL| -100000       | 375000               | 2026-03-03
```

---

## 💵 Conversions

### String ↔ Cents

**Storage Format**: Always BIGINT (can be negative for debt)

```typescript
import { MoneyString, centsToDollars, dollarsToCents } from '@protrader/utils'

// ❌ WRONG
const cents = 100.50  // This is a number, not BigInt

// ✅ CORRECT
const centsValue: bigint = 10050n  // Exactly $100.50

// From string input (API request)
const userInput = "100.50"  // User typed $100.50
const centsValue: bigint = dollarsToCents(userInput)  // 10050n

// To string for API response
const centsValue: bigint = 10050n
const forDisplay: MoneyString = centsToDollars(centsValue)  // "10050" (stored as string)
```

**Helper Functions** (from `packages/utils/src/money.ts`):

```typescript
/**
 * Convert dollar amount to cents (BigInt)
 * @param dollars "100.50" or 100.50
 * @returns 10050n
 */
export function dollarsToCents(dollars: string | number): bigint {
  const str = String(dollars)
  const [whole, fraction = '00'] = str.split('.')
  const frac = fraction.padEnd(2, '0').slice(0, 2)
  return BigInt(whole + frac)
}

/**
 * Convert cents (BigInt) to dollar string
 * @param cents 10050n
 * @returns "10050" (MoneyString for API)
 */
export function centsToDollars(cents: bigint): MoneyString {
  return cents.toString()  // API response format
}

/**
 * Format for display (with $ sign)
 * @param cents 10050n
 * @returns "$100.50"
 */
export function formatMoney(cents: bigint): string {
  const dollars = Number(cents) / 100
  return `$${dollars.toFixed(2)}`
}
```

### Price Conversions (PRICE_SCALE)

**Storage Format**: BIGINT scaled by 100000

```typescript
import { PriceString, priceToScaled, scaledToPrice } from '@protrader/utils'

const PRICE_SCALE = 100000n

// Quote: EUR/USD = 1.08500
const scaledPrice = 1.08500 * PRICE_SCALE  // 108500n
const scaledPrice = 108500n                 // Directly as BigInt

// Back to readable price
const readable = Number(scaledPrice) / Number(PRICE_SCALE)  // 1.08500

// API response (PriceString)
const forApi: PriceString = scaledPrice.toString()  // "108500"
```

---

## 📥 Input Validation

### Validate Dollar Amounts

```typescript
import { z } from 'zod'

const WithdrawalSchema = z.object({
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Must be valid money format')
    .refine((val) => {
      try {
        const cents = dollarsToCents(val)
        // Check range: $0.01 to $999,999.99
        return cents > 0n && cents <= 99999999n
      } catch {
        return false
      }
    }, 'Amount must be between $0.01 and $999,999.99')
})

// Usage
const input = req.body  // { amount: "150.50" }
const parsed = WithdrawalSchema.parse(input)
// Now safe to use: dollarsToCents(parsed.amount)
```

### Validate Before Ledger Entry

```typescript
async function recordDebit(
  userId: string,
  amountCents: bigint,
  type: 'WITHDRAWAL' | 'TRADE_LOSS' | 'FEE'
) {
  // 1. Validate amount is positive
  if (amountCents <= 0n) {
    throw new Error('Debit amount must be positive')
  }

  // 2. Check available balance
  const currentBalance = await getBalance(userId)
  if (currentBalance < amountCents) {
    throw new Error('Insufficient balance')
  }

  // 3. Create ledger entry
  const entry = await prisma.ledger_Transaction.create({
    data: {
      user_id: userId,
      type,
      amount_cents: amountCents.toString(),
      balance_after_cents: (currentBalance - amountCents).toString()
    }
  })

  return entry
}
```

---

## 📤 API Responses

### Response Type Definitions

```typescript
// packages/types/src/index.ts
export type MoneyString = string & { readonly __brand: 'MoneyString' }
export type PriceString = string & { readonly __brand: 'PriceString' }

function masMoney(value: string): MoneyString {
  return value as MoneyString
}

function asPrice(value: string): PriceString {
  return value as PriceString
}
```

### Example API Response

```typescript
// ✅ CORRECT
const response: ApiResponse<PositionData> = {
  success: true,
  data: {
    id: 'pos_123',
    symbol: 'EUR/USD',
    margin_used: '100000' as MoneyString,  // $1,000.00
    unrealized_pnl: '2500' as MoneyString, // $25.00 (profit)
    open_rate: '108500' as PriceString,    // 1.08500
    current_bid: '108750' as PriceString   // 1.08750
  }
}

// ❌ WRONG — Never send as Number
{
  margin_used: 100000,        // Could lose precision
  unrealized_pnl: 2500.50,    // Float rounding error
}
```

---

## 💾 Database Storage

### Prisma Schema (Correct)

```prisma
// packages/db/prisma/schema.prisma

model LedgerTransaction {
  id              String    @id @default(cuid())
  user_id         String
  type            String    // DEPOSIT, WITHDRAWAL, TRADE_LOSS, etc.
  amount_cents    BigInt    // ✅ Store as BIGINT, never Decimal
  balance_after_cents BigInt
  created_at      DateTime  @default(now())
  
  @@index([user_id, created_at])
}

model TraderWallet {
  id              String    @id @default(cuid())
  user_id         String    @unique
  // ❌ DO NOT store balance here
  // Balance = SUM FROM ledger_transactions for this user
  created_at      DateTime  @default(now())
}
```

### Read Balance from Ledger

```typescript
async function getBalance(userId: string): Promise<bigint> {
  const latestEntry = await prisma.ledger_transaction.findFirst({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    select: { balance_after_cents: true }
  })
  
  return latestEntry ? BigInt(latestEntry.balance_after_cents) : 0n
}

// OR compute from all transactions
async function computeBalance(userId: string): Promise<bigint> {
  const result = await prisma.ledger_transaction.aggregate({
    where: { user_id: userId },
    _sum: {
      amount_cents: true  // Signed: debits negative, credits positive
    }
  })
  
  return result._sum.amount_cents ?? 0n
}
```

---

## 🔄 Common Flows

### Deposit Flow

```typescript
async function processDeposit(
  userId: string,
  amountDollars: string  // "100.50" from API
): Promise<DepositRecord> {
  // 1. Convert to cents
  const amountCents = dollarsToCents(amountDollars)
  
  // 2. Validate
  if (amountCents < 100n) {
    throw new Error('Minimum deposit is $1.00')
  }
  
  // 3. Get current balance
  const oldBalance = await getBalance(userId)
  const newBalance = oldBalance + amountCents
  
  // 4. Create ledger entry (atomic)
  const entry = await prisma.ledger_transaction.create({
    data: {
      user_id: userId,
      type: 'DEPOSIT',
      amount_cents: amountCents.toString(),
      balance_after_cents: newBalance.toString()
    }
  })
  
  // 5. Return to API (as MoneyString)
  return {
    id: entry.id,
    amount: amountCents.toString() as MoneyString,
    balance: newBalance.toString() as MoneyString
  }
}
```

### Withdrawal Flow

```typescript
async function processWithdrawal(
  userId: string,
  amountDollars: string
): Promise<WithdrawalRecord> {
  // 1. Convert to cents
  const amountCents = dollarsToCents(amountDollars)
  
  // 2. Check sufficient balance (with margin buffer)
  const availableBalance = await getAvailableBalance(userId)
  if (availableBalance < amountCents) {
    throw new Error('INSUFFICIENT_BALANCE')
  }
  
  // 3. Create withdrawal request (ON_HOLD status)
  const withdrawal = await prisma.withdrawal_request.create({
    data: {
      user_id: userId,
      amount_cents: amountCents.toString(),
      status: 'ON_HOLD'
    }
  })
  
  // 4. Deduct from available (not yet confirmed)
  const oldBalance = await getBalance(userId)
  const newBalance = oldBalance - amountCents
  
  await prisma.ledger_transaction.create({
    data: {
      user_id: userId,
      type: 'WITHDRAWAL_HOLD',
      amount_cents: (-amountCents).toString(),
      balance_after_cents: newBalance.toString()
    }
  })
  
  return withdrawal
}
```

---

## ✅ Implementation Checklist

### Before Touching Money
- [ ] Am I using BigInt (not number/float)?
- [ ] Did I validate input with Zod schema?
- [ ] Am I storing in a ledger entry, not a balance field?
- [ ] Did I compute new balance correctly?
- [ ] Is this an atomic transaction (all or nothing)?

### For Every Money Operation
- [ ] Is the amount positive or negative as intended?
- [ ] Did I check sufficient balance before debit?
- [ ] Did I format response as MoneyString?
- [ ] Did I round correctly (if at all)?
- [ ] Did I test with edge cases (0, negative, 1M+)?

---

## 🚨 Common Mistakes

| ❌ Wrong | ✅ Correct |
|---------|-----------|
| Store balance in `trader_wallet.balance` field | Compute from `ledger_transactions` SUM |
| Use `Decimal` type in Prisma | Use `BigInt` |
| `const cents = dollars * 100` (as number) | `dollarsToCents("100.50")` → 10050n |
| API response: `{ balance: 100000 }` | API response: `{ balance: "100000" }` |
| Check balance after transaction | Check balance **before** and use in calc |
| `new BigInt(dollars * 100)` | `dollarsToCents(dollars)` |

---

## 📚 Related Skills

- `financial-calculations` — Using money in formulas
- `api-response-design` — Formatting money for APIs
- `testing-financial-features` — Writing money tests
