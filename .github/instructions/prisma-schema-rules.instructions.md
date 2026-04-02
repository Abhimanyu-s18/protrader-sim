---
name: prisma-schema-rules
description: Rules for editing Prisma schema files
applyTo: '**/*.prisma'
---

# Prisma Schema Rules

## Financial Fields

- All money fields MUST use `BigInt` (not `Decimal` or `Float`)
- All price fields MUST use `BigInt` (scaled ×100000)
- For timestamps: Use `@updatedAt` on `updatedAt` fields for automatic DB-side timestamp updates (recommended for most cases). Remove `@updatedAt` and require application code to set `updatedAt` explicitly when you need exact control over update timing or to set timestamps from application logic. Use `@default(now())` on `createdAt` if DB-assigned creation time is acceptable.

## Naming Conventions

- Model names: PascalCase singular (`User`, `Trade`, `Instrument`)
- Field names: camelCase (`userId`, `createdAt`, `openRate`)
- Relation fields: descriptive (`user`, `instrument`, `trades`)
- Index names: `idx_{table}_{columns}` format

## Required Fields

- Every model MUST have `id`, `createdAt`, `updatedAt`
- Use `@updatedAt` for automatic timestamp updates
- Use `@default(cuid())` or `@default(uuid())` for IDs

## Relations

- Always define bidirectional relations
- Use `@relation` with explicit `fields` and `references`
- Add `onDelete: Cascade` or `onDelete: Restrict` explicitly

## Indexes

- Add indexes on all foreign keys
- Add composite indexes for common query patterns
- Use `@@unique` for natural unique keys (e.g., `email`, `symbol`)

## Examples

```prisma
model Trade {
  id          String   @id @default(cuid())
  userId      String
  instrumentId String
  direction   TradeDirection
  units       BigInt
  leverage    Int
  openRate    BigInt   // Scaled ×100000
  marginCents BigInt   // In cents
  pnlCents    BigInt?  // In cents, null until closed
  status      TradeStatus @default(OPEN)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  instrument  Instrument @relation(fields: [instrumentId], references: [id], onDelete: Restrict)

  @@index([userId, status])
  @@index([instrumentId])
  @@index([createdAt(sort: Desc)])
}
```
