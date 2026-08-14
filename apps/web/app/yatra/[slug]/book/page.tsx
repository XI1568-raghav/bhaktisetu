import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getYatraBySlug } from '../../../../lib/yatra-data';

// Per-package SEO landing → hands off to canonical /yatra/book multi-step
// flow which honours ?slug=. R-Q2-P-003 success criterion: per-package
// route resolves end-to-end (5 packages: char-dham, vaishno-devi,
// tirupati-south, ayodhya-kashi, shirdi-sai).

export const revalidate = 86400;

type Params = { slug: string };
type Search = Record<string, string | string[] | undefined>;

const TIERS = ['economy', 'standard', 'premium'] as const;
type Tier = (typeof TIERS)[number];

function readTier(sp: Search | undefined): Tier | null {
  const raw = sp?.tier;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return TIERS.includes(value as Tier) ? (value as Tier) : null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const yatra = getYatraBySlug(slug);
  if (!yatra) {
    return { title: 'Yatra package not found' };
  }
  // COM-08: this description used to promise a secure payment-gateway
  // checkout. It is a SERP promise the page cannot keep — no payment gateway
  // script is loaded anywhere in the yatra flow, and /yatra/book's only network
  // call is POST /api/v1/yatra-inquiry/, a lead form. The page itself already
  // says the honest thing
  // ("Payment link emailed after our team confirms availability. No charge
  // now."); only the snippet that got people here was lying. Describe the
  // request-a-booking flow that actually exists.
  return {
    title: `Request a booking — ${yatra.title} (pandit-curated package)`,
    description: `Request a booking for ${yatra.title}: ${yatra.durationDays} days, all-inclusive package from ₹${yatra.startingPrice.toLocaleString('en-IN')} per person. Verified pandits, hotel + transport handled. Our yatra desk confirms availability and emails your payment link — no charge when you submit.`,
    alternates: { canonical: `/yatra/${slug}/book` },
  };
}

export default async function PerPackageBookPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams?: Promise<Search>;
}) {
  const { slug } = await params;
  const yatra = getYatraBySlug(slug);
  if (!yatra) notFound();
  // COM-17: the package page links here as ?tier=economy|standard|premium and
  // the destination reads `tier` from its own query string — but this redirect
  // dropped it, so every buyer who deliberately chose premium landed on
  // standard, at a lower price with different inclusions.
  const tier = readTier(searchParams ? await searchParams : undefined);
  redirect(`/yatra/book?slug=${slug}${tier ? `&tier=${tier}` : ''}`);
}
