# Caveats — read before refactoring

These look like obvious cleanup targets. They aren't. Each entry has a "why" — respect it or document a new one.

## Architectural

### Donations are in-memory (`donationStore: Map`)

`apps/api/src/routes/donations.ts` keeps donation state in a process-local `Map`. Survives until process restart.

**Why**: Quick MVP — schema is identical to the future Prisma `Donation` table.
**Migration plan**: When ready, add `model Donation` to Prisma schema with same fields, swap `Map.set/get` for `prisma.donation.create/findUnique`. No API contract changes.
**Don't**: Add a Redis layer or refactor — go straight to Prisma when migrating.

### Storage keys still say `poojly_*`

`localStorage.poojly_session` and `localStorage.poojly_user` in the browser.

**Why**: Backwards-compat with existing user sessions across the rebrand.
**Don't rename**: Every active browser logs out. Need a dual-read migration if ever changed.

### `/auth/verify` runs on Cloudflare edge runtime

`apps/web/app/auth/verify/page.tsx` has `export const runtime = 'edge'`.

**Why**: Magic-link landing must be fast and globally close to the user.
**Don't**: Import Node-only APIs (`fs`, `crypto.createHmac`, `Buffer` polyfill issues, etc.). Anything HMAC-related stays server-side at `/api/v1/auth/magic-link/verify`.

## Data / external

### 80G placeholder PAN `AAAGD1234F`

`apps/api/src/routes/donations.ts` falls back to this PAN when no gaushala-specific value exists.

**Why**: Demo data; real gaushalas haven't onboarded yet with their own 80G regn + PAN.
**Fix at**: Onboarding flow (capture real values per gaushala), not by editing `pdf-receipt.ts`.

### Razorpay signature verification

`donations.ts` does HMAC-SHA256 of `${order_id}|${payment_id}` with the key secret.

**Why**: This is exactly what Razorpay's docs prescribe.
**Don't refactor** without re-reading Razorpay's verification docs. Subtle — `|` separator is part of the spec.

### Panchang via `mhah-panchang`

`apps/api/src/services/panchang.service.ts` (or wherever) uses the `mhah-panchang` npm lib.

**Why**: Real astronomical computation. Earlier mock data was visibly wrong to users.
**Don't**: Replace with mock data. Don't replace with another lib without validating outputs against drikpanchang.com.

## Frontend / UI

### Sankalp JSON nested-string fallback

`apps/api/src/services/ai.service.ts` detects when Llama 3.3 returns `{sanskrit: "<full json string>"}` and re-parses.

**Why**: Llama 3.3 occasionally double-wraps. The fallback is load-bearing — without it, sankalp generation breaks for ~5% of requests.
**Don't**: Remove the nested-`{` detection without confirming the model behavior changed.

### Mobile drawer uses `createPortal(document.body)`

The header has `backdrop-blur` which creates a stacking context. Drawer rendered as a header child sits behind the page content on mobile.

**Why**: Portal escapes the stacking context → drawer floats above everything with `z-[100]/[101]`.
**Don't**: Move the drawer back inside the header. The bug returns immediately.

### Adopt Today card has no `lg:sticky`

User flagged sticky overlap repeatedly. Multiple half-fixes (self-start, max-h) failed.

**Why**: Final fix was to remove `lg:sticky` entirely. Don't re-add as a "polish" change.

### Chat page scroll uses `el.scrollTo`, not `scrollIntoView`

`scrollIntoView` bubbles to window and broke layout (triple scrollbar).

**Why**: `messagesScrollRef.current?.scrollTo({top: scrollHeight})` scrolls only the inner container.
**Don't**: Switch back to `scrollIntoView` "for simplicity."

### `Analytics.tsx` is Suspense-wrapped

It uses `useSearchParams` for manual pageview tracking.

**Why**: Without Suspense, the entire layout is forced into dynamic rendering, breaking static optimization.
**Don't**: Remove the Suspense wrapper.

## Behavioral

### AI chat is auth-optional

`/ai/chat` accepts unauthenticated requests with synthetic `anon-<ts>` ids.

**Why**: "Ask Pandit" is a top-of-funnel feature for visitors. Requiring auth blocked conversion.
**Constraint**: Persistence skipped for `demo-*` and `anon-*` ids (UUID FK).

### Sentry init must be the first executable line in `server.ts`

Imports are hoisted but Sentry's instrumentation needs to run before route handlers register.

**Why**: Otherwise, errors thrown during boot are missed.
**Don't**: Move Sentry init below other side-effecting imports.
