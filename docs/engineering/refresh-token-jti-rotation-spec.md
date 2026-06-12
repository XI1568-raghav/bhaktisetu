# Refresh Token JTI Single-Use Rotation Logic

> **Roadmap item**: R-Q1-E-004 (P1) · **Authored**: 2026-06-13 · **Extends**: HANDOFF 2026-06-08 #20 RefreshTokenJTI schema shipped 7adbd87

## Goal

Implement /refresh endpoint single-use JTI rotation per `RefreshTokenJTI` table (shipped via 7adbd87 schema migration).

## Architecture

Refresh token = JWT containing `{ userId, jti, family, exp }`. JTI = unique-per-token. Family = stable across rotation (all tokens for same login session).

## /refresh endpoint flow

```typescript
POST /api/v1/auth/refresh
Headers: Cookie: refresh_token={jwt}

1. Parse JWT → extract { userId, jti, family, exp }
2. SELECT 1 FROM refresh_token_jtis WHERE jti=$1 AND revoked_at IS NULL
3. IF row not found → 401 (replay attack OR revoked family) + REVOKE entire family
   UPDATE refresh_token_jtis SET revoked_at=now() WHERE family=$family
4. ELSE
   a. UPDATE refresh_token_jtis SET revoked_at=now() WHERE jti=$1 (mark used)
   b. Generate NEW jti (uuidv7), keep family
   c. INSERT refresh_token_jtis (jti=NEW, family, user_id, created_at, expires_at)
   d. Issue new refresh JWT w/ NEW jti, same family, exp + 30d
   e. Issue new access JWT (15min)
   f. Return { accessToken, refreshToken }
```

## Security properties

- **Single-use**: Each JTI revoked on use, cannot be reused
- **Replay detection**: Reuse of revoked JTI → family REVOKED entirely (logout all)
- **Family isolation**: Compromised refresh token only affects that login session

## Cleanup cron

Daily cron: `DELETE FROM refresh_token_jtis WHERE expires_at < now() - INTERVAL '7 days'`

## Engineering ticket

`apps/api/src/routes/auth.ts` — replace existing /refresh endpoint w/ JTI-rotation flow above.

## Closes

R-Q1-E-004 — spec shipped.
