import type { Metadata } from 'next';
import { TITLE_TEMPLATE } from '../../lib/seo/title-template';

// Generic auth-segment defaults. Per-route canonical lives in each
// route's own layout.tsx (login/signup/verify/callback) — hardcoding
// /auth/login here would mistag signup, verify, callback as login.
export const metadata: Metadata = {
 // SEO-03: this `template` used to be a second hard-coded copy of the root
 // layout's. It is the shared constant now, so /auth can never brand
 // differently from the other ~1,780 pages after a rename or a separator change.
 title: { default: 'Sign In', template: TITLE_TEMPLATE },
 description: 'Sign in to Darshya with your phone number. Access live darshan, book pujas, and manage your spiritual journey.',
 openGraph: {
   title: 'Darshya — Sign In',
   description: 'Sign in to Darshya with your phone number. Access live darshan, book pujas, and manage your spiritual journey.',
   type: 'website',
   images: ['/og/default.png'],
 },
 twitter: {
   card: 'summary_large_image',
   title: 'Darshya — Sign In',
   description: 'Sign in to Darshya. Access live darshan, book pujas, and manage your spiritual journey.',
   images: ['/og/default.png'],
 },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
 return (
 // RESP-01: this centres the sign-in card inside a full-viewport box. While
 // the cookie banner is open it covers the bottom 41% of a 390x844 screen, so
 // "centred in the viewport" put the Sign In button underneath it — a hit test
 // on the button's own centre returned "Reject all". Centring inside the
 // VISIBLE area instead means the form is reachable on first paint, with no
 // scrolling and no dismissing the banner first. --consent-h is 0px whenever
 // the banner is closed, so this is a no-op for returning visitors.
 //
 // RESP-01 (third pass, 2026-08-28). The reservation above fixed 390x844 and
 // left two common sizes still broken. Re-measured in Chromium against the
 // repo's own compiled CSS with the REAL rendered markup of login/page.tsx and
 // CookieBanner.tsx (see app/auth/__tests__/resp01-auth-layout-density.test.tsx
 // for the full table and the rig's limits):
 //
 //   360x800  Sign In had 13 of its 44px on screen and a tap at its centre
 //            landed on the BANNER. Now 29px and the tap lands on the button.
 //   390x844  cleared the banner by 12px. Now 28px — the slack that matters,
 //            because the notice's wrap point moves with the real webfont.
 //   412x915  card top y=113 -> y=80.
 //   768x1024, 1280x800  unchanged; sm: restores both old values exactly.
 //
 // py-8 was 32px of the shortfall, and reclaiming it below sm is what actually
 // moved the button. items-start is NOT what fixed it — at 360x800 and 375x667
 // the wrapper is already taller than `100dvh - --consent-h`, so it is sized by
 // its content and align-items has no free space to distribute; flipping it
 // alone produced byte-identical geometry at both sizes. It is kept below sm
 // because it is free and it stops a future taller banner from raising the
 // centring offset and pushing the card DOWN, toward the banner.
 //
 // 375x667 (iPhone SE) still has Sign In below the fold at first paint and no
 // padding change here can alter that: 667 - 64 (fixed header) - 262 (banner)
 // = 341px of usable band against a 574px card. The page scrolls, and the
 // button hit-tests correctly once scrolled, at every size measured.
 <div
 className="relative flex items-start justify-center overflow-hidden py-4 sm:items-center sm:py-8"
 style={{ minHeight: 'calc(100dvh - var(--consent-h, 0px))' }}
 >
 {/* Background gradient — warm saffron tones */}
 <div className="absolute inset-0 bg-gradient-to-br from-saffron-700 via-saffron-600 to-temple-gold" />

 {/* Decorative mandala pattern */}
 <div className="absolute inset-0 bg-[url('/images/pattern-mandala.svg')] opacity-5 bg-center bg-cover" />

 {/* Content */}
 <div className="relative z-10 w-full max-w-md mx-4">
 {children}
 </div>

 {/* Bottom attribution */}
 <div className="absolute bottom-4 left-0 right-0 text-center">
 <p className="text-saffron-200/60 text-xs">
 &copy; {new Date().getFullYear()} Darshya. All rights reserved.
 </p>
 </div>
 </div>
 );
}
