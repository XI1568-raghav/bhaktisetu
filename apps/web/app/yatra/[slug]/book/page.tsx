import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getYatraBySlug } from '../../../../lib/yatra-data';

// Per-package SEO landing → hands off to canonical /yatra/book multi-step
// flow which honours ?slug=. R-Q2-P-003 success criterion: per-package
// route resolves end-to-end (5 packages: char-dham, vaishno-devi,
// tirupati-south, ayodhya-kashi, shirdi-sai).

export const revalidate = 86400;

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const yatra = getYatraBySlug(slug);
  if (!yatra) {
    return { title: 'Yatra package not found' };
  }
  return {
    title: `Book ${yatra.title} — pandit-curated package`,
    description: `Book ${yatra.title}: ${yatra.durationDays} days, all-inclusive package starting from ₹${yatra.startingPrice.toLocaleString('en-IN')}. Verified pandits, hotel + transport handled, Razorpay secure checkout.`,
    alternates: { canonical: `/yatra/${slug}/book` },
  };
}

export default async function PerPackageBookPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const yatra = getYatraBySlug(slug);
  if (!yatra) notFound();
  redirect(`/yatra/book?slug=${slug}`);
}
