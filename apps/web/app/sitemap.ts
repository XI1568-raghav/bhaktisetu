import type { MetadataRoute } from 'next';
import { getTemples, getPujaTypes } from '../lib/api';
import { SHLOKAS } from '../lib/shlokas';
import { topicSlugs as freePanditTopicSlugs } from '../lib/free-pandit-topics';
import { CITY_PUJA_SLUGS } from '../lib/city-pujas';
import { canonicalTempleSlug } from '../lib/temple-slug';
import { HELP_ARTICLES, isUnreviewedTranslation } from '../lib/help-articles';

const BASE_URL = 'https://darshya.online';
// deploy-stamp 2026-06-05 #7 — CF rebuild trigger for 5f71b48 dead-href + /discover GROUPS 54->61 (HEAD was [skip ci])

// Build-time fetch tolerant of failures — if the API is asleep/cold or down,
// we still ship a sitemap with the static paths + a curated fallback list
// rather than crash the build or produce an empty sitemap.
const FALLBACK_TEMPLE_SLUGS = [
  'kashi-vishwanath',
  'tirupati-balaji',
  'siddhivinayak',
  'somnath',
  'jagannath-puri',
  'golden-temple',
  'meenakshi-temple',
  'kedarnath',
  'badrinath',
  'akshardham',
  'mahakaleshwar',
  'dwarkadhish',
  'rameshwaram',
  'vaishno-devi',
];

const FALLBACK_PUJA_SLUGS = [
  'rudrabhishek',
  'satyanarayan-puja',
  'navgraha-puja',
  'ganesh-puja',
  'lakshmi-puja',
  'maha-mrityunjaya',
  'sundarkand-path',
  'kaal-sarp-dosh',
  'mangal-dosh',
  'vivah-puja',
  'griha-pravesh',
  'navaratri-puja',
];

// P0 #202 (2026-08-03): the API seeds temples with `<name>-<city>` slugs
// (e.g. `kashi-vishwanath-varanasi`) but `/temples/[slug]` resolves the curated
// short slug (`kashi-vishwanath`). The sitemap was advertising the long API
// slugs → 19/20 temple URLs 404'd.
//
// SEO-06 (prod sweep 2026-08-12): the normaliser that fixed that lived HERE, as
// a private `toCanonicalTempleSlug` keyed off the hardcoded FALLBACK_TEMPLE_SLUGS
// array — while app/temples/[slug]/page.tsx carried a SECOND, independent
// implementation keyed off TEMPLE_DETAILS. Two lists, two functions, one URL
// space: they disagreed for any temple curated in TEMPLE_DETAILS but absent
// from the fallback array, so the sitemap advertised a slug the route did not
// treat as canonical. `canonicalTempleSlug` in lib/temple-slug.ts is now the
// single implementation, shared with the route that serves the redirect.
async function safeTempleSlugs(): Promise<string[]> {
  try {
    const res = await getTemples({ limit: 100 });
    const slugs = res.data.map((t) => t.slug).filter(Boolean).map(canonicalTempleSlug);
    const unique = Array.from(new Set(slugs));
    return unique.length > 0 ? unique : FALLBACK_TEMPLE_SLUGS;
  } catch {
    return FALLBACK_TEMPLE_SLUGS;
  }
}

async function safePujaSlugs(): Promise<string[]> {
  try {
    const res = await getPujaTypes({ limit: 100 });
    const slugs = res.data.map((p) => p.slug).filter(Boolean);
    return slugs.length > 0 ? slugs : FALLBACK_PUJA_SLUGS;
  } catch {
    return FALLBACK_PUJA_SLUGS;
  }
}

