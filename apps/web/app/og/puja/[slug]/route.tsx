// Edge OG card for puja detail pages. Loads the puja from the API at
// request time (cached at the CDN for 24h) so the card always reflects
// the current title + temple + price.
import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';

type PujaCard = {
  title: string;
  temple?: string;
  deity?: string;
  price?: string;
};

async function loadPuja(slug: string): Promise<PujaCard> {
  try {
    const base = API.endsWith('/api/v1') ? API : `${API.replace(/\/$/, '')}/api/v1`;
    const r = await fetch(`${base}/pujas/${encodeURIComponent(slug)}`, {
      headers: { 'user-agent': 'darshya-og/1.0' },
      // Avoid hitting the API too hard from edge — 1h cache.
      next: { revalidate: 3600 },
    });
    if (!r.ok) throw new Error(`api ${r.status}`);
    const j = await r.json();
    return {
      title: j.title || j.name || slug,
      temple: j.temple?.name,
      deity: j.deity,
      price: j.basePrice ? `₹${Number(j.basePrice).toLocaleString('en-IN')}` : undefined,
    };
  } catch {
    // Fallback when API is down — use slug as title so the card still renders.
    return { title: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) };
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const puja = await loadPuja(slug);

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
            'linear-gradient(135deg, #fff7ed 0%, #fde9c8 45%, #f7d7a3 100%)',
          fontFamily: 'serif',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 12,
            background: '#E16318',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 28, fontWeight: 700, color: '#7c2d12', marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: '#E16318', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>ॐ</div>
          <span>Darshya · Book Puja</span>
        </div>

        <div style={{ display: 'flex', fontSize: 24, color: '#92400e', textTransform: 'uppercase', letterSpacing: 4, fontWeight: 600, marginBottom: 12 }}>
          {puja.deity || 'Sacred Puja'}
        </div>

        <div style={{ display: 'flex', fontSize: 64, lineHeight: 1.15, color: '#1f2937', fontWeight: 700, marginBottom: 24, maxWidth: 1080 }}>
          {puja.title}
        </div>

        {puja.temple ? (
          <div style={{ display: 'flex', fontSize: 28, color: '#7c2d12', marginBottom: 16 }}>
            at {puja.temple}
          </div>
        ) : null}

        {puja.price ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
            <div style={{ display: 'flex', padding: '12px 24px', borderRadius: 12, background: '#E16318', color: '#fff', fontSize: 32, fontWeight: 700 }}>
              {puja.price}
            </div>
            <div style={{ display: 'flex', fontSize: 22, color: '#374151' }}>
              Video proof · Verified pandits · 80G eligible
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', fontSize: 22, color: '#374151', marginTop: 8 }}>
            Video proof · Verified pandits · Book online
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'absolute', bottom: 48, left: 64, right: 64, fontSize: 22, color: '#92400e' }}>
          <span>Book online</span>
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
