---
name: test-file-rules
description: Rules for test files
applyTo: '**/*.test.{ts,tsx}'
---

# Test File Rules

## Structure

- Co-locate tests with source files (`src/services/trading.test.ts`)
- Use `describe` blocks for grouping related tests
- Use `it` or `test` for individual test cases
- Follow AAA pattern: Arrange, Act, Assert

## Financial Tests

- NEVER use floating-point assertions for money values
- Use exact BigInt comparisons (`expect(value).toBe(10050n)`)
- Test edge cases: zero, negative, maximum values
- Test JPY pairs separately (2 decimal places vs 4)

## Naming

- Test file: `{source}.test.ts`
- Describe blocks: describe the unit being tested
- Test names: should + expected behavior
- Use present tense: "should return", "should throw"

## Mocking

- Mock external services (NowPayments, Twelve Data, Resend)
- NEVER mock the service layer in integration tests
- Use real database for integration tests
- Use `jest.mock()` at top of file

## Examples

```typescript
import { describe, it, expect } from '@jest/globals'
import { calculateMargin } from '@/lib/calculations'

describe('calculateMargin', () => {
  it('should compute correct margin for EUR/USD', () => {
    const margin = calculateMargin({
      units: 1n,
      contractSize: 100000n,
      openRateScaled: 108500n,
      leverage: 100n,
    })
    expect(margin).toBe(10850000n) // $108,500.00
  })

  it('should reject zero units', () => {
    expect(() =>
      calculateMargin({
        units: 0n,
        contractSize: 100000n,
        openRateScaled: 108500n,
        leverage: 100n,
      }),
    ).toThrow('Units must be greater than zero')
  })
})
```
