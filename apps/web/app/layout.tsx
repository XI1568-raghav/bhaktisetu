import type { Metadata, Viewport } from "next";
import { TITLE_TEMPLATE } from "../lib/seo/title-template";
import localFont from "next/font/local";
import { t } from "../lib/t";
import { footerDonateLink } from "../lib/footer-donate-link";
import { blogFooterLinks } from "../lib/footer-blog-link";
import {
 Flame,
 Heart,
 Home,
 Music,
 Calendar,
 ShoppingBag,
 Video,
 Search,
 Menu,
 ChevronDown,
 Phone,
 Mail,
 MapPin,
 Facebook,
 Instagram,
 Youtube,
 Sparkles,
 MessageCircleQuestion,
 Moon,
 Leaf,
 Mountain,
} from "lucide-react";
import { AuthProvider } from "../lib/auth-context";
import { CartProvider } from "../components/CartContext";
import { QueryProvider } from "../components/QueryProvider";
import NavAuthButton from "../components/NavAuthButton";
import NavCartButton from "../components/NavCartButton";
import { GlobalSearch } from "../components/GlobalSearch";
import { MobileNavV2 } from "../components/MobileNavV2";
import { MobileBottomTabs } from "../components/MobileBottomTabs";
import { SiteChrome } from "../components/SiteChrome";
import CookieSettingsButton from "../components/CookieSettingsButton";
import { buttonClass } from "../components/ui/button-recipe";
import { CategoryNav } from "../components/CategoryNav";
import OnboardingTrigger from "../components/OnboardingTrigger";
import { ListYourBusinessDropdown } from "../components/ListYourBusinessDropdown";
import { Analytics } from "../components/Analytics";
import { CloudflareAnalytics } from "../components/CloudflareAnalytics";
import { ReferralCapture } from "../components/ReferralCapture";
import { HAS_REFERRAL_CREDIT } from "../lib/referral-flag";
import { ServiceWorkerRegister } from "../components/ServiceWorkerRegister";
import { ChannelAttribution } from "../components/ChannelAttribution";
import { Logo } from "../components/Logo";
import { DeferredClientWidgets } from "../components/DeferredClientWidgets";
import { SentryProvider } from "../components/SentryProvider";
import { SentryErrorBoundary } from "../components/SentryErrorBoundary";
import ConnectivityBar from "../components/ConnectivityBar";
import { TranslationCoverageNotice } from "../components/TranslationCoverageNotice";
import AdSenseScript from "../components/AdSenseScript";
import { GA4Script } from "../lib/ga4";
import { MetaPixelScript } from "../lib/meta-pixel";
import { PostHogScript } from "../lib/posthog";
import { SITE_OPEN_GRAPH, SITE_TWITTER } from "../lib/site-metadata";
import { organizationJsonLd, webSiteJsonLd } from "../lib/jsonld";
import Link from "next/link";
import "./globals.css";

/*
 * I-06 / I18N-06 (prod sweep 2026-08-12) — WEBFONT COVERAGE FOR THE FOUR INDIC
 * SCRIPTS THE FOOTER ADVERTISES ON EVERY PAGE.
 *
 * The measurement: 11 of 20 temple names painted in a script with no loaded
 * font, and Devanagari / Tamil / Telugu / Bengali all fell through to whatever
 * the operating system happened to ship — different metrics per device, and on
 * Windows frequently a last-resort face with no italic and no weights.
 *
 * Noto Sans Devanagari was ALREADY downloaded before this change and still
 * painted nothing, which is the part worth understanding before editing here.
 * The only stack that named it was globals.css's `--font-devanagari`, reachable
 * only through the `html[lang="hi"]` rule — and the root layout renders
 * `lang="en"` on the server for every route (see I-05: the correction is
 * client-side, in components/TranslationCoverageNotice). So on the ~1,780
 * English pages that carry Devanagari temple names that rule never matched.
 * Downloading a face is not the fix; being reachable from the stack a page
 * actually inherits is.
 *
 * HOW THE INDIC FACES REACH EVERY STACK WITHOUT TOUCHING globals.css.
 * next/font emits the `variable` as
 *     --x: '<hashed family>', '<metric fallback>', …fallback
 * with `fallback` entries inserted VERBATIM and unquoted
 * (next/dist/build/webpack/loaders/next-font-loader/postcss-next-font.js:110)
 * — so a `var(--other)` in `fallback` lands as a real var() reference. Hanging
 * the four Indic faces off --font-noto-sans and --font-reader-serif therefore
 * extends every stack that already names those two (--font-body,
 * --font-display, --font-sans, --font-serif, --font-devanagari) in ONE place,
 * with no second copy of a font stack to drift. Guarded by
 * __tests__/seo/indic-webfonts.test.ts, which resolves the stacks var() by
 * var() rather than trusting that an import implies a rendered glyph.
 *
 * WHY THE INDIC FACES ARE preload: false. next/font preloads by default, and a
 * face imported by the ROOT layout preloads on all ~1,785 routes. These four
 * are needed by a handful of them. A browser downloads a webfont only when a
 * glyph in the rendered text actually needs it, so opting out of preload makes
 * them free on every page that has no Indic text and unchanged on the pages
 * that do. Devanagari was preloading site-wide before this change; that is 4
 * woff2 preload hints per page for a face 99% of pages never painted, and is
 * the same waste PERF-03 recorded ("201.9 KB of font bytes, rendered in Arial
 * anyway").
 *
 * WEIGHTS: the three new families are declared as the full 100-900 range, i.e.
 * the variable font — one file covering 100-900 instead of four static cuts.
 *
 * Scope is deliberately the four scripts lib/i18n/locales.ts advertises
 * (hi + mr → Devanagari, ta → Tamil, te → Telugu, bn → Bengali). Gujarati,
 * Kannada, Malayalam and Gurmukhi are accepted by the DB enum but the web has
 * no destination for them (locales.ts collapses them to English), so loading
 * their faces would be bytes for a page that does not exist.
 */

/*
 * UNICODE-RANGE ON THE INDIC FACES (perf, 2026-10-07). next/font/local emits
 * @font-face with no unicode-range. Every body stack ends in the four Indic
 * faces as fallbacks, so ANY glyph the Latin Noto Sans lacks (the rupee sign
 * U+20B9, arrows, check marks) made the browser walk the whole chain and fetch
 * all four files (about 400 KB) on pages with no Indic text. Each face is now
 * limited to its own script block; the rupee sign stays on Devanagari, which is
 * the face that actually carries it, exactly as before. Crimson Pro (reader
 * serif only) no longer preloads on every route either; it loads when used.
 */

