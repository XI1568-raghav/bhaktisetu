// Brand-default 1200x630 OG card. Lives at /og/default and replaces the
// missing /og-default.png referenced from several layouts/metadata blocks.
// Edge runtime, 24h cache.
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(): Promise<Response> {
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
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 12,
            background: '#E16318',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 48,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              background: '#E16318',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 38,
            }}
          >
            ॐ
          </div>
          <span
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: '#7c2d12',
            }}
          >
            Darshya
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 64,
            lineHeight: 1.15,
            color: '#1f2937',
            fontWeight: 700,
            marginBottom: 24,
            maxWidth: 1000,
          }}
        >
          India’s Devotional Super App
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 28,
            lineHeight: 1.5,
            color: '#374151',
            maxWidth: 1000,
          }}
        >
          Live darshan · Puja with video proof · Panchang · Sanskrit · Gurukuls ·
          Gaushala seva · AI pandit
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'absolute',
            bottom: 48,
            left: 64,
            right: 64,
            fontSize: 24,
            color: '#92400e',
          }}
        >
          <span>Sanatan Dharma · daily companion</span>
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
