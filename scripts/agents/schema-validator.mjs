// schema-validator — fetch high-value pages, extract JSON-LD, validate schema.org
// shape. Surfaces missing required fields and broken @context refs. Daily run.

import { writeReport, fetchText, WEB_BASE, TODAY } from './_lib.mjs';

const TARGETS = [
  { url: '/', expected: ['Organization', 'WebSite'] },
  { url: '/pujas', expected: ['ItemList'] },
  { url: '/temples', expected: ['ItemList'] },
  { url: '/nakshatra', expected: ['ItemList'] },
  { url: '/muhurat', expected: ['ItemList'] },
  { url: '/rashi', expected: ['ItemList'] },
  { url: '/faqs', expected: ['FAQPage'] },
  { url: '/pilgrimage', expected: ['ItemList'] },
  { url: '/pilgrimage/char-dham', expected: ['BreadcrumbList', 'TouristTrip'] },
  { url: '/nakshatra/ashwini', expected: ['BreadcrumbList', 'Article'] },
  { url: '/muhurat/brahma-muhurta', expected: ['BreadcrumbList', 'Article'] },
  { url: '/rashi/aries', expected: ['BreadcrumbList', 'Article'] },
  { url: '/why-darshya', expected: ['WebPage'] },
  { url: '/today', expected: [] },
  { url: '/shloka-card', expected: [] },
  { url: '/launch', expected: [] },
];

const JSONLD_RE = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function extractJsonLd(html) {
  const blocks = [];
  let m;
  while ((m = JSONLD_RE.exec(html)) !== null) {
    const raw = m[1].trim();
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        blocks.push({ ok: true, type: item['@type'] || 'unknown', context: item['@context'], item });
      }
    } catch (e) {
      blocks.push({ ok: false, error: String(e).slice(0, 100), raw: raw.slice(0, 120) });
    }
  }
  return blocks;
}

function validate(item) {
  const errors = [];
  if (!item['@context']) errors.push('missing @context');
  else if (!String(item['@context']).includes('schema.org')) errors.push(`@context not schema.org: ${item['@context']}`);
  if (!item['@type']) errors.push('missing @type');

  const t = String(item['@type'] || '');
  if (t === 'BreadcrumbList' && !item.itemListElement) errors.push('BreadcrumbList missing itemListElement');
  if (t === 'ItemList' && !item.itemListElement) errors.push('ItemList missing itemListElement');
  if (t === 'FAQPage' && !item.mainEntity) errors.push('FAQPage missing mainEntity');
  if (t === 'Article' && !item.headline) errors.push('Article missing headline');
  if (t === 'TouristTrip' && !item.name) errors.push('TouristTrip missing name');
  if (t === 'Organization' && !item.name) errors.push('Organization missing name');
  if (t === 'WebSite' && !item.name) errors.push('WebSite missing name');
  return errors;
}

async function probe(target) {
  const { url } = target;
  const { status, text } = await fetchText(`${WEB_BASE}${url}`);
  if (status !== 200) return { url, status, blocks: [], expected: target.expected, missing: target.expected, errors: [`HTTP ${status}`] };

  const blocks = extractJsonLd(text);
  const validBlocks = blocks.filter((b) => b.ok);
  const parseErrors = blocks.filter((b) => !b.ok).map((b) => b.error || 'parse fail');
  const presentTypes = validBlocks.map((b) => b.type);
  const missing = target.expected.filter((e) => !presentTypes.includes(e));
  const schemaErrors = validBlocks.flatMap((b) => validate(b.item).map((e) => `[${b.type}] ${e}`));

  return {
    url,
    status,
    blocks: presentTypes,
    expected: target.expected,
    missing,
    errors: [...parseErrors, ...schemaErrors],
  };
}

async function main() {
  console.log('[schema-validator] starting');
  const results = [];
  for (const t of TARGETS) {
    results.push(await probe(t));
    await new Promise((r) => setTimeout(r, 250));
  }

  const broken = results.filter((r) => r.missing.length > 0 || r.errors.length > 0);
  const ok = results.filter((r) => r.missing.length === 0 && r.errors.length === 0);

  const md = `# Schema.org JSON-LD Validator — ${TODAY}

Validates structured-data blocks on ${TARGETS.length} high-value pages.

## Summary

- Total pages probed: ${results.length}
- Fully valid: ${ok.length}
- Issues found: ${broken.length}

## Issues (action required)

${broken.length === 0 ? '_None — all blocks valid._' : broken.map((r) => `
### \`${r.url}\` (HTTP ${r.status})

- Found types: ${r.blocks.length ? r.blocks.map((b) => `\`${b}\``).join(', ') : '_none_'}
- Expected: ${r.expected.length ? r.expected.map((e) => `\`${e}\``).join(', ') : '_none required_'}
- Missing: ${r.missing.length ? r.missing.map((m) => `\`${m}\``).join(', ') : '_none_'}
${r.errors.length ? `- Errors:\n${r.errors.map((e) => `  - ${e}`).join('\n')}` : ''}
`).join('\n')}

## All pages

| URL | Status | Types found | Missing | Errors |
|---|---|---|---|---|
${results.map((r) => `| \`${r.url}\` | ${r.status} | ${r.blocks.length} | ${r.missing.length} | ${r.errors.length} |`).join('\n')}

---
Probed against ${WEB_BASE}. Re-runs daily via fleet cron.
`;

  writeReport('schema-validator', md);
  console.log(`[schema-validator] ${ok.length}/${results.length} valid, ${broken.length} with issues`);
}

main().catch((e) => {
  console.error('[schema-validator] fatal:', e);
  process.exit(1);
});
