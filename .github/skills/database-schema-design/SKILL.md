---
name: database-schema-design
description: "Use when: designing database schema, creating new tables, adding columns, designing relationships, or planning migrations. Ensures proper normalization, BIGINT usage for money, index strategies, and Prisma best practices. Primary agents: Schema, Architecture, Coding."
---

# Database Schema Design — ProTraderSim

Master Prisma schema design for ProTraderSim's PostgreSQL 17 database. Every table is a building block — poor schema design cascades into business logic bugs and performance nightmares.

---

## 🏛️ Core Principles

### 1. **Money is BIGINT Cents (Never Stored as Balance)**

```prisma
// ✅ CORRECT — Store as BIGINT, compute balance from ledger
model LedgerTransaction {
  id                String   @id @default(cuid())
  user_id           String
  type              String   // DEPOSIT, WITHDRAWAL, TRADE_LOSS, FEE
  amount_cents      BigInt   // Signed: positive credit, negative debit
  balance_after_cents BigInt // Immutable snapshot for audit only (never a canonical balance)
  created_at        DateTime @default(now())
  
  @@index([user_id, created_at])
}

// ❌ WRONG — Never store balance here
model TraderWallet {
  id        String @id @default(cuid())
  user_id   String @unique
  balance   Decimal  // ❌ Don't do this
}
```

**Rule**: Compute balance as SUM(LedgerTransaction.amount_cents) for that user. Never persist balance on user-facing wallet records. Immutable per-transaction snapshots like LedgerTransaction.balance_after_cents are permitted solely for auditing and reconciliation purposes.

### 2. **Prices are BIGINT Scaled ×100000**

```prisma
// PRICE_SCALE = 100000
// 1.08500 USD = 108500n (stored as BIGINT)

model Trade {
  id              String @id @default(cuid())
  symbol          String
  open_rate_scaled BigInt // 1.08500 → 108500n
  close_rate_scaled BigInt?
  current_bid_scaled BigInt // Real-time
  
  @@index([symbol, created_at])
}
```

### 3. **Timestamps are ALWAYS DateTime with @default(now())**

```prisma
model Entity {
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt  // Auto-updates
}
```

### 4. **Foreign Keys Use @relation with onDelete/onUpdate**

```prisma
// Parent table
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  trades    Trade[]  // Implicit relation
}

// Child table
model Trade {
  id      String @id @default(cuid())
  user_id String
  user    User   @relation(fields: [user_id], references: [id], onDelete: Cascade)
}
```

---

## 📊 ProTraderSim Core Schema

### User & Auth Tables

```prisma
model User {
  id              String   @id @default(cuid())
  email           String   @unique @db.VarChar(255)
  password_hash   String   @db.VarChar(255)
  roles           String[] @default(["TRADER"])  // TRADER, ADMIN, IB_AGENT
  kyc_status      String   @default("PENDING")   // PENDING, APPROVED, REJECTED
  pool_code       String?  // Mandatory for traders
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  
  // Relations
  trades          Trade[]
  ledger          LedgerTransaction[]
  withdrawals     WithdrawalRequest[]
  deposits        DepositRequest[]
  kyc_documents   KycDocument[]
  sessions        Session[]
  managed_by      StaffManagedUser[]
  
  @@index([email])
  @@index([pool_code])
}

model Session {
  id            String   @id @default(cuid())
  user_id       String
  token         String   @unique
  expires_at    DateTime
  created_at    DateTime @default(now())
  
  user          User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  
  @@index([user_id])
}
```

### Financial Data Tables

