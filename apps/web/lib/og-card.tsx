import { ImageResponse } from 'next/og';

const SIZE = { width: 1200, height: 630 };

// Devanagari glyphs are not in the default OG font; without a font the shloka
// renders as boxes. Fetched once per instance; if the fetch fails the card
// still renders (Latin text only) rather than the route 500ing.
let devanagari: ArrayBuffer | null | undefined;
async function loadDevanagari(): Promise<ArrayBuffer | null> {
  if (devanagari !== undefined) return devanagari;
  try {
    const res = await fetch(
      'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-devanagari@5.0.8/files/noto-sans-devanagari-devanagari-500-normal.woff',
    );
    devanagari = res.ok ? await res.arrayBuffer() : null;
  } catch {
    devanagari = null;
  }
  return devanagari;
}

export function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export async function ogCard(opts: {
  eyebrow: string;
  title: string;
  lines?: string[];
  footer?: string;
  titleSize?: number;
}): Promise<ImageResponse> {
  const font = await loadDevanagari();
  const { eyebrow, title, lines = [], footer = 'darshya.online', titleSize = 68 } = opts;
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 55%, #fdba74 100%)',
          fontFamily: font ? 'Noto Sans Devanagari' : 'sans-serif',
          color: '#431407',
        }}
      >
        <div style={{ display: 'flex', fontSize: 28, letterSpacing: 4, textTransform: 'uppercase', color: '#c2410c' }}>
          {eyebrow}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: titleSize, fontWeight: 700, lineHeight: 1.2 }}>{title}</div>
          {lines.map((l, i) => (
            <div key={i} style={{ display: 'flex', fontSize: 32, marginTop: 20, color: '#7c2d12' }}>
              {l}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: '#9a3412' }}>{footer}</div>
      </div>
    ),
    {
      ...SIZE,
      ...(font ? { fonts: [{ name: 'Noto Sans Devanagari', data: font, weight: 500 as const, style: 'normal' as const }] } : {}),
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' },
    },
  );
}
