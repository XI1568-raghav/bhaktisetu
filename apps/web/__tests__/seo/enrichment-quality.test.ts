import { describe, it, expect } from 'vitest';
import { ENRICHMENT } from '../../lib/enrich';
import { FESTIVALS } from '../../lib/festivals';
import { DEITIES } from '../../lib/deities';
import { TITHIS } from '../../lib/tithis';
import { CITIES } from '../../lib/cities';
import { NAKSHATRAS } from '../../lib/nakshatras';
import { EKADASHIS } from '../../lib/ekadashis';
import { SHAKTI_PEETHS } from '../../lib/shakti-peeths';
import { PANCHANG_YOGAS } from '../../lib/panchang-yogas';
import { PANCHANG_KARANAS } from '../../lib/panchang-karanas';
import { SHLOKAS } from '../../lib/shlokas';
import { VEDIC_MONTHS } from '../../lib/vedic-months';
import { SAMSKARAS } from '../../lib/samskaras';
import { RUDRAKSHAS } from '../../lib/rudrakshas';
import { PURANAS } from '../../lib/puranas';
import { ASHTA_LAKSHMIS } from '../../lib/ashta-lakshmi';
import { DWADASHA_ADITYAS } from '../../lib/dwadasha-aditya';
import { SACRED_MOUNTAINS } from '../../lib/sacred-mountains';
import { JYOTIRLINGAS } from '../../lib/jyotirlingas';
import { NAVADURGA } from '../../lib/navadurga';
import { HINDU_PHILOSOPHIES } from '../../lib/hindu-philosophies';
import { SAPTA_MATHRUKA } from '../../lib/sapta-mathruka';
import { SACRED_TREES } from '../../lib/sacred-trees';
import { SACRED_RIVERS } from '../../lib/sacred-rivers';
import { PANCHA_BHOOTA } from '../../lib/pancha-bhoota';

// Some data sets list a slug twice; the page serves the first match, so one
// enrichment record per distinct slug is correct.
const uniq = (a: string[]) => [...new Set(a)];
const SLUGS = {
  deities: uniq(DEITIES.map((d) => d.slug)),
  festivals: uniq(FESTIVALS.map((f) => f.slug)),
  tithis: uniq(TITHIS.map((t) => t.slug)),
  cities: uniq(CITIES.map((c) => c.slug)),
  nakshatras: uniq(NAKSHATRAS.map((n) => n.slug)),
  ekadashis: uniq(EKADASHIS.map((e) => e.slug)),
  shaktipeeths: uniq(SHAKTI_PEETHS.map((e) => e.slug)),
  yogas: uniq(PANCHANG_YOGAS.map((e) => e.slug)),
  karanas: uniq(PANCHANG_KARANAS.map((e) => e.slug)),
  shlokas: uniq(SHLOKAS.map((e) => e.slug)),
  masas: uniq(VEDIC_MONTHS.map((e) => e.slug)),
  samskaras: uniq(SAMSKARAS.map((e) => e.slug)),
  rudrakshas: uniq(RUDRAKSHAS.map((e) => e.slug)),
  puranas: uniq(PURANAS.map((x) => x.slug)),
  ashtalakshmi: uniq(ASHTA_LAKSHMIS.map((x) => x.slug)),
  adityas: uniq(DWADASHA_ADITYAS.map((x) => x.slug)),
  mountains: uniq(SACRED_MOUNTAINS.map((x) => x.slug)),
  jyotirlingas: uniq(JYOTIRLINGAS.map((x) => x.slug)),
  navadurga: uniq(NAVADURGA.map((x) => x.slug)),
  philosophies: uniq(HINDU_PHILOSOPHIES.map((x) => x.slug)),
  matruka: uniq(SAPTA_MATHRUKA.map((x) => x.slug)),
  trees: uniq(SACRED_TREES.map((x) => x.slug)),
  rivers: uniq(SACRED_RIVERS.map((x) => x.slug)),
  bhoota: uniq(PANCHA_BHOOTA.map((x) => x.slug)),
} as const;

// Claims the product cannot back, plus filler that signals unreviewed text.
const BANNED = [
  /80\s?G/i, /tax[- ]deduct/i, /\bverified (pandit|priest|temple)/i, /live[- ]?stream/i,
  /tamper-proof/i, /samagri (is )?(included|provided)/i, /free delivery/i, /guarantee/i,
  /blessed by (our|temple)/i, /\bMAU\b/, /\bTODO\b/, /lorem ipsum/i, /as an ai/i,
  /\bwe (will|can) (book|arrange|send)\b/i, /\bour (pandits|priests)\b/i,
  // Internal framing must never leak into public prose.
  /\b(the|our|this|in the|from the) (data|dataset|catalogue|catalog|database)\b/i, /\bthe data's\b/i,
  /\b(this|the) (page|entry|record|listing)\b/i, /\bsource (data|field)\b/i,
];

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);
const text = (e: { about: string[]; faqs: { q: string; a: string }[] }) =>
  [...e.about, ...e.faqs.flatMap((f) => [f.q, f.a])].join(' ');

function shingles(s: string, n = 5): Set<string> {
  const w = words(s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' '));
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '));
  return out;
}

describe.each(Object.keys(SLUGS) as (keyof typeof SLUGS)[])('enrichment: %s', (set) => {
  const data = ENRICHMENT[set];
  const slugs = SLUGS[set];

  it('covers every entry and has no orphans', () => {
    expect(slugs.filter((s) => !data[s]), 'missing').toEqual([]);
    expect(Object.keys(data).filter((k) => !slugs.includes(k)), 'unknown slugs').toEqual([]);
  });

  it('every entry has 200+ words, 2+ paragraphs and 2-3 FAQs', () => {
    for (const s of slugs) {
      const e = data[s];
      if (!e) continue;
      expect(e.about.length, `${s} paragraphs`).toBeGreaterThanOrEqual(2);
      expect(words(text(e)).length, `${s} words`).toBeGreaterThanOrEqual(200);
      expect(e.faqs.length, `${s} faqs`).toBeGreaterThanOrEqual(2);
      expect(e.faqs.length, `${s} faqs`).toBeLessThanOrEqual(3);
    }
  });

  it('has no banned claims, markup or placeholder text', () => {
    for (const s of slugs) {
      const e = data[s];
      if (!e) continue;
      const t = text(e);
      for (const re of BANNED) expect(t, `${s} matches ${re}`).not.toMatch(re);
      expect(t, `${s} markup`).not.toMatch(/<[a-z/][^>]*>|\*\*|^#/m);
    }
  });

  it('entries are not near-duplicates of each other (5-gram overlap < 25%)', () => {
    const sh = slugs.filter((s) => data[s]).map((s) => [s, shingles(text(data[s]))] as const);
    for (let i = 0; i < sh.length; i++) {
      for (let j = i + 1; j < sh.length; j++) {
        const [a, A] = sh[i];
        const [b, B] = sh[j];
        const inter = [...A].filter((x) => B.has(x)).length;
        const overlap = inter / Math.max(1, Math.min(A.size, B.size));
        expect(overlap, `${a} vs ${b}`).toBeLessThan(0.25);
      }
    }
  });
});
