# Referral Program v1 — Implementation Spec (Q-C-20260611T2307-R-Q2-M-011)

> Concrete TDD-first implementation per queue trailer. Engineer-ready spec.

## Scope

5 deliverables (matches queue spec):
1. Prisma migration
2. API routes (`/api/v1/referrals/me`, `/api/v1/referrals/claim`)
3. Checkout hook (auto-claim from cookie)
4. /refer page (SSR + client share buttons)
5. KPI flip in roadmap item

## Acceptance criteria (verified)

- [ ] Prisma migration applied, Referral table exists
- [ ] 6/6 API tests green
- [ ] 3/3 web tests green
- [ ] 1/1 middleware test green
- [ ] /refer page renders SSR, share buttons functional
- [ ] Duplicate claim returns idempotent 200 (no double credit via SQL verify)
- [ ] KPI metadata file updated w/ live SQL query
- [ ] Feature flag `NEXT_PUBLIC_FEATURE_REFERRAL=1` gates /refer page link in nav

## Step 1: Prisma Migration

```bash
# apps/api/prisma/schema.prisma — append:
```

```prisma
model Referral {
  id          String   @id @default(cuid())
  inviterId   String   @map("inviter_id")
  inviteeId   String   @unique @map("invitee_id")
  status      ReferralStatus @default(pending)
  bookingId   String?  @map("booking_id")
  creditInr   Int      @default(0) @map("credit_inr")
  createdAt   DateTime @default(now()) @map("created_at")
  claimedAt   DateTime? @map("claimed_at")
  inviter     User     @relation("ReferralInviter", fields: [inviterId], references: [id])
  invitee     User     @relation("ReferralInvitee", fields: [inviteeId], references: [id])
  booking     Booking? @relation(fields: [bookingId], references: [id])
  @@index([inviterId, status])
  @@map("referrals")
}

enum ReferralStatus { pending claimed }
```

Add to existing User model:
```prisma
referralCode String @unique @default(cuid()) @map("referral_code")
referralInviter Referral[] @relation("ReferralInviter")
referralInvitee Referral[] @relation("ReferralInvitee")
```

Migrate: `pnpm --filter @poojly/api exec prisma migrate dev --name add_referrals`

## Step 2: API Routes — TDD RED first

```typescript
// apps/api/src/routes/__tests__/referrals.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { build } from '../../testing/helpers'

describe('Referrals API', () => {
  it('GET /me unauth → 401', async () => {
    const app = await build()
    const res = await app.inject({ method: 'GET', url: '/api/v1/referrals/me' })
    expect(res.statusCode).toBe(401)
  })
  
  it('GET /me returns code + zero counts for new user', async () => {
    const { app, token } = await buildWithAuth()
    const res = await app.inject({
      method: 'GET', url: '/api/v1/referrals/me',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({
      code: expect.stringMatching(/^[a-z0-9]{20,}$/),
      pendingCount: 0, claimedCount: 0, creditsEarnedInr: 0
    })
  })
  
  it('POST /claim self-referral → 400', async () => {
    const { app, token, user } = await buildWithAuth()
    const res = await app.inject({
      method: 'POST', url: '/api/v1/referrals/claim',
      headers: { authorization: `Bearer ${token}` },
      payload: { refCode: user.referralCode, bookingId: 'bkg_xxx' }
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toContain('self')
  })
  
  it('POST /claim unpaid booking → 400', async () => {
    // ... test
  })
  
  it('POST /claim happy path → 200, wallet credited +10000 paise', async () => {
    // ... test
    expect(res.json()).toMatchObject({ ok: true, creditedInr: 100 })
    // verify wallet credit
    const wallet = await getInviterWallet()
    expect(wallet.balancePaise).toBeGreaterThanOrEqual(10000)
  })
  
  it('POST /claim duplicate invitee → 200 idempotent (no double credit)', async () => {
    // first claim
    await claim({ refCode, bookingId })
    // second attempt
    const res = await claim({ refCode, bookingId })
    expect(res.statusCode).toBe(200)
    // verify wallet NOT double-credited
    expect(walletBalance).toBe(10000) // not 20000
  })
})
```

Run RED first, confirm fail, then implement.

### API Routes Implementation

