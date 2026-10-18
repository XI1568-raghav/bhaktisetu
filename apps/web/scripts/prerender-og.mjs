// Pre-renders OG cards to public/og/{puja,temple,shloka}/<slug>.png so the
// Cloudflare Worker serves them as static assets (no next/og CPU per request).
// Run via `pnpm build:cf` (scripts/build-cf.mjs) under tsx; output is
// gitignored. Needs network once for the Devanagari font; if it is
// unreachable, shloka cards are skipped (they would render as boxes) and the
// dynamic routes remain the fallback.
import fs from 'node:fs';
import path from 'node:path';
import { ogCard, titleFromSlug, loadDevanagari } from '../lib/og-card.tsx';
import { ogStaticSlugs } from '../lib/og-static.ts';
import { TEMPLE_DETAILS } from '../lib/temple-details.ts';
import { SHLOKAS } from '../lib/shlokas.ts';

const OUT = path.join(process.cwd(), 'public', 'og');
const clip = (v, n) => (v ?? '').slice(0, n);

async function write(kind, slug, res) {
  const dir = path.join(OUT, kind);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${slug}.png`), Buffer.from(await res.arrayBuffer()));
}

let n = 0;
for (const slug of ogStaticSlugs('puja')) {
  await write('puja', slug, await ogCard({ eyebrow: 'Puja on Darshya', title: titleFromSlug(slug.slice(0, 80)), lines: ['Performed at a temple in India, with video proof'] }));
  n++;
}
for (const slug of ogStaticSlugs('temple')) {
  const t = TEMPLE_DETAILS[slug];
  const place = t ? [t.location, t.state].filter(Boolean).join(', ') : '';
  await write('temple', slug, await ogCard({ eyebrow: 'Temple on Darshya', title: t?.name || titleFromSlug(slug.slice(0, 80)), lines: place ? [place, 'Book a puja performed in your name'] : ['Book a puja performed in your name'] }));
  n++;
}
if (await loadDevanagari()) {
  for (const s of SHLOKAS) {
    const text = clip(s.text, 220) || 'ॐ भूर्भुवः स्वः';
    const lines = [clip(s.translit, 200), clip(s.meaning, 240)].filter(Boolean);
    const source = clip(s.source, 80);
    await write('shloka', s.slug, await ogCard({ eyebrow: 'Shloka', title: text, lines, footer: source ? `${source} · darshya.online` : 'darshya.online', titleSize: text.length > 90 ? 42 : 56 }));
    n++;
  }
} else {
  console.warn('prerender-og: Devanagari font unreachable, skipping shloka cards');
}
console.log(`prerender-og: wrote ${n} cards to ${OUT}`);
