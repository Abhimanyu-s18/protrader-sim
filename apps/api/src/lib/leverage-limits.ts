/**
 * Leverage Limits Helper
 * Ensures compliance with major regulatory frameworks
 * - ESMA (EU): 30:1 max for majors, 20:1 majors, 10:1 minors/exotics
 * - FCA (UK): 30:1 for majors, 20:1 for minors, 10:1 for exotic
 * - ASIC (AU): 30:1 for majors, 20:1 for minors, 10:1 for exotic
 * - DFSA (UAE): 30:1 for majors
 * - FSA Seychelles: 50:1 max (offshore)
 * - FSC Mauritius: 50:1 max (offshore)
 * - CFTC (US): Limited to 50:1 for majors
 */

import type { Jurisdiction } from '@prisma/client'

export type AssetClassType = 'FOREX' | 'STOCK' | 'INDEX' | 'COMMODITY' | 'CRYPTO'

interface LeverageLimits {
  /** Maximum leverage allowed for this jurisdiction/asset class */
  maxLeverage: number
  /** Recommended default leverage */
  defaultLeverage: number
  /** Compliance note for documentation */
  reason: string
}

/** Data-driven lookup table mapping jurisdiction groups and asset classes to leverage limits */
const LEVERAGE_LIMITS_TABLE: Record<string, Record<AssetClassType, LeverageLimits>> = {
  // EU, UK, AU, AE regulators: ESMA-aligned leverage caps
  EU_UK_AU_AE: {
    FOREX: {
      maxLeverage: 30,
      defaultLeverage: 20,
      reason: 'Regulatory leverage cap on major Forex pairs (ESMA/FCA/ASIC/DFSA)',
    },
    STOCK: {
      maxLeverage: 20,
      defaultLeverage: 10,
      reason: 'Equity leverage limit (ESMA/FCA/ASIC)',
    },
    INDEX: {
      maxLeverage: 20,
      defaultLeverage: 10,
      reason: 'Index leverage limit (ESMA/FCA/ASIC)',
    },
    COMMODITY: {
      maxLeverage: 20,
      defaultLeverage: 10,
      reason: 'Commodity leverage limit (ESMA/FCA/ASIC)',
    },
    CRYPTO: {
      maxLeverage: 5,
      defaultLeverage: 2,
      reason: 'Conservative crypto leverage (high volatility)',
    },
  },
  // Seychelles and Mauritius offshore: moderate leverage caps
  SC_MU: {
    FOREX: {
      maxLeverage: 50,
      defaultLeverage: 30,
      reason: 'FSA Seychelles / FSC Mauritius offshore leverage limit',
    },
    STOCK: {
      maxLeverage: 20,
      defaultLeverage: 10,
      reason: 'Equity leverage limit (offshore)',
    },
    INDEX: {
      maxLeverage: 100,
      defaultLeverage: 50,
      reason: 'Index leverage limit (offshore)',
    },
    COMMODITY: {
      maxLeverage: 100,
      defaultLeverage: 50,
      reason: 'Commodity leverage limit (offshore)',
    },
    CRYPTO: {
      maxLeverage: 10,
      defaultLeverage: 5,
      reason: 'Crypto leverage limit (offshore)',
    },
  },
  // US regulated: CFTC limits
  US: {
    FOREX: {
      maxLeverage: 50,
      defaultLeverage: 30,
      reason: 'CFTC retail forex leverage limit',
    },
    STOCK: {
      maxLeverage: 4,
      defaultLeverage: 2,
      reason: 'SEC Regulation T equity leverage limit',
    },
    COMMODITY: {
      maxLeverage: 20,
      defaultLeverage: 10,
      reason: 'CFTC commodity futures leverage limit',
    },
    INDEX: {
      maxLeverage: 20,
      defaultLeverage: 10,
      reason: 'CFTC index futures leverage limit',
    },
    CRYPTO: {
      maxLeverage: 1,
      defaultLeverage: 1,
      reason: 'No leverage on crypto (regulatory prohibition)',
    },
  },
}

/** Map individual jurisdictions to their lookup table group */
const JURISDICTION_TO_GROUP: Record<string, string> = {
  EU: 'EU_UK_AU_AE',
  UK: 'EU_UK_AU_AE',
  AU: 'EU_UK_AU_AE',
  AE: 'EU_UK_AU_AE',
  SC: 'SC_MU',
  MU: 'SC_MU',
  US: 'US',
}

/**
 * Get the maximum leverage allowed for a given jurisdiction and asset class.
 * This enforces regulatory compliance across multiple markets.
 *
 * @param jurisdiction - User's regulated jurisdiction (EU, UK, AU, AE, SC, MU, US, OTHER)
 * @param assetClass - Asset class (FOREX, STOCK, INDEX, COMMODITY, CRYPTO)
 * @returns Maximum leverage and compliance details
 *
 * @example
 * const limit = getLeverageLimit('EU', 'FOREX')
 * // Returns { maxLeverage: 30, defaultLeverage: 20, reason: 'ESMA retail leverage cap on major pairs' }
 */
export function getLeverageLimit(
  jurisdiction: Jurisdiction,
  assetClass: AssetClassType,
): LeverageLimits {
  // Look up the jurisdiction group from the mapping
  const group = JURISDICTION_TO_GROUP[jurisdiction]

  if (group && LEVERAGE_LIMITS_TABLE[group]) {
    const limits = LEVERAGE_LIMITS_TABLE[group][assetClass]
    if (limits) {
      return limits
    }
  }

  // Default (OTHER or unknown jurisdictions): conservative limits
  return {
    maxLeverage: 20,
    defaultLeverage: 10,
    reason: 'Conservative default for unknown jurisdiction',
  }
}

/**
 * Validate that a requested leverage complies with regulatory limits.
 * Called before opening a trade.
 *
 * @param jurisdiction - User's jurisdiction
 * @param assetClass - Asset class of the instrument
 * @param requestedLeverage - The leverage requested by the user
 * @returns { allowed: boolean, maxLeverage: number, message: string }
 *
 * @example
 * const result = validateLeverage('EU', 'FOREX', 35)
 * // Returns { allowed: false, maxLeverage: 30, message: 'Leverage 35:1 exceeds regulatory limit of 30:1 for EU Forex traders' }
 */
export function validateLeverage(
  jurisdiction: Jurisdiction,
  assetClass: AssetClassType,
  requestedLeverage: number,
): { allowed: boolean; maxLeverage: number; message: string } {
  const limit = getLeverageLimit(jurisdiction, assetClass)

  if (!Number.isFinite(requestedLeverage) || requestedLeverage <= 0) {
    return {
      allowed: false,
      maxLeverage: limit.maxLeverage,
      message: `Invalid requestedLeverage: must be a positive number, got ${requestedLeverage}`,
    }
  }

  if (requestedLeverage > limit.maxLeverage) {
    return {
      allowed: false,
      maxLeverage: limit.maxLeverage,
      message: `Leverage ${requestedLeverage}:1 exceeds regulatory limit of ${limit.maxLeverage}:1 for ${jurisdiction} traders on ${assetClass}. Reason: ${limit.reason}`,
    }
  }

  return {
    allowed: true,
    maxLeverage: limit.maxLeverage,
    message: `Leverage ${requestedLeverage}:1 is compliant`,
  }
}
