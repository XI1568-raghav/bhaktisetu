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
 // RESP-01 (third pass, 2026-08-28). py-8 was 32px of the shortfall, and
 // reclaiming it below sm is what actually moved the button. items-start is NOT
 // what fixed it — at 360x800 and 375x667 the wrapper is already taller than
 // `100dvh - --consent-h`, so it is sized by its content and align-items has no
 // free space to distribute; flipping it alone produced byte-identical geometry
 // at both sizes. It is kept below sm because it is free and it stops a future
 // taller banner from raising the centring offset and pushing the card DOWN,
 // toward the banner.
 //
 // RESP-01 (fourth pass, 2026-09-01) — CORRECTION. The third pass's own table
 // claimed 360x800 was fixed ("29 of 44px visible, tap lands on Sign In"). It
 // is not, and neither is 375x812. Re-measured in headless Chromium against a
 // FRESH `@tailwindcss/cli` build of app/globals.css (the .next bundle those
 // numbers came from is from 2026-08-16 and predates `mb-1.5`, `gap-1.5`,
 // `mt-2.5` and `py-2.5` — it silently dropped ~100px of real card height), with
 // the markup dumped out of render() for this layout, login/page.tsx and
 // CookieBanner.tsx, inside app/layout.tsx's body + the fixed h-16 header +
 // SiteChrome's consumer `main.pt-16`. Card measures 597px, not the 489px the
 // third pass recorded. Sign In sits at y 524-568 at every width below sm.
 //
 //   viewport   before this pass          after (pt-0 below sm + banner 262->227)
 //   390x844    44/44, clears by 14px     44/44, clears by 65px
 //   375x812    27/44, 17px clipped       44/44, clears by 33px
 //   360x800    15/44, hit = the BANNER   44/44, clears by 21px
 //   375x667    0/44,  hit = the BANNER   0/44 — see below, NOT fixable here
 //   412x915    44/44, clears by 104px    44/44, clears by 152px
 //   768x1024   44/44, clears by 110px    unchanged; sm: restores py-8 and
 //              items-center exactly, so nothing at or above 640px moves.
 //
 // 21px of slack at 360x800 is the number to watch: it is a little more than one
 // wrapped line of the notice (16.5px at leading-snug), so a longer disclosure,
 // a wider glyph set or a fifth wrapped line puts that size back under the
 // banner. Re-measure this table before changing the notice copy.
 //
 // The prod measurement that makes this a P0 rather than a paper finding
 // (darshya.online, 2026-09-01, first visit, consent cleared): at 390x844 the
 // banner is 278px with its top edge at y=566, the card is 652px starting at
 // y=96, Sign In is y 596-640 with **0 pixels visible**, and
 // elementFromPoint(195, 618) returns the banner's <h2>. NONE of the three
 // passes above are deployed — only the very first `--consent-h` reservation is.
 //
 // 375x667 (iPhone SE) cannot be fixed from here or from CookieBanner.tsx, and
 // the arithmetic says why: 64 (fixed header) + 488 (card chrome above the
 // button) + 44 (the button) = 596px must fit above the banner's top edge, and
 // at 667px tall that leaves the notice 71px. The notice needs 148px for its
 // own copy before a single button. It is an owner/compliance call — a layered
 // notice on short viewports — not a layout one. The page does scroll and the
 // button hit-tests correctly once scrolled, at every size measured.
 //
 // pt-0 below sm is safe because the card is top-aligned directly under an
 // opaque 64px fixed header, so the 16px gap it removes was dead space between
 // two adjacent surfaces, not visual rhythm.
 <div
 className="relative flex items-start justify-center overflow-hidden pt-0 pb-4 sm:items-center sm:pt-8 sm:pb-8"
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
