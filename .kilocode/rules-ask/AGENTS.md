# Ask Mode Rules (Non-Obvious)

- "src/" contains VSCode extension code, not source for web apps (counterintuitive)
- Provider examples in `src/api/providers/` are the canonical reference (docs are outdated)
- UI runs in VSCode webview with restrictions (no localStorage, limited APIs)
- Package.json scripts must be run from specific directories, not root
- Locales in root are for extension, `webview-ui/src/i18n` for UI (two separate systems)
- Database migrations cannot be rolled back - forward-only by design
- React hooks required because external state libraries break webview isolation
- Monorepo packages have circular dependency on types package (intentional)
- Instrument configuration in `packages/db/prisma/schema.prisma` is critical for calculations
- Socket.io room limits (20 subscriptions) can cause silent connection drops
- JWT token validation happens in middleware before route handlers
