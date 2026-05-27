#!/usr/bin/env node
// SEO Agent — daily audit of sitemap + meta tags on top pages + internal-link gaps.
// Output: docs/agent-reports/YYYY-MM-DD-seo-audit.md
import { fetchText, fetchJson, writeReport, WEB_BASE, TODAY } from './_lib.mjs';

const CORE_PAGES = [
  '/', '/pujas', '/temples', '/gurukuls', '/become-gurukul',
  '/sanskrit', '/ved', '/sanatan', '/learn-sanskrit',
  '/about', '/contact', '/pricing',
  '/astrology', '/astrology/horoscope', '/astrology/kundli', '/panchang',
  '/yatra', '/weddings/muhurat',
];

const KEYWORDS = [
  'online puja booking', 'live darshan temple', 'sanskrit lessons free',
  'sanatan dharma knowledge', 'gurukul admission online', 'NRI puja booking',
  'kundli online free', 'panchang today', 'gaushala donation 80G',
];

function extractMeta(html, tag) {
  const m = html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${tag}["'][^>]+content=["']([^"']*)["']`, 'i'));
  return m ? m[1] : null;
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m ? m[1].trim() : null;
}

function countInternalLinks(html, base) {
  const re = new RegExp(`href=["'](?:${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})?(/[^"'#?]*)["']`, 'g');
  const set = new Set();
  let m;
  while ((m = re.exec(html))) set.add(m[1]);
  return set;
}

async function run() {
  const rows = [];
  const allInternalLinks = new Set();
  const orphans = [];

  for (const path of CORE_PAGES) {
    const { status, text } = await fetchText(`${WEB_BASE}${path}`);
    if (status === 0 || status >= 400) {
      rows.push({ path, status, title: null, desc: null, og: null, linkCount: 0, issues: ['FETCH_FAILED'] });
      continue;
    }
    const title = extractTitle(text);
    const desc = extractMeta(text, 'description');
    const og = extractMeta(text, 'og:title') || extractMeta(text, 'og:image');
    const links = countInternalLinks(text, WEB_BASE);
    links.forEach((l) => allInternalLinks.add(l));

    const issues = [];
    if (!title || title.length < 20) issues.push('TITLE_TOO_SHORT');
    if (!desc || desc.length < 80) issues.push('DESC_MISSING_OR_SHORT');
    if (!og) issues.push('NO_OG');
    if (title && title.length > 70) issues.push('TITLE_TOO_LONG');
    if (links.size < 5) issues.push('FEW_INTERNAL_LINKS');

    rows.push({ path, status, title, desc, og, linkCount: links.size, issues });
  }

  // Sitemap presence
  const sitemap = await fetchText(`${WEB_BASE}/sitemap.xml`);
  const sitemapOk = sitemap.status === 200 && sitemap.text.includes('<urlset');
  const sitemapUrls = sitemapOk ? (sitemap.text.match(/<loc>([^<]+)<\/loc>/g) || []).length : 0;

  // Robots.txt
  const robots = await fetchText(`${WEB_BASE}/robots.txt`);
  const robotsOk = robots.status === 200;
  const robotsHasSitemap = robotsOk && /sitemap:/i.test(robots.text);

  // Orphans: core pages not linked from any other core page
  for (const path of CORE_PAGES) {
    if (path !== '/' && !allInternalLinks.has(path)) orphans.push(path);
  }

  const passing = rows.filter((r) => r.issues.length === 0 && r.status === 200).length;
  const failing = rows.length - passing;

  const body = `# SEO Audit — ${TODAY}

> Daily agent. Scans ${CORE_PAGES.length} core pages for title/meta/og + sitemap + robots + orphan detection.

## Summary

- **Pages clean**: ${passing}/${rows.length}
- **Pages with issues**: ${failing}
- **Sitemap**: ${sitemapOk ? `OK (${sitemapUrls} URLs)` : `MISSING (${sitemap.status})`}
- **robots.txt**: ${robotsOk ? (robotsHasSitemap ? 'OK + sitemap directive' : 'OK but missing sitemap directive') : `MISSING (${robots.status})`}
- **Orphan core pages** (not linked from any other core page): ${orphans.length === 0 ? 'none' : orphans.join(', ')}

## Keyword targets (track in GSC)

${KEYWORDS.map((k) => `- \`${k}\``).join('\n')}

## Per-page audit

| Path | HTTP | Title len | Desc len | Internal links | Issues |
|---|---|---|---|---|---|
${rows.map((r) => `| \`${r.path}\` | ${r.status} | ${r.title ? r.title.length : '—'} | ${r.desc ? r.desc.length : '—'} | ${r.linkCount} | ${r.issues.join(', ') || 'OK'} |`).join('\n')}

## Title/description excerpts (first 5 with issues)

${rows.filter((r) => r.issues.length).slice(0, 5).map((r) => `### \`${r.path}\` — ${r.issues.join(', ')}
- **Title**: ${r.title || '(missing)'}
- **Description**: ${r.desc ? r.desc.slice(0, 200) : '(missing)'}
`).join('\n')}

## Action items

${[
  failing > 0 ? `- Fix meta on ${failing} pages above` : null,
  !sitemapOk ? '- Sitemap missing — add `/sitemap.xml` route' : null,
  robotsOk && !robotsHasSitemap ? '- Add `Sitemap: ${WEB_BASE}/sitemap.xml` to robots.txt' : null,
  orphans.length > 0 ? `- Add internal links to orphans: ${orphans.join(', ')}` : null,
  '- Submit sitemap to Google Search Console + Bing Webmaster Tools',
  '- Track keyword rankings weekly via free Google Search Console',
].filter(Boolean).join('\n')}

---
*Agent: seo-audit · base: ${WEB_BASE}*
`;

  writeReport('seo-audit', body);
  return { passing, failing, sitemapOk, robotsOk, orphans: orphans.length };
}

run().then((s) => {
  console.log('SEO summary:', JSON.stringify(s));
  process.exit(0);
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
