# /refer Page — Actual Code Implementation Spec

> Engineer-ready code for /refer page + ShareButtons + middleware cookie. Per R-Q2-M-011 queue trailer.

## File 1: Middleware (cookie capture)

`apps/web/middleware.ts` (new):

```typescript
import { NextResponse, NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const refParam = req.nextUrl.searchParams.get('ref')
  
  if (refParam && /^[a-z0-9]{20,40}$/.test(refParam)) {
    const cleanUrl = req.nextUrl.clone()
    cleanUrl.searchParams.delete('ref')
    
    const res = NextResponse.redirect(cleanUrl)
    res.cookies.set('ref', refParam, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/'
    })
    return res
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
```

## File 2: /refer page (SSR server component)

`apps/web/app/refer/page.tsx` (new):

```typescript
import { Metadata } from 'next'
import { ShareButtons } from './_components/ShareButtons'

export const runtime = 'edge'

export const metadata: Metadata = {
  title: 'Invite friends, earn ₹100 wallet credit — Bhaktisetu',
  description: 'Share Bhaktisetu with Hindu family + friends. When they complete their first paid puja, you earn ₹100 in your Bhaktisetu wallet.',
  openGraph: {
    title: 'Earn ₹100 — Bhaktisetu Referral Program',
    description: 'Invite friends + earn rewards for verified pandit pujas',
    images: ['/og/default.png']
  }
}

export default function ReferPage() {
  return (
    <main className="container mx-auto py-16 px-4 max-w-3xl">
      {/* Hero */}
      <header className="text-center mb-16">
        <h1 className="text-5xl font-bold text-saffron-700 mb-6 leading-tight">
          Invite friends,<br />earn ₹100 wallet credit
        </h1>
        <p className="text-lg text-gray-700 max-w-2xl mx-auto">
          Share Bhaktisetu with your Hindu family + friends. When they sign up and complete their first paid puja, you receive ₹100 credit in your Bhaktisetu wallet — instantly.
        </p>
      </header>
      
      {/* How it works (3 steps) */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">How it works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-saffron-100">
            <div className="w-12 h-12 bg-saffron-100 text-saffron-700 rounded-full flex items-center justify-center font-bold text-xl mb-4">
              1
            </div>
            <h3 className="font-semibold text-lg mb-2">Share your link</h3>
            <p className="text-gray-600">Copy your unique referral link and share via WhatsApp, email, or social media.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-saffron-100">
            <div className="w-12 h-12 bg-saffron-100 text-saffron-700 rounded-full flex items-center justify-center font-bold text-xl mb-4">
              2
            </div>
            <h3 className="font-semibold text-lg mb-2">Friend signs up + books</h3>
            <p className="text-gray-600">When they create their account via your link and complete their first paid puja booking.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-saffron-100">
            <div className="w-12 h-12 bg-saffron-100 text-saffron-700 rounded-full flex items-center justify-center font-bold text-xl mb-4">
              3
            </div>
            <h3 className="font-semibold text-lg mb-2">You earn ₹100</h3>
            <p className="text-gray-600">₹100 instantly credited to your Bhaktisetu wallet. Redeem on any puja booking.</p>
          </div>
        </div>
      </section>
      
      {/* Share buttons (client component) */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Share with friends</h2>
        <ShareButtons />
      </section>
      
      {/* Leaderboard stub */}
      <section className="bg-amber-50 p-6 rounded-lg text-center">
        <h3 className="text-xl font-semibold text-amber-800 mb-2">Top inviters this month</h3>
        <p className="text-amber-700">Coming soon — leaderboard launching Q3 2026</p>
      </section>
      
      {/* FAQ */}
      <section className="mt-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Frequently asked questions</h2>
        <div className="space-y-4">
          <details className="bg-white p-4 rounded-lg border">
            <summary className="font-semibold cursor-pointer">When do I receive the ₹100?</summary>
            <p className="mt-3 text-gray-700">Instantly. As soon as your friend completes their first paid puja booking, ₹100 is added to your Bhaktisetu wallet. No waiting period.</p>
          </details>
          <details className="bg-white p-4 rounded-lg border">
            <summary className="font-semibold cursor-pointer">Can I refer the same friend multiple times?</summary>
            <p className="mt-3 text-gray-700">No. Each friend can be referred only once — the wallet credit applies to their first paid booking only.</p>
          </details>
          <details className="bg-white p-4 rounded-lg border">
            <summary className="font-semibold cursor-pointer">Can I refer myself?</summary>
            <p className="mt-3 text-gray-700">No. Self-referrals are blocked at the API level to maintain program integrity.</p>
          </details>
          <details className="bg-white p-4 rounded-lg border">
            <summary className="font-semibold cursor-pointer">How long does my referral link last?</summary>
            <p className="mt-3 text-gray-700">Friends who click your link have a 30-day window to sign up and complete their first puja for you to receive credit.</p>
          </details>
        </div>
      </section>
    </main>
  )
}
```

## File 3: Share Buttons (client component)

`apps/web/app/refer/_components/ShareButtons.tsx` (new):