/**
 * SEO-07 (prod sweep 2026-08-12) — two defects, one exit point.
 *
 * 1. DUPLICATES. Several slug sources list the same slug twice
 *    (`deitySlugs()`, `aartiSlugs()`, `vratSlugs()`, `SHLOKAS`, …), so the
 *    emitted sitemap carried 49 repeated <loc> values. A <loc> must be unique
 *    inside a sitemap; repeats waste crawl budget and make the file fail
 *    validators. Deduped here at the single exit point rather than in ~60
 *    call sites, so a future list that gains a duplicate can never leak one.
 *
 * 2. lastmod. Every one of the ~1,600 entries carried `new Date()` — the
 *    instant the sitemap was rendered. That is not when the page changed, it
 *    is when the server booted, so the whole file claimed the entire site was
 *    rewritten on every deploy. Google's documented response to a lastmod it
 *    can see is unreliable (identical across all URLs, moving with no content
 *    change) is to ignore lastmod for the site — which also throws away the
 *    signal for the handful of pages that genuinely ARE fresh.
 *
 *    lastmod is now emitted only where a real date exists:
 *      - `contentDates` — a per-URL date taken from the content itself
 *        (currently blog post dates).
 *      - `dailyUrls` — pages whose body is computed from the current date on
 *        every render (panchang, daily horoscope, choghadiya/rahu-kalam/hora,
 *        /today). These get today's date at UTC midnight, not the render
 *        instant: the claim "this page's content is from today" is true, the
 *        claim "it changed at 14:22:07" is not.
 *      - everything else gets NO lastmod. The sitemap protocol makes the tag
 *        optional and Google prefers it absent over fabricated; omitting is
 *        the honest fallback for a page whose modification date we do not
 *        actually know.
 */
