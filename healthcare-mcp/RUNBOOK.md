# Healthcare MCP Server - Operations Runbook

## Quick Reference

| Check | Command |
|-------|---------|
| Health | `curl localhost:3000/health` |
| Stats | `curl localhost:3000/stats` |
| Logs | `docker logs healthcare-mcp` |

---

## Common Issues

### 1. Server Won't Start

**Symptom:** Container exits immediately

**Check:**
```bash
docker logs healthcare-mcp
```

**Causes & Fixes:**
- Missing `OPENAI_API_KEY` → Set env var (server runs without it but AI chat disabled)
- Port 3000 in use → Change port: `-p 3001:3000`
- Build failed → Rebuild: `docker build -t healthcare-mcp .`

---

### 2. Health Check Failing

**Symptom:** `/health` returns 503 or degraded

**Check:**
```bash
curl -s localhost:3000/health | jq
```

**Response meanings:**
- `openfda: down` → FDA API unreachable (their outage or network issue)
- `openai: degraded` → API key not set (chat disabled, tools still work)

**Fix:** Usually temporary. If FDA is down, tools still work with cached data.

---

### 3. Rate Limiting

**Symptom:** Getting 429 responses

**Limits:**
- API: 100 requests/min per IP
- Chat: 30 requests/min per IP
- MCP: 100 requests/min per IP

**Fix:** Wait for window to reset. For legitimate high traffic, deploy multiple instances.

---

### 4. Slow Responses

**Check cache stats:**
```bash
curl -s localhost:3000/stats | jq .cache
```

**Good:** High `hit_rate` (>50% after warmup)
**Bad:** Low hits → Cold cache, will improve with use

**FDA rate limit:** 240 req/min. If hitting this, responses slow down.

---

### 5. Memory Issues

**Check:**
```bash
curl -s localhost:3000/stats | jq .sessions
```

**Watch for:**
- `active_sessions` > 500 → Many concurrent users
- Memory growing → Sessions auto-expire after 30 min

**Fix:** Restart if memory critical. Sessions and cache auto-managed.

---

## Docker Commands

```bash
# Build
docker build -t healthcare-mcp .

# Run
docker run -d --name healthcare-mcp \
  -p 3000:3000 \
  -e OPENAI_API_KEY=sk-... \
  healthcare-mcp

# Logs
docker logs -f healthcare-mcp

# Restart
docker restart healthcare-mcp

# Stop
docker stop healthcare-mcp && docker rm healthcare-mcp
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | For chat | - | OpenAI API key |
| `OPENAI_MODEL` | No | gpt-5-nano-2025-08-07 | OpenAI model id |
| `OPENAI_MAX_TOKENS` | No | 8192 | Max completion tokens |
| `OPENAI_TEMPERATURE` | No | 0.2 | Response creativity (0-2) |
| `PORT` | No | 3000 | Server port |
| `NODE_ENV` | No | development | Set to `production` for JSON logs |
| `LOG_LEVEL` | No | info | Logging level |
| `SENTRY_DSN` | No | - | Enable Sentry error monitoring |
| `SENTRY_TRACES_SAMPLE_RATE` | No | 0.1 | Sentry performance sampling |

---

## Monitoring Endpoints

### GET /health
Returns service health with dependency checks.

```json
{
  "status": "healthy",
  "uptime_seconds": 3600,
  "checks": {
    "openfda": { "status": "ok", "latency_ms": 150 },
    "openai": { "status": "ok" }
  }
}
```

### GET /stats
Returns detailed metrics (cache, sessions, rate limits).

---

## Emergency Procedures

### Full Restart
```bash
docker stop healthcare-mcp
docker rm healthcare-mcp
docker run -d --name healthcare-mcp -p 3000:3000 -e OPENAI_API_KEY=sk-... healthcare-mcp
```

### Check if Running
```bash
docker ps | grep healthcare-mcp
curl -s localhost:3000/health
```
