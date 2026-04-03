# Architect Mode Rules (Non-Obvious)

- Providers MUST be stateless - hidden caching layer assumes this
- Webview and extension communicate through specific IPC channel patterns only
- Database migrations cannot be rolled back - forward-only by design
- React hooks required because external state libraries break webview isolation
- Monorepo packages have circular dependency on types package (intentional)
- Socket.io room naming follows strict conventions: `user:{userId}`, `prices:{symbol}`, `admin:panel`
- Financial calculations require BigInt throughout - mixing types causes precision loss
- Error codes in `packages/types/src/` must match frontend error handling
- Rate limiting is implemented at both global and per-IP levels
- Balance is computed, not stored - affects database query patterns
- Margin calculations depend on instrument-specific `contractSize` and `pipDecimalPlaces`
