import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, MapPin, BadgeCheck, Heart, Info } from 'lucide-react';
import { getGaushalaImage, remoteImage, IMG_W } from '../../../../lib/images';
import { API_BASE_URL } from '../../../../lib/api-config';
import { H1 } from '../../../../components/ui/heading-recipe';

/**
 * COM-07 (prod sweep 2026-08-12): /gaushala rendered a strip headed "Verified
 * gaushalas on Darshya — Approved gaushalas you can support directly" listing
 * real onboarded profiles, every card linking to /gaushala/<uuid>. All of them
 * 404'd: `/gaushala/[id]` is the adoptable-COW detail route, with
 * `dynamicParams = false` and generateStaticParams over cow ids, and the API
 * behind it resolved only the gs_00x fixtures. Four real partners had no
 * reachable page and no way to receive a donation.
 *
 * This is the real gaushala page, on its own static segment so it does not
 * collide with the cow route. Everything rendered comes from the profile — no
 * fixture cows, no invented cow counts, no borrowed photos of another shelter's
 * herd beyond the generic shelter illustration.
 */

interface GaushalaDetail {
  id: string;
  name: string;
  location: string;
  description: string;
  address: string;
  totalCows: number;
  verified: boolean;
  source: string;
  donationCauseId: string;
}

async function fetchGaushala(id: string): Promise<GaushalaDetail | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/gaushala/${encodeURIComponent(id)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { gaushala?: GaushalaDetail };
    return json.gaushala ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const gaushala = await fetchGaushala(id);
  const name = gaushala?.name ?? 'Gaushala';
  return {
    title: `${name} — Gau Seva`,
    // TC-11. The fallback said "Support a verified gaushala on Darshya. Your
    // donation reaches the shelter directly." Two claims, neither backed:
    // nothing in the product writes GaushalaProfile.verified (the admin path
    // sets `approved`, the gaushala portal never mentions verification), and
    // "reaches the shelter directly" is a settlement promise — the money lands
    // in Darshya's Razorpay account and the gaushala's share is released by
    // hand, because no automated payout rail is live. "Approved" is the word
    // for the process that actually runs, and it is the word /gaushala already
    // uses.
    description: gaushala?.description?.slice(0, 155) ||
      'Support an approved gaushala on Darshya. Contributions are recorded against the shelter and appear in its portal.',
    alternates: { canonical: `https://darshya.online/gaushala/profile/${id}` },
  };
}

export default async function GaushalaProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gaushala = await fetchGaushala(id);
  if (!gaushala) notFound();

  const donateHref = `/donations?causeId=${encodeURIComponent(
    gaushala.donationCauseId,
  )}&causeKind=gaushala&causeName=${encodeURIComponent(gaushala.name)}`;

  return (
    <div className="min-h-[100dvh] bg-surface-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/gaushala"
          className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-saffron-600 mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Gau Seva
        </Link>

        <div className="overflow-hidden rounded-2xl border border-surface-100 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={remoteImage(getGaushalaImage('cow-shelter'), IMG_W.HERO)}
            alt=""
            width={1200}
            height={480}
            className="h-56 w-full object-cover sm:h-72"
          />

          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className={H1.catalogue}>
                  {gaushala.name}
                </h1>
                {gaushala.location && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm text-surface-500">
                    <MapPin className="h-4 w-4" />
                    {gaushala.location}
                  </p>
                )}
              </div>
              {/* TC-11. This badge read "Verified gaushala", gated on
                  GaushalaProfile.verified. Nothing in the product ever writes
                  that column — admin.service.ts sets `approved`,
                  routes/gaushala-portal.ts does not mention verification, and
                  the only `verified: true` in apps/api is a mock fixture — so
                  the badge is unreachable today and one manual SQL update away
                  from publishing a credential nobody checked. What the API
                  guarantees instead is real and worth saying: GET /gaushala/:id
                  filters `where: { approved: true }`, so reaching this page at
                  all means the profile was approved by hand before listing. */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <BadgeCheck className="h-3.5 w-3.5" />
                Approved gaushala
              </span>
            </div>

            {gaushala.description && (
              <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-surface-600">
                {gaushala.description}
              </p>
            )}

            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-surface-100 pt-6 sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-surface-400">Cows in care</dt>
                <dd className="mt-1 text-lg font-semibold text-surface-800">
                  {gaushala.totalCows > 0 ? gaushala.totalCows.toLocaleString('en-IN') : 'Not stated'}
                </dd>
              </div>
              {gaushala.address && (
                <div className="col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-surface-400">Address</dt>
                  <dd className="mt-1 text-sm text-surface-700">{gaushala.address}</dd>
                </div>
              )}
            </dl>

            <div className="mt-8">
              <Link
                href={donateHref}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-6 py-3 font-medium text-white hover:bg-emerald-800"
              >
                <Heart className="h-5 w-5" />
                Donate to this gaushala
              </Link>
            </div>

            {/* Honest about what this page does not have. The cow-adoption
                roster belongs to the seed catalogue, not to this shelter. */}
            <p className="mt-6 flex items-start gap-2 rounded-lg bg-surface-50 p-4 text-xs text-surface-500">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              This gaushala has not published individual cow profiles on Darshya yet. Donations go
              to the shelter and appear in its portal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
