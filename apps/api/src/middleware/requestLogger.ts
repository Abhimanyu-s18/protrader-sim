import type { Request, Response, NextFunction } from 'express'

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now()
  const { method, url } = req

  res.on('finish', () => {
    const duration = Date.now() - start
    const { statusCode } = res
    const color = statusCode >= 500 ? '\x1b[31m'
      : statusCode >= 400 ? '\x1b[33m'
      : statusCode >= 300 ? '\x1b[36m'
      : '\x1b[32m'
    const reset = '\x1b[0m'

    if (url !== '/health') {
      console.log(`${color}${method} ${url} ${statusCode} ${duration}ms${reset}`)
    }
  })

  next()
}
