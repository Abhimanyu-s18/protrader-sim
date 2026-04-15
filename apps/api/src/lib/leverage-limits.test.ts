/**
 * Unit tests for leverage-limits.ts
 * Validates jurisdiction-aware leverage compliance across regulatory frameworks
 */

import { describe, it, expect } from 'vitest'
import { getLeverageLimit, validateLeverage } from './leverage-limits'

describe('leverage-limits', () => {
  describe('getLeverageLimit', () => {
    describe('EU regulated jurisdiction', () => {
      it('should return 30:1 max for Forex majors', () => {
        const limit = getLeverageLimit('EU', 'FOREX')
        expect(limit.maxLeverage).toBe(30)
        expect(limit.defaultLeverage).toBe(20)
        expect(limit.reason).toContain('ESMA')
      })

      it('should return 20:1 max for stocks', () => {
        const limit = getLeverageLimit('EU', 'STOCK')
        expect(limit.maxLeverage).toBe(20)
        expect(limit.defaultLeverage).toBe(10)
      })

      it('should return 20:1 max for indices', () => {
        const limit = getLeverageLimit('EU', 'INDEX')
        expect(limit.maxLeverage).toBe(20)
        expect(limit.defaultLeverage).toBe(10)
      })

      it('should return 20:1 max for commodities', () => {
        const limit = getLeverageLimit('EU', 'COMMODITY')
        expect(limit.maxLeverage).toBe(20)
        expect(limit.defaultLeverage).toBe(10)
      })

      it('should return 5:1 max for crypto (high volatility)', () => {
        const limit = getLeverageLimit('EU', 'CRYPTO')
        expect(limit.maxLeverage).toBe(5)
        expect(limit.defaultLeverage).toBe(2)
        expect(limit.reason).toContain('volatility')
      })
    })

    describe('UK regulated jurisdiction', () => {
      it('should follow ESMA-aligned limits (same as EU)', () => {
        const euLimit = getLeverageLimit('EU', 'FOREX')
        const ukLimit = getLeverageLimit('UK', 'FOREX')
        expect(ukLimit.maxLeverage).toBe(euLimit.maxLeverage)
      })

      it('should align CRYPTO limits with EU (same regulatory framework)', () => {
        const euCrypto = getLeverageLimit('EU', 'CRYPTO')
        const ukCrypto = getLeverageLimit('UK', 'CRYPTO')
        expect(ukCrypto.maxLeverage).toBe(euCrypto.maxLeverage)
        expect(ukCrypto.defaultLeverage).toBe(euCrypto.defaultLeverage)
      })
    })

    describe('ASIC regulated (Australia)', () => {
      it('should enforce 30:1 for Forex majors (ASIC compliance)', () => {
        const limit = getLeverageLimit('AU', 'FOREX')
        expect(limit.maxLeverage).toBe(30)
        expect(limit.reason).toContain('ASIC')
      })

      it('should enforce 20:1 for stocks (ASIC compliance)', () => {
        const limit = getLeverageLimit('AU', 'STOCK')
        expect(limit.maxLeverage).toBe(20)
        expect(limit.reason).toContain('ASIC')
      })
    })

    describe('DFSA regulated (UAE)', () => {
      it('should enforce 30:1 for Forex majors (DFSA compliance)', () => {
        const limit = getLeverageLimit('AE', 'FOREX')
        expect(limit.maxLeverage).toBe(30)
        expect(limit.reason).toContain('DFSA')
      })
    })

    describe('FSA Seychelles (offshore)', () => {
      it('should allow 50:1 for Forex (offshore moderate limit)', () => {
        const limit = getLeverageLimit('SC', 'FOREX')
        expect(limit.maxLeverage).toBe(50)
        expect(limit.reason).toContain('Seychelles')
      })

      it('should allow 100:1 for indices', () => {
        const limit = getLeverageLimit('SC', 'INDEX')
        expect(limit.maxLeverage).toBe(100)
      })

      it('should allow 100:1 for commodities', () => {
        const limit = getLeverageLimit('SC', 'COMMODITY')
        expect(limit.maxLeverage).toBe(100)
      })

      it('should allow 10:1 for crypto', () => {
        const limit = getLeverageLimit('SC', 'CRYPTO')
        expect(limit.maxLeverage).toBe(10)
      })
    })

    describe('FSC Mauritius (offshore)', () => {
      it('should allow 50:1 for Forex (offshore moderate limit)', () => {
        const limit = getLeverageLimit('MU', 'FOREX')
        expect(limit.maxLeverage).toBe(50)
        expect(limit.reason).toContain('Mauritius')
      })
    })

    describe('US regulated (CFTC)', () => {
      it('should enforce 50:1 for Forex (CFTC limit)', () => {
        const limit = getLeverageLimit('US', 'FOREX')
        expect(limit.maxLeverage).toBe(50)
        expect(limit.reason).toContain('CFTC')
      })

      it('should enforce 4:1 for stocks (SEC Reg T)', () => {
        const limit = getLeverageLimit('US', 'STOCK')
        expect(limit.maxLeverage).toBe(4)
        expect(limit.reason).toContain('SEC')
      })

      it('should prohibit leverage on crypto', () => {
        const limit = getLeverageLimit('US', 'CRYPTO')
        expect(limit.maxLeverage).toBe(1)
        expect(limit.reason).toContain('prohibition')
      })
    })

    describe('OTHER/unknown jurisdiction', () => {
      it('should default to conservative 20:1 limits', () => {
        const limit = getLeverageLimit('OTHER', 'FOREX')
        expect(limit.maxLeverage).toBe(20)
        expect(limit.reason.toLowerCase()).toContain('conservative')
      })
    })
  })

  describe('validateLeverage', () => {
    describe('EU trader Forex compliance', () => {
      it('should allow 30:1 leverage for Forex majors', () => {
        const result = validateLeverage('EU', 'FOREX', 30)
        expect(result.allowed).toBe(true)
        expect(result.message).toContain('compliant')
      })

      it('should reject 35:1 leverage for Forex (exceeds 30:1 cap)', () => {
        const result = validateLeverage('EU', 'FOREX', 35)
        expect(result.allowed).toBe(false)
        expect(result.message).toMatch(/exceeds.*regulatory limit/)
        expect(result.maxLeverage).toBe(30)
      })

      it('should allow 20:1 leverage for stocks', () => {
        const result = validateLeverage('EU', 'STOCK', 20)
        expect(result.allowed).toBe(true)
      })

      it('should reject 50:1 leverage for stocks', () => {
        const result = validateLeverage('EU', 'STOCK', 50)
        expect(result.allowed).toBe(false)
        expect(result.maxLeverage).toBe(20)
      })
    })

    describe('US trader CFTC compliance', () => {
      it('should allow 50:1 for Forex', () => {
        const result = validateLeverage('US', 'FOREX', 50)
        expect(result.allowed).toBe(true)
      })

      it('should reject 100:1 for Forex (exceeds CFTC limit)', () => {
        const result = validateLeverage('US', 'FOREX', 100)
        expect(result.allowed).toBe(false)
        expect(result.maxLeverage).toBe(50)
      })

      it('should allow 4:1 for stocks (SEC Reg T)', () => {
        const result = validateLeverage('US', 'STOCK', 4)
        expect(result.allowed).toBe(true)
      })

      it('should reject 5:1 for stocks', () => {
        const result = validateLeverage('US', 'STOCK', 5)
        expect(result.allowed).toBe(false)
        expect(result.maxLeverage).toBe(4)
      })

      it('should prohibit leverage on crypto (max 1:1)', () => {
        // 1:1 is allowed (no leverage, just trading at spot)
        const result1 = validateLeverage('US', 'CRYPTO', 1)
        expect(result1.allowed).toBe(true)

        // Any leverage above 1:1 is rejected
        const result2 = validateLeverage('US', 'CRYPTO', 2)
        expect(result2.allowed).toBe(false)
        expect(result2.maxLeverage).toBe(1)
      })
    })

    describe('Offshore trader (Seychelles)', () => {
      it('should allow 50:1 for Forex', () => {
        const result = validateLeverage('SC', 'FOREX', 50)
        expect(result.allowed).toBe(true)
      })

      it('should reject 100:1 for Forex', () => {
        const result = validateLeverage('SC', 'FOREX', 100)
        expect(result.allowed).toBe(false)
        expect(result.maxLeverage).toBe(50)
      })

      it('should allow 100:1 for indices', () => {
        const result = validateLeverage('SC', 'INDEX', 100)
        expect(result.allowed).toBe(true)
      })

      it('should allow 10:1 for crypto', () => {
        const result = validateLeverage('SC', 'CRYPTO', 10)
        expect(result.allowed).toBe(true)
      })
    })

    it('should provide actionable error messages', () => {
      const result = validateLeverage('EU', 'FOREX', 125)
      expect(result.message).toContain('Leverage 125:1')
      expect(result.message).toContain('30:1')
      expect(result.message).toContain('EU')
      expect(result.message).toContain('FOREX')
      expect(result.message).toContain('regulatory')
    })

    it('should return max leverage in validation result', () => {
      const result = validateLeverage('AU', 'STOCK', 50)
      expect(result.maxLeverage).toBe(20)
    })
  })

  describe('Regulatory compliance edge cases', () => {
    it('should enforce max leverage of 1 for crypto in US (no leverage)', () => {
      const limit = getLeverageLimit('US', 'CRYPTO')
      expect(limit.maxLeverage).toBe(1)
    })

    it('ESMA-regulated jurisdictions should have stricter crypto limits than offshore', () => {
      const euCrypto = getLeverageLimit('EU', 'CRYPTO')
      const saCrypto = getLeverageLimit('SC', 'CRYPTO')
      expect(euCrypto.maxLeverage).toBeLessThan(saCrypto.maxLeverage)
    })

    it('offshore jurisdictions should allow higher leverage than regulated', () => {
      const euForex = getLeverageLimit('EU', 'FOREX')
      const scForex = getLeverageLimit('SC', 'FOREX')
      expect(scForex.maxLeverage).toBeGreaterThan(euForex.maxLeverage)
    })

    describe('Input validation edge cases', () => {
      it('should reject zero leverage', () => {
        const result = validateLeverage('EU', 'FOREX', 0)
        expect(result.allowed).toBe(false)
        expect(result.message).toMatch(/positive number/)
      })

      it('should reject negative leverage', () => {
        const result = validateLeverage('EU', 'FOREX', -1)
        expect(result.allowed).toBe(false)
        expect(result.message).toMatch(/positive number/)
      })

      it('should reject non-integer leverage (fractional)', () => {
        const result = validateLeverage('US', 'FOREX', 25.5)
        expect(result.allowed).toBe(false)
        expect(result.message).toMatch(/positive number/)
      })
    })
  })

  describe('Compliance reason documentation', () => {
    it.each([
      ['EU', 'FOREX'] as const,
      ['US', 'STOCK'] as const,
      ['SC', 'INDEX'] as const,
      ['AU', 'CRYPTO'] as const,
    ])('should document compliance framework for %s %s', (jurisdiction, assetClass) => {
      const limit = getLeverageLimit(jurisdiction, assetClass)
      expect(limit.reason).toBeTruthy()
      expect(limit.reason.length).toBeGreaterThan(0)
    })
  })
})
