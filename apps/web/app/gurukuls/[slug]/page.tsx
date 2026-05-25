export const runtime = 'edge';

import type { Metadata } from 'next';
import GurukulDetailClient from './GurukulDetailClient';

interface Params { slug: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${slug} — Gurukul`, description: 'Gurukul details, programs, and admission information.' };
}

export default async function GurukulDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  return <GurukulDetailClient slug={slug} />;
}
