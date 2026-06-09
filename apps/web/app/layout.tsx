import type { Metadata, Viewport } from "next";
import { Noto_Sans, Noto_Sans_Devanagari, Crimson_Pro } from "next/font/google";
import { t } from "../lib/t";
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
 Twitter,
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
import { CategoryNav } from "../components/CategoryNav";
import OnboardingTrigger from "../components/OnboardingTrigger";
import { ListYourBusinessDropdown } from "../components/ListYourBusinessDropdown";
import { Analytics } from "../components/Analytics";
import { CloudflareAnalytics } from "../components/CloudflareAnalytics";
import { NotificationPrompt } from "../components/NotificationPrompt";
import { ReferralCapture } from "../components/ReferralCapture";
import { Logo } from "../components/Logo";
import { DeferredClientWidgets } from "../components/DeferredClientWidgets";
import { SentryProvider } from "../components/SentryProvider";
import { SentryErrorBoundary } from "../components/SentryErrorBoundary";
import AdSenseScript from "../components/AdSenseScript";
import { GA4Script } from "../lib/ga4";
import { MetaPixelScript } from "../lib/meta-pixel";
import { PostHogScript } from "../lib/posthog";
import { getTempleHero } from "../lib/images";
import { organizationJsonLd, webSiteJsonLd } from "../lib/jsonld";
import Link from "next/link";
import "./globals.css";

const notoSans = Noto_Sans({
 subsets: ["latin"],
 weight: ["300", "400", "500", "600", "700"],
 variable: "--font-noto-sans",
 display: "swap",
});

const notoSansDevanagari = Noto_Sans_Devanagari({
 subsets: ["devanagari"],
 weight: ["400", "500", "600", "700"],
 variable: "--font-noto-devanagari",
 display: "swap",
});

const crimsonPro = Crimson_Pro({
 subsets: ["latin"],
 weight: ["400", "500", "600", "700"],
 variable: "--font-reader-serif",
 display: "swap",
});