/*
 * SELF-HOSTED (2026-10-05, ci/cut-actions-minutes): these faces used to come from
 * next/font/google, which downloads from fonts.googleapis.com during `next build`.
 * That intermittently failed in CI with `TypeError: Cannot read properties of
 * null (reading '1')` after every test had passed, forcing ~8 min reruns against
 * the 2,000 min/mo Actions cap. The same woff2 files (SIL OFL 1.1, variable
 * fonts, same subsets as before) are vendored in app/fonts/ and loaded through
 * next/font/local, so the build needs no network and the emitted CSS variables,
 * families, weight ranges, display, preload and fallback chains are unchanged.
 */

/*
 * The Indic tail below is written out in full twice on purpose. next/font
 * options are read by a compile-time transform, not at runtime: every value
 * must be an explicitly written literal, and hoisting the array into a shared
 * `const` fails the build with "Font loader values must be explicitly written
 * literals". __tests__/seo/indic-webfonts.test.ts resolves both copies and
 * fails if either one stops reaching all four scripts, which is the guard that
 * a shared constant would otherwise have provided.
 */
const notoSans = localFont({
 src: "./fonts/NotoSans-latin-var.woff2",
 weight: "300 700",
 style: "normal",
 variable: "--font-noto-sans",
 display: "swap",
 adjustFontFallback: "Arial",
 fallback: [
  "var(--font-noto-devanagari)",
  "var(--font-noto-tamil)",
  "var(--font-noto-telugu)",
  "var(--font-noto-bengali)",
 ],
});

const notoSansDevanagari = localFont({
 src: "./fonts/NotoSansDevanagari-var.woff2",
 weight: "400 700",
 style: "normal",
 variable: "--font-noto-devanagari",
 display: "swap",
 preload: false,
 declarations: [{ prop: "unicode-range", value: "U+0900-097F, U+1CD0-1CFF, U+200C-200D, U+20B9, U+25CC, U+A830-A839, U+A8E0-A8FF" }],
});

const notoSansTamil = localFont({
 src: "./fonts/NotoSansTamil-var.woff2",
 weight: "100 900",
 style: "normal",
 variable: "--font-noto-tamil",
 display: "swap",
 preload: false,
 declarations: [{ prop: "unicode-range", value: "U+0B80-0BFF, U+1CDA" }],
});

const notoSansTelugu = localFont({
 src: "./fonts/NotoSansTelugu-var.woff2",
 weight: "100 900",
 style: "normal",
 variable: "--font-noto-telugu",
 display: "swap",
 preload: false,
 declarations: [{ prop: "unicode-range", value: "U+0C00-0C7F, U+1CDA" }],
});

const notoSansBengali = localFont({
 src: "./fonts/NotoSansBengali-var.woff2",
 weight: "100 900",
 style: "normal",
 variable: "--font-noto-bengali",
 display: "swap",
 preload: false,
 declarations: [{ prop: "unicode-range", value: "U+0980-09FF, U+1CD0-1CFF" }],
});

const crimsonPro = localFont({
 src: "./fonts/CrimsonPro-latin-var.woff2",
 weight: "400 700",
 style: "normal",
 variable: "--font-reader-serif",
 display: "swap",
 preload: false,
 adjustFontFallback: "Times New Roman",
 fallback: [
  "var(--font-noto-devanagari)",
  "var(--font-noto-tamil)",
  "var(--font-noto-telugu)",
  "var(--font-noto-bengali)",
 ],
});

export const metadata: Metadata = {
 // P0-6 (CEO audit 2026-07-01): metadataBase resolves relative OG image
 // paths (e.g. "/og/default.png" used by ~15 child pages) against this
 // origin. Without it Next.js falls back to http://localhost:3000 \u2014
 // breaking every WhatsApp/FB/X/LinkedIn share preview. Hard-code the
 // canonical apex (NEXT_PUBLIC_SITE_URL env is not reliably set in the
 // build env; this matches the absolute URLs already used in alternates).
 metadataBase: new URL("https://darshya.online"),
 title: {
 default: "Darshya \u2014 India\u2019s Devotional Super App",
 // SEO-03: one definition, in lib/seo/title-template.ts. Do not retype the
 // literal here \u2014 app/auth/layout.tsx used to carry a second copy, and two
 // copies of a format string brand two parts of the site differently the
 // moment one is edited, with nothing failing.
 template: TITLE_TEMPLATE,
 },
 description:
 "Experience live darshan, book pujas, explore panchang, listen to bhajans, and shop for sacred items. Darshya brings the divine into daily life.",
 keywords: [
 "darshan",
 "puja",
 "temple",
 "bhajan",
 "aarti",
 "panchang",
 "hindu",
 "devotional",
 "spiritual",
 "mantra",
 "chalisa",
 "darshya",
 ],
 authors: [{ name: "Darshya" }],
 icons: {
 icon: "/favicon.svg",
 apple: "/favicon.svg",
 },
 manifest: "/manifest.json",
 alternates: {
   // NO canonical here. Next.js inherits a parent's `alternates.canonical`
   // into every child route that does not declare its own, so a canonical on
   // the ROOT layout tells Google that ~349 distinct indexable pages are
   // duplicates of the homepage (prod sweep 2026-08-12, SEO-01). Each route
   // supplies its own canonical; a missing one is safe because Google
   // self-canonicalises by default. Guarded by
   // __tests__/seo/canonical-and-next-assets.test.ts.
   languages: {
     "en-IN": "https://darshya.online",
     "en-US": "https://darshya.online",
     "x-default": "https://darshya.online",
   },
 },
 // Site-level card DEFAULTS only \u2014 no page content. Next.js inherits a
 // parent's whole `openGraph`/`twitter` object into any route that does not
 // declare its own, so a homepage title/description/url here becomes the card
 // for every other page (prod sweep 2026-08-12, SEO-04: 1,652 pages emitted
 // the homepage Twitter card, 158 sitemap URLs the homepage OG card).
 // See lib/site-metadata.ts for the resolver mechanics that make the empty
 // content keys load-bearing. Guarded by __tests__/seo/social-cards.test.ts.
 openGraph: SITE_OPEN_GRAPH,
 twitter: SITE_TWITTER,
 robots: {
 index: true,
 follow: true,
 },
 // Search Console verification — pasted on first verify in GSC / Bing.
 // Leaving values empty is safe; Next.js skips empty meta tags.
 verification: {
 google: process.env.NEXT_PUBLIC_GSC_VERIFICATION || "",
 other: {
 "msvalidate.01": process.env.NEXT_PUBLIC_BING_VERIFICATION || "",
 "yandex-verification": process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || "",
 },
 },
};

