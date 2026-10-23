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

## Provider approval (REQUIRE_PROVIDER_APPROVAL, default off)

Non-devotee roles (pandit/priest, store owner, astrologer, wellness instructor, gaushala manager, temple manager) go live on submit with no admin action. Set `REQUIRE_PROVIDER_APPROVAL=true` on the API to restore the old admin gate. Details: `docs/env-vars.md`.

| Role | Live means | Written on submit |
|---|---|---|
| pandit | `PanditProfile.approved` + ACTIVE `Priest` row (portal gate `requireRole('priest')`) | `approved`, `approvedAt`; `Priest.status` inactive -> active. **Never** `Priest.isVerified` / `verificationStatus` (TC-08). |
| store owner | `StoreProfile.approved` (public store + products) | `approved` |
| astrologer | `AstrologerProfile.approved` (directory, booking); public `verified` stays false | `approved` |
| wellness instructor | `WellnessProfile.approved` (public + enrolments) | `approved` |
| gaushala manager | `GaushalaProfile.approved` and the cause-quality bar | `approved` only when name/description/address pass `lib/cause-quality.ts` |
| temple manager | `TempleProfile.approved`; a new name also gets a hidden `pending_review` Temple + `temple_manager_links` row | `approved` only when quality passes (a catalogue temple name links the manager to it directly, no admin step since 2026-10-23) |

Portals open on the role assignment alone (`requireRole`/roles list); only the pandit portal also needs the active Priest row, which signup now creates. Suspension: admin Block (`User.blocked`, enforced everywhere) or un-approve (`PATCH /admin/users/:id {approved:false}`: hides the profile and, for a pandit, sets an active Priest row inactive). Un-approve is not a permanent ban: the provider re-submitting their profile re-activates it; use Block for that. Earnings stay held until performed/proved and payouts still need payout details + KYC.

### Register -> portal (2026-10-23)

- `POST /auth/register` returns the session and sets the httpOnly cookies (the web sends `credentials:'include'` so the browser keeps them). The signup page seeds the auth context from that response and enters the portal with a **soft navigation** (`useSoftNavigate`); a full page load drops the in-memory access token and the portal would revive from nothing and bounce to `/auth/login`. Never navigate with `window.location.href` / `assign` after signup, registration or onboarding.
- `POST /auth/refresh` with no body token and no `darshya_refresh` cookie is a clean **401** (it was a 400).
- A provider is **active from registration**: role assignment + (pandit) an ACTIVE `Priest` row + a stub profile. `approved` therefore means "publicly listed". With approval off it flips on in `onboardingService.activateOnSubmit` once the listing gate passes: price submitted (or stored price no longer the schema placeholder: pandit 500, astrologer 10, wellness 500) and non-empty specialties for pandit/astrologer/wellness; gaushala/temple keep the cause-quality bar. Prices are optional in `POST /onboarding/provider` and are never invented. `GET/POST /onboarding/provider` and the astrologer/wellness dashboards return `listing: { listed, approvalRequired, missing, message }`; screens show `message` ("Your portal is active. Add your price and details to be listed.") and approval wording only when `approvalRequired` is true.
- E2E: `apps/web/e2e/provider-register-to-portal.spec.ts` (`E2E_LOCAL_STACK=1`, six roles, asserts no 4xx and no login visit).
