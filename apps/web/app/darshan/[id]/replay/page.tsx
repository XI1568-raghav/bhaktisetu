// R-Q1-P-007 — Live darshan recording on-demand (replay last 24h)
//
// Q1 minimal scaffold: lists last-24h auto-recorded aarti segments per temple
// from IVS S3 recording bucket. Env-or-noop when bucket not configured —
// renders honest "Replay coming soon" panel so prod doesn't show fabricated
// recordings. Q2 (R-Q2-E-002) replaces this with permanent archive + CDN.

export const dynamicParams = true;
export const revalidate = 600;
export function generateStaticParams() {
  return [
    'kashi-vishwanath-varanasi',
    'siddhivinayak-mumbai',
    'tirumala-tirupati',
    'iskcon-vrindavan',
    'golden-temple-amritsar',
  ].map((id) => ({ id }));
}

import Link from 'next/link';
import type { Metadata } from 'next';
import { Video, Clock, ArrowLeft, Calendar } from 'lucide-react';

type ReplaySegment = {
  id: string;
  recordedAt: string; // ISO
  label: string; // "Mangala Aarti", "Sandhya Aarti", etc.
  durationMin: number;
  hlsUrl: string | null; // null when env not configured
};

// Env-or-noop: reads IVS recording bucket base URL. Returns [] when missing.
async function listLast24hSegments(templeId: string): Promise<ReplaySegment[]> {
  const bucketBase = process.env.IVS_REPLAY_BUCKET_BASE; // e.g. https://recordings.darshya.online/ivs
  if (!bucketBase) return [];

  // Live-fetch manifest from S3 (when bucket configured).
  // Manifest schema is owned by R-Q2-E-002 ops setup; this scaffold returns []
  // until the founder wires the bucket + manifest endpoint.
  try {
    const res = await fetch(`${bucketBase}/${templeId}/last24h.json`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { segments?: ReplaySegment[] };
    return Array.isArray(data.segments) ? data.segments : [];
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pretty = id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: `${pretty} — Aarti Replay (Last 24h)`,
    description: `Watch last 24 hours of recorded aartis from ${pretty}. Auto-recorded daily, replay anytime.`,
    alternates: { canonical: `/darshan/${id}/replay` },
    openGraph: {
      images: ['/images/golden-temple-og.jpg'],
      title: `${pretty} — Aarti Replay`,
      description: `Last 24 hours of recorded aartis from ${pretty}.`,
      type: 'video.other',
    },
  };
}

export default async function DarshanReplayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const segments = await listLast24hSegments(id);
  const pretty = id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const configured = Boolean(process.env.IVS_REPLAY_BUCKET_BASE);

  return (
    <main className="min-h-[100dvh] bg-surface-50 pb-16">
      <div className="mx-auto max-w-5xl px-4 pt-8">
        <Link
          href={`/darshan/${id}`}
          className="inline-flex items-center gap-1 text-sm text-saffron-700 hover:text-saffron-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back to live darshan
        </Link>

        <header className="mt-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
            <Clock className="h-3.5 w-3.5" /> Last 24h replay
          </div>
          <h1 className="mt-3 font-display text-3xl text-surface-900 sm:text-4xl">
            {pretty} — Aarti Replay
          </h1>
          <p className="mt-2 text-surface-700">
            Catch the aartis you missed. Recordings auto-expire after 24 hours.
            Permanent archive coming Q2 (R-Q2-E-002).
          </p>
        </header>

        {!configured && (
          <section className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="font-display text-xl text-amber-900">Replay coming soon</h2>
            <p className="mt-2 text-sm text-amber-900">
              Auto-recording pipeline for {pretty} is being configured. Once the
              temple&apos;s IVS channel is wired to our recording bucket, the
              last 24 hours of aartis will appear here automatically.
            </p>
            <p className="mt-3 text-xs text-amber-800">
              Tracker: R-Q1-P-007 · Founder action: wire{' '}
              <code className="rounded bg-amber-100 px-1.5 py-0.5">IVS_REPLAY_BUCKET_BASE</code>{' '}
              env + per-temple last24h.json manifest.
            </p>
          </section>
        )}

        {configured && segments.length === 0 && (
          <section className="mt-8 rounded-xl border border-surface-200 bg-white p-6">
            <h2 className="font-display text-xl text-surface-900">No recordings yet</h2>
            <p className="mt-2 text-sm text-surface-700">
              No aarti recordings in the last 24 hours for {pretty}. The next
              scheduled aarti will be recorded automatically.
            </p>
          </section>
        )}

        {segments.length > 0 && (
          <ul className="mt-8 grid gap-4">
            {segments.map((seg) => (
              <li
                key={seg.id}
                className="rounded-xl border border-surface-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-saffron-600" />
                      <h3 className="font-medium text-surface-900">{seg.label}</h3>
                    </div>
                    <p className="mt-1 text-xs text-surface-600">
                      <Calendar className="mr-1 inline h-3 w-3" />
                      {new Date(seg.recordedAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}{' '}
                      · {seg.durationMin} min
                    </p>
                  </div>
                  {seg.hlsUrl ? (
                    <a
                      href={seg.hlsUrl}
                      className="rounded-lg bg-saffron-600 px-4 py-2 text-sm font-medium text-white hover:bg-saffron-700"
                    >
                      Watch
                    </a>
                  ) : (
                    <span className="rounded-lg bg-surface-100 px-4 py-2 text-sm text-surface-500">
                      Processing
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <footer className="mt-12 border-t border-surface-200 pt-6 text-xs text-surface-600">
          <p>
            Roadmap: R-Q1-P-007 (Q1 minimal — last 24h) · Q2 upgrade
            R-Q2-E-002 brings permanent archive + CDN + Schema.org VideoObject.
          </p>
        </footer>
      </div>
    </main>
  );
}
