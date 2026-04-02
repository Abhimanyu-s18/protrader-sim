---
name: 'docker-local-development'
description: 'Use when: setting up local development environment, configuring Docker Compose services, managing local database, running infrastructure containers, or troubleshooting local setup issues. Ensures consistent local development across all team members. Primary agents: @devops.'
---

# Skill: Docker Local Development

**Scope**: Docker Compose setup for local development infrastructure
**Primary Agents**: @devops
**When to Use**: Setting up local environment, managing containers, troubleshooting Docker issues

---

## Infrastructure Overview

```
docker-compose.yml
├── postgres (PostgreSQL 17)
│   ├── Port: 5432
│   ├── User: protrader
│   ├── Password: protrader_local_dev
│   ├── Database: protrader_dev
│   └── Volume: pgdata (persistent)
├── redis (Redis 7)
│   ├── Port: 6379
│   └── No persistence (dev only)
├── mailhog (SMTP testing)
│   ├── SMTP Port: 1025
│   └── Web UI: 8025
└── redis-commander (Redis UI)
    └── Port: 8081
```

---

## Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:17-alpine
    container_name: protrader-postgres
    restart: unless-stopped
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: protrader
      POSTGRES_PASSWORD: protrader_local_dev
      POSTGRES_DB: protrader_dev
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U protrader']
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - protrader-network

  redis:
    image: redis:7-alpine
    container_name: protrader-redis
    restart: unless-stopped
    ports:
      - '6379:6379'
    command: redis-server --appendonly no
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - protrader-network

  mailhog:
    image: mailhog/mailhog
    container_name: protrader-mailhog
    restart: unless-stopped
    ports:
      - '1025:1025' # SMTP
      - '8025:8025' # Web UI
    networks:
      - protrader-network

  redis-commander:
    image: rediscommander/redis-commander:latest
    container_name: protrader-redis-commander
    restart: unless-stopped
    ports:
      - '8081:8081'
    environment:
      REDIS_HOSTS: local:redis:6379
    depends_on:
      - redis
    networks:
      - protrader-network

volumes:
  pgdata:
    driver: local

networks:
  protrader-network:
    driver: bridge
```

---

## Quick Start

```bash
# Start all infrastructure
docker compose up -d

# Wait for services to be ready
docker compose ps

# Check logs
docker compose logs -f postgres
docker compose logs -f redis

# Stop all services
docker compose down

# Stop and remove volumes (WARNING: deletes local data)
docker compose down -v
```

---

## Environment Variables

```bash
# apps/api/.env.local
DATABASE_URL=postgresql://protrader:protrader_local_dev@localhost:5432/protrader_dev
DIRECT_URL=postgresql://protrader:protrader_local_dev@localhost:5432/protrader_dev
REDIS_URL=redis://localhost:6379
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
```

---

## Database Management

### Initialize Database

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed data
pnpm db:seed

# Open Prisma Studio
pnpm db:studio
```

### Reset Database

```bash
# Reset and re-seed
pnpm db:migrate reset

# Or manually
docker compose down -v
docker compose up -d
pnpm db:migrate
pnpm db:seed
```

### Backup & Restore

```bash
# Backup
docker exec protrader-postgres pg_dump -U protrader protrader_dev > backup.sql

# Restore
docker exec -i protrader-postgres psql -U protrader protrader_dev < backup.sql
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :5432
lsof -i :6379

# Kill process
kill -9 <PID>

# Or change Docker Compose ports
ports:
  - '5433:5432'  # Use 5433 instead
```

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker compose ps postgres

# Check logs
docker compose logs postgres

# Test connection
psql -h localhost -p 5432 -U protrader -d protrader_dev

# Reset if corrupted
docker compose down -v
docker compose up -d
```

### Redis Connection Failed

```bash
# Check if Redis is running
docker compose ps redis

# Test connection
redis-cli ping  # Should return PONG

# Check logs
docker compose logs redis
```

### Container Won't Start

```bash
# Check Docker daemon
docker info

# Restart Docker Desktop
# (macOS: Docker Desktop → Restart)

# Rebuild containers
docker compose down
docker compose up -d --build
```

---

## Development Workflow

### Daily Development

```bash
# Morning: Start infrastructure
docker compose up -d

# Work on code
pnpm dev

# Evening: Stop infrastructure (optional)
docker compose down
```

### Database Schema Changes

```bash
# 1. Edit schema.prisma
# 2. Generate migration
pnpm db:migrate

# 3. Generate Prisma client
pnpm db:generate

# 4. Restart API if needed
pnpm --filter @protrader/api dev
```

### Testing

```bash
# Run tests (uses local database)
pnpm test

# Run with fresh database
docker compose down -v
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm test
```

---

## Performance Tips

### 1. Volume Mount Performance (macOS)

```yaml
# Use delegated volume mount for better performance
volumes:
  - ./packages/db/prisma:/app/packages/db/prisma:delegated
```

### 2. Resource Limits

```yaml
# Limit container resources
services:
  postgres:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
```

### 3. Health Checks

```yaml
# Wait for services before starting app
services:
  api:
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
```

---

## References

- [PTS-ENV-001](../../../docs/Development%20&%20Operations/PTS-ENV-001_Environment_Setup.md)
- [Deployment Railway ECS Skill](../deployment-railway-ecs/SKILL.md)
- [Database Schema Design Skill](../database-schema-design/SKILL.md)