```prisma
model Instrument {
  id                 String   @id @default(cuid())
  symbol             String   @unique  // EUR/USD
  contract_size      Int      // 100000 for Forex, 1 for stocks
  leverage           Int      // 500
  margin_call_bps    Int      // 10000 bps = 100%
  stop_out_bps       Int      // 5000 bps = 50%
  spread_pips        Int      // Bid-ask spread in pips
  pip_decimal_places Int      // 4 for EUR/USD, 2 for USDJPY
  swap_buy_bps       Int      // Buy overnight fee in bps
  swap_sell_bps      Int      // Sell overnight fee in bps
  twelve_data_symbol String   // For market data API
  is_active          Boolean  @default(true)
  created_at         DateTime @default(now())
  updated_at         DateTime @updatedAt
  
  // Relations
  trades             Trade[]
  
  @@index([symbol])
  @@unique([twelve_data_symbol])
}

model Trade {
  id                  String   @id @default(cuid())
  user_id             String
  symbol              String
  direction           String   // BUY or SELL
  units               Int      // Lot size × 100 (e.g., 1.5 lots = 150 units)
  leverage            Int
  open_rate_scaled    BigInt   // Price × PRICE_SCALE
  close_rate_scaled   BigInt?
  open_timestamp      DateTime @default(now())
  close_timestamp     DateTime?
  status              String   @default("OPEN")  // OPEN, CLOSED
  closed_by           String?  // USER, MARGIN_CALL, TAKE_PROFIT, etc.
  margin_used_cents   BigInt   // BIGINT cents
  swap_charged_cents  BigInt   @default(0)      // Accumulating
  created_at          DateTime @default(now())
  updated_at          DateTime @updatedAt
  
  // Relations
  user                User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  instrument          Instrument @relation(fields: [symbol], references: [symbol], onDelete: Restrict)
  
  @@index([user_id, status])
  @@index([symbol])
  @@index([open_timestamp, close_timestamp])
}

model LedgerTransaction {
  id                  String   @id @default(cuid())
  user_id             String
  type                String   // DEPOSIT, WITHDRAWAL, TRADE_LOSS, SWAP_CHARGE, etc.
  amount_cents        BigInt   // Signed: positive = credit, negative = debit
  balance_after_cents BigInt   // Snapshot for audit
  trade_id            String?  // Reference if from trade
  created_at          DateTime @default(now())
  
  user                User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  
  @@index([user_id, created_at])
  @@index([type])
}
```

### Withdrawal & Deposit Tables

```prisma
model DepositRequest {
  id              String   @id @default(cuid())
  user_id         String
  amount_cents    BigInt   // BIGINT cents
  currency        String   // USDT, ETH
  status          String   @default("PENDING")  // PENDING, CONFIRMED, FAILED
  tx_hash         String?  // Blockchain transaction
  confirmed_at    DateTime?
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  
  user            User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  
  @@index([user_id, status])
  @@index([tx_hash])
}

model WithdrawalRequest {
  id              String   @id @default(cuid())
  user_id         String
  amount_cents    BigInt   // BIGINT cents
  status          String   @default("ON_HOLD")  // ON_HOLD, APPROVED, REJECTED, COMPLETED
  destination     String   // Wallet address
  approved_by     String?  // Admin user_id
  rejected_reason String?
  completed_at    DateTime?
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  
  user            User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  
  @@index([user_id, status])
  @@index([approved_by])
}
```

### KYC & Compliance Tables

```prisma
model KycDocument {
  id              String   @id @default(cuid())
  user_id         String
  type            String   // PASSPORT, ID_CARD, PROOF_OF_ADDRESS
  cloudflare_key  String   // S3 key in R2
  status          String   @default("PENDING")  // PENDING, APPROVED, REJECTED
  reviewed_by     String?  // Admin user_id (FK)
  rejection_reason String?
  uploaded_at     DateTime @default(now())
  reviewed_at     DateTime?
  updated_at      DateTime @updatedAt
  
  user            User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  reviewer        Staff?   @relation(fields: [reviewed_by], references: [id], onDelete: SetNull)
  
  @@index([user_id, type])
  @@index([status])
}
```

### Staff & IB Tables

```prisma
model Staff {
  id              String   @id @default(cuid())
  email           String   @unique
  role            String   // SUPER_ADMIN, ADMIN, IB_TEAM_LEADER, AGENT
  status          String   @default("ACTIVE")  // ACTIVE, INACTIVE
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  
  // Relations
  users_managed   StaffManagedUser[]
  kyc_reviews     KycDocument[]
  
  @@index([email])
  @@index([role])
}

model StaffManagedUser {
  id        String   @id @default(cuid())
  staff_id  String
  user_id   String
  
  staff     Staff    @relation(fields: [staff_id], references: [id], onDelete: Cascade)
  user      User     @relation("manages", fields: [user_id], references: [id], onDelete: Cascade)
  
  @@unique([staff_id, user_id])
  @@index([user_id])
}

model IbCommission {
  id              String   @id @default(cuid())
  trade_id        String
  ib_agent_id     String
  rate_bps        Int      // Commission in basis points
  commission_cents BigInt  // = (trade_value * rate_bps) / BPS_SCALE
  paid             Boolean  @default(false)
  created_at      DateTime @default(now())
  
  trade           Trade    @relation(fields: [trade_id], references: [id], onDelete: Cascade)
  ib_agent        Staff    @relation(fields: [ib_agent_id], references: [id], onDelete: Restrict)
  
  @@index([ib_agent_id, paid])
  @@index([trade_id])
}
```

