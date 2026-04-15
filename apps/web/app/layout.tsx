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
  X,
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
} from "lucide-react";
import { AuthProvider } from "../lib/auth-context";
import { CartProvider } from "../components/CartContext";
import CartDrawer from "../components/CartDrawer";
import NavAuthButton from "../components/NavAuthButton";
import NavCartButton from "../components/NavCartButton";
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
    default: "Bhaktisetu \u2014 India\u2019s Devotional Super App",
    template: "%s | Bhaktisetu",
  },
  description:
    "Experience live darshan, book pujas, explore panchang, listen to bhajans, and shop for sacred items. Bhaktisetu bridges you to the divine.",
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
    "bhaktisetu",
  ],
  authors: [{ name: "Bhaktisetu" }],
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://bhaktisetu.com",
    siteName: "Bhaktisetu",
    title: "Bhaktisetu \u2014 India\u2019s Devotional Super App",
    description:
      "Live darshan, puja booking, panchang, bhajans & more \u2014 your complete spiritual companion.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bhaktisetu \u2014 India\u2019s Devotional Super App",
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
  { href: "/panchang", label: "Panchang", icon: Calendar },
  { href: "/gaushala", label: "Gau Seva", icon: Heart },
  { href: "/astrology", label: "Astrology", icon: Moon },
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
      { href: "/panchang", label: "Panchang" },
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
    ],
  },
  {
    title: "Support",
    links: [
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
      <body className="font-[family-name:var(--font-noto-sans)] min-h-screen flex flex-col bg-surface-50">
        <AuthProvider>
        <CartProvider>
        <CartDrawer />

        {/* ── Navigation ─────────────────────────────────────────────── */}
        <header className="fixed top-0 left-0 right-0 z-50">
          <nav
            className="mx-auto max-w-7xl bg-white/80 backdrop-blur-xl border-b border-surface-200/50 px-4 sm:px-6"
            aria-label="Main navigation"
          >
            <div className="flex items-center h-14">
              {/* Logo */}
              <a href="/" className="flex items-center gap-2 shrink-0 mr-6">
                <img src="/logo.svg" alt="Bhaktisetu" className="w-7 h-7" />
                <span className="text-base font-semibold text-surface-800 tracking-tight hidden sm:inline">
                  Bhakti<span className="text-saffron-600">setu</span>
                </span>
              </a>

              {/* Desktop nav links */}
              <div className="hidden md:flex items-center gap-0.5 flex-1 min-w-0">
                {primaryLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium text-surface-500 hover:text-surface-900 hover:bg-surface-100 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {link.label}
                    </a>
                  );
                })}

                {/* More dropdown */}
                <div className="relative group">
                  <button className="flex items-center gap-1 px-2.5 py-1.5 text-[13px] font-medium text-surface-500 hover:text-surface-900 hover:bg-surface-100 rounded-lg transition-colors whitespace-nowrap">
                    More
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg border border-surface-200 shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
                    {moreLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <a
                          key={link.href}
                          href={link.href}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm text-surface-600 hover:text-surface-900 hover:bg-surface-50 transition-colors"
                        >
                          <Icon className="w-4 h-4 text-surface-400" />
                          {link.label}
                        </a>
                      );
                    })}
                  </div>
                </div>

                {/* Ask Pandit — highlighted */}
                <a
                  href={highlightLink.href}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white bg-saffron-600 rounded-lg hover:bg-saffron-700 transition-colors whitespace-nowrap ml-0.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {highlightLink.label}
                </a>
              </div>

              {/* Right side */}
              <div className="flex items-center gap-1 ml-auto shrink-0">
                <button
                  aria-label="Search"
                  className="p-2 text-surface-400 hover:text-surface-700 hover:bg-surface-100 rounded-lg transition-colors"
                >
                  <Search className="w-4 h-4" />
                </button>
                <NavCartButton />
                <div className="hidden sm:block">
                  <NavAuthButton />
                </div>
                <button
                  aria-label="Open menu"
                  className="md:hidden p-2 text-surface-400 hover:text-surface-700 hover:bg-surface-100 rounded-lg transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>
            </div>
          </nav>
        </header>

        {/* Main content — offset for fixed nav */}
        <main className="flex-1 pt-14">{children}</main>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <footer className="bg-surface-900 text-surface-400">
          {/* Decorative top border */}
          <div className="h-px bg-gradient-to-r from-transparent via-saffron-600/40 to-transparent" />

          <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-16 lg:py-20">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-10">
              {/* Brand column */}
              <div className="col-span-2">
                <div className="flex items-center gap-2.5 mb-5">
                  <img src="/logo-dark.svg" alt="Bhaktisetu" className="w-9 h-9" />
                  <span className="text-xl font-semibold text-white tracking-tight">
                    Bhakti<span className="text-temple-gold">setu</span>
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
                  <Mail className="w-3.5 h-3.5" /> support@bhaktisetu.com
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> +91 80-BHAKTI-00
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Bengaluru, India
                </span>
              </div>
              <p className="text-sm text-surface-600">
                &copy; {new Date().getFullYear()} Bhaktisetu. All rights
                reserved.
              </p>
            </div>
          </div>
        </footer>
        </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
