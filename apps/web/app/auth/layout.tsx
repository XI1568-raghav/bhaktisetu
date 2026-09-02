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
 // Its per-viewport table has been folded into the sixth pass's below rather
 // than left standing, because the two disagree: this pass recorded Sign In at
 // y 524-568 and 488px of card chrome above it, and the sixth pass measures
 // 508-552 and 444px on the same tree. Where they conflict, the sixth pass's
 // numbers are the ones re-derived from a fresh build today; treat the figures
 // in this paragraph as history, not as a baseline to compare against.
 //
 // The prod measurement that makes this a P0 rather than a paper finding
 // (darshya.online, re-confirmed 2026-09-02, first visit, consent cleared, real
 // deployed build): at 390x844 the banner is 277px with its top edge at y=567,
 // Sign In is y 593-637 with **0 pixels visible**, and elementFromPoint(195,
 // 615) returns the banner's <h2>. NONE of the passes above are deployed — only
 // the very first `--consent-h` reservation is, which is why prod still shows
 // the original symptom verbatim.
 //
 // pt-0 below sm is safe because the card is top-aligned directly under an
 // opaque 64px fixed header, so the 16px gap it removes was dead space between
 // two adjacent surfaces, not visual rhythm.
 // RESP-01 (sixth pass, 2026-09-02). `data-auth-shell` is the hook the consent
 // banner's height policy keys off — app/globals.css tightens --consent-max-h to
 // `clamp(164px, calc(100dvh - 576px), 45dvh)` while this element is in the
 // document and leaves every other route on the 45dvh default. It is on this
 // wrapper rather than on <body> because the auth segment is the thing whose
 // card sets the constant, and because a server component cannot write to
 // documentElement without shipping a client boundary to do it.
 //
 // THE FIFTH PASS'S `max-h-[45dvh]` DID NOT CLOSE THIS FINDING. Re-measured in
 // headless Chromium (playwright 1.59.1) against a fresh Tailwind build of
 // globals.css and the real rendered markup of this layout, login/page.tsx and
 // CookieBanner.tsx, inside app/layout.tsx's body with SiteChrome's 64px fixed
 // header and consumer `main.pt-16`. 11 viewports x {collapsed, preferences
 // expanded} = 22 cases. "clears" is banner top edge minus the Sign In button's
 // bottom edge; a case passes only when elementFromPoint at the button's own
 // centre returns the button.
 //
 //              45dvh (fifth pass)          scoped cap (this pass)
 //   viewport   collapsed    expanded       collapsed        expanded
 //   390x844    +65  pass    -96  FAIL      +65  pass        +16  pass
 //   375x812    +33  pass    -113 FAIL      +33  pass        +16  pass
 //   360x800    +21  pass    -120 FAIL      +21  pass        +16  pass
 //   412x915    +152 pass    -57  FAIL      +152 pass        +16  pass
 //   640x960    +46  pass    -160 FAIL      +46  pass        +18  pass
 //   768x1024   +110 pass    -54  FAIL      +110 pass        +15  pass
 //   834x1112   +154 pass    +31  pass      +154 pass        +31  pass
 //   1440x900   +25  pass    -146 FAIL      +25  pass        +14  pass
 //   375x667    -112 FAIL    -193 FAIL      -57  FAIL        -57  FAIL
 //   320x568    -209 FAIL    -247 FAIL      -155 FAIL        -155 FAIL
 //   1280x800   -74  FAIL    -282 FAIL      -49  FAIL        -49  FAIL
 //                 9 of 22 passing             16 of 22 passing
 //
 // Note 1280x800: a laptop failed even COLLAPSED under the flat cap, a size no
 // earlier pass had measured at all. Note also that the clearance is now a
 // near-CONSTANT ~15px rather than a number that drifts with the screen — that
 // is the point of subtracting the card's height instead of taking a fraction
 // of the viewport.
 //
 // WHAT IS STILL OPEN, AND WHY IT IS NOT A LAYOUT PROBLEM. 375x667 (iPhone SE),
 // 320x568 and 1280x800 cannot be closed from here. 64 (fixed header) + 444
 // (the card's chrome above the button) + 44 (the button) = 552px must sit above
 // the banner's top edge below sm, and 661px at sm and above. The banner's own
 // controls need 116px below sm before a word of the notice is shown (card py-2
 // 16 + the row's mt-2 8 + 44 + 4 + 44, because "Manage preferences" is
 // full-width on its own row), and roughly 48px more to leave the <h2> legible.
 // So a 667px screen can spare 107px where 164px is the honest minimum, and an
 // 800px laptop can spare 139px against the same floor. Shrinking past the floor
 // does not shrink the notice, it deletes it: a 96px cap was measured pushing
 // "Manage preferences" to y 628-672, off the bottom of a 667px display, with
 // the notice's scroll window at 0px.
 //
 // Closing those three needs the layered notice the ledger already flags — a
 // compact bar plus "more options" — which is a decision about what may be shown
 // BEFORE consent under DPDP/UK-GDPR, i.e. owner/compliance, not layout. All
 // three do scroll, and the button hit-tests correctly once scrolled.
 //
 // Two things hold this together and must not be loosened independently: the
 // 552px constant is guarded by the card spacing budget in
 // app/auth/login/__tests__/resp01-mobile-density.test.tsx (a taller card trips
 // it), and the cap's own shape is guarded in the same file.
 <div
 data-auth-shell
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
