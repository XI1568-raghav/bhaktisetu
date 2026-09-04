import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * DATED-COVERAGE (inventory sweep 2026-08-24) — the seed catalogue is what the
 * festival calendar sells against, and in the year's peak window it does not
 * cover the calendar.
 *
 * Measured on 2026-08-24 against `apps/web/lib/festivals.ts` over the next 90
 * days (2026-08-24 -> 2026-11-22): 22 dated festivals, of which 13 resolve to
 * at least one bookable puja slug and 9 resolve to NONE. Navaratri
 * (2026-10-12), Durga Puja (2026-10-19) and Chhath (2026-11-15) — three of the
 * biggest commerce days of the Hindu year — all resolved to zero, because
 * `pujasAvailable` names `durga-puja` / `navaratri-puja` /
 * `durga-saptashati-path` / `chandi-homam` / `surya-puja` and the catalogue
 * sold none of them. `resolveBookablePujas` (festivals.ts) drops an unmatched
 * slug rather than redirecting it somewhere plausible, so the festival page
 * renders no CTA at all.
 *
 * The second half of the same measurement: `offeringPlan` covered 5 of the 20
 * seeded temples (25 offerings), so 15 temples — Vaishno Devi, Shirdi,
 * Badrinath, Meenakshi Amman, Dwarkadhish, ISKCON Bangalore, Dagdusheth and
 * eight more — had ZERO bookable offerings. A temple page with nothing to book
 * is a dead end no amount of festival traffic can convert.
 *
 * WHY this test parses source text instead of importing it: `prisma/seed.ts`
 * calls `main()` at module scope (seed.ts, last statement), so importing it
 * would open a Prisma connection and try to write to a database. `offeringPlan`
 * is also a local `const` inside `main()` and is not exported at all. Reading
 * the file is the only way to assert on it, and it keeps this test free of any
 * DB dependency — it is a data-shape test, not an integration test.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SEED_PATH = path.resolve(HERE, '../../prisma/seed.ts');
const ENUM_LABELS_PATH = path.resolve(HERE, '../../../web/lib/enum-labels.ts');
const LABELS_MARKER = 'PUJA_SLUG_LABELS: Readonly<Record<string, string>> = Object.freeze({';

/**
 * Both files are CRLF on this checkout (Windows, `core.autocrlf` unset). Every
 * structural regex below anchors on `\n  {`, which never matches `\r\n  {` —
 * left unnormalised the parse silently yields ZERO objects and every coverage
 * assertion passes vacuously. Normalising at read time is the only place this
 * can be fixed once.
 */
const readNormalised = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

const seedSrc = readNormalised(SEED_PATH);
const enumLabelsSrc = readNormalised(ENUM_LABELS_PATH);

/** Text between `startMarker` and the first line that is exactly `endLine`. */
function sliceBlock(src: string, startMarker: string, endLine: string): string {
  const start = src.indexOf(startMarker);
  if (start === -1) throw new Error(`marker not found: ${startMarker}`);
  const from = start + startMarker.length;
  const end = src.indexOf(`\n${endLine}`, from);
  if (end === -1) throw new Error(`terminator not found after: ${startMarker}`);
  return src.slice(from, end);
}

const templesBlock = sliceBlock(seedSrc, 'const templesData = [', '];');
const pujasBlock = sliceBlock(seedSrc, 'const pujaTypesData = [', '];');
const offeringBlock = sliceBlock(
  seedSrc,
  'const offeringPlan: Record<string, string[]> = {',
  '  };',
);
const labelBlock = sliceBlock(enumLabelsSrc, LABELS_MARKER, '});');

/**
 * One entry per top-level object literal inside a seeded array.
 *
 * `(?=\n|$)` rather than `(?=\n)`: `sliceBlock` cuts the body immediately
 * before the array's closing `\n];`, so the LAST object ends at end-of-string
 * with no trailing newline. A `\n`-only lookahead silently drops it — which is
 * how a first run reported 19 temples and 9 pujas and called
 * pitru-dosh-nivaran-puja an unknown slug.
 */
function objectBlocks(arrayBody: string): string[] {
  return [...arrayBody.matchAll(/\n {2}\{\n([\s\S]*?)\n {2}\},?(?=\n|$)/g)].map((m) => m[1]!);
}

type Temple = { slug: string; tradition: string; deities: string; raw: string };

const temples: Temple[] = [];
for (const raw of objectBlocks(templesBlock)) {
  const slug = /\n?\s*slug: '([^']+)'/.exec(raw)?.[1];
  if (!slug) continue;
  temples.push({
    slug,
    tradition: /tradition: '(\w+)'/.exec(raw)?.[1] ?? '',
    deities: /deities: \[([^\]]*)\]/.exec(raw)?.[1] ?? '',
    raw,
  });
}

type Puja = {
  slug: string;
  name: string;
  deity: string;
  basePrice: number;
  nriPrice: number;
};

