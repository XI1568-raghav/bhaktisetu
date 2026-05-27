// Edge OG card for temple detail pages. Loads from API at request time
// with 1h revalidate. Falls back to a slug-derived title when the API is
// asleep/cold so the share card always renders.
import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';

type TempleCard = {
  name: string;
  deity?: string;
  city?: string;
  state?: string;
  established?: string;
};

async function loadTemple(slug: string): Promise<TempleCard> {
  try {
    const base = API.endsWith('/api/v1') ? API : `${API.replace(/\/$/, '')}/api/v1`;
    const r = await fetch(`${base}/temples/${encodeURIComponent(slug)}`, {
      headers: { 'user-agent': 'darshya-og/1.0' },
      next: { revalidate: 3600 },
    });
    if (!r.ok) throw new Error(`api ${r.status}`);
    const j = await r.json();
    return {
      name: j.name || slug,
      deity: j.primaryDeity || j.deity,
      city: j.city || j.locationCity,
      state: j.state || j.locationState,
      established: j.established,
    };
  } catch {
    return { name: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) };
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const temple = await loadTemple(slug);
  const location = [temple.city, temple.state].filter(Boolean).join(', ');

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 64,
          background:
            'linear-gradient(135deg, #fef3c7 0%, #fcd34d 45%, #f59e0b 100%)',
          fontFamily: 'serif',
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 12, background: '#92400e' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 28, fontWeight: 700, color: '#451a03', marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: '#92400e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🕉</div>
          <span>Darshya · Sacred Temple</span>
        </div>

        {temple.deity ? (
          <div style={{ display: 'flex', fontSize: 24, color: '#7c2d12', textTransform: 'uppercase', letterSpacing: 4, fontWeight: 600, marginBottom: 12 }}>
            {temple.deity}
          </div>
        ) : null}

        <div style={{ display: 'flex', fontSize: 72, lineHeight: 1.1, color: '#1c1917', fontWeight: 800, marginBottom: 20, maxWidth: 1080 }}>
          {temple.name}
        </div>

        {location ? (
          <div style={{ display: 'flex', fontSize: 30, color: '#451a03', marginBottom: 16 }}>
            📍 {location}
          </div>
        ) : null}

        {temple.established ? (
          <div style={{ display: 'flex', fontSize: 22, color: '#78350f' }}>
            Established · {temple.established}
          </div>
        ) : null}

        <div style={{ display: 'flex', fontSize: 22, color: '#78350f', marginTop: 24 }}>
          Live darshan · Book puja · Verified temple
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'absolute', bottom: 48, left: 64, right: 64, fontSize: 22, color: '#451a03' }}>
          <span>Visit virtually</span>
          <span style={{ fontWeight: 700 }}>darshya.online</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' },
    },
  );
}
