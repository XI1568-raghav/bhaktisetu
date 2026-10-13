import type { NextRequest } from 'next/server';
import { ogCard } from '../../../lib/og-card';

export const runtime = 'nodejs';

const clip = (v: string | null, n: number) => (v ?? '').slice(0, n);

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const text = clip(q.get('text'), 220) || 'ॐ भूर्भुवः स्वः';
  const lines = [clip(q.get('translit'), 200), clip(q.get('meaning'), 240)].filter(Boolean);
  const source = clip(q.get('source'), 80);
  return ogCard({ eyebrow: 'Shloka', title: text, lines, footer: source ? `${source} · darshya.online` : 'darshya.online', titleSize: text.length > 90 ? 42 : 56 });
}