const pujas: Puja[] = [];
for (const raw of objectBlocks(pujasBlock)) {
  const slug = /\n?\s*slug: '([^']+)'/.exec(raw)?.[1];
  if (!slug) continue;
  pujas.push({
    slug,
    name: /\n?\s*name: '([^']+)'/.exec(raw)?.[1] ?? '',
    deity: /\n?\s*deity: '([^']+)'/.exec(raw)?.[1] ?? '',
    basePrice: Number(/basePrice: (\d+)/.exec(raw)?.[1] ?? NaN),
    nriPrice: Number(/nriPrice: (\d+)/.exec(raw)?.[1] ?? NaN),
  });
}

/** templeSlug -> puja slugs, exactly as `offeringPlan` declares them. */
const offerings = new Map<string, string[]>();
for (const m of offeringBlock.matchAll(/'([a-z0-9-]+)': \[([^\]]*)\]/g)) {
  offerings.set(
    m[1]!,
    [...m[2]!.matchAll(/'([^']+)'/g)].map((x) => x[1]!),
  );
}

/** puja slug -> temple slugs offering it. */
const templesByPuja = new Map<string, string[]>();
for (const [templeSlug, pujaSlugs] of offerings) {
  for (const p of pujaSlugs) {
    templesByPuja.set(p, [...(templesByPuja.get(p) ?? []), templeSlug]);
  }
}

const labelledSlugs = new Set(
  [...labelBlock.matchAll(/^\s*'?([a-z0-9-]+)'?:/gm)].map((m) => m[1]!),
);

describe('seed parse sanity', () => {
  // If the parse silently drifts, every assertion below becomes vacuously
  // true — the one failure mode a text-parsing test has that an import-based
  // one does not. These guard it.
  it('parses every seeded temple, puja and offering row', () => {
    expect(temples.length).toBe(20);
    expect(pujas.length).toBeGreaterThanOrEqual(10);
    expect(offerings.size).toBeGreaterThan(0);
    expect(labelledSlugs.size).toBeGreaterThanOrEqual(10);
    for (const p of pujas) {
      expect(p.name, `${p.slug} name`).not.toBe('');
      expect(p.deity, `${p.slug} deity`).not.toBe('');
      expect(Number.isFinite(p.basePrice), `${p.slug} basePrice`).toBe(true);
    }
  });

  it('names only real slugs on both sides of offeringPlan', () => {
    const templeSlugs = new Set(temples.map((t) => t.slug));
    const pujaSlugs = new Set(pujas.map((p) => p.slug));
    for (const [templeSlug, pujaList] of offerings) {
      expect(
        templeSlugs.has(templeSlug),
        `offeringPlan key ${templeSlug} is not a seeded temple`,
      ).toBe(true);
      for (const p of pujaList) {
        expect(
          pujaSlugs.has(p),
          `${templeSlug} offers ${p}, which is not a seeded puja`,
        ).toBe(true);
      }
    }
  });
});

