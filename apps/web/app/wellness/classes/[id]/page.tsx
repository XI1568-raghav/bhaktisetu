import type { Metadata } from 'next';
import ClassDetailClient from './ClassDetailClient';

// Public shell only (the class is fetched client-side): safe to cache at the edge.
export const revalidate = 3600;

/**
 * SEO-09 (prod sweep 2026-08-12) — every /wellness/classes/<id> URL served the
 * root layout's title and description, so each live class shared a SERP entry
 * reading "Darshya — India's Devotional Super App" with the homepage and with
 * every other class.
 *
 * The canonical is built from `id` so each class URL claims itself. A single
 * hardcoded canonical under a dynamic segment is the SEO-01 defect — it tells
 * Google every class is the same page — and __tests__/seo/
 * canonical-and-next-assets.test.ts fails on exactly that shape.
 *
 * HONEST LIMIT: the title and description are section-level, not per-class.
 * The class itself is fetched client-side by ClassDetailClient, so nothing on
 * the server knows the instructor, subject or schedule at metadata time, and
 * fetching here would make every class page's HTTP response depend on the API
 * being up. Section-level copy that describes what the page is beats 1,785
 * pages claiming to be the homepage; per-class titles need the fetch to move
 * server-side, which is a change to the page body, not to its metadata.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: 'Live Wellness Class — Schedule, Instructor & Enrolment',
    description:
      'Details for one live Darshya wellness session: what it covers, who teaches it, when it runs, how long it lasts, what it costs and how to enrol.',
    alternates: { canonical: `https://darshya.online/wellness/classes/${id}` },
  };
}

export default function WellnessClassPage() {
  return (
    <div style={{ background: 'var(--color-bg)' }}>
      <ClassDetailClient />
    </div>
  );
}
