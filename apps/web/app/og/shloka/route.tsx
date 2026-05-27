// Edge OG card for a single shloka. Renders a 1200x630 PNG via Next.js
// built-in ImageResponse (no @vercel/og dependency). Used as the og:image
// for shareable shloka pages and by the social-queue / content-publisher
// agents to bake share-ready visuals.
//
// Query params:
//   ?text=<devanagari>   required, the shloka body (URL-encoded)
//   &translit=<latin>    optional transliteration
//   &meaning=<english>   optional meaning
//   &source=<reference>  optional citation (e.g. "Bhagavad Gita 2.47")
//
// All params are sanitised to plain text and capped per-field so a malformed
// URL can't blow up the renderer or be used to inject markup.
import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

const MAX = {
  text: 400,
  translit: 400,
  meaning: 500,
  source: 80,
};

function clip(s: string | null, max: number): string {
  if (!s) return '';
  const trimmed = s.slice(0, max).replace(/[<>]/g, '');
  return trimmed;
}

export async function GET(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const text = clip(url.searchParams.get('text'), MAX.text) || 'ॐ सर्वे भवन्तु सुखिनः';
  const translit = clip(url.searchParams.get('translit'), MAX.translit);
  const meaning = clip(url.searchParams.get('meaning'), MAX.meaning);
  const source = clip(url.searchParams.get('source'), MAX.source) || 'Sanatan Dharma';

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
        {/* Saffron top bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 12,
            background: '#E16318',
          }}
        />

        {/* Brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 28,
            fontWeight: 700,
            color: '#7c2d12',
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              background: '#E16318',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
            }}
          >
            ॐ
          </div>
          <span>Darshya</span>
        </div>

        {/* Shloka */}
        <div
          style={{
            display: 'flex',
            fontSize: 56,
            lineHeight: 1.4,
            color: '#1f2937',
            fontWeight: 600,
            marginBottom: translit || meaning ? 24 : 0,
            whiteSpace: 'pre-wrap',
          }}
        >
          {text}
        </div>

        {translit ? (
          <div
            style={{
              display: 'flex',
              fontSize: 26,
              fontStyle: 'italic',
              color: '#7c2d12',
              marginBottom: 16,
            }}
          >
            {translit}
          </div>
        ) : null}

        {meaning ? (
          <div
            style={{
              display: 'flex',
              fontSize: 24,
              lineHeight: 1.5,
              color: '#374151',
              maxWidth: 1000,
            }}
          >
            {meaning}
          </div>
        ) : null}

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'absolute',
            bottom: 48,
            left: 64,
            right: 64,
            fontSize: 22,
            color: '#92400e',
          }}
        >
          <span>— {source}</span>
          <span style={{ fontWeight: 700 }}>darshya.online</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable',
      },
    },
  );
}
