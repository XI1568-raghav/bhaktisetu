# Prod deploy runbook — 2026-04-28

This batch (commits `88e4076..4616edb`, 9 commits on `rebrand/darshya`)
adds provider self-serve onboarding, admin approval wiring, public
listings, dashboard profile card, KYC stage 2, approval emails, and
flips Razorpay webhook verification to raw-body by default.

## Order of operations (important)

1. **Run the KYC migration on Supabase**, BEFORE the API redeploy
   completes. New `/api/v1/provider-kyc` route 500s if the table
   doesn't exist.
2. **Verify Render env vars** before traffic hits new code.
3. **Watch Render + Cloudflare deploy logs** until both are green.
4. **Smoke-test live**.

## 1. Run KYC migration on Supabase

```bash
# From your machine, with $DATABASE_URL set to the Supabase pooler URL.
psql "$DATABASE_URL" -f apps/api/prisma/migrations/20260428_provider_kyc/migration.sql
```

Or in the Supabase SQL editor, paste the contents of
`apps/api/prisma/migrations/20260428_provider_kyc/migration.sql`
and run.

Verify:
```sql
SELECT to_regclass('public.provider_kyc');   -- must return 'provider_kyc'
SELECT count(*) FROM provider_kyc;            -- must return 0 (empty)
```

If the migration fails because `users.id` isn't `uuid` in your prod
schema, stop — DO NOT proceed with the API redeploy. Tell me.

## 2. Verify Render env vars

In Render dashboard → `darshya-api` → Environment:

| Var | Required value | Why |
|---|---|---|
| `RAZORPAY_VERIFY_RAW` | unset OR `true` | Code default is now ON. If currently set to `"false"` it will keep using the legacy path — change to `"true"` or delete the row. |
| `DATABASE_URL` | (existing — unchanged) | Migration above must already be applied here. |
| `RESEND_API_KEY` | (existing — unchanged) | Provider approval emails will silently no-op if missing; non-blocking. |

Save and click **Manual Deploy → Deploy latest commit**.

## 3. Watch deploys

- **API (Render)**: dashboard log tail. Look for:
  - `server.listen` line with port 10000 → started OK
  - any `RAZORPAY_VERIFY_RAW (default true) requires fastify-raw-body` line → drift, need to fix
  - any `provider_kyc` `relation does not exist` → migration step skipped, run it
- **Web (Cloudflare Pages)**: project → Deployments. The latest commit
  on `rebrand/darshya` should build and deploy in ~2-4 min. Watch for
  TypeScript errors (already type-checked locally; should pass).

## 4. Smoke test live

In a new browser session (no cookies):

```
https://darshya.online/                     # home loads
https://darshya.online/pandits              # listings work, empty state if no approved pandits yet
https://darshya.online/auth/signup          # form loads
https://darshya.online/admin/approvals      # redirects to login (expected)
https://api.darshya.online/health           # 200 {"status":"ok"}
https://api.darshya.online/api/v1/providers/pandit  # 200 {"providers":[...]}
```

End-to-end provider onboarding (real test):

1. Open `https://darshya.online/auth/signup` in incognito.
2. Pick "Pandit" role. Fill with a real email you control (Gmail with
   `+test1` works: `your.name+darshya-pandit-1@gmail.com`).
3. Password must be 8+ chars with a letter and a digit (`Test1234`).
4. Submit. You'll get the Supabase email-confirm. Click the link.
5. Log in with the new account → land on `/priest`. Card at top should
   say "Pending approval".
6. In another tab, log in as `admin@demo.com` / `demo123`. Visit
   `/admin/approvals` — your pandit should be there. Click Approve.
7. Back in pandit tab, refresh — card should now say "Live on Darshya"
   with a "View public profile" button.
8. Visit `/pandits` — your pandit should appear in the listing.
9. If `RESEND_API_KEY` is set, you should also receive an approval
   email at the address used.

## Rollback procedures

If something breaks:

- **Webhook stops working**: set Render env `RAZORPAY_VERIFY_RAW=false`
  to fall back to the legacy path. Fix forward later.
- **/provider-kyc 500s**: probable migration not applied. Apply it (§1).
- **Anything else catastrophic**: revert the relevant commits and push.

```bash
# Revert just the security cutover (most likely candidate)
git revert 0fa525c
git push origin rebrand/darshya
```

## What this push does NOT change

- No schema change other than `provider_kyc` (new table).
- No existing API contract changed; new routes are additive.
- Demo accounts unchanged.
- `apps/mobile` not redeployed; Phase 2 wiring is the next task.

## Open follow-ups (non-blocking)

- Admin UI to review/approve KYC submissions (currently `verified=true`
  flips via direct DB update only).
- Razorpay test-mode webhook dry run before relying on the new HMAC
  for real money. Procedure in `docs/razorpay-webhook-test.md`.
- Mobile devotee tabs still show inline mock data; Phase 2 is queued.
