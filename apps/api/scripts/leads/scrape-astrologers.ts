/**
 * Astrologer lead scraper.
 *
 * Strategy: Justdial city listings + AstroSage public profile pages.
 * Cheerio extraction; same polite-throttle pattern as priests scraper.
 *
 * Run:
 *   pnpm tsx apps/api/scripts/leads/scrape-astrologers.ts
 */
import * as cheerio from 'cheerio';
import { politeFetch, runScrape, type RawLead } from './_shared.js';
import { ASTROLOGER_SEED } from './_astrologer-seed.js';

interface DirectorySource {
  source: string;
  urls: string[];
  itemSelector: string;
  parse: ($el: cheerio.Cheerio<any>, $: cheerio.CheerioAPI) => Partial<RawLead> | null;
}

const SOURCES: DirectorySource[] = [
  {
    source: 'justdial',
    urls: [
      'https://www.justdial.com/Delhi/Astrologers/nct-10000341',
      'https://www.justdial.com/Mumbai/Astrologers/nct-10000341',
      'https://www.justdial.com/Bangalore/Astrologers/nct-10000341',
      'https://www.justdial.com/Pune/Astrologers/nct-10000341',
      'https://www.justdial.com/Chennai/Astrologers/nct-10000341',
      'https://www.justdial.com/Hyderabad/Astrologers/nct-10000341',
      'https://www.justdial.com/Kolkata/Astrologers/nct-10000341',
      'https://www.justdial.com/Jaipur/Astrologers/nct-10000341',
      'https://www.justdial.com/Ahmedabad/Astrologers/nct-10000341',
      'https://www.justdial.com/Lucknow/Astrologers/nct-10000341',
      'https://www.justdial.com/Varanasi/Astrologers/nct-10000341',
      'https://www.justdial.com/Surat/Astrologers/nct-10000341',
    ],
    itemSelector: '.resultbox, .cntanr',
    parse: ($el) => {
      const name = $el.find('.lng_cont_name, .resultbox_title_anchor').first().text().trim();
      const phone = $el.find('.callcontent, .callNowAnchor').first().text().replace(/[^\d+]/g, '') || null;
      const city = $el.find('.locatcity, .resultbox_address').first().text().trim() || null;
      if (!name) return null;
      return { name, city, phone, email: null };
    },
  },
  {
    source: 'astrosage',
    urls: [
      'https://www.astrosage.com/astrologer/',
      'https://www.astrosage.com/astrologer/page/2/',
      'https://www.astrosage.com/astrologer/page/3/',
      'https://www.astrosage.com/astrologer/page/4/',
      'https://www.astrosage.com/astrologer/page/5/',
      'https://www.astrosage.com/astrologer/page/6/',
      'https://www.astrosage.com/astrologer/page/7/',
      'https://www.astrosage.com/astrologer/page/8/',
    ],
    itemSelector: '.astrologer-card, .astro-list-item, [data-astrologer]',
    parse: ($el) => {
      const name = $el.find('h3, .astro-name').first().text().trim();
      const city = $el.find('.city, .location').first().text().trim() || null;
      const phone = $el.find('a[href^="tel:"]').first().text().replace(/[^\d+]/g, '') || null;
      const email = $el.find('a[href^="mailto:"]').first().attr('href')?.replace(/^mailto:/, '') ?? null;
      if (!name) return null;
      return { name, city, phone, email };
    },
  },
];

async function fetchAndParse(
  source: DirectorySource,
  upsert: (raw: RawLead) => Promise<unknown>,
): Promise<void> {
  for (const url of source.urls) {
    try {
      const res = await politeFetch(url);
      if (!res.ok) {
        console.warn(`[astrologers] ${source.source} ${url} -> HTTP ${res.status}`);
        continue;
      }
      const html = await res.text();
      const $ = cheerio.load(html);
      const items = $(source.itemSelector);
      items.each((_i, el) => {
        const parsed = source.parse($(el), $);
        if (!parsed?.name) return;
        void upsert({
          name: parsed.name,
          city: parsed.city ?? null,
          state: parsed.state ?? null,
          country: 'India',
          phone: parsed.phone ?? null,
          email: parsed.email ?? null,
          source: source.source,
          sourceUrl: url,
          metadata: { listingPage: url, ...parsed.metadata },
        });
      });
    } catch (err) {
      console.warn(`[astrologers] error fetching ${url}:`, (err as Error).message);
    }
  }
}

async function main(): Promise<void> {
  await runScrape('ASTROLOGER', 'astrologers', async ({ upsert }) => {
    console.log(`[astrologers] seeding ${ASTROLOGER_SEED.length} static astrologers first`);
    for (const lead of ASTROLOGER_SEED) await upsert(lead);
    for (const source of SOURCES) {
      await fetchAndParse(source, upsert);
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('scrape-astrologers.ts')) {
  main().catch((err) => {
    console.error('[astrologers] fatal:', err);
    process.exit(1);
  });
}

export { fetchAndParse, SOURCES };
