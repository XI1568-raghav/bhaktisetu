/**
 * Wellness instructor lead scraper.
 *
 * Strategy: Yoga Alliance India teacher directory search results pages
 * filtered to country=India, plus a few Justdial yoga-instructor city pages
 * as a backstop.
 *
 * Run:
 *   pnpm tsx apps/api/scripts/leads/scrape-wellness.ts
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
    source: 'yoga_alliance',
    urls: [
      'https://www.yogaalliance.org/Directory_Search?Country=India&Page=1',
      'https://www.yogaalliance.org/Directory_Search?Country=India&Page=2',
      'https://www.yogaalliance.org/Directory_Search?Country=India&Page=3',
      'https://www.yogaalliance.org/Directory_Search?Country=India&Page=4',
      'https://www.yogaalliance.org/Directory_Search?Country=India&Page=5',
      'https://www.yogaalliance.org/Directory_Search?Country=India&Page=6',
      'https://www.yogaalliance.org/Directory_Search?Country=India&Page=7',
      'https://www.yogaalliance.org/Directory_Search?Country=India&Page=8',
      'https://www.yogaalliance.org/Directory_Search?Country=India&Page=9',
      'https://www.yogaalliance.org/Directory_Search?Country=India&Page=10',
    ],
    itemSelector: '.directory-result, .ya-directory-item, tr.directory-row',
    parse: ($el) => {
      const name = $el.find('.name, h3, td.name').first().text().trim();
      const city = $el.find('.city, td.city, .location').first().text().trim() || null;
      const state = $el.find('.state, td.state').first().text().trim() || null;
      const phone = $el.find('a[href^="tel:"]').first().attr('href')?.replace(/^tel:/, '') ?? null;
      const email = $el.find('a[href^="mailto:"]').first().attr('href')?.replace(/^mailto:/, '') ?? null;
      if (!name) return null;
      return { name, city, state, phone, email };
    },
  },
  {
    source: 'justdial_yoga',
    urls: [
      'https://www.justdial.com/Delhi/Yoga-Classes/nct-10183022',
      'https://www.justdial.com/Mumbai/Yoga-Classes/nct-10183022',
      'https://www.justdial.com/Bangalore/Yoga-Classes/nct-10183022',
      'https://www.justdial.com/Rishikesh/Yoga-Classes/nct-10183022',
      'https://www.justdial.com/Pune/Yoga-Classes/nct-10183022',
      'https://www.justdial.com/Chennai/Yoga-Classes/nct-10183022',
      'https://www.justdial.com/Hyderabad/Yoga-Classes/nct-10183022',
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
        console.warn(`[wellness] ${source.source} ${url} -> HTTP ${res.status}`);
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
      console.warn(`[wellness] error fetching ${url}:`, (err as Error).message);
    }
  }
}

async function main(): Promise<void> {
  await runScrape('WELLNESS_INSTRUCTOR', 'wellness', async ({ upsert }) => {
    for (const source of SOURCES) {
      await fetchAndParse(source, upsert);
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('scrape-wellness.ts')) {
  main().catch((err) => {
    console.error('[wellness] fatal:', err);
    process.exit(1);
  });
}

export { fetchAndParse, SOURCES };