function todayUtc(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function finalizeSitemap(
  entries: MetadataRoute.Sitemap,
  contentDates: Map<string, Date>,
  dailyUrls: Set<string>,
): MetadataRoute.Sitemap {
  const stamp = todayUtc();
  const seen = new Set<string>();
  const out: MetadataRoute.Sitemap = [];

  for (const entry of entries) {
    if (seen.has(entry.url)) continue;
    seen.add(entry.url);

    // Builders stamp a placeholder `lastModified`; this is the only authority.
    const { lastModified: _placeholder, ...rest } = entry;
    const real = contentDates.get(entry.url) ?? (dailyUrls.has(entry.url) ? stamp : undefined);
    out.push(real ? { ...rest, lastModified: real } : rest);
  }

  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Placeholder only — `finalizeSitemap` decides every entry's real lastmod.
  const now = new Date();
  // url -> the date the page's own content carries. Populated where a real
  // date exists; an absent key means "we do not know" and emits no lastmod.
  const contentDates = new Map<string, Date>();

  const topLevelStatic: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' }[] = [
    { path: '', priority: 1.0, changeFrequency: 'daily' },
    { path: '/temples', priority: 1.0, changeFrequency: 'weekly' },
    { path: '/pujas', priority: 1.0, changeFrequency: 'weekly' },
    { path: '/content', priority: 1.0, changeFrequency: 'weekly' },
    { path: '/darshan', priority: 1.0, changeFrequency: 'daily' },
    { path: '/store', priority: 1.0, changeFrequency: 'weekly' },
  ];

  const secondaryStatic: { path: string; priority: number }[] = [
    { path: '/astrology', priority: 0.7 },
    { path: '/astrology/horoscope', priority: 0.7 },
    { path: '/astrology/kundli', priority: 0.7 },
    { path: '/astrology/kundli-milan', priority: 0.95 },
    { path: '/astrology/numerology', priority: 0.95 },
    { path: '/astrology/baby-name', priority: 0.95 },
    { path: '/astrology/nakshatra-finder', priority: 0.95 },
    { path: '/astrology/dasha', priority: 0.95 },
    { path: '/astrology/manglik', priority: 0.95 },
    { path: '/astrology/sade-sati', priority: 0.95 },
    { path: '/astrology/choghadiya', priority: 0.95 },
    { path: '/astrology/rahu-kalam', priority: 0.95 },
    { path: '/astrology/hora', priority: 0.95 },
    { path: '/astrology/kaal-sarp', priority: 0.95 },
    { path: '/astrology/shubh-muhurat', priority: 0.95 },
    { path: '/astrology/vastu', priority: 0.95 },
    { path: '/astrology/lal-kitab', priority: 0.95 },
    { path: '/astrology/pitra-dosh', priority: 0.95 },
    { path: '/astrology/pancha-pakshi', priority: 0.95 },
    { path: '/devi/navadurga', priority: 0.95 },
    { path: '/devi/mahavidyas', priority: 0.95 },
    { path: '/ekadashi', priority: 0.95 },
    { path: '/matchmaking', priority: 0.95 },
    { path: '/wellness', priority: 0.7 },
    { path: '/gaushala', priority: 0.7 },
    { path: '/yatra', priority: 0.7 },
    { path: '/yatra/companion', priority: 0.6 },
    { path: '/yatra/plan', priority: 0.6 },
    { path: '/panchang', priority: 0.7 },
    { path: '/weddings', priority: 0.9 },
    { path: '/weddings/muhurat', priority: 0.8 },
    { path: '/weddings/packages', priority: 0.8 },
    { path: '/weddings/inquiry', priority: 0.6 },
    { path: '/blog', priority: 0.7 },
    { path: '/about', priority: 0.5 },
    { path: '/contact', priority: 0.5 },
    { path: '/careers', priority: 0.4 },
    { path: '/help', priority: 0.5 },
    { path: '/pricing', priority: 0.5 },
    { path: '/refunds', priority: 0.5 },
    { path: '/shipping', priority: 0.5 },
    { path: '/privacy', priority: 0.5 },
    { path: '/terms', priority: 0.5 },
    { path: '/data-deletion', priority: 0.5 },
    { path: '/list-temple', priority: 0.5 },
    { path: '/for-temple-chains', priority: 0.75 },
    { path: '/become-priest', priority: 0.5 },
    { path: '/become-astrologer', priority: 0.5 },
    { path: '/become-wellness', priority: 0.5 },
    { path: '/list-gaushala', priority: 0.5 },
    // Knowledge + gurukul (Layer M)
    { path: '/sanskrit', priority: 0.8 },
    { path: '/ved', priority: 0.8 },
    { path: '/sanatan', priority: 0.8 },
    { path: '/learn-sanskrit', priority: 0.8 },
    { path: '/gurukuls', priority: 0.9 },
    { path: '/become-gurukul', priority: 0.6 },
    // Conversion + revenue surfaces
    { path: '/donations', priority: 0.8 },
    { path: '/ask-pandit', priority: 0.8 },
    { path: '/nri', priority: 0.9 },
    { path: '/nri-pujas', priority: 0.95 },
    { path: '/uk', priority: 0.85 }, // R-Q3-G-001 UK launch landing
    { path: '/upgrade', priority: 0.7 },
    { path: '/waitlist', priority: 0.6 },
    // Support
    { path: '/support', priority: 0.5 },
    { path: '/support/faq', priority: 0.5 },
    { path: '/credits', priority: 0.3 },
    { path: '/refer', priority: 0.7 },
    { path: '/shloka-card', priority: 0.7 },
    { path: '/launch', priority: 0.6 },
    { path: '/updates', priority: 0.5 },
    { path: '/changelog', priority: 0.5 },
    { path: '/press', priority: 0.5 },
    { path: '/deity', priority: 0.8 },
    { path: '/festival', priority: 0.9 },
    { path: '/city', priority: 0.9 },
    { path: '/aarti', priority: 0.8 },
    { path: '/chalisa', priority: 0.8 },
    { path: '/today', priority: 0.9 },
    { path: '/gift', priority: 0.95 },
    { path: '/pilgrimage', priority: 0.9 },
    { path: '/faqs', priority: 0.8 },
    { path: '/nakshatra', priority: 0.85 },
    { path: '/muhurat', priority: 0.85 },
    { path: '/rashi', priority: 0.85 },
    { path: '/vrat', priority: 0.85 },
    { path: '/chants', priority: 0.85 },
    { path: '/sankalp', priority: 0.85 },
    { path: '/tirth', priority: 0.9 },
    { path: '/jyotirlinga', priority: 0.95 },
    { path: '/shakti-peeth', priority: 0.95 },
    { path: '/rudraksha', priority: 0.85 },
    { path: '/ashta-lakshmi', priority: 0.9 },
    { path: '/aditya', priority: 0.9 },
    { path: '/sapta-mathruka', priority: 0.9 },
    { path: '/tithi', priority: 0.9 },
    { path: '/masa', priority: 0.9 },
    { path: '/pancha-bhoota', priority: 0.9 },
    { path: '/navaratna', priority: 0.9 },
    { path: '/calendar', priority: 0.9 },
    { path: '/nava-graha', priority: 0.9 },
    { path: '/why-darshya', priority: 0.9 },
    { path: '/discover', priority: 0.95 },
    { path: '/chakras', priority: 0.85 },
    { path: '/sacred-trees', priority: 0.9 },
    { path: '/hindu-symbols', priority: 0.9 },
    { path: '/sacred-mountains', priority: 0.9 },
    { path: '/bhakti-saint', priority: 0.9 },
    { path: '/feed.xml', priority: 0.3 },
  ];

  const bookSlugs = ['bhagavad-gita', 'ramayana', 'upanishads'];

  const yatraSlugs = [
    'char-dham', 'do-dham', 'jyotirlinga-yatra', 'four-dhams-india',
    'amarnath', 'vaishno-devi', 'shirdi-sai', 'tirupati-south', 'ayodhya-kashi',
  ];

  const [templeSlugs, pujaSlugs] = await Promise.all([
    safeTempleSlugs(),
    safePujaSlugs(),
  ]);

  const topLevelEntries = topLevelStatic.map((s) => ({
    url: `${BASE_URL}${s.path}`,
    lastModified: now,
    changeFrequency: s.changeFrequency,
    priority: s.priority,
  }));

  const secondaryEntries = secondaryStatic.map((s) => ({
    url: `${BASE_URL}${s.path}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: s.priority,
  }));

  const templeEntries = templeSlugs.flatMap((slug) => [
    {
      url: `${BASE_URL}/temples/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    // Programmatic-SEO long-tail page per temple.
    {
      url: `${BASE_URL}/temples/${slug}/pujas`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
  ]);

  const pujaEntries = pujaSlugs.flatMap((slug) => [
    {
      url: `${BASE_URL}/pujas/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    // Programmatic-SEO mirror — "where to book {puja}" long-tail.
    {
      url: `${BASE_URL}/pujas/${slug}/temples`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
  ]);

  const yatraEntries = yatraSlugs.map((slug) => ({
    url: `${BASE_URL}/yatra/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // New yatra destination landing pages (Layer M1) — affiliate revenue.
  const { destinationSlugs } = await import('../lib/yatra-destinations');
  const yatraDestEntries = destinationSlugs().map((slug) => ({
    url: `${BASE_URL}/yatra/destinations/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Deity programmatic-SEO pages — long-tail "{deity} puja online".
  const { deitySlugs } = await import('../lib/deities');
  const deityEntries = deitySlugs().map((slug) => ({
    url: `${BASE_URL}/deity/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Per-deity mantra sub-pages — long-tail "{deity} mantras", "{deity} beej mantra".
  const { deitiesWithMantras } = await import('../lib/deity-mantras');
  const deityMantraEntries = deitiesWithMantras().map((slug) => ({
    url: `${BASE_URL}/deity/${slug}/mantras`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  }));

  // Aarti collection — long-tail "{deity} aarti lyrics".
  const { aartiSlugs } = await import('../lib/aartis');
  const aartiEntries = aartiSlugs().map((slug) => ({
    url: `${BASE_URL}/aarti/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  }));

  // Chalisa collection — long-tail "{deity} chalisa lyrics meaning".
  const { chalisaSlugs } = await import('../lib/chalisas');
  const chalisaEntries = chalisaSlugs().map((slug) => ({
    url: `${BASE_URL}/chalisa/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  // Festival pages — drive massive seasonal traffic spikes.
  const { festivalSlugs } = await import('../lib/festivals');
  const festivalEntries = festivalSlugs().map((slug) => ({
    url: `${BASE_URL}/festival/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }));

  // City pages — long-tail "puja in {city}", "temples in {city}".
  const { citySlugs } = await import('../lib/cities');
  const cityEntries = citySlugs().map((slug) => ({
    url: `${BASE_URL}/city/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }));

  // Per-city panchang pages — long-tail "panchang in {city}", "{city} sunrise today".
  const panchangCityEntries = citySlugs().map((slug) => ({
    url: `${BASE_URL}/panchang/${slug}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }));

  // Per-rashi horoscope pages — long-tail "{rashi} horoscope today".
  const { rashiSlugs } = await import('../lib/rashis');
  const rashiEntries = rashiSlugs().flatMap((slug) => [
    {
      url: `${BASE_URL}/astrology/horoscope/${slug}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    // Today's reading — high-volume daily long-tail.
    {
      url: `${BASE_URL}/astrology/horoscope/${slug}/today`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.85,
    },
  ]);

  // Blog posts — pulled from GH at build/revalidate, tolerant of API failure.
  let blogEntries: { url: string; lastModified: Date; changeFrequency: 'weekly'; priority: number }[] = [];
  try {
    const { listBlogPosts } = await import('../lib/blog-posts');
    const posts = await listBlogPosts();
    blogEntries = posts.map((p) => {
      const url = `${BASE_URL}/blog/${p.slug}`;
      const published = new Date(`${p.date}T00:00:00Z`);
      // A real, per-post content date — the one lastmod on this site that is
      // beyond argument. Registered so finalizeSitemap keeps it.
      if (!Number.isNaN(published.getTime())) contentDates.set(url, published);
      return {
        url,
        lastModified: published,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      };
    });
  } catch {
    blogEntries = [];
  }

  // Lang landing pages — only landing is genuinely translated per lang.
  // Listing untranslated /lang/* pages would mislead Google + hurt SEO
  // (thin/duplicate content penalty). Expand only when real translated
  // sub-pages ship.
  const { circuitSlugs } = await import('../lib/pilgrimage-circuits');
  const pilgrimageEntries = circuitSlugs().map((slug) => ({
    url: `${BASE_URL}/pilgrimage/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const { nakshatraSlugs } = await import('../lib/nakshatras');
  const nakshatraEntries = nakshatraSlugs().map((slug) => ({
    url: `${BASE_URL}/nakshatra/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const { muhuratSlugs } = await import('../lib/muhurats');
  const muhuratEntries = muhuratSlugs().map((slug) => ({
    url: `${BASE_URL}/muhurat/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  }));

  const { rashiProfileSlugs } = await import('../lib/rashi-profiles');
  const rashiProfileEntries = rashiProfileSlugs().map((slug) => ({
    url: `${BASE_URL}/rashi/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  }));

  const { vratSlugs } = await import('../lib/vrats');
  const vratEntries = vratSlugs().map((slug) => ({
    url: `${BASE_URL}/vrat/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  }));

  const { chantSlugs } = await import('../lib/chants');
  const chantEntries = chantSlugs().map((slug) => ({
    url: `${BASE_URL}/chants/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  const { tirthaSlugs } = await import('../lib/tirthas');
  const tirthaEntries = tirthaSlugs().map((slug) => ({
    url: `${BASE_URL}/tirth/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const { JYOTIRLINGA_SLUGS } = await import('../lib/jyotirlingas');
  const jyotirlingaEntries = JYOTIRLINGA_SLUGS.map((slug) => ({
    url: `${BASE_URL}/jyotirlinga/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.9,
  }));

  const { SHAKTI_PEETH_SLUGS } = await import('../lib/shakti-peeths');
  const shaktiPeethEntries = SHAKTI_PEETH_SLUGS.map((slug) => ({
    url: `${BASE_URL}/shakti-peeth/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const { rudrakshaSlugs } = await import('../lib/rudrakshas');
  const rudrakshaEntries = rudrakshaSlugs().map((slug) => ({
    url: `${BASE_URL}/rudraksha/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  }));

  const { ASHTA_LAKSHMI_SLUGS } = await import('../lib/ashta-lakshmi');
  const ashtaLakshmiEntries = ASHTA_LAKSHMI_SLUGS.map((slug) => ({
    url: `${BASE_URL}/ashta-lakshmi/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const { DWADASHA_ADITYA_SLUGS } = await import('../lib/dwadasha-aditya');
  const adityaEntries = DWADASHA_ADITYA_SLUGS.map((slug) => ({
    url: `${BASE_URL}/aditya/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const { SAPTA_MATHRUKA_SLUGS } = await import('../lib/sapta-mathruka');
  const saptaMathrukaEntries = SAPTA_MATHRUKA_SLUGS.map((slug) => ({
    url: `${BASE_URL}/sapta-mathruka/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const { TITHI_SLUGS } = await import('../lib/tithis');
  const tithiEntries = TITHI_SLUGS.map((slug) => ({
    url: `${BASE_URL}/tithi/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const { PANCHANG_YOGAS } = await import('../lib/panchang-yogas');
  const yogaEntries = [
    { url: `${BASE_URL}/panchang/yoga`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.9 },
    ...PANCHANG_YOGAS.map((y) => ({
      url: `${BASE_URL}/panchang/yoga/${y.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.85,
    })),
  ];

  const { PANCHANG_KARANAS } = await import('../lib/panchang-karanas');
  const karanaEntries = [
    { url: `${BASE_URL}/panchang/karana`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.9 },
    ...PANCHANG_KARANAS.map((k) => ({
      url: `${BASE_URL}/panchang/karana/${k.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.85,
    })),
  ];

  const { VEDIC_MONTH_SLUGS } = await import('../lib/vedic-months');
  const masaEntries = VEDIC_MONTH_SLUGS.map((slug) => ({
    url: `${BASE_URL}/masa/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const { PANCHA_PAKSHI_BIRDS } = await import('../lib/pancha-pakshi');
  const panchaPakshiEntries = PANCHA_PAKSHI_BIRDS.map((b) => ({
    url: `${BASE_URL}/astrology/pancha-pakshi/${b.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const { NAVADURGA } = await import('../lib/navadurga');
  const navadurgaEntries = NAVADURGA.map((n) => ({
    url: `${BASE_URL}/devi/navadurga/${n.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const { MAHAVIDYAS } = await import('../lib/mahavidyas');
  const mahavidyasEntries = MAHAVIDYAS.map((m) => ({
    url: `${BASE_URL}/devi/mahavidyas/${m.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const { EKADASHIS } = await import('../lib/ekadashis');
  const ekadashiEntries = EKADASHIS.map((e) => ({
    url: `${BASE_URL}/ekadashi/${e.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const { PANCHA_BHOOTA_SLUGS } = await import('../lib/pancha-bhoota');
  const panchaBhootaEntries = PANCHA_BHOOTA_SLUGS.map((slug) => ({
    url: `${BASE_URL}/pancha-bhoota/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const { NAVARATNA_SLUGS } = await import('../lib/navaratna');
  const navaratnaEntries = NAVARATNA_SLUGS.map((slug) => ({
    url: `${BASE_URL}/navaratna/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const calendarMonthSlugs = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  const calendarMonthEntries = calendarMonthSlugs.map((slug) => ({
    url: `${BASE_URL}/calendar/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const { navaGrahaSlugs } = await import('../lib/nava-grahas');
  const navaGrahaEntries = navaGrahaSlugs().map((slug) => ({
    url: `${BASE_URL}/nava-graha/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const { chapterSlugs } = await import('../lib/gita-chapters');
  const gitaEntries = [
    { url: `${BASE_URL}/gita`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 },
    ...chapterSlugs().map((slug) => ({
      url: `${BASE_URL}/gita/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.85,
    })),
  ];

  const { kandaSlugs } = await import('../lib/ramayana-kandas');
  const ramayanaEntries = [
    { url: `${BASE_URL}/ramayana`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 },
    ...kandaSlugs().map((slug) => ({
      url: `${BASE_URL}/ramayana/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.85,
    })),
  ];

  const { parvaSlugs } = await import('../lib/mahabharata-parvas');
  const mahabharataEntries = [
    { url: `${BASE_URL}/mahabharata`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 },
    ...parvaSlugs().map((slug) => ({
      url: `${BASE_URL}/mahabharata/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.85,
    })),
  ];

  const { centerSlugs: vipassanaCenterSlugs } = await import('../lib/vipassana-centers');
  const vipassanaEntries = [
    { url: `${BASE_URL}/wellness/vipassana/centers`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: `${BASE_URL}/wellness/vipassana/learn`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.85 },
    ...vipassanaCenterSlugs().map((slug) => ({
      url: `${BASE_URL}/wellness/vipassana/centers/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];

  const { upanishadSlugs } = await import('../lib/upanishads');
  const upanishadEntries = [
    { url: `${BASE_URL}/upanishads`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 },
    ...upanishadSlugs().map((slug) => ({
      url: `${BASE_URL}/upanishads/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.85,
    })),
  ];

  const { padaSlugs } = await import('../lib/yoga-sutras');
  const yogaSutraEntries = [
    { url: `${BASE_URL}/yoga-sutras`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 },
    ...padaSlugs().map((slug) => ({
      url: `${BASE_URL}/yoga-sutras/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.85,
    })),
  ];

  const { samskaraSlugs } = await import('../lib/samskaras');
  const samskaraEntries = [
    { url: `${BASE_URL}/samskaras`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.85 },
    ...samskaraSlugs().map((slug) => ({
      url: `${BASE_URL}/samskaras/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];

  const { puranaSlugs } = await import('../lib/puranas');
  const puranaEntries = [
    { url: `${BASE_URL}/puranas`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 },
    ...puranaSlugs().map((slug) => ({
      url: `${BASE_URL}/puranas/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.85,
    })),
  ];

  const { darshanaSlugs } = await import('../lib/darshanas');
  const darshanaEntries = [
    { url: `${BASE_URL}/darshanas`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 },
    ...darshanaSlugs().map((slug) => ({
      url: `${BASE_URL}/darshanas/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.85,
    })),
  ];

  const { vedaSlugs } = await import('../lib/vedas');
  const vedaEntries = [
    { url: `${BASE_URL}/vedas`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.95 },
    ...vedaSlugs().map((slug) => ({
      url: `${BASE_URL}/vedas/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    })),
  ];

  const { avatarSlugs } = await import('../lib/dashavatar');
  const dashavatarEntries = [
    { url: `${BASE_URL}/dashavatar`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 },
    ...avatarSlugs().map((slug) => ({
      url: `${BASE_URL}/dashavatar/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.85,
    })),
  ];

  const { rishiSlugs } = await import('../lib/sapta-rishis');
  const saptaRishiEntries = [
    { url: `${BASE_URL}/sapta-rishis`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 },
    ...rishiSlugs().map((slug) => ({
      url: `${BASE_URL}/sapta-rishis/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.85,
    })),
  ];

  const { chakraSlugs } = await import('../lib/chakras');
  const chakraEntries = chakraSlugs().map((slug) => ({
    url: `${BASE_URL}/chakras/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const { sacredTreeSlugs } = await import('../lib/sacred-trees');
  const sacredTreeEntries = sacredTreeSlugs().map((slug) => ({
    url: `${BASE_URL}/sacred-trees/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const { hinduSymbolSlugs } = await import('../lib/hindu-symbols');
  const hinduSymbolEntries = hinduSymbolSlugs().map((slug) => ({
    url: `${BASE_URL}/hindu-symbols/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const { sacredRiverSlugs } = await import('../lib/sacred-rivers');
  const sacredRiverEntries = [
    { url: `${BASE_URL}/sacred-rivers`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.85 },
    ...sacredRiverSlugs().map((slug) => ({
      url: `${BASE_URL}/sacred-rivers/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.85,
    })),
  ];

  const { bhaktiSaintSlugs } = await import('../lib/bhakti-saints');
  const bhaktiSaintEntries = bhaktiSaintSlugs().map((slug) => ({
    url: `${BASE_URL}/bhakti-saint/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const { vedicYajnaSlugs } = await import('../lib/vedic-yajnas');
  const vedicYajnaEntries = [
    { url: `${BASE_URL}/vedic-yajnas`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 },
    ...vedicYajnaSlugs().map((slug) => ({
      url: `${BASE_URL}/vedic-yajnas/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.85,
    })),
  ];

  const langCodes = ['hi', 'ta', 'te', 'bn', 'mr'] as const;
  const langAlternates = {
    en: `${BASE_URL}/`,
    hi: `${BASE_URL}/hi`,
    ta: `${BASE_URL}/ta`,
    te: `${BASE_URL}/te`,
    bn: `${BASE_URL}/bn`,
    mr: `${BASE_URL}/mr`,
  };
  const langEntries = langCodes.map((code) => ({
    url: `${BASE_URL}/${code}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
    alternates: { languages: langAlternates },
  }));

  // R-Q3-G-003 Chennai soft-launch — Tamil-language city landing.
  const taChennaiEntry = {
    url: `${BASE_URL}/ta/chennai`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  };

  const bookEntries = [
    { url: `${BASE_URL}/content/books`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 },
    ...bookSlugs.map((slug) => ({
      url: `${BASE_URL}/content/books/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];

  const freePanditEntries = [
    { url: `${BASE_URL}/free-pandit-advice`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.95 },
    ...freePanditTopicSlugs().map((slug) => ({
      url: `${BASE_URL}/free-pandit-advice/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
  ];

  const cityPujaEntries = CITY_PUJA_SLUGS.map(({ city, puja }) => ({
    url: `${BASE_URL}/puja/${city}/${puja}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.95,
  }));

  const shlokaEntries = [
    { url: `${BASE_URL}/shlokas`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 },
    ...SHLOKAS.map((s) => ({
      url: `${BASE_URL}/shlokas/${s.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];

  // I-09 residual (triage 2026-08-15): `/help` was in the sitemap but nothing
  // below it was, so the seven English guides had zero crawler discovery.
  //
  // The filter is the load-bearing half. app/help/articles/[lang]/[slug] serves
  // `robots: { index: false }` for exactly the articles where
  // `isUnreviewedTranslation` is true (a non-English translation with no human
  // reviewer). Listing a noindex URL in a sitemap is a Search Console error, so
  // the same predicate that de-indexes an article must also keep it out of
  // here — imported rather than re-derived so the two cannot drift.
  const helpArticleEntries = HELP_ARTICLES.filter((a) => !isUnreviewedTranslation(a)).map(
    (a) => ({
      url: `${BASE_URL}/help/articles/${a.lang}/${a.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    }),
  );

  // Pages whose rendered body is derived from the current date on every
  // request, verified against each route: /today (day deity + tithi +
  // next-festival countdown), /panchang and /panchang/[city] (today's
  // panchang), the per-rashi horoscope hub and its /today child (getDailyHoroscope
  // for the current IST date), and choghadiya/rahu-kalam/hora (sunrise-relative
  // tables for the current date, revalidate 86400). These, and only these, can
  // honestly claim today's date as lastmod.
  const dailyUrls = new Set<string>([
    `${BASE_URL}/today`,
    `${BASE_URL}/panchang`,
    `${BASE_URL}/astrology/choghadiya`,
    `${BASE_URL}/astrology/rahu-kalam`,
    `${BASE_URL}/astrology/hora`,
    ...citySlugs().map((slug) => `${BASE_URL}/panchang/${slug}`),
    ...rashiSlugs().flatMap((slug) => [
      `${BASE_URL}/astrology/horoscope/${slug}`,
      `${BASE_URL}/astrology/horoscope/${slug}/today`,
    ]),
  ]);

  return finalizeSitemap([
    ...topLevelEntries,
    ...secondaryEntries,
    ...templeEntries,
    ...pujaEntries,
    ...yatraEntries,
    ...yatraDestEntries,
    ...deityEntries,
    ...deityMantraEntries,
    ...aartiEntries,
    ...chalisaEntries,
    ...festivalEntries,
    ...cityEntries,
    ...panchangCityEntries,
    ...rashiEntries,
    ...blogEntries,
    ...bookEntries,
    ...pilgrimageEntries,
    ...nakshatraEntries,
    ...muhuratEntries,
    ...rashiProfileEntries,
    ...vratEntries,
    ...chantEntries,
    ...tirthaEntries,
    ...jyotirlingaEntries,
    ...shaktiPeethEntries,
    ...rudrakshaEntries,
    ...ashtaLakshmiEntries,
    ...adityaEntries,
    ...saptaMathrukaEntries,
    ...tithiEntries,
    ...yogaEntries,
    ...karanaEntries,
    ...masaEntries,
    ...panchaBhootaEntries,
    ...panchaPakshiEntries,
    ...navadurgaEntries,
    ...mahavidyasEntries,
    ...ekadashiEntries,
    ...navaratnaEntries,
    ...calendarMonthEntries,
    ...navaGrahaEntries,
    ...gitaEntries,
    ...ramayanaEntries,
    ...mahabharataEntries,
    ...vipassanaEntries,
    ...upanishadEntries,
    ...yogaSutraEntries,
    ...samskaraEntries,
    ...puranaEntries,
    ...darshanaEntries,
    ...vedaEntries,
    ...dashavatarEntries,
    ...saptaRishiEntries,
    ...chakraEntries,
    ...sacredTreeEntries,
    ...hinduSymbolEntries,
    ...sacredRiverEntries,
    ...vedicYajnaEntries,
    ...bhaktiSaintEntries,
    ...langEntries,
    taChennaiEntry,
    ...shlokaEntries,
    ...helpArticleEntries,
    ...freePanditEntries,
    ...cityPujaEntries,
    { url: `${BASE_URL}/yatra/destinations`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 },
  ], contentDates, dailyUrls);
}
// force CF Pages full re-deploy ARE-phase5-1780955800
