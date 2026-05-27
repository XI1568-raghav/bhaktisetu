#!/usr/bin/env node
// SEO Internal Linker — crawls top SEO pages, builds inbound-link graph,
// flags orphan / low-inbound pages, suggests linking opportunities.
// Output: docs/agent-reports/YYYY-MM-DD-seo-internal-linker.md
import { fetchText, writeReport, WEB_BASE, TODAY } from './_lib.mjs';

// Seed URLs grouped by surface. Each surface is the set the agent crawls
// to count inbound links to every other surface.
const SEEDS = [
  '/', '/pujas', '/temples', '/deity', '/festival', '/city',
  '/aarti', '/chalisa', '/today', '/blog', '/shlokas', '/yatra',
  '/astrology', '/astrology/horoscope', '/panchang',
];

// High-value programmatic landing targets we want inbound links to.
const TARGETS = [
  '/deity/shiva', '/deity/vishnu', '/deity/ganesha', '/deity/devi',
  '/deity/hanuman', '/deity/krishna', '/deity/rama', '/deity/lakshmi',
  '/festival/maha-shivratri', '/festival/diwali', '/festival/navaratri',
  '/festival/krishna-janmashtami', '/festival/ganesh-chaturthi',
  '/festival/dussehra', '/festival/karwa-chauth',
  '/city/varanasi', '/city/tirupati', '/city/mumbai', '/city/ayodhya',
  '/aarti/om-jai-jagdish-hare', '/aarti/hanuman-aarti',
  '/chalisa/hanuman-chalisa', '/chalisa/ganesh-chalisa',
  '/today', '/refer', '/nri', '/shloka-card',
];

function extractLinks(html, base) {
  const re = new RegExp(`href=["'](?:${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})?(/[^"'#?]*)["']`, 'g');
  const set = new Set();
  let m;
  while ((m = re.exec(html))) set.add(m[1]);
  return set;
}

async function run() {
  const inboundMap = new Map();
  for (const t of TARGETS) inboundMap.set(t, []);

  const seedFetches = [];
  for (const seed of SEEDS) {
    const { status, text } = await fetchText(`${WEB_BASE}${seed}`);
    seedFetches.push({ seed, status, ok: status === 200 });
    if (status !== 200) continue;
    const links = extractLinks(text, WEB_BASE);
    for (const target of TARGETS) {
      if (links.has(target) && target !== seed) {
        inboundMap.get(target).push(seed);
      }
    }
  }

  const rows = TARGETS.map((t) => ({
    target: t,
    inbound: inboundMap.get(t),
    count: inboundMap.get(t).length,
  })).sort((a, b) => a.count - b.count);

  const orphans = rows.filter((r) => r.count === 0);
  const weak = rows.filter((r) => r.count > 0 && r.count <= 1);
  const healthy = rows.filter((r) => r.count >= 2);

  const suggestions = orphans.slice(0, 10).map((o) => {
    const guessSource = guessLinkSource(o.target);
    return `- Add link to \`${o.target}\` from ${guessSource}`;
  });

  const body = `# SEO Internal Linker — ${TODAY}

> Crawls ${SEEDS.length} seed surfaces, counts inbound links to ${TARGETS.length} high-value targets. Surfaces orphan + low-link pages so they get boosted in pagerank.

## Summary

- **Seeds crawled OK**: ${seedFetches.filter((s) => s.ok).length}/${SEEDS.length}
- **Orphans (0 inbound)**: ${orphans.length}
- **Weak (1 inbound)**: ${weak.length}
- **Healthy (≥2 inbound)**: ${healthy.length}

## Orphan targets (highest priority to fix)

${orphans.length === 0
    ? '_None — every target has ≥1 inbound link._'
    : orphans.map((o) => `- \`${o.target}\``).join('\n')}

## Weak targets (need 1+ more inbound)

${weak.length === 0
    ? '_None._'
    : weak.map((w) => `- \`${w.target}\` ← linked from: ${w.inbound.map((s) => `\`${s}\``).join(', ')}`).join('\n')}

## Top linking opportunities

${suggestions.length === 0 ? '_All targets healthy._' : suggestions.join('\n')}

## Full inbound link graph

| Target | Inbound count | Linked from |
|---|---|---|
${rows.map((r) => `| \`${r.target}\` | ${r.count} | ${r.inbound.map((s) => `\`${s}\``).join(', ') || '—'} |`).join('\n')}

## Action items

${[
  orphans.length > 0 ? `- Add inbound links to ${orphans.length} orphan pages (see suggestions above)` : null,
  weak.length > 0 ? `- Strengthen ${weak.length} pages with only 1 inbound link` : null,
  '- Add cross-link blocks: deity → aarti/chalisa/mantras; city → temples/pujas; festival → deity/puja',
  '- Use lib/* dictionaries to auto-render contextual link blocks on detail pages',
].filter(Boolean).join('\n')}

---
*Agent: seo-internal-linker · base: ${WEB_BASE}*
`;

  writeReport('seo-internal-linker', body);
  return { orphans: orphans.length, weak: weak.length, healthy: healthy.length };
}

function guessLinkSource(target) {
  if (target.startsWith('/deity/')) return '`/deity` index + related city/festival pages';
  if (target.startsWith('/festival/')) return '`/festival` index + `/today` + relevant deity page';
  if (target.startsWith('/city/')) return '`/city` index + relevant deity page';
  if (target.startsWith('/aarti/')) return '`/aarti` index + matching deity page';
  if (target.startsWith('/chalisa/')) return '`/chalisa` index + matching deity page';
  if (target === '/today') return 'home page hero + global nav';
  if (target === '/refer') return 'post-booking confirmation + profile page';
  if (target === '/nri') return 'home page NRI section + footer';
  if (target === '/shloka-card') return '/shlokas index + blog posts';
  return 'home page and related content surfaces';
}

run().then((s) => {
  console.log('Internal linker summary:', JSON.stringify(s));
  process.exit(0);
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
