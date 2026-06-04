import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const contentType = 'image/png';

/**
 * Darshya brand-default OG card (1200x630).
 *
 * Used by 55+ pages as openGraph fallback when no page-specific OG asset exists.
 * Saffron→amber gradient, ॐ glyph, wordmark, tagline. Edge-rendered, no remote fonts.
 *
 * Restored 2026-06-05 Phase D-7 — replaces 66 dead refs to missing /og/default.
 */
export async function GET() {
 return new ImageResponse(
 (
 <div
 style={{
 width: '100%',
 height: '100%',
 display: 'flex',
 flexDirection: 'column',
 alignItems: 'center',
 justifyContent: 'center',
 background: 'linear-gradient(135deg, #E16318 0%, #F99A48 55%, #FFC107 100%)',
 fontFamily: 'system-ui, -apple-system, sans-serif',
 color: '#fff',
 padding: '64px',
 }}
 >
 <div
 style={{
 fontSize: 220,
 lineHeight: 1,
 marginBottom: 24,
 textShadow: '0 4px 24px rgba(0,0,0,0.15)',
 }}
 >
 {'ॐ'}
 </div>
 <div
 style={{
 fontSize: 96,
 fontWeight: 800,
 letterSpacing: '-0.03em',
 textShadow: '0 2px 12px rgba(0,0,0,0.18)',
 }}
 >
 Darshya
 </div>
 <div
 style={{
 fontSize: 36,
 fontWeight: 500,
 marginTop: 16,
 opacity: 0.95,
 textAlign: 'center',
 maxWidth: 900,
 }}
 >
 {"India's Devotional Super App"}
 </div>
 <div
 style={{
 fontSize: 24,
 marginTop: 36,
 opacity: 0.85,
 display: 'flex',
 gap: 24,
 }}
 >
 <span>Live Darshan</span>
 <span>·</span>
 <span>Puja Booking</span>
 <span>·</span>
 <span>Vedic Astrology</span>
 <span>·</span>
 <span>80G Receipts</span>
 </div>
 <div
 style={{
 fontSize: 22,
 marginTop: 64,
 opacity: 0.75,
 letterSpacing: '0.05em',
 }}
 >
 darshya.online
 </div>
 </div>
 ),
 {
 width: 1200,
 height: 630,
 headers: {
 'cache-control': 'public, max-age=86400, immutable',
 },
 }
 );
}
