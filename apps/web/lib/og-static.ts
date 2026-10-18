import { TEMPLE_DETAILS } from './temple-details';
import { SHLOKAS } from './shlokas';
import { IMAGES } from './images';
import { homePujaCategories } from './home-pujas';

// Cloudflare Workers free plan allows 10 ms CPU per request; next/og (wasm +
// font) cannot meet that. `pnpm build:cf` pre-renders the cards below into
// public/og/<kind>/<slug>.png (scripts/prerender-og.mjs) and sets
// NEXT_PUBLIC_OG_STATIC=1, which makes metadata point at those files. Without
// the flag (Render/Docker, local dev) nothing changes: the dynamic /og/* routes
// keep serving. One list feeds both the script and the metadata so they cannot
// drift.

export type OgKind = 'puja' | 'temple' | 'shloka';

const FALLBACK_TEMPLES = [
  'kashi-vishwanath', 'tirupati-balaji', 'siddhivinayak', 'somnath',
  'jagannath-puri', 'golden-temple', 'meenakshi-temple', 'kedarnath',
  'badrinath', 'akshardham', 'mahakaleshwar', 'dwarkadhish',
  'rameshwaram', 'vaishno-devi', 'baidyanath-dham',
];

export function ogStaticSlugs(kind: OgKind): string[] {
  if (kind === 'temple') return Array.from(new Set([...Object.keys(TEMPLE_DETAILS), ...FALLBACK_TEMPLES]));
  if (kind === 'shloka') return SHLOKAS.map((s) => s.slug);
  const pujas = Object.keys((IMAGES as { pujas: Record<string, string> }).pujas);
  return Array.from(new Set([...pujas, ...homePujaCategories.map((c) => c.slug)]));
}

export function ogStaticEnabled(): boolean {
  return process.env.NEXT_PUBLIC_OG_STATIC === '1';
}

/** Absolute-path URL of the pre-rendered card, or undefined to use the dynamic route. */
export function staticOgPath(kind: OgKind, slug: string): string | undefined {
  if (!ogStaticEnabled()) return undefined;
  return ogStaticSlugs(kind).includes(slug) ? `/og/${kind}/${slug}.png` : undefined;
}
