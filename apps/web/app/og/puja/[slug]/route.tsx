import type { NextRequest } from 'next/server';
import { ogCard, titleFromSlug } from '../../../../lib/og-card';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return ogCard({ eyebrow: 'Puja on Darshya', title: titleFromSlug(slug.slice(0, 80)), lines: ['Performed at a temple in India, with video proof'] });
}
