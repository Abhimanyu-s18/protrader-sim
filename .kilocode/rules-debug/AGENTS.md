# Debug Mode Rules (Non-Obvious)

- Hidden log locations: Check `apps/api/src/lib/queues.ts` and `apps/api/src/lib/redis.ts` for runtime logs
- IPC messages fail silently if not wrapped in try/catch in `packages/ipc/src/`
- Production builds require `NODE_ENV=production` or certain features break without error
- Database migrations must run from `packages/evals/` directory, not root
- Socket.io debugging requires checking both server logs and client-side console
- Redis connection errors often appear as database timeouts in production
- JWT token validation failures return generic auth errors - check `JWT_PRIVATE_KEY` environment variable
- Rate limiting errors return 429 but don't specify which limit was exceeded
- Prisma query failures often manifest as socket.io connection drops
- Balance calculation errors occur when `ledger_transactions` table is out of sync
- Margin call calculations can fail silently if instrument `contractSize` is incorrect