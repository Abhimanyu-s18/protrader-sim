import { Redis } from 'ioredis'
import { createLogger } from './logger.js'
import { z } from 'zod'

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

const priceScaledSchema = z.object({
  bid_scaled: z.string(),
  ask_scaled: z.string(),
  mid_scaled: z.string(),
  change_bps: z.string(),
  ts: z.string(),
})

export type PriceScaled = z.infer<typeof priceScaledSchema>

export async function setCachedPrice(symbol: string, price: PriceScaled): Promise<void> {
  const redis = getRedis()
  await redis.setex(`prices:${symbol}`, PRICE_TTL_SECONDS, JSON.stringify(price))
}

export async function getCachedPrice(symbol: string): Promise<PriceScaled | null> {
  const redis = getRedis()
  const raw = await redis.get(`prices:${symbol}`)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    const validated = priceScaledSchema.parse(parsed)
    return validated
  } catch (err) {
    log.warn({ symbol, raw, err }, 'Invalid cached price JSON - clearing entry')
    await redis.del(`prices:${symbol}`)
    return null
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
