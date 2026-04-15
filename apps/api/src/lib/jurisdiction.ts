/**
 * Country to Jurisdiction mapping utility
 * Maps user's country of residence to regulatory jurisdiction
 * Determines maximum leverage and compliance framework
 */

type Jurisdiction = 'EU' | 'UK' | 'AU' | 'AE' | 'SC' | 'MU' | 'US' | 'OTHER'

const COUNTRY_JURISDICTION_MAP: Record<string, Jurisdiction> = {
  // EU jurisdictions (ESMA: 30:1 max leverage on majors)
  Austria: 'EU',
  Belgium: 'EU',
  Bulgaria: 'EU',
  Croatia: 'EU',
  Cyprus: 'EU',
  'Czech Republic': 'EU',
  Czechia: 'EU',
  Denmark: 'EU',
  Estonia: 'EU',
  Finland: 'EU',
  France: 'EU',
  Germany: 'EU',
  Greece: 'EU',
  Hungary: 'EU',
  Ireland: 'EU',
  Italy: 'EU',
  Latvia: 'EU',
  Lithuania: 'EU',
  Luxembourg: 'EU',
  Malta: 'EU',
  Netherlands: 'EU',
  Poland: 'EU',
  Portugal: 'EU',
  Romania: 'EU',
  Slovakia: 'EU',
  Slovenia: 'EU',
  Spain: 'EU',
  Sweden: 'EU',

  // UK (FCA: 30:1 max leverage)
  UK: 'UK',
  'United Kingdom': 'UK',
  'Great Britain': 'UK',
  England: 'UK',
  Scotland: 'UK',
  Wales: 'UK',
  'Northern Ireland': 'UK',

  // Australia (ASIC: 30:1 max leverage)
  Australia: 'AU',
  AU: 'AU',

  // UAE (DFSA: 30:1 max leverage)
  'United Arab Emirates': 'AE',
  UAE: 'AE',
  Dubai: 'AE',
  'Abu Dhabi': 'AE',

  // Seychelles (FSA: 50:1 max, ProTraderSim primary)
  Seychelles: 'SC',
  SC: 'SC',

  // Mauritius (FSC: 50:1 max, ProTraderSim secondary)
  Mauritius: 'MU',
  MU: 'MU',

  // USA (CFTC: limited leverage, ~50:1 max)
  USA: 'US',
  'United States': 'US',
  US: 'US',
  'United States of America': 'US',
  America: 'US',

  // Other jurisdictions (default 20:1 conservative)
  Canada: 'OTHER',
  CA: 'OTHER',
  India: 'OTHER',
  IN: 'OTHER',
  Japan: 'OTHER',
  JP: 'OTHER',
  Singapore: 'OTHER',
  SG: 'OTHER',
  'Hong Kong': 'OTHER',
  HK: 'OTHER',
  China: 'OTHER',
  CN: 'OTHER',
  Brazil: 'OTHER',
  BR: 'OTHER',
  Mexico: 'OTHER',
  MX: 'OTHER',
  'South Africa': 'OTHER',
  ZA: 'OTHER',
  'New Zealand': 'OTHER',
  NZ: 'OTHER',
}

/**
 * Derive jurisdiction from user's country
 * @param country - User's country of residence
 * @returns Jurisdiction enum value, or 'OTHER' if no mapping found
 */
export function deriveJurisdictionFromCountry(country: string): Jurisdiction {
  if (!country || typeof country !== 'string') {
    return 'OTHER'
  }

  // Try exact match first
  let jurisdiction = COUNTRY_JURISDICTION_MAP[country.trim()]
  if (jurisdiction) {
    return jurisdiction
  }

  // Try case-insensitive match
  const countryLower = country.toLowerCase()
  for (const [key, value] of Object.entries(COUNTRY_JURISDICTION_MAP)) {
    if (key.toLowerCase() === countryLower) {
      return value
    }
  }

  // Default to OTHER for unknown countries
  return 'OTHER'
}

/**
 * Validate that country and jurisdiction are consistent
 * Used as a compliance check when updating user profile
 * @param country - User's country
 * @param jurisdiction - User's current jurisdiction
 * @returns true if consistent, false otherwise
 */
export function isCountryJurisdictionConsistent(
  country: string,
  jurisdiction: Jurisdiction,
): boolean {
  const derivedJurisdiction = deriveJurisdictionFromCountry(country)
  return derivedJurisdiction === jurisdiction
}

export default {
  deriveJurisdictionFromCountry,
  isCountryJurisdictionConsistent,
}
