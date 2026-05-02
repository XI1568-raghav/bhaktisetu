# Funnel dashboard

Server-rendered conversion funnel at `/funnel` in `apps/admin` (Layer D of the
investor-readiness rollout). Data comes from PostHog. Page revalidates every
5 minutes via Next.js ISR — PostHog is **not** queried on every page hit.

## Required env vars

| Var | Required | Behavior when absent |
|---|---|---|
| `POSTHOG_API_KEY` | Yes (for live data) | Page renders an empty state explaining how to configure. |
| `POSTHOG_PROJECT_ID` | Yes (for live data) | Same as above. |
| `ADMIN_DASHBOARD_TOKEN` | Optional | When set, `apps/admin` middleware requires the `darshya_admin_session` cookie value to match. Unset means open access (dev mode). |

`POSTHOG_API_KEY` must be a **personal API key** with read access to the
project's insights — not the public client capture key. Generate at
PostHog → Settings → Personal API Keys.

The page calls
`POST https://us.i.posthog.com/api/projects/$POSTHOG_PROJECT_ID/insights/funnel/`
with `Authorization: Bearer $POSTHOG_API_KEY`.

## Funnel steps and event mapping

The funnel definition lives in `apps/admin/lib/posthog-funnel.ts` (`FUNNEL_STEPS`).

| Step ID | PostHog event | Property filter | Source |
|---|---|---|---|
| `home_view` | `$pageview` | `$pathname == "/"` | Auto-captured by `posthog-js` `capture_pageview` flag (see `packages/analytics/src/index.ts`). |
| `temple_view` | `temple_viewed` | none | `AnalyticsEvents.templeViewed` in `packages/analytics`. |
| `puja_view` | `$pageview` | `$pathname icontains "/pujas/"` | `$pageview` is the canonical pageview event. |
| `checkout_open` | `booking_started` | none | `AnalyticsEvents.bookingStarted` in `packages/analytics`. |
| `payment_success` | `payment_success` | none | `AnalyticsEvents.paymentSuccess` in `packages/analytics`. |

These are the **exact event names** sent in the `events` array of the funnel
insight request. If a step's event name is renamed in `packages/analytics`,
update the matching entry in `FUNNEL_STEPS`.

## How to add a new funnel step

1. Open `apps/admin/lib/posthog-funnel.ts`.
2. Append a new entry to `FUNNEL_STEPS` (`id`, `label`, `event`,
   `description`, optional `properties`). The `event` string must match the
   exact PostHog event name.
3. If you need property filters, follow the existing shape:
   `{ key, value, operator, type: "event" }`. PostHog supports `exact`,
   `icontains`, `regex`, etc.
4. Confirm the event is actually being captured in PostHog Live Events. The
   funnel will silently show 0 for unknown event names.
5. Re-deploy. ISR will pick up the new step on the next 5-minute revalidation.

## Schema validation

PostHog responses are zod-validated against
`FunnelResponseSchema` and `NestedFunnelResponseSchema` (PostHog has shipped
both flat and breakdown-nested shapes). On schema mismatch the page renders an
"error" state with the message instead of crashing.

## Graceful degradation

| Failure mode | Behavior |
|---|---|
| Env vars missing | Empty state listing missing keys. |
| PostHog network error | Empty state with the error message. |
| PostHog returns non-2xx | Empty state with the HTTP status. |
| Schema mismatch | Empty state with a "did not match expected schema" message. |
| Zero events in window | "Empty" state plus the (all-zero) chart so the layout still renders. |

## Auth

`apps/admin/middleware.ts` checks for the `darshya_admin_session` cookie when
`ADMIN_DASHBOARD_TOKEN` is set. Cookie value must equal the env value.
Mirrors the `poojly_session` pattern used in `apps/web` but for server-side
gating; the existing `poojly_*` localStorage keys are not visible to
middleware so a separate cookie is used.

## Verifying

```bash
cd E:\NewClaude\bhaktisetu
pnpm turbo type-check --filter=@poojly/admin
```

(`@bhaktisetu/admin` does not exist in this workspace — the admin package
is named `@poojly/admin` for legacy compatibility, see CLAUDE.md.)

## Cohort retention dashboard (Layer AJ)

Server-rendered weekly cohort retention at `/retention` in `apps/admin`. Same
PostHog auth and ISR (5-minute) pattern as the funnel page.

### What it shows

A heatmap of weekly cohorts over the **last 8 weeks**. Rows are signup
cohorts (week of first `$pageview`), columns are intervals 0..7 weeks
later. Each cell is the percentage of that cohort that returned that week.

| Property | Value |
|---|---|
| Endpoint | `POST $POSTHOG_HOST/api/projects/$POSTHOG_PROJECT_ID/insights/retention/` |
| Cohort signup event | first `$pageview` (`retention_first_time`) |
| Returning event | any `$pageview` |
| Period | `Week` |
| Intervals | 8 |
| Window | last 56 days (`date_from = -56d`) |

### Heatmap encoding

Cells use a saffron gradient (`rgba(225, 99, 24, alpha)`) where `alpha` is
the retention percentage scaled into `[0.08, 1.0]`. Week 0 is hard-coded to
`100%` (it is the cohort itself). A small legend renders at the bottom of
the table.

The heatmap is pure HTML/CSS — no chart library — to keep the admin app
free of new dependencies.

### Empty state

When `POSTHOG_API_KEY` (or `POSTHOG_PROJECT_ID`) is missing, the page shows
**"Set POSTHOG_API_KEY to view retention"** along with the list of
specifically missing vars. Same fallback applies for network errors,
non-2xx responses, schema mismatches, and zero-event windows.

### Files

| File | Purpose |
|---|---|
| `apps/admin/lib/posthog-retention.ts` | `fetchRetention()` — typed PostHog client + zod validation. Mirrors `posthog-funnel.ts`. |
| `apps/admin/app/retention/page.tsx` | Server component, ISR 300 s. Renders cohort grid with saffron heatmap. |
| `apps/admin/components/admin-nav.tsx` | "Retention" nav link added between Funnel and Bookings. |