export const metadata: Metadata = {
 title: {
 default: "Darshya \u2014 India\u2019s Devotional Super App",
 template: "%s | Darshya",
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
 alternates: { canonical: "https://darshya.online" },
 openGraph: {
 type: "website",
 locale: "en_IN",
 url: "https://darshya.online",
 siteName: "Darshya",
 title: "Darshya \u2014 India\u2019s Devotional Super App",
 description:
 "Live darshan, puja booking, panchang, bhajans & more \u2014 your complete spiritual companion.",
 // OG image: Golden Temple Wikimedia 1280px (works as Twitter summary_large_image fallback; CF worker-cap blocks @vercel/og runtime route, see 292c328)
 images: ["https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/The_Golden_Temple_of_Amrithsar_7.jpg/1280px-The_Golden_Temple_of_Amrithsar_7.jpg"],
 },
 twitter: {
 card: "summary_large_image",
 title: "Darshya \u2014 India\u2019s Devotional Super App",
 description:
 "Live darshan, puja booking, panchang, bhajans & more \u2014 your complete spiritual companion.",
 images: ["https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/The_Golden_Temple_of_Amrithsar_7.jpg/1280px-The_Golden_Temple_of_Amrithsar_7.jpg"],
 },
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
 themeColor: "#E16318",
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
const footerSections: { titleKey: string; links: FooterLink[] }[] = [
 {
 titleKey: "explore",
 links: [
 { href: "/temples", t: "nav", key: "temples" },
 { href: "/darshan", t: "footer", key: "liveDarshan" },
 { href: "/pujas", t: "footer", key: "bookPuja" },
 { href: "/donations", t: "footer", key: "donate80G" },
 { href: "/yatra", t: "footer", key: "dharmicYatra" },
 { href: "/panchang", t: "nav", key: "panchang" },
 ],
 },
 {
 titleKey: "content",
 links: [
 { href: "/aarti", t: "terms", key: "aarti" },
 { href: "/chalisa", t: "terms", key: "chalisa" },
 { href: "/content?tab=mantra", t: "terms", key: "mantra" },
 { href: "/content?tab=bhajan", t: "terms", key: "bhajan" },
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
 { href: "/blog", t: "footer", key: "blog" },
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
 <html
 lang="en"
 className={`${notoSans.variable} ${notoSansDevanagari.variable} ${crimsonPro.variable}`}
 >
 <head>
 {/* Resource hints — warm up connections to third-party origins we hit on nearly every page. */}
 <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
 <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />
 <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
 <link rel="dns-prefetch" href="https://images.unsplash.com" />
 <link rel="preconnect" href="https://upload.wikimedia.org" crossOrigin="anonymous" />
 <link rel="dns-prefetch" href="https://upload.wikimedia.org" />
 <link rel="preconnect" href="https://www.youtube.com" crossOrigin="anonymous" />
 <link rel="dns-prefetch" href="https://www.youtube.com" />

 {/*
 Fontshare — Cabinet Grotesk (display) + Satoshi (body).
 Trimmed to the weights actually used in the UI:
 - Cabinet Grotesk 500, 700 (headings / display)
 - Satoshi 400, 500, 700 (body + UI)
 Dropped: cabinet-grotesk 400 & 800, satoshi 300 — unused in current components.
 */}
 <link
 href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@500,700&f[]=satoshi@400,500,700&display=swap"
 rel="stylesheet"
 />

 {/* Preload the home hero — the image is reused on multiple sections and is the LCP element on `/`. */}
 <link
 rel="preload"
 as="image"
 href={getTempleHero('kashi-vishwanath')}
 fetchPriority="high"
 />

 {/* Cloudflare Web Analytics — privacy-first, no cookies. No-op when env unset. */}
 <CloudflareAnalytics />

 <link rel="alternate" hrefLang="en" href="https://darshya.online" />
 <link rel="alternate" hrefLang="hi" href="https://darshya.online/hi" />
 <link rel="alternate" hrefLang="ta" href="https://darshya.online/ta" />
 <link rel="alternate" hrefLang="te" href="https://darshya.online/te" />
 <link rel="alternate" hrefLang="bn" href="https://darshya.online/bn" />
 <link rel="alternate" hrefLang="mr" href="https://darshya.online/mr" />
 <link rel="alternate" hrefLang="x-default" href="https://darshya.online" />
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
 <SentryErrorBoundary>
 <QueryProvider>
 <AuthProvider>
 <CartProvider>

 {/* ── Navigation ─────────────────────────────────────────────── */}
 <header
   data-scroll-shadow
   className="fixed top-0 left-0 right-0 z-50 bg-[#faf9f6]/85 backdrop-blur-xl backdrop-saturate-150 border-b border-transparent transition-[border,background] duration-200"
   style={{ WebkitBackdropFilter: 'saturate(180%) blur(20px)' }}
 >
 <nav
 className="mx-auto max-w-7xl flex items-center h-16 px-4 sm:px-6 lg:px-8 gap-3"
 aria-label="Main navigation"
 >
 {/* Logo — fixed left, shrink-0 */}
 <a href="/" className="flex items-center gap-2 shrink-0" aria-label="Darshya home">
 <Logo size={28} />
 <span className="text-[15px] font-semibold text-surface-800 tracking-tight hidden sm:inline leading-none">
 Darsh<span className="text-saffron-600">ya</span>
 </span>
 </a>

 {/* Desktop nav — center; flex-1 reserves space so right cluster never gets pushed off-screen.
     min-w-0 lets center shrink before it overflows. Hidden below lg (1024px) — drawer takes over. */}
 <div className="hidden lg:flex flex-1 items-center justify-center gap-1 min-w-0">
 <CategoryNav />
 </div>

 {/* Right cluster — shrink-0 guarantees visibility at every viewport. Items reveal progressively. */}
 <div className="flex items-center gap-1 ml-auto lg:ml-0 shrink-0">
 {/* Ask Pandit — icon-only below xl, label visible 1280px+ */}
 <a
 href={highlightLink.href}
 className="hidden md:inline-flex items-center gap-1.5 h-9 px-2.5 xl:px-3 text-sm font-medium text-white bg-saffron-600 hover:bg-saffron-700 rounded-md transition-colors whitespace-nowrap btn-press"
 aria-label={tNav(highlightLink.labelKey)}
 title={tNav(highlightLink.labelKey)}
 >
 <MessageCircleQuestion className="w-4 h-4" />
 <span className="hidden xl:inline">{tNav(highlightLink.labelKey)}</span>
 </a>

 {/* List your business — only at 2xl (1536px+). Below that, lives in mobile drawer. */}
 <div className="hidden 2xl:block">
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
 <span className="hidden xl:inline">Today</span>
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

 {/* Main content — offset for fixed nav, bottom-padded on mobile for tab bar */}
 <main id="main" className="flex-1 pt-16 pb-20 md:pb-0 [@supports(padding:env(safe-area-inset-bottom))]:pb-[calc(5rem+env(safe-area-inset-bottom))] md:[@supports(padding:env(safe-area-inset-bottom))]:pb-0">{children}</main>
 <MobileBottomTabs />

 {/* ── Footer ──────────────────────────────────────────────────── */}
 <footer className="bg-[#2a2520] text-surface-400" aria-labelledby="footer-heading">
 <h2 id="footer-heading" className="sr-only">Site footer</h2>
 {/* Decorative top border */}
 <div className="h-px bg-gradient-to-r from-transparent via-saffron-600/40 to-transparent" />

 <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-16 lg:py-20">
 <div className="grid grid-cols-2 md:grid-cols-7 gap-10">
 {/* Brand column */}
 <div className="col-span-2">
 <div className="flex items-center gap-2.5 mb-5">
 <Logo size={36} color="#F99A48" />
 <span className="text-xl font-semibold text-white tracking-tight">
 Darsh<span className="text-saffron-400">ya</span>
 </span>
 </div>
 <p className="text-sm text-surface-500 mb-6 max-w-xs leading-relaxed">
 {tFooter('tagline')}
 </p>
 <div className="flex items-center gap-2">
 <a
 href="https://www.facebook.com/darshya.online"
 target="_blank"
 rel="noopener noreferrer"
 aria-label="Facebook"
 className="p-2 text-surface-500 hover:text-saffron-400 hover:bg-white/5 rounded-lg transition-all duration-200"
 >
 <Facebook className="w-4 h-4" />
 </a>
 <a
 href="https://twitter.com/darshya_app"
 target="_blank"
 rel="noopener noreferrer"
 aria-label="Twitter"
 className="p-2 text-surface-500 hover:text-saffron-400 hover:bg-white/5 rounded-lg transition-all duration-200"
 >
 <Twitter className="w-4 h-4" />
 </a>
 <a
 href="https://www.instagram.com/darshya.online"
 target="_blank"
 rel="noopener noreferrer"
 aria-label="Instagram"
 className="p-2 text-surface-500 hover:text-saffron-400 hover:bg-white/5 rounded-lg transition-all duration-200"
 >
 <Instagram className="w-4 h-4" />
 </a>
 <a
 href="https://www.youtube.com/@darshya"
 target="_blank"
 rel="noopener noreferrer"
 aria-label="YouTube"
 className="p-2 text-surface-500 hover:text-saffron-400 hover:bg-white/5 rounded-lg transition-all duration-200"
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
 className="text-sm text-surface-500 hover:text-saffron-400 transition-colors duration-200"
 >
 {tFor[link.t](link.key)}
 </a>
 </li>
 ))}
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
 className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-saffron-300 bg-white/5 hover:bg-white/10 hover:text-saffron-400 border border-saffron-700/40 rounded-full transition-colors"
 >
 Browse all 500+ guides &rarr;
 </Link>
 </div>
 </details>

 {/* Lang switcher — surfaces translated landings */}
 <div className="mt-10 pt-8 border-t border-surface-800/60">
 <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-surface-500">
 <span className="text-surface-600">Read in:</span>
 <Link href="/" className="hover:text-saffron-400 transition-colors" hrefLang="en">English</Link>
 <Link href="/hi" className="hover:text-saffron-400 transition-colors" hrefLang="hi" lang="hi">हिन्दी</Link>
 <Link href="/ta" className="hover:text-saffron-400 transition-colors" hrefLang="ta" lang="ta">தமிழ்</Link>
 <Link href="/te" className="hover:text-saffron-400 transition-colors" hrefLang="te" lang="te">తెలుగు</Link>
 <Link href="/bn" className="hover:text-saffron-400 transition-colors" hrefLang="bn" lang="bn">বাংলা</Link>
 <Link href="/mr" className="hover:text-saffron-400 transition-colors" hrefLang="mr" lang="mr">मराठी</Link>
 </div>
 </div>

 {/* Contact info */}
 <div className="mt-8 pt-6 border-t border-surface-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
 <div className="flex flex-wrap items-center gap-6 text-sm text-surface-500">
 <span className="flex items-center gap-1.5">
 <Mail className="w-3.5 h-3.5" /> support@darshya.online
 </span>
 <span className="flex items-center gap-1.5">
 <Phone className="w-3.5 h-3.5" />
 <a href="tel:+919255109400" className="hover:text-saffron-400 transition-colors">+91 92551 09400</a>
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
 <NotificationPrompt />
 <ReferralCapture />
 </CartProvider>
 </AuthProvider>
 </QueryProvider>
 </SentryErrorBoundary>
 </body>
 </html>
 );
}