```typescript
// apps/api/src/routes/referrals.ts
import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

export const referralRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/referrals/me
  fastify.get('/referrals/me', {
    preHandler: [authenticateUser]
  }, async (req, reply) => {
    const userId = req.user.id
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
        referralInviter: {
          select: { status: true, creditInr: true }
        }
      }
    })
    
    if (!user) return reply.status(404).send({ error: 'User not found' })
    
    const pendingCount = user.referralInviter.filter(r => r.status === 'pending').length
    const claimedCount = user.referralInviter.filter(r => r.status === 'claimed').length
    const creditsEarnedInr = user.referralInviter
      .filter(r => r.status === 'claimed')
      .reduce((sum, r) => sum + r.creditInr, 0)
    
    return reply.send({
      code: user.referralCode,
      pendingCount,
      claimedCount,
      creditsEarnedInr
    })
  })
  
  // POST /api/v1/referrals/claim
  fastify.post('/referrals/claim', {
    preHandler: [authenticateUser]
  }, async (req, reply) => {
    const { refCode, bookingId } = z.object({
      refCode: z.string().min(1).max(64),
      bookingId: z.string().min(1)
    }).parse(req.body)
    
    const inviteeId = req.user.id
    
    // Find inviter by code
    const inviter = await prisma.user.findUnique({
      where: { referralCode: refCode },
      select: { id: true }
    })
    
    if (!inviter) {
      return reply.status(400).send({ error: 'invalid_referral_code' })
    }
    
    // Self-referral check
    if (inviter.id === inviteeId) {
      return reply.status(400).send({ error: 'self_referral_forbidden' })
    }
    
    // Booking check
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, userId: true, status: true }
    })
    
    if (!booking) {
      return reply.status(400).send({ error: 'booking_not_found' })
    }
    
    if (booking.userId !== inviteeId) {
      return reply.status(400).send({ error: 'booking_not_owned_by_invitee' })
    }
    
    if (booking.status !== 'paid') {
      return reply.status(400).send({ error: 'booking_not_paid' })
    }
    
    // Idempotent claim
    try {
      const referral = await prisma.referral.create({
        data: {
          inviterId: inviter.id,
          inviteeId,
          bookingId,
          status: 'claimed',
          creditInr: 100,
          claimedAt: new Date()
        }
      })
      
      // Credit inviter wallet via wallet service
      await walletService.credit({
        userId: inviter.id,
        amountPaise: 10000,
        reason: 'referral_credit',
        meta: { referralId: referral.id, inviteeId }
      })
      
      return reply.send({ ok: true, creditedInr: 100 })
    } catch (err: any) {
      // P2002 = unique constraint violation = duplicate invitee
      if (err.code === 'P2002') {
        // Return existing row (idempotent)
        const existing = await prisma.referral.findUnique({
          where: { inviteeId }
        })
        return reply.send({ ok: true, creditedInr: existing!.creditInr })
      }
      throw err
    }
  })
}

// Wire in apps/api/src/server.ts:
await fastify.register(referralRoutes, { prefix: '/api/v1' })
```

## Step 3: Checkout Hook

```typescript
// apps/api/src/services/booking-checkout.ts
// Find existing onPaymentSuccess hook (rg "booking.*paid|onPaymentSuccess")

async function onPaymentSuccess(req: FastifyRequest, booking: Booking) {
  // ... existing code (email confirmation, video proof scheduling, etc.)
  
  // NEW: Referral auto-claim from cookie
  const refCookie = req.cookies.ref
  if (refCookie) {
    try {
      await referralService.claim({
        refCode: refCookie,
        bookingId: booking.id,
        inviteeId: booking.userId
      })
    } catch (err) {
      // Claim failure must NOT fail booking
      console.warn('Referral auto-claim failed for booking', booking.id, err)
      // Sentry capture but don't throw
      Sentry.captureException(err)
    }
  }
}
```

## Step 4: /refer Page

