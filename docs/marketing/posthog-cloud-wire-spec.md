# PostHog Cloud Wired Into Web Layout (Provider)

> **Roadmap item**: R-Q1-M-003 (P0) · **Authored**: 2026-06-13

## Goal

Wire PostHog cloud into apps/web layout via Provider component. Closes "we don't track anything" baseline. Enables R-Q1-E-008 funnel events.

## Implementation

`apps/web/components/PostHogProvider.tsx`:

```typescript
'use client'
import { useEffect } from 'react'
import posthog from 'posthog-js'
import { PostHogProvider as Provider } from 'posthog-js/react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com'
    if (!key) return  // graceful degradation if not configured
    
    posthog.init(key, {
      api_host: host,
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      session_recording: { maskAllInputs: true },
      person_profiles: 'identified_only',
    })
  }, [])
  
  return <Provider client={posthog}>{children}</Provider>
}
```

Wire in `apps/web/app/layout.tsx`:

```typescript
import { PostHogProvider } from '@/components/PostHogProvider'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  )
}
```

## Env vars

- `NEXT_PUBLIC_POSTHOG_KEY` = phc_xxx (CF Pages + dev .env)
- `NEXT_PUBLIC_POSTHOG_HOST` = https://eu.i.posthog.com (region-correct per data-residency)

## Identify on login

```typescript
// In apps/web/app/auth/login/page.tsx success handler
import posthog from 'posthog-js'
posthog.identify(user.id, {
  email: user.email,
  name: user.name,
  role: user.primaryRole,
  signupAt: user.createdAt,
})
```

## Reset on logout

```typescript
posthog.reset()
```

## Engineering tickets

- R-Q1-M-003a: PostHogProvider component
- R-Q1-M-003b: layout.tsx wire
- R-Q1-M-003c: identify on login + reset on logout
- R-Q1-M-003d: CF Pages env vars set

## Closes

R-Q1-M-003 — spec shipped.