describe('temple offering coverage', () => {
  it('gives every seeded temple at least one bookable offering', () => {
    const dark = temples
      .filter((t) => (offerings.get(t.slug) ?? []).length === 0)
      .map((t) => t.slug);
    expect(dark, `temples with no bookable offering: ${dark.join(', ')}`).toEqual([]);
  });

  it('never leaves a SKU dependent on a single temple', () => {
    // A SKU sold by exactly one temple dies the moment that temple's priest is
    // unavailable, and it appears in no city or deity browse that excludes that
    // temple. Two is the floor for a catalogue row to be real inventory.
    const thin = pujas
      .map((p) => [p.slug, (templesByPuja.get(p.slug) ?? []).length] as const)
      .filter(([, n]) => n < 2);
    expect(thin, `SKUs offered by fewer than 2 temples: ${JSON.stringify(thin)}`).toEqual([]);
  });

  it('gives the festival-dark SKUs a wider temple base than the catalogue floor', () => {
    // These four are named by NO festival in the 90-day window (measured
    // 2026-08-24 — see the file header). Every other SKU has at least one
    // festival page funnelling traffic to it; for these, temple inventory is
    // the ONLY discovery route a devotee has. The 2-temple floor above keeps a
    // SKU alive; it does not compensate for having no festival entry point at
    // all, so these carry a strictly higher floor.
    const festivalDark = [
      'maha-mrityunjay-jaap',
      'sunderkand-path',
      'hanuman-chalisa-path',
      'ram-charit-manas-path',
    ];
    for (const slug of festivalDark) {
      const hosts = templesByPuja.get(slug) ?? [];
      expect(
        hosts.length,
        `${slug} is offered by ${hosts.length} temple(s): ${hosts.join(', ')}`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it('assigns offerings selectively rather than giving every temple the whole catalogue', () => {
    // Deity-appropriate assignment is the point. A Ganesha-only temple listing
    // a Chhath arghya next to a Rudrabhishek reads as a shopfront nobody has
    // ever been inside — a credibility failure, not a coverage win.
    for (const [templeSlug, pujaList] of offerings) {
      expect(pujaList.length, `${templeSlug} offers the entire catalogue`).toBeLessThan(
        pujas.length,
      );
      expect(new Set(pujaList).size, `${templeSlug} lists a duplicate puja`).toBe(
        pujaList.length,
      );
    }
  });
});

describe('peak-window SKU gaps', () => {
  it('sells a Durga/Chandi puja under a slug the Navaratri calendar names', () => {
    // festivals.ts — Sharad Navaratri (2026-10-12) `pujasAvailable` is
    // ['durga-puja', 'navaratri-puja'], and Dussehra (2026-10-20) names
    // 'durga-puja' too. `resolveBookablePujas` matches the catalogue slug
    // EXACTLY (after its own alias table), so the SKU lights those pages up
    // only if it is seeded under one of those literal slugs.
    const durga = pujas.find((p) => p.slug === 'durga-puja');
    expect(durga, 'no durga-puja SKU in pujaTypesData').toBeDefined();
    expect(durga!.deity).toMatch(/durga|chandi|devi/i);
  });

  it('sells a Surya puja under the slug the Chhath calendar names', () => {
    // festivals.ts — Chhath Puja (2026-11-15) `pujasAvailable` is
    // ['surya-puja'], its only entry.
    const surya = pujas.find((p) => p.slug === 'surya-puja');
    expect(surya, 'no surya-puja SKU in pujaTypesData').toBeDefined();
    expect(surya!.deity).toMatch(/surya|sun|aditya/i);
  });

  it('prices every SKU on the existing ladder', () => {
    // The seeded ladder is Rs.451-Rs.3,501 with nriPrice at 9-10x. A new row
    // outside it makes the catalogue look assembled by two different people.
    // (nriPrice is not charged at checkout today — the column exists and the
    // other 10 rows carry it, so new rows must too.)
    for (const p of pujas) {
      expect(p.basePrice, `${p.slug} basePrice`).toBeGreaterThanOrEqual(451);
      expect(p.basePrice, `${p.slug} basePrice`).toBeLessThanOrEqual(3501);
      const ratio = p.nriPrice / p.basePrice;
      expect(ratio, `${p.slug} nriPrice ratio ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(8.5);
      expect(ratio, `${p.slug} nriPrice ratio ${ratio.toFixed(2)}`).toBeLessThanOrEqual(10);
    }
  });

  it('places the Devi SKU only at temples with a real Devi shrine', () => {
    // A Chandi path booked at a temple with no Devi murti is not a stretch, it
    // is wrong — and a devotee knows it on sight. Qualifying anchor: the temple
    // is shakta, or its seeded `deities` list actually names a form of Devi.
    const hosts = templesByPuja.get('durga-puja') ?? [];
    expect(hosts.length, 'durga-puja is offered by no temple').toBeGreaterThan(0);
    for (const slug of hosts) {
      const t = temples.find((x) => x.slug === slug)!;
      const anchored =
        t.tradition === 'shakta' ||
        /durga|kali|parvati|devi|amman|shakti|gauri|ambal/i.test(t.deities);
      expect(
        anchored,
        `${slug} offers durga-puja but names no Devi in its deities: ${t.deities}`,
      ).toBe(true);
    }
  });

  it('never places the Chhath SKU at a temple that is shut on Chhath', () => {
    // Chhath 2026 falls on 2026-11-15. Badrinath's seeded timingInfo says
    // "Closed in winter (approx Nov-Apr)" — selling a 15 November arghya there
    // would take money for a ritual nobody could perform.
    const hosts = templesByPuja.get('surya-puja') ?? [];
    expect(hosts.length, 'surya-puja is offered by no temple').toBeGreaterThan(0);
    for (const slug of hosts) {
      const t = temples.find((x) => x.slug === slug)!;
      expect(
        /closed in winter/i.test(t.raw),
        `${slug} is winter-closed but offers surya-puja`,
      ).toBe(false);
    }
  });
});

describe('reader-facing labels', () => {
  it('has a PUJA_SLUG_LABELS entry for every seeded SKU', () => {
    // enum-labels.ts is the only thing standing between a primary key and a
    // homepage CTA: NextFestivalStrip renders `Book {pujaSlugLabel(slug)}`.
    // humanizeEnum would turn 'durga-puja' into 'Durga Puja' by luck; the map
    // is what makes it deliberate, and it is where the first name that is NOT
    // the title-cased slug has to live.
    const missing = pujas.map((p) => p.slug).filter((s) => !labelledSlugs.has(s));
    expect(missing, `seeded SKUs with no reader-facing label: ${missing.join(', ')}`).toEqual([]);
  });

  it('labels each SKU with the name it is seeded under', () => {
    // The CTA and the page it lands on must say the same words — the label map
    // is a copy of the seed `name` column, not a second naming decision.
    for (const p of pujas) {
      if (!labelledSlugs.has(p.slug)) continue;
      const row = new RegExp(`'?${p.slug}'?: '([^']+)'`).exec(labelBlock);
      expect(row?.[1], `${p.slug} label`).toBe(p.name);
    }
  });
});
