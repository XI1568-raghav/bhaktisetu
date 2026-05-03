export const runtime = 'edge';

import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Heart,
  ChevronRight,
  MapPin,
  Shield,
  FileText,
  Sparkles,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { IMAGES } from '../../lib/images';
import { getTemples } from '../../lib/api';
import DonationForm from '../../components/DonationForm';

export const metadata: Metadata = {
  title: 'Donate to Temples & Gaushalas',
  description:
    'Support verified temples and gaushalas across India. 80G tax-deductible donations with instant PDF receipts. Razorpay-secured payments via Darshya.',
};

// ─── Static gaushala causes ─────────────────────────────────────
// These mirror the ids used in app/gaushala/page.tsx so that linking
// in either direction works without an extra API round-trip.
const gaushalaCauses = [
  {
    id: 'gs_001',
    name: 'Shri Krishna Gaushala',
    location: 'Vrindavan, Uttar Pradesh',
    image: IMAGES.gaushala['cow-shelter'],
    description: 'ISKCON-affiliated; home to 500+ rescued cows.',
    cowCount: 500,
  },
  {
    id: 'gs_002',
    name: 'Kamdhenu Gaushala',
    location: 'Jaipur, Rajasthan',
    image: IMAGES.gaushala['tharparkar-cow'],
    description: 'Government-registered; 50-acre campus with 1,200+ cows.',
    cowCount: 1200,
  },
  {
    id: 'gs_003',
    name: 'Gokul Gaushala',
    location: 'Mathura, Uttar Pradesh',
    image: IMAGES.gaushala['gir-cow'],
    description: 'Heritage gaushala (since 1952); breed conservation focus.',
    cowCount: 350,
  },
];

// ─── Page ───────────────────────────────────────────────────────

