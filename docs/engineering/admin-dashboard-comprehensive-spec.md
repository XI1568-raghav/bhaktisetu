# Admin Dashboard Comprehensive Spec — /admin Family

> Unified founder-facing admin surface. Consolidates 20+ admin sub-screens into coherent UX.

## Existing /admin/* surface (current state)

- /admin (overview metrics)
- /admin/agents (28 agent fleet)
- /admin/consultations (consultation lifecycle)
- /admin/metrics (real-numbers + investor + funnel + dashboard)
- /admin/leads (lead status PATCH)
- /admin/roadmap (4-panel timeline)
- /admin/dsar/pending (DSAR queue — per R-Q2-L-003)
- /admin/escalations (per R-Q2-CS-004)
- /admin/nps (per R-Q2-CS-001 + R-Q3-CS-004)
- /admin/cohort-retention (per R-Q2-CS-002)

## New /admin/* additions (per recent specs)

- /admin/customer-success (per R-Q2-E-011 monitoring spec)
- /admin/ab-tests (per R-Q2-E-013 + new dashboard)
- /admin/webhooks (per R-Q2-E-010 webhook handler)
- /admin/accounts (per R-Q4-SA-001 enterprise mgmt)
- /admin/observability (per R-Q3-E-013 SLO)
- /admin/spend (per R-Q3-F-004)
- /admin/pandits (per R-Q1-S-001 pipeline)
- /admin/temples (per R-Q3-S-009 temple onboarding)
- /admin/investor-crm (per R-Q3-SA-003)
- /admin/influencer-crm (per R-Q4-M-009)

## Unified left-nav structure

```
┌─────────────────────────────────┐
│ BHAKTISETU ADMIN              👤│
├─────────────────────────────────┤
│ 📊 DASHBOARDS                  │
│   🏠 Overview                  │
│   📈 Customer Success           │
│   👀 Observability              │
│   🧪 A/B Tests                  │
│                                 │
│ 👥 PEOPLE                       │
│   🙏 Pandits                    │
│   ✨ Temples                    │
│   🎓 Gurus                      │
│   💼 Enterprise Accounts        │
│                                 │
│ 💰 OPERATIONS                   │
│   📦 Bookings                   │
│   🛒 Subscriptions              │
│   🔄 Webhooks                   │
│   💵 Spend                      │
│                                 │
│ 🛡️ COMPLIANCE                   │
│   📋 DSAR Queue                 │
│   🚨 Escalations                │
│   📜 Legal Audits               │
│                                 │
│ 📣 GROWTH                       │
│   💼 Investor CRM               │
│   📢 Influencer CRM             │
│   📊 Funnel Analytics           │
│   ⭐ NPS Insights                │
│                                 │
│ 🤖 SYSTEM                       │
│   🤖 Agent Fleet                │
│   🗺️ Roadmap                    │
│   📝 Cohort Retention           │
└─────────────────────────────────┘
```

## Per-page card pattern (consistent UX)

```
┌─────────────────────────────────────────────┐
│ Page Title                       Last: 2min ago│
├─────────────────────────────────────────────┤
│ ┌──────────┬──────────┬──────────┬──────┐ │
│ │ KPI 1    │ KPI 2    │ KPI 3    │ KPI 4│ │
│ │ Value    │ Value    │ Value    │ Value│ │
│ │ Δ trend  │ Δ trend  │ Δ trend  │ Δ tr.│ │
│ └──────────┴──────────┴──────────┴──────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐│
│ │ Primary Data Panel — full width         ││
│ │ [Detailed table OR chart OR cards]      ││
│ └─────────────────────────────────────────┘│
│                                             │
│ ┌─────────────────┬───────────────────────┐│
│ │ Side Panel 1    │ Side Panel 2          ││
│ │ Secondary info  │ Tertiary info         ││
│ └─────────────────┴───────────────────────┘│
└─────────────────────────────────────────────┘
```

## Per-page implementation pattern

```typescript
// apps/web/app/admin/{page}/page.tsx
import { Suspense } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { KpiCards } from '@/components/admin/KpiCards'

export const runtime = 'edge'

export default async function AdminPage() {
  // SSR initial load
  const data = await fetchAdminData()
  
  return (
    <AdminLayout>
      <h1>Page Title</h1>
      
      <Suspense fallback={<LoadingCards />}>
        <KpiCards data={data.kpis} />
      </Suspense>
      
      <Suspense fallback={<LoadingPanel />}>
        <PrimaryDataPanel data={data.primary} />
      </Suspense>
      
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <Suspense fallback={<LoadingPanel />}>
          <SidePanel1 data={data.secondary} />
        </Suspense>
        <Suspense fallback={<LoadingPanel />}>
          <SidePanel2 data={data.tertiary} />
        </Suspense>
      </div>
    </AdminLayout>
  )
}
```

## Auth + permissions

```typescript
// apps/web/app/admin/_layout.tsx
import { requireRole } from '@/lib/auth'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole('admin') // redirect to /auth/login if not admin
  return <>{children}</>
}
```

## API endpoint patterns

```typescript
// apps/api/src/routes/admin/index.ts
fastify.register(adminBookingsRoutes, { prefix: '/admin/bookings' })
fastify.register(adminPanditsRoutes, { prefix: '/admin/pandits' })
fastify.register(adminTemplesRoutes, { prefix: '/admin/temples' })
fastify.register(adminAgentsRoutes, { prefix: '/admin/agents' })
fastify.register(adminEnterpriseAccountsRoutes, { prefix: '/admin/accounts' })
fastify.register(adminInvestorCrmRoutes, { prefix: '/admin/investor-crm' })
fastify.register(adminInfluencerCrmRoutes, { prefix: '/admin/influencer-crm' })
// ... 13 more route groups
```

## Search + filtering pattern

Every admin list page:
- Search input (debounced 300ms)
- Status filter dropdown
- Date range picker
- Pagination
- CSV export
- Bulk action toolbar (when row-select enabled)

## Mobile responsiveness

- Admin pages designed primarily desktop (founder/CS-ops main usage)
- Mobile shows: top 4 KPI cards + alerts only
- Detailed panels collapsed on mobile
- Quick-action buttons (escalate, cancel, etc.) always visible

## Permissions matrix

| Role | Pages |
|---|---|
| Founder | All admin pages |
| CS Lead Contractor | Customer-facing pages (bookings, escalations, DSAR, NPS) |
| Pandit Liaison | Pandit page only |
| Temple Coordinator | Temples + Pandits pages |
| Engineer | Agent + System + Observability + Webhooks pages |
| Finance | Spend + Bookings + Subscriptions pages |

## Engineering timeline

- Week 1-2: Unified /admin/_layout + side-nav structure
- Week 3-4: KPI card components + per-page templates
- Week 5-6: Migrate existing /admin pages to new structure
- Week 7-8: Implement 10 new admin pages
- Week 9: Mobile responsive audit
- Week 10: Permissions matrix implementation
- Week 11: Full QA + accessibility audit
- Week 12: Production deploy

## Future evolution

- Q1 2027: Real-time data via WebSocket for critical metrics
- Q2 2027: Custom dashboard builder for power users
- Q3 2027: Mobile-first redesign (founder on-the-go)
- Q4 2027: AI-powered admin assistant (natural language queries)

## Founder ROI

- Daily 5-min admin scan replaces 30-min spreadsheet review
- Cohesive admin UX scales to multi-person team
- Per-admin-page permissions reduces accidental data modifications
- Audit log for all admin actions (compliance ready)

## Cost

- Engineering: 12 weeks part-time
- Hosting: Within existing Render plan
- Total cost to ship: ₹0 incremental ops cost
