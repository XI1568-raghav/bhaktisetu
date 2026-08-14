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
import { getTranslations } from '../../lib/t';
import { getGaushalaImage, IMG_W } from '../../lib/images';
import { getTemples, getApprovedProviders } from '../../lib/api';
import DonationForm from '../../components/DonationForm';

export const metadata: Metadata = {
  alternates: { canonical: 'https://darshya.online/donations' },
  title: 'Donate to Temples & Gaushalas',
  description:
    'Support verified temples and gaushalas across India. 80G tax-deductible donations with instant PDF receipts. Razorpay-secured payments via Darshya.',
};

// ─── Verified gaushala causes ──────────────────────────
//
// S-05 (prod sweep 2026-08-12): this list used to be three hardcoded causes
// (`gs_001` Shri Krishna Gaushala, `gs_002` Kamdhenu, `gs_003` Gokul) whose ids
// were written verbatim into `donations.gaushala_id`, while the gaushala portal
// filters donations by the manager's User UUID. A paid ₹2,100 donation with a
// live 80G receipt was therefore invisible to its recipient forever — and two
// of the three causes had no onboarded gaushala behind them at all.
//
// The list now comes from the approved-provider directory, and the cause id is
// the gaushala owner's User id — the key the portal reads. If none are
// approved, the section says so rather than showing causes that cannot receive
// money. POST /donations/create-order refuses an unonboarded donee, so a
// fabricated card here would be a dead donate button.

// ─── Page ───────────────────────────────────────────────────────

export default async function DonationsLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ causeId?: string; causeKind?: string; causeName?: string; planId?: string }>;
}) {
  const sp = await searchParams;
  const t = await getTranslations('donations');
  const tCommon = await getTranslations('common');
  const tTerms = await getTranslations('terms');

  // Gau-seva plan amounts (match the gaushala adoption plan grid). When a
  // cow detail page deep-links with ?planId=, prefill the donation amount so
  // the devotee pays the plan's real price.
  const PLAN_AMOUNTS: Record<string, number> = {
    plan_daily: 51,
    plan_monthly: 3000,
    plan_annual: 30000,
    plan_lifetime: 225000,
  };
  const planAmount = sp.planId ? PLAN_AMOUNTS[sp.planId] : undefined;
  // LC-09: /donations?planId=… with no causeId is the DIRECTORY view — the
  // devotee still has to pick who receives the money. Each cause card rebuilt
  // its own href from scratch, so the plan they had just chosen on /gaushala
  // was dropped at that click and the form opened with an empty amount. Carry
  // it through.
  const planQuery = sp.planId ? `&planId=${encodeURIComponent(sp.planId)}` : '';

  // If the URL points at a specific cause (deep-linked from a temple or
  // gaushala detail page), render the form directly.
  if (sp.causeId && sp.causeName) {
    const causeKind = sp.causeKind === 'temple' ? 'temple' : 'gaushala';
    return (
      <div className="min-h-[100dvh] bg-surface-50">
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
            planAmount={planAmount}
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

  // S-05: real, approved gaushalas only — see the note above the imports.
  const { providers: gaushalaProviders } = await getApprovedProviders('gaushala', { limit: 6 });
  const gaushalaCauses = gaushalaProviders.map((g) => ({
    // The gaushala owner's User id is what donations are keyed on and what the
    // gaushala portal filters by. Fall back to the profile id, which the API
    // also resolves.
    causeId: g.userId || g.id,
    name: g.gaushalaName ?? 'Verified Gaushala',
    location: [g.city, g.state].filter(Boolean).join(', '),
    description: g.description ?? '',
    cowCount: typeof g.totalCows === 'number' ? g.totalCows : 0,
  }));

  return (
    <div className="min-h-[100dvh] bg-surface-50">
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

        {gaushalaCauses.length === 0 && (
          <div className="rounded-xl border border-dashed border-surface-200 bg-white p-8 text-center">
            <p className="font-medium text-surface-700">No gaushalas are listed for donations yet</p>
            <p className="mt-1 text-sm text-surface-500">
              Gau seva causes appear here once a gaushala is onboarded and approved. Temple causes
              below are unaffected.
            </p>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {gaushalaCauses.map((g) => (
            <CauseCard
              key={g.causeId}
              imageUrl={getGaushalaImage('cow-shelter')}
              title={g.name}
              location={g.location}
              description={g.description}
              meta={g.cowCount > 0 ? `${g.cowCount}+ cows` : 'Verified gaushala'}
              donateHref={`/donations?causeId=${encodeURIComponent(g.causeId)}&causeKind=gaushala&causeName=${encodeURIComponent(g.name)}${planQuery}`}
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
                  : getGaushalaImage('cow-shelter');
              return (
                <CauseCard
                  key={t.id}
                  imageUrl={img}
                  title={t.name}
                  location={`${t.city ?? ''}${t.state ? ', ' + t.state : ''}`}
                  description={(t.description ?? '').slice(0, 100)}
                  meta={t.deityPrimary ?? 'Temple'}
                  donateHref={`/donations?causeId=${encodeURIComponent(t.id)}&causeKind=temple&causeName=${encodeURIComponent(t.name)}${planQuery}`}
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
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
          width={500}
          height={313}
          loading="lazy"
          decoding="async"
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-0.5 text-xs font-semibold text-surface-700 shadow-sm backdrop-blur">
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