export default async function DonationsLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ causeId?: string; causeKind?: string; causeName?: string }>;
}) {
  const sp = await searchParams;
  const t = await getTranslations('donations');
  const tCommon = await getTranslations('common');
  const tTerms = await getTranslations('terms');

  // If the URL points at a specific cause (deep-linked from a temple or
  // gaushala detail page), render the form directly.
  if (sp.causeId && sp.causeName) {
    const causeKind = sp.causeKind === 'temple' ? 'temple' : 'gaushala';
    return (
      <div className="min-h-screen bg-surface-50">
        <div className="border-b border-surface-100 bg-white">
          <div className="mx-auto max-w-4xl px-4 py-3 sm:px-6">
            <nav className="flex items-center gap-2 text-sm text-surface-500">
              <Link href="/" className="hover:text-saffron-600">Home</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link href="/donations" className="hover:text-saffron-600">Donate</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="font-medium text-surface-700">{sp.causeName}</span>
            </nav>
          </div>
        </div>

        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
          <DonationForm
            causeId={sp.causeId}
            causeName={sp.causeName}
            causeKind={causeKind}
          />
        </div>
      </div>
    );
  }

  // List view: fetch a few verified temples to show alongside gaushalas.
  // If the API is offline, fall back to gaushalas only — the page should
  // never crash because of a degraded backend.
  let temples: Awaited<ReturnType<typeof getTemples>>['data'] = [];
  try {
    const res = await getTemples({ limit: 6 });
    temples = res.data ?? [];
  } catch {
    temples = [];
  }

  return (
    <div className="min-h-screen bg-surface-50">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-saffron-50 via-amber-50 to-rose-50">
        <div className="mx-auto max-w-5xl px-6 py-14 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-saffron-700 shadow-sm backdrop-blur">
              <Heart className="h-3.5 w-3.5" /> {t('tax80G')}
            </div>
            <h1 className="mb-3 text-3xl font-bold text-surface-900 sm:text-4xl">
              {t('pageTitle')}
            </h1>
            <p className="mb-6 text-base text-surface-600 sm:text-lg">
              {t('pageSubtitle')}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-surface-500">
              <span className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-emerald-600" /> {t('trustSecure')}
              </span>
              <span className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-saffron-600" /> {t('instantReceipt')}
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500" /> {t('trustVerified')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Gaushalas ────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-surface-900">
              <Heart className="h-6 w-6 text-emerald-600" /> {tTerms('gauSeva')}
            </h2>
            <p className="mt-1 text-sm text-surface-500">
              {t('gaushalaCauses')}
            </p>
          </div>
          <Link
            href="/gaushala"
            className="hidden text-sm font-semibold text-saffron-600 hover:text-saffron-700 sm:inline-flex sm:items-center sm:gap-1"
          >
            {tCommon('viewAll')} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {gaushalaCauses.map((g) => (
            <CauseCard
              key={g.id}
              imageUrl={g.image}
              title={g.name}
              location={g.location}
              description={g.description}
              meta={`${g.cowCount}+ cows`}
              donateHref={`/donations?causeId=${encodeURIComponent(g.id)}&causeKind=gaushala&causeName=${encodeURIComponent(g.name)}`}
              accent="emerald"
            />
          ))}
        </div>
      </section>

      {/* ── Temples ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-surface-900">
              <Building2 className="h-6 w-6 text-saffron-600" /> {t('templeCauses')}
            </h2>
            <p className="mt-1 text-sm text-surface-500">
              {t('selectCause')}
            </p>
          </div>
          <Link
            href="/temples"
            className="hidden text-sm font-semibold text-saffron-600 hover:text-saffron-700 sm:inline-flex sm:items-center sm:gap-1"
          >
            {tCommon('viewAll')} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {temples.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {temples.map((t) => {
              const firstImg = t.images?.[0];
              const img =
                typeof firstImg === 'string'
                  ? firstImg
                  : firstImg && typeof firstImg === 'object' && 'url' in firstImg
                  ? firstImg.url
                  : IMAGES.gaushala['cow-shelter'];
              return (
                <CauseCard
                  key={t.id}
                  imageUrl={img}
                  title={t.name}
                  location={`${t.city ?? ''}${t.state ? ', ' + t.state : ''}`}
                  description={(t.description ?? '').slice(0, 100)}
                  meta={t.deityPrimary ?? 'Temple'}
                  donateHref={`/donations?causeId=${encodeURIComponent(t.id)}&causeKind=temple&causeName=${encodeURIComponent(t.name)}`}
                  accent="saffron"
                />
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-surface-200 bg-white p-6 text-center text-sm text-surface-500">
            Temple donation listings are temporarily unavailable. Please try again shortly.
          </p>
        )}
      </section>
    </div>
  );
}

// ─── Reusable card ──────────────────────────────────────────────

function CauseCard({
  imageUrl,
  title,
  location,
  description,
  meta,
  donateHref,
  accent,
}: {
  imageUrl: string;
  title: string;
  location: string;
  description: string;
  meta: string;
  donateHref: string;
  accent: 'saffron' | 'emerald';
}) {
  const accentBtn =
    accent === 'emerald'
      ? 'bg-emerald-600 hover:bg-emerald-700'
      : 'bg-saffron-600 hover:bg-saffron-700';

  return (
    <article className="group overflow-hidden rounded-xl border border-surface-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-semibold text-surface-700 shadow-sm backdrop-blur">
          {meta}
        </span>
      </div>

      <div className="p-4">
        <h3 className="text-base font-semibold text-surface-900">{title}</h3>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-surface-500">
          <MapPin className="h-3 w-3" /> {location}
        </p>
        {description && (
          <p className="mt-2 line-clamp-2 text-sm text-surface-600">{description}</p>
        )}

        <Link
          href={donateHref}
          className={`mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg ${accentBtn} px-4 py-2 text-sm font-semibold text-white`}
        >
          <Heart className="h-4 w-4" /> Donate
        </Link>
      </div>
    </article>
  );
}
