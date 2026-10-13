import type { NextRequest } from 'next/server';
import { ogCard, titleFromSlug } from '../../../../lib/og-card';
import { getTempleBySlug } from '../../../../lib/api';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let name = titleFromSlug(slug.slice(0, 80));
  let place = '';
  try {
    const t = await getTempleBySlug(slug);
    if (t?.name) name = t.name;
    place = [t?.city, t?.state].filter(Boolean).join(', ');
  } catch {
    // unknown temple: fall back to the slug-derived title
  }
  return ogCard({ eyebrow: 'Temple on Darshya', title: name, lines: place ? [place, 'Book a puja performed in your name'] : ['Book a puja performed in your name'] });
}
