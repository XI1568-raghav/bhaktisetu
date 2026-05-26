# Auth model

## Three token formats

`apps/api/src/middlewares/auth.ts` routes by token prefix. **Order matters** — the magic-link branch runs BEFORE Supabase verification:

| Format | Origin | Notes |
|---|---|---|
| `email-<uuid>-<32hex>` | `/auth/magic-link/verify` | Returned as session token after a successful magic-link verify. Middleware looks up user by uuid. |
| `demo-*` | hardcoded demo accounts | 8 accounts, password `demo123`, used for showcase. |
| Supabase JWT | normal sign-in | Verified via Supabase client. |

If the prefix doesn't match the first two, the token falls through to Supabase verification.

## Magic-link tokens (the link itself, not the session)

Format: `<base64url(email.nonce.expiresAt)>.<sig>`

- Signed with HMAC-SHA256 using `MAGIC_LINK_SECRET`
- 15-minute TTL on the link
- No DB row needed for the token — verification is pure crypto + expiry check
- After verify, server returns a session token of the form `email-<userId>-<32hex>`

Lives in `apps/api/src/routes/magic-link.ts`.

## Anonymous AI chat

`/ai/chat` is auth-optional. When unauthenticated:
- Synthetic id `anon-<ts>` is generated
- DB persistence is skipped (no `aiConversation.create`)
- Same skip applies to `demo-*` ids — both prefixes avoid the UUID FK violation

Detection: any id starting with `demo-` or `anon-` is treated as a synthetic user.

## Demo accounts

All passwords: `demo123`.

| Email | Role | Lands on |
|---|---|---|
| `devotee@demo.com` | devotee | `/dashboard` |
| `pandit@demo.com` | priest | `/priest` |
| `store@demo.com` | store_owner | `/store-admin` |
| `astro@demo.com` | astrologer | `/astrologer-portal` |
| `wellness@demo.com` | wellness_instructor | `/wellness-portal` |
| `gaushala@demo.com` | gaushala_manager | `/gaushala-portal` |
| `temple@demo.com` | temple_manager | `/temple-portal` |
| `admin@demo.com` | admin | `/admin` |

The role → dashboard path mapping is `getRoleDashboardPath()` in `apps/web/lib/auth-context.tsx`. Mobile parity work mirrors this with Expo Router groups (see `docs/mobile-plan.md`).

## Storage keys (browser)

- `poojly_session` — full session object including `accessToken`
- `poojly_user` — user profile snapshot

The `poojly_` prefix is legacy from rebrand. **Do not rename** without a migration path — every existing browser would log out.

## Smoke test

`node apps/api/scripts/smoke-all-roles.mjs` logs in each demo account, hits every role's dashboard + API surfaces, verifies perms enforcement + admin mutation. 88/88 green on prod 2026-05-26.
