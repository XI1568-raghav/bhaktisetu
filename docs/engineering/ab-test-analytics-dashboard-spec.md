# A/B Test Analytics Dashboard — Implementation Spec

> /admin/ab-tests for founder + product team to monitor active experiments. Foundation for data-driven product decisions.

## Goal

Single-pane dashboard for all active A/B tests (PostHog feature flags). Shows variant performance, statistical significance, winning variant recommendations.

## Active A/B tests (current — per R-Q1-E-009)

1. `hero_copy_v2` — Hero headline variant (control vs new)
2. `cta_color_test` — Saffron vs amber primary CTA
3. `nri_lane_above_fold` — NRI USD pricing visibility for geo=US

## Future A/B tests (Q3+)

4. `referral_two_sided` — Single-side ₹100 vs two-side ₹100 (per R-Q1-P-006)
5. `pandit_filter_ux` — Specialization-first vs City-first filter
6. `pricing_anchor` — High-tier-first vs Low-tier-first display
7. `urgency_messaging` — Festival countdown vs evergreen
8. `ai_pandit_trial_length` — 3 questions/day vs 5 questions/day free tier
9. `mobile_checkout_flow` — Single-page vs multi-step
10. `live_darshan_autoplay` — Auto-play vs click-to-play

## Wireframe

```
┌────────────────────────────────────────────────────────────┐
│ Bhaktisetu A/B Tests Dashboard            Last: 5 min ago │
└────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Active Experiments — 3 Running                            │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ 🟢 hero_copy_v2 — Day 23 of 28                            │
│ ─────────────────────────────────────────────             │
│ Variant A (control):     45.2% sample | 4.3% conv → CTA  │
│ Variant B (new):         54.8% sample | 5.7% conv → CTA  │
│                                                            │
│ Uplift: +32.5% relative                                   │
│ Statistical significance: 97% confidence (p < 0.03)       │
│ Recommendation: WINNER = Variant B (high confidence)     │
│ Days to 95% confidence: 0 (already exceeded)             │
│                                                            │
│ [Roll out Variant B 100%] [Continue testing] [Pause]     │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ 🟡 cta_color_test — Day 12 of 28                          │
│ ─────────────────────────────────────────────             │
│ Variant A (saffron-600): 50.1% sample | 4.5% conv → CTA  │
│ Variant B (amber-600):   49.9% sample | 4.3% conv → CTA  │
│                                                            │
│ Uplift: -4.4% relative                                    │
│ Statistical significance: 78% confidence (p < 0.22)       │
│ Recommendation: INCONCLUSIVE (continue testing)          │
│ Days to 95% confidence: ~16 more days                    │
│                                                            │
│ [Continue testing] [Pause]                                │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ 🟢 nri_lane_above_fold — Day 18 of 28                     │
│ ─────────────────────────────────────────────             │
│ Variant A (hidden for US): 23 signups from US (control) │
│ Variant B (visible USD):   41 signups from US (78% lift) │
│                                                            │
│ Uplift: +78.3% relative                                   │
│ Statistical significance: 99% confidence (p < 0.01)       │
│ Recommendation: WINNER = Variant B (very high confidence)│
│ Days to 95% confidence: 0 (exceeded)                     │
│                                                            │
│ [Roll out Variant B 100%] [Continue testing]              │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Past Experiments — 8 Completed                            │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Q1 W04 — checkout_simplification → +15% conv  ✓   │  │
│ │ Q1 W08 — pandit_card_layout → -2% conv ✗ rolled back│
│ │ Q1 W12 — search_autocomplete → +28% engagement ✓   │  │
│ │ ... (5 more)                                        │  │
│ └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Suggested Next Experiments — Queue                        │
│ ┌────────────────────────────────────────────────────┐  │
│ │ pricing_anchor — High-first vs Low-first display    │  │
│ │ urgency_messaging — Festival countdown vs evergreen │  │
│ │ ai_pandit_trial — 3/day vs 5/day free questions     │  │
│ │ mobile_checkout — Single-page vs multi-step         │  │
│ │ live_darshan_autoplay — On vs Off                  │  │
│ └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## Implementation

### Backend endpoint

```typescript
// apps/api/src/routes/admin/ab-tests.ts
import { PostHog } from 'posthog-node'
const client = new PostHog(process.env.POSTHOG_PROJECT_KEY!, {
  host: process.env.POSTHOG_HOST
})