export const viewport: Viewport = {
 themeColor: "#9e6229",
 width: "device-width",
 initialScale: 1,
};

// Primary / secondary / highlight link href + icon definitions. Labels are
// resolved from i18n inside RootLayout so the nav switches with locale.
const primaryLinks = [
 { href: "/temples", labelKey: "temples" as const, icon: Home },
 { href: "/darshan", labelKey: "darshan" as const, icon: Video },
 { href: "/pujas", labelKey: "pujas" as const, icon: Flame },
 { href: "/content", labelKey: "content" as const, icon: Music },
 { href: "/store", labelKey: "store" as const, icon: ShoppingBag },
];

const moreLinks = [
 { href: "/yatra", labelKey: "yatra" as const, icon: Mountain },
 { href: "/panchang", labelKey: "panchang" as const, icon: Calendar },
 { href: "/gaushala", labelKey: "gauseva" as const, icon: Heart },
 { href: "/donations", labelKey: "donate" as const, icon: Heart },
 { href: "/astrology", labelKey: "astrology" as const, icon: Moon },
 { href: "/wellness", labelKey: "wellness" as const, icon: Leaf },
];

const highlightLink = { href: "/ask-pandit", labelKey: "askPandit" as const, icon: MessageCircleQuestion };

type FooterLink = { href: string; t: 'footer' | 'terms' | 'nav'; key: string };

/**
 * TC-01 — the donate link's label is decided in lib/footer-donate-link.ts,
 * gated on `COMPANY.donationLegal.HAS_80G_VERIFIED`.
 *
 * It was hardcoded to `{ t: "footer", key: "donate80G" }` here, which
 * lib/i18n/en.json resolves to "Donate (80G)". This footer is rendered by the
 * root layout, so that promised an income-tax deduction on EVERY page of the
 * site while the flag is false and both `eightyGNumber` and `pan` are null.
 *
 * The rule lives in its own module because this file cannot be rendered under
 * vitest, so an inline ternary could only be checked by scanning source — and
 * a regex cannot tell which branch of a ternary actually runs. See
 * __tests__/tc01-footer-80g-every-page.test.ts, which exercises both states.
 */
const donateFooterLink: FooterLink = footerDonateLink();
const footerSections: { titleKey: string; links: FooterLink[] }[] = [
 {
 titleKey: "explore",
 links: [
 { href: "/temples", t: "nav", key: "temples" },
 { href: "/darshan", t: "footer", key: "liveDarshan" },
 { href: "/pujas", t: "footer", key: "bookPuja" },
 donateFooterLink,
 { href: "/yatra", t: "footer", key: "dharmicYatra" },
 { href: "/panchang", t: "nav", key: "panchang" },
 ],
 },
 {
 titleKey: "content",
 links: [
 { href: "/aarti", t: "terms", key: "aarti" },
 { href: "/chalisa", t: "terms", key: "chalisa" },
 // HN-07: these were written with a param /content does not read, so both
 // landed on the unfiltered library alongside every other footer entry.
 { href: "/content?type=mantra", t: "terms", key: "mantra" },
 { href: "/content?type=bhajan", t: "terms", key: "bhajan" },
 ],
 },
 {
 titleKey: "forBusiness",
 links: [
 { href: "/list-temple", t: "footer", key: "listTemple" },
 { href: "/become-priest", t: "footer", key: "becomePandit" },
 { href: "/become-astrologer", t: "footer", key: "becomeAstrologer" },
 { href: "/become-wellness", t: "footer", key: "teachYoga" },
 { href: "/list-gaushala", t: "footer", key: "listGaushala" },
 { href: "/become-gurukul", t: "nav", key: "becomeGurukul" },
 { href: "/gurukul-portal", t: "nav", key: "gurukulPortal" },
 ],
 },
 {
 titleKey: "company",
 links: [
 { href: "/about", t: "footer", key: "about" },
 { href: "/careers", t: "footer", key: "careers" },
 /**
  * HN-11 — the Blog entry that sat here is GATED, not deleted. It is
  * rendered by the root layout, so it advertised a section with zero
  * posts on every page of the site while `PUBLISHED_POSTS` (see
  * content/blog/published.ts) is empty. Restoring it takes no edit
  * here: append one post and blogFooterLinks() emits the link again.
  */
 ...blogFooterLinks(),
 { href: "/contact", t: "footer", key: "contact" },
 { href: "/pricing", t: "footer", key: "pricing" },
 ],
 },
 {
 titleKey: "support",
 links: [
 { href: "/support", t: "footer", key: "supportCenter" },
 { href: "/support/faq", t: "footer", key: "faq" },
 { href: "/support/tickets", t: "footer", key: "myTickets" },
 { href: "/help", t: "footer", key: "helpCenter" },
 { href: "/privacy", t: "footer", key: "privacy" },
 { href: "/terms", t: "footer", key: "termsService" },
 { href: "/refunds", t: "footer", key: "refunds" },
 { href: "/shipping", t: "footer", key: "shipping" },
 { href: "/contact", t: "footer", key: "contactUs" },
 { href: "/credits", t: "footer", key: "credits" },
 ],
 },
];

