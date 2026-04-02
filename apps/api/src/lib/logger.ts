import pino from 'pino'

const isDev = process.env['NODE_ENV'] !== 'production'

/**
 * Structured logger using pino.
 * - Development: pretty-printed with colors
 * - Production: JSON output for log aggregation
 */
export const logger = pino({
  level: process.env['LOG_LEVEL'] ?? (isDev ? 'debug' : 'info'),
  ...(isDev ? { transport: { target: 'pino-pretty' as const, options: { colorize: true, translateTime: 'SYS:HH:mm:ss' } } } : {}),
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
})

/**
 * Create a child logger with a specific module context.
 * @param module - Module name (e.g. 'redis', 'trades', 'auth')
 */
export function createLogger(module: string): pino.Logger {
  return logger.child({ module })
}