fastify.get('/admin/ab-tests', {
  preHandler: [requireAdmin]
}, async (req, reply) => {
  // Fetch all active feature flags
  const flags = await client.getActiveFeatureFlags()
  
  const results = await Promise.all(flags.map(async (flag) => {
    // Get conversion rate per variant
    const variantData = await getConversionMetrics(flag.key)
    
    return {
      flagKey: flag.key,
      flagName: flag.name,
      daysRunning: getDaysRunning(flag.created_at),
      totalDays: flag.test_duration_days || 28,
      variants: variantData.map(v => ({
        variant: v.name,
        samplePct: v.sample_pct,
        conversionRate: v.conversion_rate,
        n: v.sample_size
      })),
      upliftPct: calculateUplift(variantData),
      statisticalSignificance: calculateSignificance(variantData),
      recommendation: getRecommendation(variantData),
      daysToSignificance: getDaysToSignificance(variantData)
    }
  }))
  
  return reply.send({ activeTests: results, queuedTests: getQueuedTests() })
})

// Helper: chi-square test for significance
function calculateSignificance(variantData) {
  // Standard chi-square statistical test
  // Returns p-value and confidence level
}
```

### Frontend implementation

```typescript
// apps/web/app/admin/ab-tests/page.tsx
import { useState, useEffect } from 'react'

export default async function ABTestsPage() {
  const res = await fetch('/api/v1/admin/ab-tests', { credentials: 'include' })
  const data = await res.json()
  
  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">A/B Tests Dashboard</h1>
      
      <section>
        <h2 className="text-2xl font-semibold mb-4">Active Experiments — {data.activeTests.length}</h2>
        {data.activeTests.map(test => (
          <TestCard key={test.flagKey} test={test} />
        ))}
      </section>
      
      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Suggested Next Experiments</h2>
        <ul>
          {data.queuedTests.map(test => <li key={test.id}>{test.name}</li>)}
        </ul>
      </section>
    </main>
  )
}

function TestCard({ test }) {
  const statusColor = test.statisticalSignificance > 95 ? 'green' : test.statisticalSignificance > 80 ? 'yellow' : 'gray'
  
  return (
    <div className={`bg-white p-6 rounded-lg shadow border-l-4 border-${statusColor}-500`}>
      <h3 className="text-lg font-semibold">{test.flagName}</h3>
      <p className="text-sm text-gray-500 mt-1">Day {test.daysRunning} of {test.totalDays}</p>
      
      <table className="mt-4 w-full">
        <thead>
          <tr className="text-sm text-gray-500">
            <th align="left">Variant</th>
            <th align="left">Sample</th>
            <th align="left">Conv Rate</th>
          </tr>
        </thead>
        <tbody>
          {test.variants.map(v => (
            <tr key={v.variant}>
              <td className="py-1">{v.variant}</td>
              <td>{v.samplePct}%</td>
              <td>{v.conversionRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="mt-4">
        <p>Uplift: <strong>{test.upliftPct > 0 ? '+' : ''}{test.upliftPct}%</strong></p>
        <p>Significance: {test.statisticalSignificance}% confidence</p>
        <p className="font-semibold mt-2">
          Recommendation: {test.recommendation}
        </p>
        {test.daysToSignificance > 0 ? (
          <p className="text-sm text-gray-500">{test.daysToSignificance} more days needed</p>
        ) : (
          <p className="text-sm text-green-700">Statistical threshold met</p>
        )}
      </div>
      
      <div className="mt-4 flex gap-2">
        {test.recommendation.includes('WINNER') && (
          <button className="px-4 py-2 bg-green-600 text-white rounded">Roll out Winner</button>
        )}
        <button className="px-4 py-2 bg-gray-200 rounded">Continue testing</button>
        <button className="px-4 py-2 bg-red-100 text-red-700 rounded">Pause</button>
      </div>
    </div>
  )
}
```

## Statistical methodology

### Test duration
- Minimum 14 days (statistical noise minimum)
- Maximum 28 days (avoid context drift)
- Early stop if 99% confidence achieved before day 14

### Sample size
- 50/50 split per variant
- Minimum 1,000 conversions per variant for valid stats
- Larger N for less-frequent conversion events

### Significance threshold
- 95% confidence (p < 0.05) for production rollout
- 99% confidence (p < 0.01) for high-stakes changes (pricing, checkout)
- Inconclusive < 80% confidence (continue testing)

## Best practices

- **One test per page** — avoid confounding variables
- **Sequential testing** — don't run 5 tests simultaneously
- **Document hypothesis** — before launch, state expected uplift
- **Post-mortem winners** — understand why a variant won
- **Document losers** — failed tests teach as much as wins
- **Mobile vs desktop split** — analyze separately if traffic significantly differs

## Engineering tickets

- Week 1: PostHog Node SDK integration in API
- Week 2: Conversion metrics query implementation
- Week 3: Statistical significance calculation
- Week 4: Frontend dashboard + per-test cards
- Week 5: Pilot with 3 active tests
- Week 6: Full rollout
