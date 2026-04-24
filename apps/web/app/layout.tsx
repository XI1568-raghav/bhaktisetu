import type { Metadata, Viewport } from "next";
import { Noto_Sans, Noto_Sans_Devanagari } from "next/font/google";
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
  Moon,
  Leaf,
  Mountain,
} from "lucide-react";
import { AuthProvider } from "../lib/auth-context";
import { CartProvider } from "../components/CartContext";
import NavAuthButton from "../components/NavAuthButton";
import NavCartButton from "../components/NavCartButton";
import { Logo } from "../components/Logo";
import { DeferredClientWidgets } from "../components/DeferredClientWidgets";
import { getTempleHero } from "../lib/images";
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

export const metadata: Metadata = {
  title: {
    default: "Poojly \u2014 India\u2019s Devotional Super App",
    template: "%s | Poojly",
  },
  description:
    "Experience live darshan, book pujas, explore panchang, listen to bhajans, and shop for sacred items. Poojly bridges you to the divine.",
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
    "poojly",
  ],
  authors: [{ name: "Poojly" }],
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://poojly.com",
    siteName: "Poojly",
    title: "Poojly \u2014 India\u2019s Devotional Super App",
    description:
      "Live darshan, puja booking, panchang, bhajans & more \u2014 your complete spiritual companion.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Poojly \u2014 India\u2019s Devotional Super App",
    description:
      "Live darshan, puja booking, panchang, bhajans & more \u2014 your complete spiritual companion.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#E16318",
  width: "device-width",
  initialScale: 1,
};

// Primary nav — always visible on desktop
const primaryLinks = [
  { href: "/temples", label: "Temples", icon: Home },
  { href: "/darshan", label: "Darshan", icon: Video },
  { href: "/pujas", label: "Pujas", icon: Flame },
  { href: "/content", label: "Content", icon: Music },
  { href: "/store", label: "Store", icon: ShoppingBag },
];

// Secondary nav — shown in "More" dropdown on desktop
const moreLinks = [
  { href: "/yatra", label: "Yatra", icon: Mountain },
  { href: "/panchang", label: "Panchang", icon: Calendar },
  { href: "/gaushala", label: "Gau Seva", icon: Heart },
  { href: "/astrology", label: "Astrology", icon: Moon },
  { href: "/wellness", label: "Wellness", icon: Leaf },
];

// Highlight nav — special styled items
const highlightLink = { href: "/ask-pandit", label: "Ask Pandit", icon: Sparkles };

