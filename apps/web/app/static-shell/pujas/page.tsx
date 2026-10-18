// Prerendered copy of /pujas for the query-less landing request. middleware.ts rewrites
// /pujas (no filters/page) here so it is served as a static page instead of being rendered
// per request (the real page reads searchParams, so Next marks it dynamic; the Cloudflare
// Worker free plan has a 10 ms CPU cap). Filtered/paginated URLs still hit the real route.
import type { Metadata } from 'next';
import PujasPage, { metadata as pujasMetadata } from '../../pujas/(index)/page';

export const revalidate = 3600;
export const metadata: Metadata = {
  ...pujasMetadata,
  alternates: { canonical: (pujasMetadata.alternates as { canonical: string }).canonical },
  description: pujasMetadata.description ?? 'Darshya pujas',
};

export default function PujasStaticShell() {
  return <PujasPage searchParams={Promise.resolve({})} />;
}