---

## 🔍 Index Strategy

### Always Index These

```prisma
model Trade {
  // ... fields ...
  
  // User's trades for dashboard
  @@index([user_id, status])
  
  // Price feed updates per symbol
  @@index([symbol])
  
  // Margin call detection (margin_level calculation)
  @@index([user_id, status])  // Reuse above
  
  // Transaction history
  @@index([open_timestamp])
  @@index([close_timestamp])
}

model LedgerTransaction {
  // User balance queries
  @@index([user_id, created_at])
  
  // Audit by type
  @@index([type])
}

model User {
  // Auth lookups
  @@index([email])
  
  // Referral tracking
  @@index([pool_code])
}
```

### Avoid Over-Indexing

```prisma
// ❌ Too many indexes hurt write performance
model Trade {
  @@index([user_id])
  @@index([symbol])
  @@index([status])
  @@index([created_at])
  // Now every INSERT/UPDATE is slow
}

// ✅ Composite indexes when possible
model Trade {
  @@index([user_id, status])       // For "trader's open trades"
  @@index([symbol, created_at])    // For "price feed history"
}
```

---

## 🔗 Relationships

### One-to-Many (User → Trades)

```prisma
model User {
  id     String @id
  trades Trade[]
}

model Trade {
  id      String @id
  user_id String
  user    User   @relation(fields: [user_id], references: [id], onDelete: Cascade)
}

// Query
const user = await prisma.user.findUnique({
  where: { id: 'user_123' },
  include: { trades: true }
})
```

### One-to-One (User → Session)

```prisma
model User {
  id        String   @id
  email     String   @unique
  session   Session?
}

model Session {
  id        String  @id
  user_id   String  @unique
  user      User    @relation(fields: [user_id], references: [id], onDelete: Cascade)
}
```

### Many-to-Many (Implicit)

```prisma
// Users have multiple roles (implicit join table)
model User {
  id    String @id
  roles String[]  // ["TRADER", "ADMIN"]
}
```

---

## ✅ Schema Design Checklist

### Before Adding a Table
- [ ] Does this entity belong in the DB (not in ephemeral cache)?
- [ ] Do I have a primary key?
- [ ] Are all monetary values BIGINT cents?
- [ ] Are all prices BIGINT scaled?
- [ ] Do I have timestamps (created_at, updated_at)?
- [ ] Are foreign keys properly defined?

### Before Adding a Column
- [ ] Does this column contain unique identifiers (add @unique)?
- [ ] Should this be indexed for queries?
- [ ] Is this nullable, or should I set a @default?
- [ ] If money: is this BIGINT cents?
- [ ] If price: is this BIGINT scaled?

### Before the PR
- [ ] Schema compiles (`pnpm db:generate` succeeds)
- [ ] Migration file created (`pnpm db:migrate`)
- [ ] No breaking changes to existing tables
- [ ] Tests updated for new fields
- [ ] Documentation updated (CLAUDE.md)

---

## 🚨 Common Mistakes

| ❌ Wrong | ✅ Correct |
|---------|-----------|
| Store balance in `user.balance` | Compute from `ledger_transactions` SUM |
| Use `Decimal` for money | Use `BigInt` for BIGINT cents |
| Store price as Float (1.085) | Store as `BigInt` scaled (108500n) |
| No indexes on frequently queried fields | Index `user_id`, `symbol`, `created_at` |
| Foreign key with no `onDelete` | `@relation(..., onDelete: Cascade)` |
| Optional field with no @default | Add `@default(false)` or make non-optional |
| Nested relations without limits | Use `select` to limit relational data |
| No updated_at field | Always add `updated_at DateTime @updatedAt` |

---

## 📚 Related Skills

- `orm-query-optimization` — Writing efficient Prisma queries
- `api-route-creation` — Using schema in routes
- `testing-financial-features` — Writing schema tests