const footerSections = [
  {
    title: "Explore",
    links: [
      { href: "/temples", label: "Temples" },
      { href: "/darshan", label: "Live Darshan" },
      { href: "/pujas", label: "Book a Puja" },
      { href: "/yatra", label: "Dharmic Yatra" },
      { href: "/panchang", label: "Panchang" },
      { href: "/wellness", label: "Wellness" },
    ],
  },
  {
    title: "Content",
    links: [
      { href: "/content?tab=aarti", label: "Aarti" },
      { href: "/content?tab=chalisa", label: "Chalisa" },
      { href: "/content?tab=mantra", label: "Mantras" },
      { href: "/content?tab=bhajan", label: "Bhajans" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About Us" },
      { href: "/careers", label: "Careers" },
      { href: "/blog", label: "Blog" },
      { href: "/contact", label: "Contact" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/support", label: "Support Center" },
      { href: "/support/faq", label: "FAQ" },
      { href: "/support/tickets", label: "My Tickets" },
      { href: "/help", label: "Help Center" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/refunds", label: "Refund Policy" },
    ],
  },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${notoSans.variable} ${notoSansDevanagari.variable}`}
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
      </head>
      <body className="font-[family-name:var(--font-body)] min-h-screen flex flex-col bg-[#f5f3ef]">
        <AuthProvider>
        <CartProvider>

        {/* ── Navigation ─────────────────────────────────────────────── */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#faf9f6]/90 backdrop-blur-xl border-b border-surface-200/40">
          <nav
            className="mx-auto max-w-6xl flex items-center h-14 px-4 sm:px-6 lg:px-8"
            aria-label="Main navigation"
          >
            {/* Logo */}
            <a href="/" className="flex items-center gap-2 shrink-0">
              <Logo size={28} />
              <span className="text-[15px] font-semibold text-surface-800 tracking-tight hidden sm:inline">
                Pooj<span className="text-saffron-600">ly</span>
              </span>
            </a>

            {/* Desktop nav links — centered */}
            <div className="hidden md:flex items-center gap-1 mx-auto">
              {primaryLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-surface-500 hover:text-surface-800 hover:bg-surface-100 rounded-md transition-colors whitespace-nowrap"
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </a>
                );
              })}

              {/* More dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-surface-500 hover:text-surface-800 hover:bg-surface-100 rounded-md transition-colors whitespace-nowrap">
                  More
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <div className="absolute top-full left-0 mt-1.5 w-48 bg-white rounded-lg border border-surface-200/60 shadow-lg shadow-surface-900/5 py-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  {moreLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <a
                        key={link.href}
                        href={link.href}
                        className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-surface-600 hover:text-surface-900 hover:bg-surface-50 transition-colors"
                      >
                        <Icon className="w-4 h-4 text-surface-400" />
                        {link.label}
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* Ask Pandit — highlighted CTA */}
              <a
                href={highlightLink.href}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-saffron-600 hover:bg-saffron-700 rounded-md transition-colors whitespace-nowrap ml-1 btn-press"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {highlightLink.label}
              </a>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-1.5 ml-auto md:ml-0 shrink-0">
              <button
                aria-label="Search"
                className="p-2 text-surface-400 hover:text-surface-700 hover:bg-surface-100 rounded-md transition-colors"
              >
                <Search className="w-[18px] h-[18px]" />
              </button>
              <NavCartButton />
              <div className="hidden sm:block">
                <NavAuthButton />
              </div>
              <button
                aria-label="Open menu"
                className="md:hidden p-2 text-surface-400 hover:text-surface-700 hover:bg-surface-100 rounded-md transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </nav>
        </header>

        {/* Main content — offset for fixed nav */}
        <main className="flex-1 pt-14">{children}</main>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <footer className="bg-[#2a2520] text-surface-400">
          {/* Decorative top border */}
          <div className="h-px bg-gradient-to-r from-transparent via-saffron-600/40 to-transparent" />

          <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-16 lg:py-20">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-10">
              {/* Brand column */}
              <div className="col-span-2">
                <div className="flex items-center gap-2.5 mb-5">
                  <Logo size={36} color="#D4A76A" />
                  <span className="text-xl font-semibold text-white tracking-tight">
                    Pooj<span className="text-temple-gold">ly</span>
                  </span>
                </div>
                <p className="text-sm text-surface-500 mb-6 max-w-xs leading-relaxed">
                  Bridging devotees to the divine through technology. Live
                  darshan, puja booking, spiritual content, and more.
                </p>
                <div className="flex items-center gap-2">
                  <a
                    href="#"
                    aria-label="Facebook"
                    className="p-2 text-surface-500 hover:text-saffron-400 hover:bg-white/5 rounded-lg transition-all duration-200"
                  >
                    <Facebook className="w-4 h-4" />
                  </a>
                  <a
                    href="#"
                    aria-label="Twitter"
                    className="p-2 text-surface-500 hover:text-saffron-400 hover:bg-white/5 rounded-lg transition-all duration-200"
                  >
                    <Twitter className="w-4 h-4" />
                  </a>
                  <a
                    href="#"
                    aria-label="Instagram"
                    className="p-2 text-surface-500 hover:text-saffron-400 hover:bg-white/5 rounded-lg transition-all duration-200"
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                  <a
                    href="#"
                    aria-label="YouTube"
                    className="p-2 text-surface-500 hover:text-saffron-400 hover:bg-white/5 rounded-lg transition-all duration-200"
                  >
                    <Youtube className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Link columns */}
              {footerSections.map((section) => (
                <div key={section.title}>
                  <h3 className="text-xs font-semibold text-surface-300 mb-4 uppercase tracking-widest">
                    {section.title}
                  </h3>
                  <ul className="space-y-2.5">
                    {section.links.map((link) => (
                      <li key={link.href}>
                        <a
                          href={link.href}
                          className="text-sm text-surface-500 hover:text-saffron-400 transition-colors duration-200"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Contact info */}
            <div className="mt-14 pt-8 border-t border-surface-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-6 text-sm text-surface-500">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> support@poojly.com
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> +91 80-POOJLY-00
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Bengaluru, India
                </span>
              </div>
              <p className="text-sm text-surface-600">
                &copy; {new Date().getFullYear()} Poojly. All rights
                reserved.
              </p>
            </div>
          </div>
        </footer>
        <DeferredClientWidgets />
        </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
