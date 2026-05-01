/**
 * Gaushala lead scraper.
 *
 * Strategy: NDDB / DAHD India gaushala directory pages, plus state-level
 * gaushala mahasangh listings. Cheerio extraction.
 *
 * Run:
 *   pnpm tsx apps/api/scripts/leads/scrape-gaushalas.ts
 */
import * as cheerio from 'cheerio';
import { politeFetch, runScrape, type RawLead } from './_shared.js';

interface DirectorySource {
  source: string;
  urls: string[];
  itemSelector: string;
  parse: ($el: cheerio.Cheerio<any>, $: cheerio.CheerioAPI) => Partial<RawLead> | null;
}

const SOURCES: DirectorySource[] = [
  {
    source: 'nddb',
    urls: [
      'https://www.dahd.nic.in/division/gaushalas',
      'https://www.dahd.nic.in/related-links/gaushalas-directory',
    ],
    itemSelector: 'table tbody tr, .gaushala-row',
    parse: ($el) => {
      const cells = $el.find('td');
      if (cells.length < 2) return null;
      const name = cells.eq(0).text().trim();
      const city = cells.eq(1).text().trim() || null;
      const state = cells.eq(2).text().trim() || null;
      const phone = $el.find('a[href^="tel:"]').first().text().replace(/[^\d+]/g, '') || null;
      const email = $el.find('a[href^="mailto:"]').first().attr('href')?.replace(/^mailto:/, '') ?? null;
      if (!name) return null;
      return { name, city, state, phone, email };
    },
  },
  {
    source: 'gaushala_mahasangh',
    urls: [
      'https://gaushalamahasangh.org/gaushalas',
      'https://gaushalamahasangh.org/gaushalas?state=rajasthan',
      'https://gaushalamahasangh.org/gaushalas?state=gujarat',
      'https://gaushalamahasangh.org/gaushalas?state=uttar-pradesh',
      'https://gaushalamahasangh.org/gaushalas?state=maharashtra',
      'https://gaushalamahasangh.org/gaushalas?state=madhya-pradesh',
      'https://gaushalamahasangh.org/gaushalas?state=haryana',
    ],
    itemSelector: '.gaushala-card, .listing-item',
    parse: ($el) => {
      const name = $el.find('h3, .gaushala-name').first().text().trim();
      const city = $el.find('.city, .location').first().text().trim() || null;
      const state = $el.find('.state').first().text().trim() || null;
      const phone = $el.find('a[href^="tel:"]').first().text().replace(/[^\d+]/g, '') || null;
      const email = $el.find('a[href^="mailto:"]').first().attr('href')?.replace(/^mailto:/, '') ?? null;
      if (!name) return null;
      return { name, city, state, phone, email };
    },
  },
  {
    source: 'justdial_gaushala',
    urls: [
      'https://www.justdial.com/Delhi/Gaushala/nct-10000000',
      'https://www.justdial.com/Mumbai/Gaushala/nct-10000000',
      'https://www.justdial.com/Jaipur/Gaushala/nct-10000000',
      'https://www.justdial.com/Ahmedabad/Gaushala/nct-10000000',
      'https://www.justdial.com/Pune/Gaushala/nct-10000000',
      'https://www.justdial.com/Vrindavan/Gaushala/nct-10000000',
      'https://www.justdial.com/Mathura/Gaushala/nct-10000000',
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
];

async function fetchAndParse(
  source: DirectorySource,
  upsert: (raw: RawLead) => Promise<unknown>,
): Promise<void> {
  for (const url of source.urls) {
    try {
      const res = await politeFetch(url);
      if (!res.ok) {
        console.warn(`[gaushalas] ${source.source} ${url} -> HTTP ${res.status}`);
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
      console.warn(`[gaushalas] error fetching ${url}:`, (err as Error).message);
    }
  }
}

async function main(): Promise<void> {
  await runScrape('GAUSHALA', 'gaushalas', async ({ upsert }) => {
    for (const source of SOURCES) {
      await fetchAndParse(source, upsert);
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('scrape-gaushalas.ts')) {
  main().catch((err) => {
    console.error('[gaushalas] fatal:', err);
    process.exit(1);
  });
}

export { fetchAndParse, SOURCES };
