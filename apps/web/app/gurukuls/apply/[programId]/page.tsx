
import type { Metadata } from 'next';
import ApplyClient from './ApplyClient';

interface Params { programId: string }

// Per-programme canonical: a single hardcoded `metadata.alternates.canonical`
// on a dynamic segment would declare every programme's apply page to be the
// same URL (prod sweep 2026-08-12, SEO-01).
export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { programId } = await params;
  return {
    title: 'Apply — Gurukul Admission',
    alternates: { canonical: `https://darshya.online/gurukuls/apply/${programId}` },
    description:
      'Submit a gurukul admission application with parent consent if applicant is a minor.',
  };
}

export default async function ApplyPage({ params }: { params: Promise<Params> }) {
  const { programId } = await params;
  return <ApplyClient programId={programId} />;
}
