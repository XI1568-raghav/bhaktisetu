# Security Rotation — 2026-05-13

> P0 batch. Two production credentials are LEAKED in chat archives + one auth flag is too permissive for prod. Rotate all three in one sitting (~30 min).
> Code is already env-or-noop, so partial completion is safe (services no-op until new keys land).

## Why now

| Item | Risk | Source |
|---|---|---|
| Resend API key `re_46d7r...` (LEAKED) | Anyone can send mail as `darshya.online` → domain reputation ruin, phishing, free-tier (3K/mo) drain | Memory `project_darshya.md` line 22 + `docs/chat-archive/*` |
| Supabase DB password (LEAKED) | `DATABASE_URL` grants R/W on bookings, payments, 80G receipts, PII | TASKS.md U7 |
| `ALLOW_DEMO_TOKENS=true` on Render | Demo creds (`demo-*`, password `demo123`, 8 fixed accounts incl. `admin@demo.com`) bypass real auth in prod | `apps/api/src/middlewares/auth.ts:83-89` |

## Step 1 — Rotate Resend API key (~10 min)

1. **Revoke old key**
   - Open https://resend.com/api-keys
   - Find key starting `re_46d7r...` → click `…` → **Revoke**
2. **Create new key**
   - Click **Create API Key**
   - Name: `darshya-prod-2026-05-13`
   - Permission: **Sending access** (NOT Full access)
   - Domain: `send.darshya.online`
   - Copy the new key (shown once)
3. **Paste into Render**
   - Open https://dashboard.render.com → service `bhaktisetu` → **Environment**
   - Find `RESEND_API_KEY` → **Edit** → paste new key → **Save Changes**
   - Render auto-redeploys (~2 min)
4. **Verify**
   - From local: `curl https://api.darshya.online/api/v1/health` → 200
   - Trigger one outbound: `curl -X POST https://api.darshya.online/api/v1/admin/test-email -H "Authorization: Bearer <admin-token>"` → check inbox at `support@darshya.online`
   - Resend dashboard → **Emails** → confirm new send via new key
5. **Rotate ANY OTHER copies**
   - `apps/api/.env.local` (your local) — paste same new key
   - `.env.example` — confirm placeholder only, no real key

## Step 2 — Rotate Supabase DB password (~15 min)

⚠️ **DOWNTIME**: ~30-60 sec while Render restarts with new `DATABASE_URL`.

1. **Generate new password**
   - Open https://supabase.com/dashboard/project/hlkvfarvfblhzhhnhtbp/settings/database
   - **Database password** section → **Reset database password**
   - Use a 32-char generated password (no special chars that need URL-encoding: stick to `[A-Za-z0-9]` for safety)
   - Copy it
2. **Build new connection string**
   - Format: `postgresql://postgres.<project-ref>:***REMOVED***@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`
   - Get the template from Supabase **Settings → Database → Connection string → URI** (pooler mode)
   - Replace `[YOUR-PASSWORD]` with the new password from step 1
3. **Paste into Render**
   - Render → service `bhaktisetu` → **Environment** → `DATABASE_URL` → paste new URL → **Save**
   - Render redeploys (~3 min, includes `pnpm prisma generate`)
4. **Verify**
   - Watch Render logs — should see `prisma:info Starting a postgresql pool` then no errors
   - Hit a real DB-backed endpoint: `curl https://api.darshya.online/api/v1/temples` → JSON list (not 500)
   - Try one booking-create flow from web (logged in) → should still work
5. **Rotate local copies**
   - `apps/api/.env.local` → paste new `DATABASE_URL`
   - Verify your local `pnpm dev` still connects

**Rollback**: if Render deploy fails, paste OLD `DATABASE_URL` back. The old password still works UNTIL you actually clicked "reset" in Supabase — after that, only the new password is valid, so re-do step 1 with another new password.

## Step 3 — Unset `ALLOW_DEMO_TOKENS` (~2 min)

1. Render → service `bhaktisetu` → **Environment**
2. Find `ALLOW_DEMO_TOKENS` → **Delete** (NOT just set to `false` — delete entirely so default is `undefined`)
3. **Save Changes** → wait for redeploy (~2 min)
4. **Verify demo bypass blocked**
   ```bash
   curl -X GET https://api.darshya.online/api/v1/users/me \
     -H "Authorization: Bearer demo-admin-token"
   ```
   Should return `401 Unauthorized` (not 200 with admin user).
5. **Verify real auth still works**
   - Sign in via magic link on darshya.online
   - Hit any authed page → should load fine

## Step 4 — Audit chat archive for any other leaked secrets

Run locally:
```bash
cd E:/NewClaude/bhaktisetu
grep -rE "(sk_live_|sk_test_|rzp_live_|rzp_test_|re_[a-zA-Z0-9_]{20,}|eyJhbGc|postgresql://[^@]+:[^@]+@)" docs/chat-archive/ docs/full-context.md 2>/dev/null | head -20
```

Any match → rotate that key too (Razorpay, Stripe, Supabase service role, JWT secret, etc).

## Done criteria

- [ ] Resend old key shows **Revoked** in dashboard
- [ ] Supabase password reset confirmed (old won't connect)
- [ ] `ALLOW_DEMO_TOKENS` no longer in Render env list
- [ ] All three Render redeploys green
- [ ] `darshya.online` magic-link sign-in works (Resend new key path)
- [ ] `api.darshya.online/api/v1/temples` returns JSON (DB new password path)
- [ ] `demo-admin-token` returns 401 (demo gate closed)
- [ ] No leftover real keys in chat-archive/ — or those have also been rotated

## Why these are env-or-noop safe

- `apps/api/src/lib/email.ts:11-16` — `apiKey ? new Resend(apiKey) : null` → `sendEmail()` returns `{skipped: true}` if absent
- `apps/api/src/middlewares/auth.ts:88-89` — `process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEMO_TOKENS === 'true'` → demo path disabled when flag missing in prod
- `DATABASE_URL` is the one that genuinely cannot be missing (Prisma startup fails). That is why we restart Render *with* the new URL in one save, not in two steps.
