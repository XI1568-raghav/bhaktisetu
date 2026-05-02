# A/B testing on Darshya

We use **PostHog feature flags** for both kill-switches (boolean flags) and
A/B experiments (multivariate flags). PostHog SDK is already wired by the
analytics layer — adding a new test is purely a flag + a reader.

## Where things live

| File | Purpose |
| --- | --- |
| `apps/api/src/lib/feature-flags.ts` | Server-side `isFeatureEnabled(flag, userId)`. 30s in-memory cache, env-or-noop. |
| `apps/web/lib/feature-flags.ts` | Client `useFeatureFlag(key)` hook. Reads PostHog browser SDK. |
| `apps/admin/app/experiments/page.tsx` | Read-only viewer for current flags + variant split + rollout %. |
| `apps/web/components/HomeHeroCta.tsx` | First wired experiment (`home-hero-cta-text`). |

Creation, edit, and rollout updates happen in the
[PostHog dashboard](https://app.posthog.com/feature_flags). The admin
viewer is intentionally read-only.

## Naming convention

- **Flag keys**: `kebab-case`, scoped by surface area then feature.
  - Good: `home-hero-cta-text`, `checkout-upsell-banner`, `darshan-autoplay`.
  - Bad: `homeHeroCTA`, `cta_test_v2`, `Test 1`.
- **Variants**:
  - `control` — current production behaviour. Always include.
  - Other variants: short, descriptive, `kebab-case` (e.g. `watch-darshan`).

## Adding a new experiment

1. Create the flag in PostHog with at least two variants (`control` + one
   alternative). Set rollout to 100% across the variants.
2. Read the flag in code:
   - **Web client** (preferred for visual A/B):
     ```ts
     const variant = useFeatureFlag<string>('my-flag', { defaultValue: 'control' });
     ```
   - **API server** (gating a backend behaviour):
     ```ts
     if (await isFeatureEnabled('my-flag', userId)) { /* ... */ }
     ```
3. Render every branch using the variant key. Default to `control` when
   the flag is missing — never blank.
4. Verify the wiring in the PostHog Live Events tab — variant should
   show under `$feature/<flag>`.
5. Add the experiment to the admin viewer description / runbook.

## First wired experiment: `home-hero-cta-text`

| Variant | CTA label | Destination |
| --- | --- | --- |
| `control` | Explore Temples | `/temples` |
| `watch-darshan` | Watch Live Darshan | `/darshan` |

Goal: lift `temple_viewed` OR `darshan_started` per session by 10%.
Guardrail: bounce-rate from `/`.

## Guardrail metrics

Every test must declare:

1. **Primary metric** — what success is. Single, pre-registered.
2. **Guardrails** — metrics that must NOT regress (e.g., bounce rate,
   payment success rate, p95 latency).
3. **Minimum detectable effect** — the smallest lift you'd act on (we
   default to 10% relative).

If a guardrail moves in the wrong direction with > 95% confidence, ship
`control` even if the primary metric won.

## Statistical significance

- Threshold: **95% confidence** (p < 0.05).
- Minimum sample: 1,000 users per variant OR 100 conversion events
  (whichever comes first).
- Minimum runtime: **7 days** to cover weekly seasonality. Do not call
  results before a full week even if significant earlier — early stops
  inflate false-positive rate.
- Use PostHog's built-in significance calculation; don't eyeball.

## Env vars

| Var | Where | Behaviour when absent |
| --- | --- | --- |
| `NEXT_PUBLIC_POSTHOG_KEY` | web/api | All flags resolve to `defaultValue` / `false`. App still works. |
| `NEXT_PUBLIC_POSTHOG_HOST` | web/api | Falls back to `https://us.i.posthog.com`. |
| `POSTHOG_API_KEY` | admin (personal API key) | `/experiments` shows missing-config state. |
| `POSTHOG_PROJECT_ID` | admin | `/experiments` shows missing-config state. |

## Cleanup

Once a winner ships, **remove the flag from code within 1 sprint**.
Lingering flags become tech debt. The admin viewer surfaces flags with
100% rollout to one variant — those are usually safe to delete.
