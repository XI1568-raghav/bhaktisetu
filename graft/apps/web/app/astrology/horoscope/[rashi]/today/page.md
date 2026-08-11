# apps\web\app\astrology\horoscope\[rashi]\today\page.tsx

SSR-per-request page that serves date-stamped daily horoscopes for each of the 12 rashis to capture "{rashi} horoscope today" long-tail SEO traffic, keeping the IST date and panchang current without rebuilds.

- Params · interface · L37-L39 — Type holder for the async route params carrying the rashi slug from the URL.
- generateMetadata · function · L41-L60 — Builds date-stamped SEO title, description, canonical, and OpenGraph tags so each rashi's daily page ranks for that specific day's searches.
- RashiTodayPage · function · L62-L308 — Renders the full daily horoscope page by deterministically deriving the day's panchang, lucky color/number, and per-area predictions from the IST date and rashi attributes, plus cross-links for SEO crawl depth.
