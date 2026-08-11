# apps\web\lib\rashis.ts

- RashiInfo · interface · L5-L22 — Schema describing one zodiac sign's full horoscope payload — bilingual names, prediction/career/love/health blurbs, lucky attributes, mantra, ruling planet, and rating — so pages render a consistent SEO-friendly horoscope.
- getRashi · function · L243-L245 — Looks up a single zodiac sign's horoscope data by its URL slug so the dynamic [rashi] route can render or 404.
- rashiSlugs · function · L247-L249 — Lists all zodiac slugs so the framework can pre-generate static params for every horoscope page.
- pujasForRashi · function · L252-L262 — Maps a zodiac sign's ruling planet to recommended puja slugs, driving cross-links from each horoscope page to relevant /pujas/[slug] pages.