export default function RootLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 const tNav = t('nav') as unknown as (k: string) => string;
 const tFooter = t('footer') as unknown as (k: string) => string;
 const tTerms = t('terms') as unknown as (k: string) => string;

 const tFor: Record<'footer' | 'terms' | 'nav', (k: string) => string> = {
   footer: tFooter,
   terms: tTerms,
   nav: tNav,
 };

 return (
 // I-05: `lang` is the language of the DOCUMENT the server rendered, and every
 // route in this app is served from one English root layout — there is no
 // `[locale]` segment and no second root layout, so nothing here can know the
 // route. It is corrected on the client, per navigation, from the `<main lang>`
 // the locale landings declare (components/TranslationCoverageNotice), which is
 // the only truthful source available: driving it off the visitor's STORED
 // preference put `lang="hi"` around a 100% English page. See
 // __tests__/i18n-html-lang.test.tsx for the whole argument.
 <html
 lang="en"
 className={`${notoSans.variable} ${notoSansDevanagari.variable} ${notoSansTamil.variable} ${notoSansTelugu.variable} ${notoSansBengali.variable} ${crimsonPro.variable}`}
 // HOME-TOD: the script below writes data-tod onto this element before React
 // hydrates, so the server markup and the first client render disagree by
 // design. Without this, React logs a hydration mismatch on every page load.
 suppressHydrationWarning
 >
 <head>
 {/*
   HOME-TOD (2026-09-05) — the time-of-day ground tint.

   Sets `data-tod` on <html> from the CURRENT hour in Asia/Kolkata, so the page
   arrives already tinted to the part of the day it actually is at the temples:
   indigo before dawn, saffron through the morning, neutral at midday, amber at
   sandhya, deep at night. globals.css redefines a handful of tokens per value.

   WHY AN INLINE SCRIPT IN <head> AND NOT A SERVER RENDER. Every marketing route
   here is prerendered (app/page.tsx sets `revalidate = 3600`), so a server-side
   `new Date()` would freeze the BUILD's clock into the HTML and serve it for an
   hour — a devotee opening the page at dusk would get the midday palette. This
   has to resolve on the viewer's own clock, and it has to happen before first
   paint or the page visibly repaints from one palette to another.

   WHY IT IS SAFE ON THE CRITICAL PATH. ~40 lines minified, no network, no
   layout read, no DOM query beyond documentElement. It is wrapped in try/catch
   because Intl with a timeZone option throws on a handful of stripped-down
   Android WebViews; when it throws, no attribute is written and every token
   keeps its default value, which is the existing design exactly. The tint is
   an enhancement and never a dependency.

   NOT A MUHURAT CALCULATION. These are fixed clock windows, not solar time —
   real brahma-muhurta moves with sunrise and latitude. lib/muhurat.ts and the
   API's panchang service own that; this only answers "roughly what part of the
   day is it", and nothing bookable is derived from it.
 */}
 <script
   dangerouslySetInnerHTML={{
     __html:
       "try{var h=parseInt(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',hour:'2-digit',hour12:false}).format(new Date()),10);" +
       "var t=h>=4&&h<6?'brahma':h>=6&&h<10?'pratah':h>=10&&h<14?'madhyahna':h>=14&&h<17?'aparahna':h>=17&&h<20?'sandhya':'ratri';" +
       "document.documentElement.setAttribute('data-tod',t);}catch(e){}",
   }}
 />
 {/*
 PERF-03 (closed 2026-08-28) — the two brand cuts that paint the FIRST
 VIEWPORT of every route, self-hosted from public/fonts and declared in
 app/globals.css.

 Only two of the five vendored cuts are preloaded, and the choice is not
 aesthetic: `body` renders at weight 400 on --font-body, which is Satoshi
 Regular; and all four H1 archetypes in components/ui/heading-recipe.ts are
 `font-semibold` on the display face, which — Cabinet Grotesk having no 600
 cut — resolves to Cabinet Grotesk Bold. Satoshi Medium, Satoshi Bold and
 Cabinet Grotesk Regular load on demand, because a preload in a ROOT LAYOUT
 fires on all ~1,785 routes whether the route paints that weight or not. That
 is the same mistake PERF-02 removed one tag above, in a different costume.

 crossOrigin is REQUIRED even though these are same-origin. Font fetches are
 always CORS-mode, so a preload without it is not matched to the real request
 and the browser downloads the file twice.

 Guarded by __tests__/brand-webfonts.perf03.test.ts.
 */}
 <link rel="preload" as="font" type="font/woff2" href="/fonts/Satoshi-Regular.woff2" crossOrigin="anonymous" />
 <link rel="preload" as="font" type="font/woff2" href="/fonts/CabinetGrotesk-Bold.woff2" crossOrigin="anonymous" />

 {/* Resource hints — warm up connections to third-party origins we hit on nearly every page.
     NOT api/cdn.fontshare.com: that stylesheet was removed (PERF-03) and a
     preconnect to an origin nothing requests costs a DNS+TLS handshake for
     nothing. */}
 <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
 <link rel="dns-prefetch" href="https://images.unsplash.com" />
 <link rel="preconnect" href="https://www.youtube.com" crossOrigin="anonymous" />
 <link rel="dns-prefetch" href="https://www.youtube.com" />

 {/*
 PERF-03 (prod sweep 2026-08-12) — the Fontshare stylesheet that used to sit
 here has been DEAD for some time and must not come back. GET
 api.fontshare.com/v2/css?f[]=cabinet-grotesk…&f[]=satoshi… answers HTTP 200
 with a 162-byte body containing one comment: "Access to the Fontshare API
 has been temporarily restricted." Zero @font-face rules. Measured on the
 live homepage with CDP CSS.getPlatformFontsForNode: 5,545 of 5,604 glyphs
 painted in Arial, 0 in any webfont — while every page paid a
 render-blocking cross-origin round trip in <head> for that one comment.
 CLOSED 2026-08-28: Satoshi and Cabinet Grotesk are now self-hosted from
 public/fonts and declared with @font-face in globals.css, from the five woff2
 this repo has carried at apps/remotion-pitch/public/fonts since 2026-07-15.
 Nothing is fetched from fontshare, or from any other origin, ever again.
 Noto Sans still backs both stacks and still PRELOADS, because Satoshi's cmap
 has no U+20B9 and it is what draws the ₹ in every price.

 PERF-02 — the global `<link rel="preload" as="image" fetchPriority="high">`
 that used to sit here has been removed and must not come back. A ROOT LAYOUT
 CANNOT KNOW THE LCP ELEMENT OF AN ARBITRARY ROUTE. It preloaded the Kashi
 Vishwanath hero at 1280px on every route in the app — including
 /pujas/rudrabhishek, which renders zero <img> tags and still transferred that
 one image. It was not even correct on `/`: the homepage's only Kashi image is
 the 500px-wide WorshipStrip card, a DIFFERENT URL, ~4,600px down the page. So
 fetchPriority="high" spent a connection slot on bytes nothing ever painted,
 during the most contended moment of page load. A route that genuinely has an
 above-the-fold image should mark it `priority` on its own next/image.

 Both are guarded by __tests__/seo/head-resource-budget.test.ts.
 */}

 {/* Cloudflare Web Analytics — privacy-first, no cookies. No-op when env unset. */}
 <CloudflareAnalytics />

 {/*
 I18N-08 (prod sweep 2026-08-12) — the seven <link rel="alternate" hrefLang>
 tags that used to sit here have been REMOVED and must not come back.

 An hreflang annotation is a claim about the CURRENT document, honoured only
 when the target returns the same claim. Emitted from the ROOT layout they
 shipped on all ~1,785 prerendered pages, so /aarti/vishnu-aarti told Google
 its Hindi equivalent was the Hindi HOMEPAGE — and so did /pujas, and /store,
 and every other route. /hi cannot return-link to any of them. Google drops a
 cluster whose return links do not match and treats the rest of it as
 unreliable, so the block was worse than emitting nothing on 1,784 pages and
 pure duplication on the one page it was true for: app/page.tsx already
 declares the same six URLs through `alternates.languages`.

 A root layout has no pathname (no [locale] segment, no second root layout),
 and reading headers() here would opt every route out of static prerendering
 to compute something each page already knows about itself. So the cluster
 belongs to the page: lib/seo/hreflang.ts holds the one definition.
 Guarded by __tests__/seo/hreflang-cluster.test.ts.

 The RSS link below stays — rel="alternate" with a feed type and no hrefLang
 is feed discovery, not a language claim, and it is correct on every page.
 */}
 <link rel="alternate" type="application/rss+xml" title="Darshya RSS" href="https://darshya.online/feed.xml" />

 {/* Site-wide JSON-LD: Organization + WebSite (SearchAction). Per-page JSON-LD
     (Article, Product, Event, Place) is injected by the page itself. */}
 <script
   type="application/ld+json"
   dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
 />
 <script
   type="application/ld+json"
   dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
 />
 </head>
 <body className="font-[family-name:var(--font-body)] min-h-[100dvh] flex flex-col bg-[#f5f3ef]" data-locale="en">
 {/* a11y — skip-to-main-content link, keyboard-only visible on focus. */}
 <a
 href="#main"
 className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-saffron-700 focus:text-white focus:rounded-md focus:shadow-lg"
 >
 Skip to main content
 </a>
 {/* RES-13: the global connectivity bar. Mounted here, above the providers,
     because a user whose connection drops on an already-rendered route saw
     nothing at all — every subsequent fetch failed and each surface rendered
     its own error, so the product read as broken rather than disconnected.
     It renders nothing until an 'online'/'offline' EVENT arrives (it never
     reads navigator.onLine, which lies behind a captive portal) and recovers
     with router.refresh() rather than a reload. */}
 <ConnectivityBar />
 <SentryErrorBoundary>
 <QueryProvider>
 <AuthProvider>
 <CartProvider>

 {/* ── Navigation ─────────────────────────────────────────────── */}
 {/* RESP-10: the header, <main> and the bottom tab bar are handed to
     SiteChrome, which drops the consumer chrome (and its 65px top offset
     plus 80px bottom padding) on /admin, /priest and the six *-portal
     routes. Those surfaces render their own sticky header. */}
 <SiteChrome
 header={
 <header
   data-scroll-shadow
   className="fixed top-0 left-0 right-0 z-50 bg-[#faf9f6]/85 backdrop-blur-xl backdrop-saturate-150 border-b border-transparent transition-[border,background] duration-200"
   style={{ WebkitBackdropFilter: 'saturate(180%) blur(20px)' }}
 >
 {/* `gap-2`, not `gap-3`: at 1024 the row was 6px short. Measured — nav 1009
     wide, 2rem padding each side leaves 945, minus two 12px gaps leaves 921;
     brand 89 + right cluster 393 are both shrink-0, so the category row got 439
     against the 446 it needs and "Shop" clipped. Two 8px gaps instead of 12px
     return exactly the 8px that closes it.

     `.container-nav` — the header is CHROME, not content, and capping it
     to the content column created an impossible budget at large viewports.
     Measured: container-wide is max-width 1152 with 32px padding each side, so
     1536 AND 1920 share an identical 1064px row. Meanwhile 2xl reveals the
     wider search field and swaps "For partners" for the longer "List your
     business" (HN-06 requires both variants), pushing the right cluster to 634
     and leaving the five category buttons 341 of the 446 they need — "Shop"
     clipped at the WIDEST screens, with 384px of unused viewport either side. */}
 <nav
 className="container-wide container-nav flex items-center h-16 gap-2"
 aria-label="Main navigation"
 >
 {/* Logo — fixed left, shrink-0 */}
 {/* HN-12: below sm the wordmark is hidden, leaving a bare 28px house icon —
     the smallest target in the mobile bar. The glyph keeps its size; the box
     around it reaches the 44px floor. */}
 <a href="/" className="flex items-center justify-center sm:justify-start gap-2 shrink-0 min-h-[44px] min-w-[44px]" aria-label="Darshya home">
 <Logo size={28} />
 <span className="text-[15px] font-semibold text-surface-800 tracking-tight hidden sm:inline leading-none">
 Darsh<span className="text-saffron-600">ya</span>
 </span>
 </a>

 {/* Desktop nav — center; flex-1 reserves space so right cluster never gets pushed off-screen.
     min-w-0 lets center shrink before it overflows. Hidden below lg (1024px) — drawer takes over. */}
 {/* `overflow-hidden` is a HARD guarantee, not styling. Measured at 1280px
     this box was 275px against ~450px of category buttons, and the overflow
     painted over the brand wordmark. Clipping is a visible bug someone fixes;
     painting over the logo is a bug that ships. */}
 <div className="hidden lg:flex flex-1 items-center justify-center gap-1 min-w-0 overflow-hidden">
 <CategoryNav />
 </div>

 {/* Right cluster — shrink-0 guarantees visibility at every viewport. Items reveal progressively. */}
 <div className="flex items-center gap-1 ml-auto lg:ml-0 shrink-0">
 {/* Ask Pandit — icon-only below xl, label visible 1280px+ */}
 <a
 href={highlightLink.href}
 // DU-03: the header "Ask Pandit" was the 10px-radius outlier — the only
 // rounded-md CTA on the site, on every one of the ten measured screens.
 className={buttonClass("primary", "sm", "hidden md:inline-flex btn-press")}
 aria-label={tNav(highlightLink.labelKey)}
 title={tNav(highlightLink.labelKey)}
 >
 <MessageCircleQuestion className="w-4 h-4" />
 <span className="hidden xl:inline">{tNav(highlightLink.labelKey)}</span>
 </a>

 {/* HN-12 / HN-06: the reveal was 2xl (1536px+), so a 1280 or 1440 laptop —
     the common case — got no header route to listing at all and had to reach
     the footer. It now appears at the standard lg breakpoint; the control
     itself shortens its visible label below 2xl so it fits at 1024px. Below
     lg the mobile drawer carries these links. */}
 {/* Back at lg, which keeps HN-06 fixed — a 1280 laptop had no header route
     to listing at all. The 141px it used to cost is reclaimed a better way:
     the control is icon-only now, so it costs ~40px at EVERY width rather than
     disappearing at the widths where supply-side entry matters most. */}
 <div className="hidden lg:block">
 <ListYourBusinessDropdown />
 </div>

 {/* Today — icon-only below xl. Always visible md+ for daily-return hook. */}
 <a
 href="/today"
 className="hidden md:inline-flex items-center justify-center gap-1 h-9 w-9 xl:w-auto xl:px-2.5 text-xs font-medium text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors whitespace-nowrap"
 aria-label="Today's panchang and aarti"
 title="Today's panchang and aarti"
 >
 <Calendar className="w-4 h-4" />
 <span className="sr-only">Today</span>
 </a>

 {/* Search — icon-only collapses to expand-on-click below xl */}
 <GlobalSearch />

 {/* Cart — always visible */}
 <NavCartButton />

 {/* Auth — md+ */}
 <div className="hidden md:block">
 <NavAuthButton />
 </div>

 {/* Mobile drawer trigger — only below lg, absorbs full nav */}
 <div className="lg:hidden">
 <MobileNavV2 />
 </div>
 </div>
 </nav>
 </header>
 }
 tabs={<MobileBottomTabs />}
 >
 {children}
 </SiteChrome>

 {/* ── Footer ──────────────────────────────────────────────────── */}
 <footer className="bg-[#2a2520] text-surface-400" aria-labelledby="footer-heading">
 <h2 id="footer-heading" className="sr-only">Site footer</h2>
 {/* Decorative top border */}
 <div className="h-px bg-gradient-to-r from-transparent via-saffron-600/40 to-transparent" />

 {/*
   HOME-IA (2026-09-08) — the reassurance strip.

   The footer opened straight onto five columns of links. That is a sitemap, and
   a sitemap is the last thing a devotee who has just read a price wants. These
   four lines are the objections that actually stop a first booking, and each is
   a mechanism the code enforces rather than a slogan — the same bar the
   "What you are owed" rows are held to. No payment-network logos: we are not
   going to imply a certification nobody has audited.

   It is a <ul> of plain text, not links, on purpose. Four more links here would
   compete with the five columns directly beneath them; this row is there to be
   READ, not clicked.
 */}
 <div className="border-b border-white/10">
 <div className="container-wide py-5">
 <ul className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
 {[
 { Icon: Video, label: 'Video proof on every puja', sub: 'A booking cannot be marked delivered without one' },
 { Icon: Sparkles, label: 'Free cancellation up to 48h before', sub: '75% back from 24 to 48h; not possible inside 24h' },
 { Icon: Heart, label: 'One price, shown first', sub: 'The platform fee is inside the total, not added later' },
 { Icon: Flame, label: 'Pandits paid against ID', sub: 'Aadhaar KYC on file before any payout' },
 ].map((item) => (
 <li key={item.label} className="flex items-start gap-2.5">
 <item.Icon className="mt-0.5 h-4 w-4 shrink-0 text-saffron-400" aria-hidden="true" />
 <div className="min-w-0">
 <p className="text-xs font-semibold text-white leading-snug">{item.label}</p>
 <p className="text-xs text-surface-400 leading-snug mt-0.5">{item.sub}</p>
 </div>
 </li>
 ))}
 </ul>
 </div>
 </div>

 <div className="container-wide py-12 lg:py-14">
 <div className="grid grid-cols-2 md:grid-cols-7 gap-10">
 {/* Brand column */}
 <div className="col-span-2">
 <div className="flex items-center gap-2.5 mb-5">
 <Logo size={36} color="#F99A48" />
 <span className="text-xl font-semibold text-white tracking-tight">
 Darsh<span className="text-saffron-400">ya</span>
 </span>
 </div>
 <p className="prose-meta text-surface-400 mb-6 max-w-xs leading-relaxed">
 {tFooter('tagline')}
 </p>
 <div className="flex items-center gap-2">
 <a
 href="https://www.facebook.com/darshya.online"
 target="_blank"
 rel="noopener noreferrer"
 aria-label="Facebook"
 className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center p-2 text-surface-400 hover:text-saffron-400 hover:bg-white/5 rounded-lg transition-all duration-200"
 >
 <Facebook className="w-4 h-4" />
 </a>
 <a
 href="https://www.instagram.com/darshya.online"
 target="_blank"
 rel="noopener noreferrer"
 aria-label="Instagram"
 className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center p-2 text-surface-400 hover:text-saffron-400 hover:bg-white/5 rounded-lg transition-all duration-200"
 >
 <Instagram className="w-4 h-4" />
 </a>
 <a
 href="https://www.youtube.com/@darshya"
 target="_blank"
 rel="noopener noreferrer"
 aria-label="YouTube"
 className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center p-2 text-surface-400 hover:text-saffron-400 hover:bg-white/5 rounded-lg transition-all duration-200"
 >
 <Youtube className="w-4 h-4" />
 </a>
 </div>
 </div>

 {/* Link columns */}
 {footerSections.map((section) => (
 <div key={section.titleKey}>
 <h3 className="text-xs font-semibold text-surface-300 mb-4 uppercase tracking-widest">
 {tFooter(section.titleKey)}
 </h3>
 <ul className="space-y-2.5">
 {section.links.map((link) => (
 <li key={`${section.titleKey}-${link.href}-${link.key}`}>
 <a
 href={link.href}
 className="text-sm text-surface-400 hover:text-saffron-400 transition-colors duration-200"
 >
 {tFor[link.t](link.key)}
 </a>
 </li>
 ))}
 {/* LEG-15: withdrawal of consent must be as easy as giving it (UK GDPR
     Art. 7(3), DPDP Act s.6(4)). The control shipped on /legal/cookies,
     /privacy and /account/privacy, but a user who rejected on the homepage
     had to already know one of those pages existed. The footer is on every
     page, which is the only placement that satisfies "as easy".

     Not an i18n key on purpose: lib/i18n has no entry for it and this file
     must not gain a footer link that renders as a raw key in the five
     non-English locales. Plain English here matches the untranslated
     "Browse all 500+ guides" pill below. */}
 {section.titleKey === 'support' && (
 <li key="support-cookie-settings">
 <CookieSettingsButton
 label="Cookie settings"
 className="text-sm text-surface-400 hover:text-saffron-400 transition-colors duration-200"
 />
 </li>
 )}

 {/* Google Play requires a publicly reachable, non-authenticated URL where a
     user can request account deletion — /account/privacy does not qualify,
     it sits behind AuthGuard. Plain English for the same reason as the
     cookie link directly above: lib/i18n has no key for it, and a missing
     key renders raw in the five non-English locales. */}
 {section.titleKey === 'support' && (
 <li key="support-data-deletion">
 <a
 href="/data-deletion"
 className="text-sm text-surface-400 hover:text-saffron-400 transition-colors duration-200"
 >
 Delete My Account
 </a>
 </li>
 )}
 </ul>
 </div>
 ))}
 </div>

 {/* Discover — programmatic-SEO routes. Collapsed by default per footer-trim 2026-06-07. All links in DOM (SEO preserved). */}
 <details className="mt-10 pt-6 border-t border-surface-800/60 group">
 <summary className="cursor-pointer list-none flex items-center justify-center gap-2 text-xs font-semibold text-surface-300 mb-5 uppercase tracking-widest text-center hover:text-saffron-400 transition-colors">
 <span>Discover Hindu Wisdom</span>
 <span className="text-surface-500 group-open:rotate-180 transition-transform">&#9662;</span>
 </summary>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-sm">
 <div>
 <h4 className="text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-2">Scriptures</h4>
 <ul className="space-y-1.5 text-surface-500">
 <li><Link href="/gita" className="hover:text-saffron-400 transition-colors">Bhagavad Gita</Link></li>
 <li><Link href="/ramayana" className="hover:text-saffron-400 transition-colors">Ramayana 7 Kandas</Link></li>
 <li><Link href="/mahabharata" className="hover:text-saffron-400 transition-colors">Mahabharata 18 Parvas</Link></li>
 <li><Link href="/upanishads" className="hover:text-saffron-400 transition-colors">10 Upanishads</Link></li>
 <li><Link href="/vedas" className="hover:text-saffron-400 transition-colors">4 Vedas</Link></li>
 <li><Link href="/puranas" className="hover:text-saffron-400 transition-colors">18 Puranas</Link></li>
 <li><Link href="/darshanas" className="hover:text-saffron-400 transition-colors">6 Darshanas</Link></li>
 <li><Link href="/yoga-sutras" className="hover:text-saffron-400 transition-colors">Yoga Sutras</Link></li>
 <li><Link href="/hindu-philosophies" className="hover:text-saffron-400 transition-colors">Hindu Philosophies</Link></li>
 <li><Link href="/hindu-symbols" className="hover:text-saffron-400 transition-colors">Hindu Symbols</Link></li>
 </ul>
 </div>
 <div>
 <h4 className="text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-2">Saints &amp; Deities</h4>
 <ul className="space-y-1.5 text-surface-500">
 <li><Link href="/bhakti-saint" className="hover:text-saffron-400 transition-colors">12 Bhakti Saints</Link></li>
 <li><Link href="/devi/mahavidyas" className="hover:text-saffron-400 transition-colors">10 Mahavidyas</Link></li>
 <li><Link href="/devi/navadurga" className="hover:text-saffron-400 transition-colors">9 Navadurga</Link></li>
 <li><Link href="/nakshatra" className="hover:text-saffron-400 transition-colors">27 Nakshatras</Link></li>
 <li><Link href="/rashi" className="hover:text-saffron-400 transition-colors">12 Rashis</Link></li>
 <li><Link href="/nava-graha" className="hover:text-saffron-400 transition-colors">9 Nava-Graha</Link></li>
 <li><Link href="/dashavatar" className="hover:text-saffron-400 transition-colors">10 Avatars of Vishnu</Link></li>
 <li><Link href="/sapta-rishis" className="hover:text-saffron-400 transition-colors">7 Sapta Rishis</Link></li>
 </ul>
 </div>
 <div>
 <h4 className="text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-2">Practice</h4>
 <ul className="space-y-1.5 text-surface-500">
 <li><Link href="/chants" className="hover:text-saffron-400 transition-colors">Famous Chants</Link></li>
 <li><Link href="/vrat" className="hover:text-saffron-400 transition-colors">Vrats Guide</Link></li>
 <li><Link href="/muhurat" className="hover:text-saffron-400 transition-colors">Muhurat Guide</Link></li>
 <li><Link href="/tirth" className="hover:text-saffron-400 transition-colors">Sacred Tirthas</Link></li>
 <li><Link href="/jyotirlinga" className="hover:text-saffron-400 transition-colors">12 Jyotirlinga</Link></li>
 <li><Link href="/shakti-peeth" className="hover:text-saffron-400 transition-colors">51 Shakti Peeth</Link></li>
 <li><Link href="/ashta-lakshmi" className="hover:text-saffron-400 transition-colors">8 Ashta Lakshmi</Link></li>
 <li><Link href="/aditya" className="hover:text-saffron-400 transition-colors">12 Adityas (Sun)</Link></li>
 <li><Link href="/sapta-mathruka" className="hover:text-saffron-400 transition-colors">7 Sapta Matrika</Link></li>
 <li><Link href="/tithi" className="hover:text-saffron-400 transition-colors">30 Lunar Tithis</Link></li>
 <li><Link href="/masa" className="hover:text-saffron-400 transition-colors">12 Vedic Months</Link></li>
 <li><Link href="/pancha-bhoota" className="hover:text-saffron-400 transition-colors">5 Pancha Bhoota Stalam</Link></li>
 <li><Link href="/navaratna" className="hover:text-saffron-400 transition-colors">9 Navaratna Gems</Link></li>
 <li><Link href="/pilgrimage" className="hover:text-saffron-400 transition-colors">Pilgrimage Circuits</Link></li>
 <li><Link href="/samskaras" className="hover:text-saffron-400 transition-colors">16 Samskaras</Link></li>
 <li><Link href="/chakras" className="hover:text-saffron-400 transition-colors">7 Chakras</Link></li>
 <li><Link href="/vedic-yajnas" className="hover:text-saffron-400 transition-colors">10 Vedic Yajnas</Link></li>
 <li><Link href="/sacred-rivers" className="hover:text-saffron-400 transition-colors">Sacred Rivers</Link></li>
 <li><Link href="/sacred-trees" className="hover:text-saffron-400 transition-colors">Sacred Trees</Link></li>
 <li><Link href="/sacred-mountains" className="hover:text-saffron-400 transition-colors">Sacred Mountains</Link></li>
 <li><Link href="/rudraksha" className="hover:text-saffron-400 transition-colors">18 Rudraksha</Link></li>
 <li><Link href="/ekadashi" className="hover:text-saffron-400 transition-colors">24 Ekadashis</Link></li>
 </ul>
 </div>
 <div>
 <h4 className="text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-2">Tools</h4>
 <ul className="space-y-1.5 text-surface-500">
 <li><Link href="/sankalp" className="hover:text-saffron-400 transition-colors">Sankalp Generator</Link></li>
 <li><Link href="/today" className="hover:text-saffron-400 transition-colors">Today&apos;s Panchang</Link></li>
 <li><Link href="/calendar" className="hover:text-saffron-400 transition-colors">Hindu Calendar 2026</Link></li>
 <li><Link href="/shloka-card" className="hover:text-saffron-400 transition-colors">Shloka Cards</Link></li>
 <li><Link href="/gift" className="hover:text-saffron-400 transition-colors">Gift a Puja</Link></li>
 <li><Link href="/faqs" className="hover:text-saffron-400 transition-colors">FAQs</Link></li>
 <li><Link href="/why-darshya" className="hover:text-saffron-400 transition-colors">Why Darshya</Link></li>
 <li><Link href="/discover" className="hover:text-saffron-400 transition-colors">All Guides</Link></li>
 </ul>
 </div>
 </div>

 {/* Browse all pill — single click into the Discover hub */}
 <div className="mt-6 flex justify-center">
 <Link
 href="/discover"
 className="inline-flex min-h-[44px] items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-saffron-300 bg-white/5 hover:bg-white/10 hover:text-saffron-400 border border-saffron-700/40 rounded-full transition-colors"
 >
 Browse all 500+ guides &rarr;
 </Link>
 </div>
 </details>

 {/* Lang switcher — surfaces translated landings.
     RESP-09: measured 41.3x18 / 25.6x18 / 37.4x18 / 40.2x18 / 28.9x18 — six
     links on one row, each a third of a fingertip tall, and these are the
     entry points for the Hindi/Tamil/Telugu/Bengali audience. They are not
     inside a <li>, so the globals `footer li > a` floor never reached them. */}
 <div className="mt-10 pt-8 border-t border-surface-800/60">
 <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-surface-500">
 {/* I-08 (2026-09-01) - prefetch={false} on all six, and it is not an
     optimisation. MEASURED AGAINST PRODUCTION today, one curl per link:

       curl -D- -H "RSC: 1" -H "Next-Router-Prefetch: 1"
            "https://darshya.online/hi?_rsc=abc"
       -> 200, Set-Cookie: poojly_language=hi; Max-Age=31536000

     Same for /ta /te /bn /mr, and "/?lang=en&_rsc=abc" sent with
     Cookie: poojly_language=hi answers Set-Cookie: poojly_language=en
     - it ERASES a locale the reader chose.

     middleware.ts has an isPrefetch() guard written to stop exactly this,
     and three of its four branches do work in production (Sec-Purpose,
     Purpose and X-Moz all return 200 with no Set-Cookie). The fourth,
     next-router-prefetch, is the header next/link actually sends, and Next
     strips it before middleware runs - so the one path the guard exists
     for is the one it cannot see. Its own docblock says the remedy then
     belongs "at the call site (drop the prefetch)". This is that call
     site: these are the only <Link>s in the product that target a locale
     route or ?lang=, they sit in the footer of EVERY page, and next/link
     prefetches every in-viewport link. Scrolling to the bottom of an
     English page was enough to be switched to whichever locale was
     prefetched last, for a year.

     A locale switch is a click. Nothing is lost by not speculating on it,
     and the guard keeps working for the browser-level prefetches it can
     still see. */}
 <span className="text-surface-600">Read in:</span>
 <Link prefetch={false} href="/?lang=en" className="tap-safe hover:text-saffron-400 transition-colors" hrefLang="en">English</Link>
 <Link prefetch={false} href="/hi" className="tap-safe hover:text-saffron-400 transition-colors" hrefLang="hi" lang="hi">हिन्दी</Link>
 <Link prefetch={false} href="/ta" className="tap-safe hover:text-saffron-400 transition-colors" hrefLang="ta" lang="ta">தமிழ்</Link>
 <Link prefetch={false} href="/te" className="tap-safe hover:text-saffron-400 transition-colors" hrefLang="te" lang="te">తెలుగు</Link>
 <Link prefetch={false} href="/bn" className="tap-safe hover:text-saffron-400 transition-colors" hrefLang="bn" lang="bn">বাংলা</Link>
 <Link prefetch={false} href="/mr" className="tap-safe hover:text-saffron-400 transition-colors" hrefLang="mr" lang="mr">मराठी</Link>
 </div>
 {/* I18N-01: these six links advertise a localized product on every page.
 Until the copy exists, say so where the visitor actually is. */}
 <TranslationCoverageNotice />
 </div>

 {/* Contact info */}
 <div className="mt-8 pt-6 border-t border-surface-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
 <div className="flex flex-wrap items-center gap-6 text-sm text-surface-500">
 <span className="flex items-center gap-1.5">
 <Mail className="w-3.5 h-3.5" /> support@darshya.online
 </span>
 <span className="flex items-center gap-1.5">
 <Phone className="w-3.5 h-3.5" />
 <a href="tel:+919255109400" className="tap-safe hover:text-saffron-400 transition-colors">+91 92551 09400</a>
 </span>
 <span className="flex items-center gap-1.5">
 <MapPin className="w-3.5 h-3.5" /> Bengaluru, India
 </span>
 </div>
 <p className="text-sm text-surface-600" suppressHydrationWarning>
 &copy; {new Date().getFullYear()} Darshya. {tFooter('rights')}
 </p>
 </div>
 </div>
 </footer>
 <DeferredClientWidgets />
 <OnboardingTrigger />
 <Analytics />
 <GA4Script />
 <MetaPixelScript />
 <PostHogScript />
 <SentryProvider />
 <AdSenseScript />
 <ServiceWorkerRegister />
 {HAS_REFERRAL_CREDIT && <ReferralCapture />}
 <ChannelAttribution />
 </CartProvider>
 </AuthProvider>
 </QueryProvider>
 </SentryErrorBoundary>
 </body>
 </html>
 );
}