```typescript
// apps/web/app/refer/page.tsx (SSR)
import { ShareButtons } from './_components/ShareButtons'

export const metadata = {
  title: 'Invite friends, earn ₹100 wallet credit — Bhaktisetu',
}

export default function ReferPage() {
  return (
    <main className="container mx-auto py-12 px-4 max-w-2xl">
      <h1 className="text-4xl font-bold text-saffron-700 mb-4">
        Invite friends, earn ₹100 wallet credit
      </h1>
      
      <section className="mt-12">
        <h2 className="text-2xl font-semibold mb-6">How it works</h2>
        <ol className="space-y-4">
          <li>Share your unique referral link with friends and family</li>
          <li>They sign up + complete their first paid puja</li>
          <li>You receive ₹100 credit to your Bhaktisetu wallet</li>
        </ol>
      </section>
      
      <section className="mt-12">
        <ShareButtons />
      </section>
      
      <section className="mt-12 bg-amber-50 p-6 rounded-lg">
        <h3 className="text-xl font-semibold">Top inviters this month</h3>
        <p className="text-amber-700 mt-2">Coming soon — leaderboard launching Q3</p>
      </section>
    </main>
  )
}
```

```typescript
// apps/web/app/refer/_components/ShareButtons.tsx
'use client'
import { useEffect, useState } from 'react'

export function ShareButtons() {
  const [code, setCode] = useState<string | null>(null)
  
  useEffect(() => {
    fetch('/api/v1/referrals/me')
      .then(r => r.json())
      .then(data => setCode(data.code))
  }, [])
  
  if (!code) return <p>Loading your referral code...</p>
  
  const url = `https://bhaktisetu.com?ref=${code}`
  const waText = encodeURIComponent(`Try Bhaktisetu for verified pandit pujas with 24hr video proof — first ₹100 puja credit when you sign up via my link: ${url}`)
  const waUrl = `https://wa.me/?text=${waText}`
  
  const copyLink = () => {
    navigator.clipboard.writeText(url)
    alert('Link copied!')
  }
  
  return (
    <div className="space-y-4">
      <p className="font-mono bg-gray-100 p-3 rounded">{url}</p>
      <div className="flex gap-3 flex-wrap">
        <a href={waUrl} className="px-5 py-2 bg-green-600 text-white rounded">Share on WhatsApp</a>
        <button onClick={copyLink} className="px-5 py-2 bg-saffron-600 text-white rounded">Copy Link</button>
      </div>
    </div>
  )
}
```

## Step 5: Middleware Cookie Setter

```typescript
// apps/web/middleware.ts
import { NextResponse, NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const refParam = req.nextUrl.searchParams.get('ref')
  
  if (refParam) {
    const cleanUrl = req.nextUrl.clone()
    cleanUrl.searchParams.delete('ref')
    
    const res = NextResponse.redirect(cleanUrl)
    res.cookies.set('ref', refParam, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: true,
      sameSite: 'lax',
      secure: true
    })
    return res
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next|static).*)']
}
```

## Step 6: KPI Flip

```bash
# Update docs/roadmap/items/Q2/marketing/011-referral-program-formal-launch-w-100-credit-per-co.md
# kpi.query:
#   SELECT count(*) FROM referrals WHERE status='claimed'
```

## Verify

```bash
# Migration
pnpm --filter @poojly/api exec prisma migrate status

# Tests
pnpm --filter @poojly/api exec vitest run referrals
pnpm --filter @poojly/web exec vitest run refer-page ref-cookie

# Manual curl
curl http://localhost:3001/api/v1/referrals/me -H "Cookie: session=..."

# SQL
psql $DATABASE_URL -c "SELECT status, count(*), sum(credit_inr) FROM referrals GROUP BY status;"

# Page renders
curl http://localhost:3000/refer | grep "Invite friends"
```

## Hard rules (per queue spec)

- No deploy — dev-server + tests only
- No Resend send on /refer page load — only on actual claim success
- Wallet credit MUST go through existing wallet service (no raw SQL)
- Self-referral blocked at API layer

## Closes

Q-C-20260611T2307-R-Q2-M-011

(Per queue trailer)

## Engineering ticket sequence

- Week 1: Prisma migration + apply
- Week 2: API routes + 6 tests (TDD RED → GREEN)
- Week 3: Checkout hook integration
- Week 4: /refer page + ShareButtons + middleware cookie
- Week 5: KPI metadata flip + feature flag toggle
- Week 6: Test pilot + 10-user trial
