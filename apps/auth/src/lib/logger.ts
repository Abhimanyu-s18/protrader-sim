/**
 * Structured logger for the auth app
 * Provides a consistent logging interface for client-side operations
 */

type LogContext = Record<string, unknown>

const createLogger = (context: string) => ({
  error: (message: string, ctx?: LogContext) => {
    console.error(`[${context}] ${message}`, ctx)
  },
  warn: (message: string, ctx?: LogContext) => {
    console.warn(`[${context}] ${message}`, ctx)
  },
  info: (message: string, ctx?: LogContext) => {
    console.info(`[${context}] ${message}`, ctx)
  },
  debug: (message: string, ctx?: LogContext) => {
    console.debug(`[${context}] ${message}`, ctx)
  },
})

export { createLogger }
