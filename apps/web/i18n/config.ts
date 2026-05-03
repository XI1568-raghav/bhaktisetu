// Layer AF — bilingual i18n scaffolding.
//
// next-intl is the only new dep introduced in this layer because it is the
// canonical Next 15 App Router i18n integration (server + client + middleware
// in one), keeps translations as plain JSON (free, no SaaS lock-in), and
// pairs cleanly with our existing Cloudflare Pages export. Rolling our own
// would have meant reimplementing locale negotiation, segment-aware routing,
// and SSR-safe message loading — meaningful surface area for a free-tier app.
//
// Locales: English remains unprefixed (`/`), the four Indian languages are
// prefixed (`/hi`, `/ta`, `/te`, `/kn`). Adding a new language is: drop a
// JSON in `messages/`, add the code here, and the middleware + sitemap pick
// it up automatically.

export const locales = ['en', 'hi', 'ta', 'te', 'kn'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeLabels: Record<Locale, { native: string; english: string }> = {
  en: { native: 'English', english: 'English' },
  hi: { native: 'हिन्दी', english: 'Hindi' },
  ta: { native: 'தமிழ்', english: 'Tamil' },
  te: { native: 'తెలుగు', english: 'Telugu' },
  kn: { native: 'ಕನ್ನಡ', english: 'Kannada' },
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
