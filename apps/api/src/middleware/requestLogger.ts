import type { Request, Response, NextFunction } from 'express'
import { createLogger } from '../lib/logger.js'

const log = createLogger('http')

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now()
  const { method, url } = req

  res.on('finish', () => {
    const duration = Date.now() - start
    const { statusCode } = res

    if (url !== '/health') {
      log.info({ method, url, statusCode, duration }, `${method} ${url} ${statusCode} ${duration}ms`)
    }
  })

  next()
}
