---
name: add-database-table
description: 'Add a new database table with Prisma schema, migration, seed data, and types'
argument-hint: 'Describe the table (name, fields, relationships, indexes, seed data requirements)'
agent: 'Schema'
---

# Add Database Table

You are adding a new database table to ProTraderSim. Follow the platform's financial precision rules and Prisma conventions.

## Input

- **Table Name**: {{table_name}}
- **Purpose**: {{purpose}}
- **Fields**: {{fields}}
- **Relationships**: {{relationships}}
- **Indexes**: {{indexes}}
- **Seed Data**: {{seed_data}}

## Implementation Steps

### 1. Schema Design (`packages/db/prisma/schema.prisma`)

Add the model following these rules:

- Model name: PascalCase singular (`User`, `Trade`, `Instrument`)
- Field names: camelCase (`userId`, `createdAt`, `openRate`)
- Database columns: Use `@map("snake_case")` for field mapping
- Table names: Use `@@map("snake_case_plural")` for table mapping
- ALL money fields: `BigInt @db.BigInt` (cents, never dollars)
- ALL price fields: `BigInt @db.BigInt` (scaled ×100000)
- Required fields: `id`, `createdAt`, `updatedAt`
- Use `@default(uuid())` for IDs
- Use `@default(now())` and `@updatedAt` for timestamps
- Define bidirectional relations with explicit `@relation`
- Add `onDelete: Cascade` or `onDelete: Restrict` explicitly

### 2. Index Strategy

Add indexes following these rules:

- All foreign keys MUST be indexed
- Composite indexes for common query patterns
- Use `@@unique` for natural unique keys
- Index name format: `@@index([field1, field2])`

### 3. Migration

Run these commands in order:

```bash
pnpm db:generate    # Generate Prisma client
pnpm db:migrate     # Create and apply migration
```

### 4. Seed Data (`packages/db/prisma/seed.ts`)

If seed data is needed:

- Add to existing seed function or create new section
- Use realistic test data
- Include edge cases (min/max values, boundary conditions)

### 5. Type Exports (`packages/types/src/index.ts`)

Export new types if they'll be used in API responses:

- Export the Prisma-generated type
- Create response type with `MoneyString`/`PriceString` conversions
- Export from package index

## Example Model

```prisma
model Example {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  amountCents BigInt   @db.BigInt  // Money in cents
  priceScaled BigInt   @db.BigInt  // Price ×100000
  status      ExampleStatus
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([status, createdAt])
  @@map("examples")
}

enum ExampleStatus {
  PENDING
  ACTIVE
  COMPLETED
  CANCELLED
}
```

## Checklist

- [ ] Model follows naming conventions
- [ ] Money fields use BigInt @db.BigInt
- [ ] Price fields use BigInt @db.BigInt
- [ ] Required fields present (id, createdAt, updatedAt)
- [ ] Relations are bidirectional
- [ ] onDelete behavior explicit
- [ ] Foreign keys indexed
- [ ] Composite indexes for query patterns
- [ ] Migration generated and applied
- [ ] Seed data added if needed
- [ ] Types exported from @protrader/types
- [ ] JSDoc comments on model (if complex)
