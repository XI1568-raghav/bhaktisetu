# EmailSession.expiresAt Enforcement in Auth Middleware

> **Roadmap item**: R-Q1-E-005 (P1) · **Authored**: 2026-06-13 · **Extends**: HANDOFF 2026-06-08 #20 EmailSession schema shipped 7adbd87

## Goal

Enforce EmailSession.expiresAt in `apps/api/src/middlewares/auth.ts` so passwordless email auth sessions auto-expire after 30 days.

## Current state

- Schema shipped: email_sessions table w/ id, user_id, token_hash, created_at, expires_at, revoked_at
- `/auth/logout` ebcg375 revokes email-session on demand (sets revoked_at)
- **Missing**: middleware doesn't check expires_at on read

## Patch

```typescript
// apps/api/src/middlewares/auth.ts inside authenticateUser
// After loading session by token_hash:

if (session.revoked_at) {
  return reply.status(401).send({ message: 'Session revoked' })
}

if (session.expires_at && session.expires_at < new Date()) {
  // Auto-revoke expired sessions for audit log
  await fastify.pg.query(
    `UPDATE email_sessions SET revoked_at=now() WHERE id=$1`,
    [session.id]
  )
  return reply.status(401).send({ message: 'Session expired, please sign in again' })
}
```

## Cleanup cron

Daily: `DELETE FROM email_sessions WHERE expires_at < now() - INTERVAL '90 days' AND revoked_at IS NOT NULL`

## Rollout

- Existing email-sessions w/o expires_at populated → treat as legacy, 30d from created_at
- 30d soft rollout: warn-only mode 1 week → enforce mode

## Engineering ticket

R-Q1-E-005a: middleware enforcement
R-Q1-E-005b: cleanup cron
R-Q1-E-005c: legacy session backfill

## Closes

R-Q1-E-005 — spec shipped.
