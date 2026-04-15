/**
 * ProTraderSim — Database Seed
 * Seeds all 60 instruments, default staff accounts, legal documents, and swap rates
 */

import { PrismaClient, AssetClass, StaffRole } from '@prisma/client'
import { hash } from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.warn('🌱 Starting ProTraderSim seed...')

  // ── STAFF ACCOUNTS ──────────────────────────────────────────────
  console.warn('👤 Seeding staff accounts...')
  const superAdminHash = await hash('SuperAdmin@123', 12)
  const adminHash = await hash('Admin@123456', 12)
  const tlHash = await hash('TeamLeader@123', 12)
  const agentHash = await hash('Agent@1234567', 12)

  await prisma.staff.upsert({
    where: { email: 'superadmin@protrader.com' },
    update: {},
    create: {
      email: 'superadmin@protrader.com',
      passwordHash: superAdminHash,
      fullName: 'Super Admin',
      role: StaffRole.SUPER_ADMIN,
      isActive: true,
    },
  })

  await prisma.staff.upsert({
    where: { email: 'admin@protrader.com' },
    update: {},
    create: {
      email: 'admin@protrader.com',
      passwordHash: adminHash,
      fullName: 'Platform Admin',
      role: StaffRole.ADMIN,
      isActive: true,
    },
  })

  const teamLeader = await prisma.staff.upsert({
    where: { email: 'tl1@protrader.com' },
    update: {},
    create: {
      email: 'tl1@protrader.com',
      passwordHash: tlHash,
      fullName: 'Team Leader One',
      role: StaffRole.IB_TEAM_LEADER,
      commissionRateBps: 0,
      overrideRateBps: 5, // 0.05% override on agent trades
      isActive: true,
    },
  })

  await prisma.staff.upsert({
    where: { email: 'agent1@protrader.com' },
    update: {},
    create: {
      email: 'agent1@protrader.com',
      passwordHash: agentHash,
      fullName: 'Agent One',
      role: StaffRole.AGENT,
      teamLeaderId: teamLeader.id,
      commissionRateBps: 10, // 0.10% per trade notional
      overrideRateBps: 0,
      refCode: 'AGENT001',
      isActive: true,
    },
  })

  // ── INSTRUMENTS — FOREX 40 pairs ────────────────────────────────
  // Leverage updated for regulatory compliance (30:1 majors, 20:1 minors/exotics)
  console.warn('📊 Seeding 60 instruments...')
  const forexPairs = [
    // Major pairs — COMPLIANT LEVERAGE: 30:1 (ESMA/ASIC/DFSA regulation)
    {
      symbol: 'EURUSD',
      displayName: 'Euro / US Dollar',
      contractSize: 100000,
      leverage: 30,
      spreadPips: 2,
      pipDp: 4,
      swapBuy: -5,
      swapSell: 2,
      flagCode: 'EU',
    },
    {
      symbol: 'GBPUSD',
      displayName: 'British Pound / US Dollar',
      contractSize: 100000,
      leverage: 30,
      spreadPips: 2,
      pipDp: 4,
      swapBuy: -4,
      swapSell: 1,
      flagCode: 'GB',
    },
    {
      symbol: 'USDJPY',
      displayName: 'US Dollar / Japanese Yen',
      contractSize: 100000,
      leverage: 30,
      spreadPips: 2,
      pipDp: 2,
      swapBuy: 2,
      swapSell: -6,
      flagCode: 'JP',
    },
    {
      symbol: 'AUDUSD',
      displayName: 'Australian Dollar / US Dollar',
      contractSize: 100000,
      leverage: 30,
      spreadPips: 2,
      pipDp: 4,
      swapBuy: -4,
      swapSell: 1,
      flagCode: 'AU',
    },
    {
      symbol: 'USDCAD',
      displayName: 'US Dollar / Canadian Dollar',
      contractSize: 100000,
      leverage: 30,
      spreadPips: 3,
      pipDp: 4,
      swapBuy: -3,
      swapSell: -2,
      flagCode: 'CA',
    },
    {
      symbol: 'USDCHF',
      displayName: 'US Dollar / Swiss Franc',
      contractSize: 100000,
      leverage: 30,
      spreadPips: 2,
      pipDp: 4,
      swapBuy: -1,
      swapSell: -5,
      flagCode: 'CH',
    },
    {
      symbol: 'NZDUSD',
      displayName: 'New Zealand Dollar / US Dollar',
      contractSize: 100000,
      leverage: 30,
      spreadPips: 3,
      pipDp: 4,
      swapBuy: -4,
      swapSell: 1,
      flagCode: 'NZ',
    },
    // Minor pairs — COMPLIANT LEVERAGE: 20:1
    {
      symbol: 'EURGBP',
      displayName: 'Euro / British Pound',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 2,
      pipDp: 4,
      swapBuy: -5,
      swapSell: 1,
      flagCode: 'EU',
    },
    {
      symbol: 'EURJPY',
      displayName: 'Euro / Japanese Yen',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 3,
      pipDp: 2,
      swapBuy: -3,
      swapSell: -4,
      flagCode: 'EU',
    },
    {
      symbol: 'GBPJPY',
      displayName: 'British Pound / Japanese Yen',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 4,
      pipDp: 2,
      swapBuy: -2,
      swapSell: -6,
      flagCode: 'GB',
    },
    {
      symbol: 'AUDCAD',
      displayName: 'Australian Dollar / Canadian Dollar',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 4,
      pipDp: 4,
      swapBuy: -4,
      swapSell: -2,
      flagCode: 'AU',
    },
    {
      symbol: 'AUDCHF',
      displayName: 'Australian Dollar / Swiss Franc',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 4,
      pipDp: 4,
      swapBuy: -3,
      swapSell: -4,
      flagCode: 'AU',
    },
    {
      symbol: 'AUDJPY',
      displayName: 'Australian Dollar / Japanese Yen',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 3,
      pipDp: 2,
      swapBuy: -2,
      swapSell: -5,
      flagCode: 'AU',
    },
    {
      symbol: 'CADCHF',
      displayName: 'Canadian Dollar / Swiss Franc',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 5,
      pipDp: 4,
      swapBuy: -2,
      swapSell: -4,
      flagCode: 'CA',
    },
    {
      symbol: 'CADJPY',
      displayName: 'Canadian Dollar / Japanese Yen',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 4,
      pipDp: 2,
      swapBuy: -1,
      swapSell: -6,
      flagCode: 'CA',
    },
    {
      symbol: 'CHFJPY',
      displayName: 'Swiss Franc / Japanese Yen',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 4,
      pipDp: 2,
      swapBuy: -3,
      swapSell: -4,
      flagCode: 'CH',
    },
    {
      symbol: 'EURCHF',
      displayName: 'Euro / Swiss Franc',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 3,
      pipDp: 4,
      swapBuy: -6,
      swapSell: -1,
      flagCode: 'EU',
    },
    {
      symbol: 'EURAUD',
      displayName: 'Euro / Australian Dollar',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 4,
      pipDp: 4,
      swapBuy: -6,
      swapSell: 1,
      flagCode: 'EU',
    },
    {
      symbol: 'EURCAD',
      displayName: 'Euro / Canadian Dollar',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 4,
      pipDp: 4,
      swapBuy: -5,
      swapSell: -1,
      flagCode: 'EU',
    },
    {
      symbol: 'EURNZD',
      displayName: 'Euro / New Zealand Dollar',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 5,
      pipDp: 4,
      swapBuy: -7,
      swapSell: 2,
      flagCode: 'EU',
    },
    {
      symbol: 'GBPAUD',
      displayName: 'British Pound / Australian Dollar',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 5,
      pipDp: 4,
      swapBuy: -4,
      swapSell: -3,
      flagCode: 'GB',
    },
    {
      symbol: 'GBPCAD',
      displayName: 'British Pound / Canadian Dollar',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 5,
      pipDp: 4,
      swapBuy: -4,
      swapSell: -2,
      flagCode: 'GB',
    },
    {
      symbol: 'GBPCHF',
      displayName: 'British Pound / Swiss Franc',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 4,
      pipDp: 4,
      swapBuy: -3,
      swapSell: -5,
      flagCode: 'GB',
    },
    {
      symbol: 'GBPNZD',
      displayName: 'British Pound / New Zealand Dollar',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 6,
      pipDp: 4,
      swapBuy: -5,
      swapSell: -2,
      flagCode: 'GB',
    },
    {
      symbol: 'NZDCAD',
      displayName: 'New Zealand Dollar / Canadian Dollar',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 5,
      pipDp: 4,
      swapBuy: -4,
      swapSell: -1,
      flagCode: 'NZ',
    },
    {
      symbol: 'NZDCHF',
      displayName: 'New Zealand Dollar / Swiss Franc',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 5,
      pipDp: 4,
      swapBuy: -3,
      swapSell: -4,
      flagCode: 'NZ',
    },
    {
      symbol: 'NZDJPY',
      displayName: 'New Zealand Dollar / Japanese Yen',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 4,
      pipDp: 2,
      swapBuy: -2,
      swapSell: -5,
      flagCode: 'NZ',
    },
    // Exotic pairs — COMPLIANT LEVERAGE: 20:1 (conservative)
    {
      symbol: 'USDMXN',
      displayName: 'US Dollar / Mexican Peso',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 100,
      pipDp: 4,
      swapBuy: 40,
      swapSell: -80,
      flagCode: 'MX',
    },
    {
      symbol: 'USDSEK',
      displayName: 'US Dollar / Swedish Krona',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 30,
      pipDp: 4,
      swapBuy: -8,
      swapSell: 2,
      flagCode: 'SE',
    },
    {
      symbol: 'USDNOK',
      displayName: 'US Dollar / Norwegian Krone',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 30,
      pipDp: 4,
      swapBuy: -6,
      swapSell: 1,
      flagCode: 'NO',
    },
    {
      symbol: 'USDDKK',
      displayName: 'US Dollar / Danish Krone',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 25,
      pipDp: 4,
      swapBuy: -5,
      swapSell: 0,
      flagCode: 'DK',
    },
    {
      symbol: 'USDPLN',
      displayName: 'US Dollar / Polish Zloty',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 40,
      pipDp: 4,
      swapBuy: 10,
      swapSell: -30,
      flagCode: 'PL',
    },
    {
      symbol: 'USDTRY',
      displayName: 'US Dollar / Turkish Lira',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 150,
      pipDp: 4,
      swapBuy: 100,
      swapSell: -250,
      flagCode: 'TR',
    },
    {
      symbol: 'USDHUF',
      displayName: 'US Dollar / Hungarian Forint',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 80,
      pipDp: 4,
      swapBuy: 20,
      swapSell: -50,
      flagCode: 'HU',
    },
    {
      symbol: 'USDZAR',
      displayName: 'US Dollar / South African Rand',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 100,
      pipDp: 4,
      swapBuy: 50,
      swapSell: -150,
      flagCode: 'ZA',
    },
    {
      symbol: 'USDSGD',
      displayName: 'US Dollar / Singapore Dollar',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 15,
      pipDp: 4,
      swapBuy: -2,
      swapSell: -6,
      flagCode: 'SG',
    },
    {
      symbol: 'USDHKD',
      displayName: 'US Dollar / Hong Kong Dollar',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 10,
      pipDp: 4,
      swapBuy: -3,
      swapSell: -3,
      flagCode: 'HK',
    },
    {
      symbol: 'EURHUF',
      displayName: 'Euro / Hungarian Forint',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 80,
      pipDp: 4,
      swapBuy: 15,
      swapSell: -50,
      flagCode: 'EU',
    },
    {
      symbol: 'EURTRY',
      displayName: 'Euro / Turkish Lira',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 150,
      pipDp: 4,
      swapBuy: 90,
      swapSell: -240,
      flagCode: 'EU',
    },
    {
      symbol: 'EURPLN',
      displayName: 'Euro / Polish Zloty',
      contractSize: 100000,
      leverage: 20,
      spreadPips: 40,
      pipDp: 4,
      swapBuy: 8,
      swapSell: -28,
      flagCode: 'EU',
    },
  ]

  // Stocks — 20:1 leverage (simulator environment, professional clients, or non-ESMA jurisdiction)
  const stocks = [
    { symbol: 'AAPL', displayName: 'Apple Inc', leverage: 20, spreadPips: 10, pipDp: 2 },
    { symbol: 'MSFT', displayName: 'Microsoft Corp', leverage: 20, spreadPips: 10, pipDp: 2 },
    { symbol: 'GOOGL', displayName: 'Alphabet Inc', leverage: 20, spreadPips: 20, pipDp: 2 },
    { symbol: 'AMZN', displayName: 'Amazon.com Inc', leverage: 20, spreadPips: 15, pipDp: 2 },
    { symbol: 'TSLA', displayName: 'Tesla Inc', leverage: 20, spreadPips: 20, pipDp: 2 },
    { symbol: 'META', displayName: 'Meta Platforms', leverage: 20, spreadPips: 15, pipDp: 2 },
    { symbol: 'NVDA', displayName: 'NVIDIA Corp', leverage: 20, spreadPips: 20, pipDp: 2 },
    { symbol: 'NFLX', displayName: 'Netflix Inc', leverage: 20, spreadPips: 20, pipDp: 2 },
    { symbol: 'JPM', displayName: 'JPMorgan Chase', leverage: 20, spreadPips: 10, pipDp: 2 },
    { symbol: 'BAC', displayName: 'Bank of America', leverage: 20, spreadPips: 5, pipDp: 2 },
    { symbol: 'V', displayName: 'Visa Inc', leverage: 20, spreadPips: 10, pipDp: 2 },
    { symbol: 'JNJ', displayName: 'Johnson & Johnson', leverage: 20, spreadPips: 10, pipDp: 2 },
    { symbol: 'WMT', displayName: 'Walmart Inc', leverage: 20, spreadPips: 10, pipDp: 2 },
    { symbol: 'XOM', displayName: 'Exxon Mobil', leverage: 20, spreadPips: 10, pipDp: 2 },
    { symbol: 'BRKB', displayName: 'Berkshire Hathaway B', leverage: 20, spreadPips: 15, pipDp: 2 },
  ]

  const indices = [
    {
      symbol: 'US500',
      displayName: 'S&P 500 Index',
      leverage: 100,
      spreadPips: 1,
      pipDp: 1,
      tradingHoursStart: '23:00',
      tradingHoursEnd: '22:00',
      tradingDays: '12345',
    },
    {
      symbol: 'US100',
      displayName: 'NASDAQ 100 Index',
      leverage: 100,
      spreadPips: 2,
      pipDp: 1,
      tradingHoursStart: '23:00',
      tradingHoursEnd: '22:00',
      tradingDays: '12345',
    },
    {
      symbol: 'UK100',
      displayName: 'FTSE 100 Index',
      leverage: 100,
      spreadPips: 2,
      pipDp: 1,
      tradingHoursStart: '07:00',
      tradingHoursEnd: '16:30',
      tradingDays: '12345',
    },
  ]

  const commodities = [
    {
      symbol: 'XAUUSD',
      displayName: 'Gold vs US Dollar',
      leverage: 100,
      spreadPips: 30,
      pipDp: 2,
      contractSize: 100,
    },
    {
      symbol: 'USOIL',
      displayName: 'WTI Crude Oil',
      leverage: 100,
      spreadPips: 5,
      pipDp: 2,
      contractSize: 1000,
    },
  ]

  const crypto = [
    { symbol: 'BTCUSD', displayName: 'Bitcoin / USD', leverage: 10, spreadPips: 5000, pipDp: 2 },
    { symbol: 'ETHUSD', displayName: 'Ethereum / USD', leverage: 10, spreadPips: 500, pipDp: 2 },
    { symbol: 'BNBUSD', displayName: 'BNB / USD', leverage: 10, spreadPips: 200, pipDp: 2 },
    { symbol: 'SOLUSD', displayName: 'Solana / USD', leverage: 10, spreadPips: 50, pipDp: 2 },
    { symbol: 'XRPUSD', displayName: 'Ripple / USD', leverage: 10, spreadPips: 2, pipDp: 4 },
    { symbol: 'ADAUSD', displayName: 'Cardano / USD', leverage: 10, spreadPips: 1, pipDp: 4 },
    { symbol: 'DOTUSD', displayName: 'Polkadot / USD', leverage: 10, spreadPips: 5, pipDp: 3 },
    { symbol: 'DOGEUSD', displayName: 'Dogecoin / USD', leverage: 10, spreadPips: 1, pipDp: 5 },
    { symbol: 'MATICUSD', displayName: 'Polygon / USD', leverage: 10, spreadPips: 2, pipDp: 4 },
    { symbol: 'AVAXUSD', displayName: 'Avalanche / USD', leverage: 10, spreadPips: 10, pipDp: 3 },
  ]

  // Seed Forex
  for (const fx of forexPairs) {
    const instrument = await prisma.instrument.upsert({
      where: { symbol: fx.symbol },
      update: {},
      create: {
        symbol: fx.symbol,
        displayName: fx.displayName,
        assetClass: AssetClass.FOREX,
        baseCurrency: fx.symbol.slice(0, 3),
        quoteCurrency: fx.symbol.slice(3, 6),
        contractSize: fx.contractSize,
        leverage: fx.leverage,
        minUnits: 1000,
        maxUnits: 10000000,
        unitStep: 1000,
        spreadPips: fx.spreadPips,
        pipDecimalPlaces: fx.pipDp,
        swapBuyBps: BigInt(fx.swapBuy),
        swapSellBps: BigInt(fx.swapSell),
        tradingDays: '12345',
        isActive: true,
        twelveDataSymbol: fx.symbol,
        countryFlagCode: fx.flagCode,
      },
    })
    // Add current swap rate record
    await prisma.swapRate.upsert({
      where: {
        instrumentId_direction_effectiveFrom: {
          instrumentId: instrument.id,
          direction: 'BUY',
          effectiveFrom: new Date('2026-01-01'),
        },
      },
      update: {},
      create: {
        instrumentId: instrument.id,
        direction: 'BUY',
        rateBps: BigInt(fx.swapBuy),
        effectiveFrom: new Date('2026-01-01'),
      },
    })
    await prisma.swapRate.upsert({
      where: {
        instrumentId_direction_effectiveFrom: {
          instrumentId: instrument.id,
          direction: 'SELL',
          effectiveFrom: new Date('2026-01-01'),
        },
      },
      update: {},
      create: {
        instrumentId: instrument.id,
        direction: 'SELL',
        rateBps: BigInt(fx.swapSell),
        effectiveFrom: new Date('2026-01-01'),
      },
    })
  }

  // Seed Stocks
  for (const stock of stocks) {
    await prisma.instrument.upsert({
      where: { symbol: stock.symbol },
      update: {},
      create: {
        symbol: stock.symbol,
        displayName: stock.displayName,
        assetClass: AssetClass.STOCK,
        baseCurrency: stock.symbol,
        quoteCurrency: 'USD',
        contractSize: 1,
        leverage: stock.leverage,
        minUnits: 1,
        maxUnits: 10000,
        unitStep: 1,
        spreadPips: stock.spreadPips,
        pipDecimalPlaces: stock.pipDp,
        swapBuyBps: BigInt(-3),
        swapSellBps: BigInt(-3),
        tradingHoursStart: '14:30', // 9:30 EST = 14:30 UTC
        tradingHoursEnd: '21:00', // 16:00 EST = 21:00 UTC
        tradingDays: '12345',
        isActive: true,
        twelveDataSymbol: stock.symbol,
      },
    })
  }

  // Seed Indices
  for (const idx of indices) {
    await prisma.instrument.upsert({
      where: { symbol: idx.symbol },
      update: {},
      create: {
        symbol: idx.symbol,
        displayName: idx.displayName,
        assetClass: AssetClass.INDEX,
        baseCurrency: idx.symbol,
        quoteCurrency: 'USD',
        contractSize: 1,
        leverage: idx.leverage,
        minUnits: 1,
        maxUnits: 1000,
        unitStep: 1,
        spreadPips: idx.spreadPips,
        pipDecimalPlaces: idx.pipDp,
        swapBuyBps: BigInt(-5),
        swapSellBps: BigInt(-5),
        tradingHoursStart: idx.tradingHoursStart,
        tradingHoursEnd: idx.tradingHoursEnd,
        tradingDays: idx.tradingDays,
        isActive: true,
        twelveDataSymbol: idx.symbol,
      },
    })
  }

  // Seed Commodities
  for (const com of commodities) {
    await prisma.instrument.upsert({
      where: { symbol: com.symbol },
      update: {},
      create: {
        symbol: com.symbol,
        displayName: com.displayName,
        assetClass: AssetClass.COMMODITY,
        baseCurrency: com.symbol === 'XAUUSD' ? 'XAU' : 'OIL',
        quoteCurrency: 'USD',
        contractSize: com.contractSize ?? 100,
        leverage: com.leverage,
        minUnits: 1,
        maxUnits: 1000,
        unitStep: 1,
        spreadPips: com.spreadPips,
        pipDecimalPlaces: com.pipDp,
        swapBuyBps: BigInt(-8),
        swapSellBps: BigInt(-3),
        tradingHoursStart: '23:00',
        tradingHoursEnd: '22:00',
        tradingDays: '12345',
        isActive: true,
        twelveDataSymbol: com.symbol,
      },
    })
  }

  // Seed Crypto
  for (const cry of crypto) {
    await prisma.instrument.upsert({
      where: { symbol: cry.symbol },
      update: {},
      create: {
        symbol: cry.symbol,
        displayName: cry.displayName,
        assetClass: AssetClass.CRYPTO,
        baseCurrency: cry.symbol.replace('USD', ''),
        quoteCurrency: 'USD',
        contractSize: 1,
        leverage: cry.leverage,
        minUnits: 1,
        maxUnits: 1000,
        unitStep: 1,
        spreadPips: cry.spreadPips,
        pipDecimalPlaces: cry.pipDp,
        swapBuyBps: BigInt(0), // No swap for crypto
        swapSellBps: BigInt(0),
        tradingDays: '1234567', // 24/7
        isActive: true,
        twelveDataSymbol: cry.symbol,
      },
    })
  }

  // ── LEGAL DOCUMENTS ─────────────────────────────────────────────
  console.warn('📜 Seeding legal documents...')
  const legalDocs = [
    { documentName: 'AML Policy', documentType: 'aml_policy', version: '1.0' },
    { documentName: 'Complaints Handling Procedure', documentType: 'complaints', version: '1.0' },
    { documentName: 'Cookies Policy', documentType: 'cookies', version: '1.0' },
    { documentName: 'Credit Card Declaration', documentType: 'credit_card', version: '1.0' },
    {
      documentName: 'First Protected Positions',
      documentType: 'protected_positions',
      version: '1.0',
    },
    { documentName: 'Privacy Policy', documentType: 'privacy', version: '1.0' },
    { documentName: 'Risk Disclosure Document', documentType: 'risk_disclosure', version: '1.0' },
    {
      documentName: 'Rollover of Contracts Terms and Conditions',
      documentType: 'rollover_tnc',
      version: '1.0',
    },
    {
      documentName: 'Special Power of Attorney',
      documentType: 'power_of_attorney',
      version: '1.0',
    },
    { documentName: 'Terms and Conditions', documentType: 'terms', version: '1.0' },
    {
      documentName: 'Trading Benefits Terms and Conditions',
      documentType: 'trading_benefits',
      version: '1.0',
    },
  ]

  for (const doc of legalDocs) {
    await prisma.legalDocument.upsert({
      where: { documentType: doc.documentType },
      update: {},
      create: {
        documentName: doc.documentName,
        documentType: doc.documentType,
        r2Key: `legal/${doc.documentType}_v${doc.version}.pdf`,
        version: doc.version,
        effectiveDate: new Date('2026-01-01'),
        isActive: true,
      },
    })
  }

  // Count final seeded records
  const instrumentCount = await prisma.instrument.count()
  const staffCount = await prisma.staff.count()
  console.warn(`✅ Seed complete:`)
  console.warn(`   - ${instrumentCount} instruments (60 total)`)
  console.warn(`   - ${staffCount} staff accounts`)
  console.warn(`   - ${legalDocs.length} legal documents`)
  console.warn(`   - Swap rates for all Forex instruments`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
