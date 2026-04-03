import { Redis } from 'ioredis'
import { createLogger } from './logger.js'

const log = createLogger('redis')

let redisClient: Redis | null = null

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
      // Required by BullMQ for reliable queue behavior.
      // See: https://docs.bullmq.io/guide/configuration
      maxRetriesPerRequest: null,
      retryStrategy: (times) => Math.min(times * 100, 3000),
      lazyConnect: false,
    })

    redisClient.on('error', (err) => {
      log.error({ err }, 'Connection error')
    })

    redisClient.on('connect', () => {
      log.info('Connected')
    })
  }

  return redisClient
}

// ── Price cache helpers ───────────────────────────────────────────
const PRICE_TTL_SECONDS = 60

export async function setCachedPrice(
  symbol: string,
  price: {
    bid_scaled: string
    ask_scaled: string
    mid_scaled: string
    change_bps: string
    ts: string
  },
): Promise<void> {
  const redis = getRedis()
  await redis.setex(`prices:${symbol}`, PRICE_TTL_SECONDS, JSON.stringify(price))
}

export async function getCachedPrice(
  symbol: string,
): Promise<{
  bid_scaled: string
  ask_scaled: string
  mid_scaled: string
  change_bps: string
  ts: string
} | null> {
  const redis = getRedis()
  const raw = await redis.get(`prices:${symbol}`)
  if (!raw) return null
  return JSON.parse(raw) as {
    bid_scaled: string
    ask_scaled: string
    mid_scaled: string
    change_bps: string
    ts: string
  }
}

// ── Margin watch set helpers ──────────────────────────────────────
// Tracks which users have open positions on each instrument

export async function addMarginWatch(instrumentId: string, userId: string): Promise<void> {
  const redis = getRedis()
  await redis.sadd(`margin_watch:${instrumentId}`, userId)
}

export async function removeMarginWatch(instrumentId: string, userId: string): Promise<void> {
  const redis = getRedis()
  await redis.srem(`margin_watch:${instrumentId}`, userId)
}

export async function getMarginWatchers(instrumentId: string): Promise<string[]> {
  const redis = getRedis()
  return redis.smembers(`margin_watch:${instrumentId}`)
}