```typescript
'use client'

import { useEffect, useState } from 'react'

export function ShareButtons() {
  const [code, setCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetch('/api/v1/referrals/me', { credentials: 'include' })
      .then(r => {
        if (r.status === 401) {
          throw new Error('Sign in to get your referral code')
        }
        return r.json()
      })
      .then(data => setCode(data.code))
      .catch(err => console.error('Failed to fetch referral code:', err))
      .finally(() => setLoading(false))
  }, [])
  
  if (loading) {
    return <p className="text-center text-gray-500">Loading your referral code...</p>
  }
  
  if (!code) {
    return (
      <div className="text-center bg-yellow-50 p-6 rounded-lg">
        <p className="text-yellow-800 mb-4">Please sign in to access your referral code.</p>
        <a href="/auth/login" className="inline-block px-6 py-2 bg-saffron-600 text-white rounded hover:bg-saffron-700">
          Sign in
        </a>
      </div>
    )
  }
  
  const url = `https://bhaktisetu.com?ref=${code}`
  const waText = encodeURIComponent(`Try Bhaktisetu — verified pandit pujas with 24hr video proof for India + NRI families. Sign up via my link + get ₹100 first puja credit: ${url}`)
  const waUrl = `https://wa.me/?text=${waText}`
  
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-saffron-200 max-w-2xl mx-auto">
      {/* Your unique link */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Your unique referral link</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={url}
            readOnly
            className="flex-1 px-4 py-2 bg-gray-100 rounded font-mono text-sm border border-gray-300"
          />
          <button
            onClick={copyLink}
            className="px-6 py-2 bg-saffron-600 text-white rounded hover:bg-saffron-700 font-semibold whitespace-nowrap"
          >
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>
      
      {/* Share via WhatsApp */}
      <div className="space-y-3">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full px-6 py-3 bg-green-600 text-white rounded text-center font-semibold hover:bg-green-700"
        >
          📱 Share on WhatsApp
        </a>
        
        <a
          href={`mailto:?subject=Try%20Bhaktisetu%20-%20Verified%20Hindu%20Pandit%20Pujas&body=${waText}`}
          className="block w-full px-6 py-3 bg-blue-600 text-white rounded text-center font-semibold hover:bg-blue-700"
        >
          📧 Share via Email
        </a>
        
        <a
          href={`https://twitter.com/intent/tweet?text=${waText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full px-6 py-3 bg-sky-500 text-white rounded text-center font-semibold hover:bg-sky-600"
        >
          🐦 Share on Twitter
        </a>
      </div>
      
      <p className="mt-6 text-sm text-gray-500 text-center">
        Your code: <span className="font-mono font-bold text-saffron-700">{code}</span>
      </p>
    </div>
  )
}
```

## File 4: Feature flag check (nav link gating)

`apps/web/components/MainNav.tsx` (extension to existing nav):

```typescript
const REFERRAL_ENABLED = process.env.NEXT_PUBLIC_FEATURE_REFERRAL === '1'

{REFERRAL_ENABLED && (
  <Link href="/refer" className="px-3 py-2 text-saffron-700 hover:text-saffron-800">
    Refer & Earn
  </Link>
)}
```

CF Pages env var: `NEXT_PUBLIC_FEATURE_REFERRAL=1`

## File 5: Test cases

`apps/web/__tests__/refer-page.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import ReferPage from '@/app/refer/page'

describe('/refer page', () => {
  it('hero renders correctly', async () => {
    render(<ReferPage />)
    expect(screen.getByText(/Invite friends, earn ₹100 wallet credit/i)).toBeInTheDocument()
  })
  
  it('share buttons render after code fetch', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ code: 'TESTCODE123' })
    })
    
    render(<ReferPage />)
    
    await waitFor(() => {
      expect(screen.getByText(/Copy Link/i)).toBeInTheDocument()
      expect(screen.getByText(/Share on WhatsApp/i)).toBeInTheDocument()
    })
  })
  
  it('code fetched from /api/v1/referrals/me on mount', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => ({ code: 'TEST123' })
    })
    global.fetch = fetchSpy
    
    render(<ReferPage />)
    
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/v1/referrals/me', expect.anything())
    })
  })
})
```

`apps/web/__tests__/ref-cookie-middleware.test.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { middleware } from '@/middleware'

describe('Middleware: ?ref cookie capture', () => {
  it('?ref=ABC sets cookie + strips param', () => {
    const url = new URL('https://bhaktisetu.com/?ref=ABC123XYZ456789012345')
    const req = new NextRequest(url)
    
    const res = middleware(req)
    
    // Should redirect to clean URL
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).not.toContain('ref=')
    
    // Should set cookie
    expect(res.cookies.get('ref')?.value).toBe('ABC123XYZ456789012345')
  })
  
  it('continues if no ref param', () => {
    const url = new URL('https://bhaktisetu.com/pujas')
    const req = new NextRequest(url)
    const res = middleware(req)
    expect(res.status).not.toBe(307)
  })
})
```

## Engineering tasks

- Week 1: Middleware + cookie capture
- Week 2: /refer page SSR component
- Week 3: ShareButtons client component
- Week 4: Tests (web + middleware)
- Week 5: Feature flag toggle + pilot

## Verification

```bash
# Tests
pnpm --filter @poojly/web exec vitest run refer-page ref-cookie

# Page renders
curl https://darshya.online/refer | grep "Invite friends"

# Cookie capture
curl -I "https://darshya.online?ref=TESTCODE" | grep set-cookie
```

## CF Pages deploy

After implementation:
1. Add `NEXT_PUBLIC_FEATURE_REFERRAL=1` to CF Pages env
2. Trigger CF Pages rebuild
3. Verify nav link appears
4. End-to-end test: signup → click via referral link → book puja → wallet credit
