/**
 * Priest lead scraper.
 *
 * Strategy: pull priest directory pages from public discovery sites
 * (okpuja.com, vedicpurohit.com, justdial city pages). Cheerio-extract
 * name, city, contact strings. Polite throttle between requests.
 *
 * Sites are listed in DIRECTORY_URLS — extend per region. If a site is
 * unreachable or its DOM changes, the scraper logs and continues.
 *
 * Run:
 *   pnpm tsx apps/api/scripts/leads/scrape-priests.ts
 */
import * as cheerio from 'cheerio';
import { politeFetch, runScrape, type RawLead } from './_shared.js';

interface DirectorySource {
  source: string;
  urls: string[];
  /** Selector returning a list element per priest. */
  itemSelector: string;
  /** Parser extracting fields from each element. */
  parse: ($el: cheerio.Cheerio<any>, $: cheerio.CheerioAPI) => Partial<RawLead> | null;
}

const DIRECTORY_URLS: DirectorySource[] = [
  {
    source: 'okpuja',
    urls: [
      'https://www.okpuja.com/pandits',
      'https://www.okpuja.com/pandits?city=delhi',
      'https://www.okpuja.com/pandits?city=mumbai',
      'https://www.okpuja.com/pandits?city=bengaluru',
      'https://www.okpuja.com/pandits?city=pune',
      'https://www.okpuja.com/pandits?city=chennai',
      'https://www.okpuja.com/pandits?city=hyderabad',
      'https://www.okpuja.com/pandits?city=kolkata',
      'https://www.okpuja.com/pandits?city=ahmedabad',
      'https://www.okpuja.com/pandits?city=jaipur',
      'https://www.okpuja.com/pandits?city=lucknow',
      'https://www.okpuja.com/pandits?city=varanasi',
    ],
    itemSelector: '.pandit-card, .priest-card, [data-priest]',
    parse: ($el) => {
      const name = $el.find('.name, h3, h4').first().text().trim();
      const city = $el.find('.city, [data-city]').first().text().trim() || null;
      const phoneText = $el.find('.phone, a[href^="tel:"]').first().text().trim();
      const phone = phoneText.replace(/[^\d+]/g, '') || null;
      const emailEl = $el.find('a[href^="mailto:"]').first();
      const email = emailEl.attr('href')?.replace(/^mailto:/, '') ?? null;
      if (!name) return null;
      return { name, city, phone, email };
    },
  },
  {
    source: 'vedicpurohit',
    urls: [
      'https://vedicpurohit.com/pandits',
      'https://vedicpurohit.com/pandits/delhi',
      'https://vedicpurohit.com/pandits/mumbai',
      'https://vedicpurohit.com/pandits/bengaluru',
      'https://vedicpurohit.com/pandits/pune',
      'https://vedicpurohit.com/pandits/chennai',
    ],
    itemSelector: '.purohit-listing, .pandit-list-item',
    parse: ($el) => {
      const name = $el.find('h2, h3, .purohit-name').first().text().trim();
      const phone = $el.find('a[href^="tel:"]').first().text().replace(/[^\d+]/g, '') || null;
      const email = $el.find('a[href^="mailto:"]').first().attr('href')?.replace(/^mailto:/, '') ?? null;
      const city = $el.find('.location, .city').first().text().trim() || null;
      if (!name) return null;
      return { name, city, phone, email };
    },
  },
  {
    source: 'justdial',
    urls: [
      'https://www.justdial.com/Delhi/Pandits/nct-10277249',
      'https://www.justdial.com/Mumbai/Pandits/nct-10277274',
      'https://www.justdial.com/Bangalore/Pandits/nct-10277252',
      'https://www.justdial.com/Pune/Pandits/nct-10277285',
      'https://www.justdial.com/Chennai/Pandits/nct-10277254',
      'https://www.justdial.com/Hyderabad/Pandits/nct-10277266',
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
        console.warn(`[priests] ${source.source} ${url} -> HTTP ${res.status}`);
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
      console.warn(`[priests] error fetching ${url}:`, (err as Error).message);
    }
  }
}

async function main(): Promise<void> {
  await runScrape('PRIEST', 'priests', async ({ upsert }) => {
    for (const source of DIRECTORY_URLS) {
      await fetchAndParse(source, upsert);
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('scrape-priests.ts')) {
  main().catch((err) => {
    console.error('[priests] fatal:', err);
    process.exit(1);
  });
}

export { fetchAndParse, DIRECTORY_URLS };
