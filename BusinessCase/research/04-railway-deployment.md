# Railway Deployment — Reference

*Researched: 2026-03-21*

## Why Railway
- Persistent containers (not serverless) — no runtime timeout
- WebSocket support out of the box
- No cold starts by default (always-on)
- GitHub autodeploy with Dockerfile support
- EU region (Amsterdam) for GDPR

## Pricing

| Resource | Hobby ($5/mo) | Pro ($20/mo) |
|----------|---------------|--------------|
| CPU/service | up to 48 vCPU | up to 1,000 vCPU |
| RAM/service | up to 48 GB | up to 1 TB |
| Replicas | 6 | 42 |
| Custom domains | 2 | 20 |
| Build timeout | 40 min | 90 min |
| Log retention | 7 days | 30 days |

**Usage-based:**
- CPU: ~$20/mo per always-on vCPU
- RAM: ~$10/mo per always-on GB
- Egress: $0.05/GB

**Estimated cost for MVP:** ~$25-30/mo (1 vCPU, 512MB, always-on)

## Regions

| Region | Location | Identifier |
|--------|----------|-----------|
| US West | California | us-west2 |
| US East | Virginia | us-east4-eqdc4a |
| **EU West** | **Amsterdam** | europe-west4-drams3a |
| SE Asia | Singapore | asia-southeast1-eqsg3a |

## Deployment
- Dockerfile detected automatically (capital D)
- Custom path via `RAILWAY_DOCKERFILE_PATH`
- Health checks: configure HTTP endpoint (e.g., `/health`), default 300s timeout
- Watch paths: `/backend/**` to skip rebuilds on frontend-only changes

## Secrets
- Service-scoped variables via dashboard
- Shared variables: `${{ shared.VAR }}`
- Cross-service: `${{ SERVICE_NAME.VAR }}`
- Sealed variables: one-way encryption, injected at runtime, never visible in UI

## Caveats
- **No sticky sessions** — WebSocket reconnection may hit different replica. Single replica for MVP, Redis for multi-replica.
- **Proxy idle timeout undocumented** — implement heartbeat pings every 30-60s
- **Log retention short** — consider external log drain for production
- **Serverless mode** (optional, OFF by default) — if enabled, sleeps after 10 min idle. Keep OFF for meeting backend.
