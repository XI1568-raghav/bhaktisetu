# Observability Stack for 200K MAU — Sentry + Grafana + Loki + OpenTelemetry

> **Roadmap item**: R-Q4-E-005 (P0) · **Authored**: 2026-06-13

## Goal

At 200K MAU + 50K concurrent peak, ad-hoc Render logs become inadequate. Full observability stack: traces + logs + metrics + errors + alerts.

## Stack selection

| Layer | Tool | Reason | Cost |
|---|---|---|---|
| Error tracking | Sentry | industry-std, free 5K events/mo | $0 OR $26/mo Team |
| Logs aggregation | Loki + Grafana | self-host on Render free OR Grafana Cloud free tier 50GB/mo | $0 |
| Metrics + dashboards | Grafana Cloud | free tier 10K series | $0 |
| Distributed tracing | OpenTelemetry SDK → Grafana Tempo / Honeycomb free | $0 |
| Alerts | PagerDuty (free tier) OR Grafana alerting | $0 |
| Uptime | UptimeRobot (per R-Q1-IT-001) | $0 |

Total monthly: $0-$26 (Sentry paid optional). Well within budget.

## Instrumentation per layer

### Application code

```typescript
// apps/api/src/lib/observability.ts
import * as Sentry from '@sentry/node';
import { NodeSDK } from '@opentelemetry/sdk-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});

const otelSdk = new NodeSDK({ /* OTel config */ });
otelSdk.start();
```

### HTTP request middleware

Auto-instrument every request:
- duration_ms
- status_code
- route_pattern
- user_id (if auth)
- error_message (if 5xx)
- trace_id

### DB query instrumentation

Auto-instrument Prisma queries:
- query_name
- duration_ms
- row_count
- connection_pool_status

### Background job instrumentation

Cron jobs + queue workers:
- job_type
- duration_ms
- success/failure
- queue_lag

## Dashboards (Grafana)

1. **API health**: requests/sec, p50/p95/p99, error rate, by-route breakdown
2. **DB health**: queries/sec, slow query log, connection pool, cache hit rate
3. **Business KPIs**: MRR, signups today, active bookings, payment success rate
4. **Cron health**: orchestrator green-rate (already in /admin/roadmap), other crons
5. **NRI dashboard**: NRI MAU, NRI ARPU, NRI Day-30 retention, NRI tripwires

## Alert routing

| Severity | Channel | Threshold |
|---|---|---|
| P0 (critical) | PagerDuty → founder phone | API 5xx >5% for 5min, DB down, payment processor down |
| P1 (high) | Slack #alerts | API latency p95 >800ms for 10min, DB pool >90% for 5min |
| P2 (medium) | Email + Slack | MRR daily drop >20%, signup rate drop >50%, churn spike |
| P3 (low) | Email digest | Test flakiness, deploy frequency, etc. |

## Cost monitoring

Per Sentry / Grafana / Render dashboard: monthly cost forecast vs budget.

## Engineering tickets

- R-Q4-E-005a: Sentry SDK integration
- R-Q4-E-005b: Grafana Cloud + Loki setup
- R-Q4-E-005c: OpenTelemetry instrumentation across services
- R-Q4-E-005d: 5 dashboards build
- R-Q4-E-005e: alert routing + PagerDuty integration

## Closes

R-Q4-E-005 — spec shipped.
