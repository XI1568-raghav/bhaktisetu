import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  MapPin,
  Star,
  Video,
  Clock,
  Heart,
  Share2,
  ChevronRight,
  Flame,
  Info,
  Shield,
  CheckCircle2,
  ExternalLink,
  Calendar,
  Shirt,
  Camera,
  Plane,
  Train,
  Car,
  Building2,
  Home,
  Ticket,
  BookOpen,
  ArrowUpRight,
} from 'lucide-react';
import { getTempleBySlug, type TempleDetail } from '../../../lib/api';
import { getTempleHero, getTempleGallery } from '../../../lib/images';
import {
  getTempleDetail,
  getSimilarTemples,
  type TempleDetailRich,
} from '../../../lib/temple-details';

// ──────────────────────────────────────────────────────────────
// Fallback temple from API (when no rich detail exists)
// ──────────────────────────────────────────────────────────────

const apiFallback: TempleDetail = {
  id: '1',
  name: 'Temple',
  nameLocal: null,
  slug: '',
  description:
    'Rich detail for this temple is coming soon. Please explore available pujas and darshan options below.',
  deityPrimary: 'Deity',
  deities: [],
  tradition: 'hindu',
  addressLine: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  lat: 0,
  lng: 0,
  phone: null,
  email: null,
  websiteUrl: null,
  images: [],
  timingInfo: null,
  isVerified: true,
  verificationDate: null,
  trustScore: 90,
  liveDarshanEnabled: false,
  streamUrl: null,
  status: 'active',
  priests: [],
  pujaOfferings: [],
  darshanStream: [],
};

async function getApiTemple(slug: string): Promise<TempleDetail | null> {
  try {
    return await getTempleBySlug(slug);
  } catch {
    return { ...apiFallback, slug, name: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) };
  }
}

// ──────────────────────────────────────────────────────────────
// Metadata
// ──────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const rich = getTempleDetail(slug);
  const fallback = await getApiTemple(slug);
  const name = rich?.name ?? fallback?.name ?? 'Temple';
  const location = rich ? `${rich.location}, ${rich.state}` : `${fallback?.city ?? ''}, ${fallback?.state ?? ''}`;
  const deity = rich?.deity ?? fallback?.deityPrimary ?? 'Devotees';

  return {
    title: `${name} — ${location}`,
    description: `Plan your darshan of ${name}. Book pujas, view timings, travel info, dress code, gallery, festivals and more. Deity: ${deity}.`,
    openGraph: {
      title: name,
      description: rich?.significance?.slice(0, 160) ?? fallback?.description?.slice(0, 160) ?? '',
      type: 'website',
    },
  };
}

// ──────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────

export default async function TempleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const rich = getTempleDetail(slug);
  const apiTemple = await getApiTemple(slug);

  if (!rich && !apiTemple) notFound();

  if (rich) {
    return <RichTemplePage slug={slug} rich={rich} apiTemple={apiTemple} />;
  }

  // Fallback: simpler layout with basic API data
  return <SimpleTemplePage slug={slug} temple={apiTemple!} />;
}

// ══════════════════════════════════════════════════════════════
// RICH PAGE — for temples with full detail in temple-details.ts
// ══════════════════════════════════════════════════════════════

function RichTemplePage({
  slug,
  rich,
  apiTemple,
}: {
  slug: string;
  rich: TempleDetailRich;
  apiTemple: TempleDetail | null;
}) {
  const heroImg = getTempleHero(slug);
  const gallery = getTempleGallery(slug);
  const similar = getSimilarTemples(slug, 3);
  const liveDarshanEnabled = apiTemple?.liveDarshanEnabled ?? true;

  return (
    <div className="min-h-screen bg-[color:var(--color-bg,#fbf7f1)]">
      {/* Breadcrumb */}
      <div className="border-b border-[var(--color-border)] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <Link href="/" className="hover:text-saffron-600">Home</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/temples" className="hover:text-saffron-600">Temples</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-surface-700">{rich.name}</span>
          </nav>
        </div>
      </div>

      {/* 1. HERO */}
      <section className="relative" data-reveal>
        <div className="relative h-[480px] w-full overflow-hidden md:h-[560px]">
          <img
            src={heroImg}
            alt={rich.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Saffron gradient overlay for text contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#2a1206]/80 via-[#3a1d08]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#c65a1a]/30 via-transparent to-transparent" />

          <div className="absolute inset-x-0 bottom-0">
            <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {rich.isJyotirlinga && <HeroBadge icon={Star} text="Jyotirlinga" tone="amber" />}
                {rich.isShaktiPeetha && <HeroBadge icon={Heart} text="Shakti Peetha" tone="rose" />}
                {rich.isDivyaDesam && <HeroBadge icon={Star} text="Divya Desam" tone="amber" />}
                <HeroBadge icon={Shield} text="Verified" tone="green" />
              </div>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-white drop-shadow-lg md:text-5xl">
                {rich.name}
              </h1>
              <p className="mt-3 flex items-center gap-2 text-lg text-white/90">
                <Flame className="h-5 w-5 text-amber-300" />
                {rich.deity}
                <span className="mx-2 text-white/40">•</span>
                <MapPin className="h-4 w-4 text-amber-200" />
                {rich.location}, {rich.state}
              </p>

              {rich.officialWebsite && (
                <a
                  href={rich.officialWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/25"
                >
                  <ExternalLink className="h-4 w-4" />
                  Official Temple Website
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Top-right actions */}
          <div className="absolute right-4 top-4 flex items-center gap-2 sm:right-6 sm:top-6">
            <button className="rounded-lg bg-white/20 p-2.5 backdrop-blur-md transition-colors hover:bg-white/30">
              <Heart className="h-5 w-5 text-white" />
            </button>
            <button className="rounded-lg bg-white/20 p-2.5 backdrop-blur-md transition-colors hover:bg-white/30">
              <Share2 className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* 2. QUICK INFO BAR */}
        <section data-reveal className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <QuickInfoCard
            icon={Clock}
            label="Timings"
            value="Opens 4–5 AM"
            sub="See full schedule below"
          />
          <QuickInfoCard
            icon={Calendar}
            label="Main Festivals"
            value={`${rich.mainFestivals.length} major`}
            sub={rich.mainFestivals[0]?.name}
          />
          <QuickInfoCard
            icon={Shirt}
            label="Dress Code"
            value="Traditional"
            sub="Details below"
          />
          <QuickInfoCard
            icon={Ticket}
            label="Entry"
            value="Free"
            sub="Pujas are paid"
          />
        </section>

        {/* 3. CTAs — Book Darshan / Puja / Live */}
        <section data-reveal className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Link
            href={`/pujas?temple=${rich.slug}`}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-saffron-600 to-saffron-700 p-6 text-white shadow-warm-md transition-transform hover:-translate-y-0.5"
          >
            <Flame className="mb-3 h-7 w-7 text-amber-200" />
            <div className="text-lg font-semibold">Book Puja via Poojly</div>
            <p className="mt-1 text-sm text-white/80">
              Verified priests, video proof, prasad delivery to your door
            </p>
            <ArrowUpRight className="absolute right-4 top-4 h-5 w-5 text-white/70 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>

          {rich.officialBookingUrl ? (
            <a
              href={rich.officialBookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition-all hover:-translate-y-0.5 hover:border-saffron-300 hover:shadow-warm-md"
            >
              <ExternalLink className="mb-3 h-7 w-7 text-saffron-600" />
              <div className="text-lg font-semibold text-surface-800">
                Official Temple Booking
              </div>
              <p className="mt-1 text-sm text-surface-500">
                Direct booking on the temple's official site
              </p>
              <p className="mt-2 text-[11px] italic text-surface-400">
                Opens the temple's official website in a new tab
              </p>
              <ArrowUpRight className="absolute right-4 top-4 h-5 w-5 text-surface-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          ) : (
            <div className="group relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 opacity-60">
              <ExternalLink className="mb-3 h-7 w-7 text-surface-400" />
              <div className="text-lg font-semibold text-surface-700">
                Official Booking
              </div>
              <p className="mt-1 text-sm text-surface-500">
                Direct bookings coming soon for this temple
              </p>
            </div>
          )}

          <Link
            href={`/darshan/${rich.slug}`}
            className="group relative overflow-hidden rounded-xl border-2 border-red-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-red-300 hover:shadow-warm-md"
          >
            <div className="mb-3 flex items-center gap-2">
              <Video className="h-7 w-7 text-red-600" />
              {liveDarshanEnabled && (
                <span className="flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live
                </span>
              )}
            </div>
            <div className="text-lg font-semibold text-surface-800">Watch Live Darshan</div>
            <p className="mt-1 text-sm text-surface-500">
              Real-time video stream from the sanctum
            </p>
            <ArrowUpRight className="absolute right-4 top-4 h-5 w-5 text-surface-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </section>

        {/* Main 2-column content */}
        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="space-y-10 lg:col-span-2">
            {/* 4. ABOUT */}
            <section data-reveal className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:p-8">
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold tracking-tight text-surface-800">
                <Info className="h-5 w-5 text-saffron-600" />
                About {rich.name}
              </h2>

              <div className="space-y-5 text-[15px] leading-relaxed text-surface-600">
                <div>
                  <h3 className="mb-2 font-semibold text-surface-800">History</h3>
                  <p className="whitespace-pre-line">{rich.history}</p>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold text-surface-800">Significance</h3>
                  <p>{rich.significance}</p>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold text-surface-800">About the Deity</h3>
                  <p>{rich.deityDescription}</p>
                </div>
              </div>
            </section>

            {/* 5. PUJAS OFFERED */}
            <section data-reveal>
              <h2 className="mb-6 flex items-center gap-2 text-2xl font-semibold tracking-tight text-surface-800">
                <Flame className="h-5 w-5 text-saffron-600" />
                Pujas Offered ({rich.pujasOffered.length})
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rich.pujasOffered.map((puja, i) => (
                  <article
                    key={`${puja.name}-${i}`}
                    className="group flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-all hover:-translate-y-0.5 hover:border-saffron-300 hover:shadow-warm-md"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold leading-tight text-surface-800">
                        {puja.name}
                      </h3>
                      {puja.bookExternal && (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                          Official
                        </span>
                      )}
                    </div>

                    <p className="mb-3 line-clamp-3 text-sm text-surface-600">
                      {puja.description}
                    </p>

                    <div className="mb-3 flex items-center gap-3 text-xs text-surface-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {puja.duration}
                      </span>
                      {!puja.bookExternal && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Video proof
                        </span>
                      )}
                    </div>

                    <div className="mb-4 rounded-lg bg-amber-50 p-2.5 text-xs italic text-amber-900">
                      {puja.spiritualBenefit}
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-2">
                      <div className="text-xl font-bold text-saffron-700">
                        {puja.price === 0 ? 'Free' : `₹${puja.price.toLocaleString('en-IN')}`}
                      </div>
                      {puja.bookExternal && rich.officialBookingUrl ? (
                        <a
                          href={rich.officialBookingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-saffron-300 bg-white px-3 py-1.5 text-xs font-medium text-saffron-700 transition-colors hover:bg-saffron-50"
                        >
                          Book Official <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <Link
                          href={`/pujas?temple=${rich.slug}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-saffron-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-saffron-700"
                        >
                          Book Now
                        </Link>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* 6. FESTIVALS */}
            <section data-reveal className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:p-8">
              <h2 className="mb-5 flex items-center gap-2 text-2xl font-semibold tracking-tight text-surface-800">
                <Calendar className="h-5 w-5 text-saffron-600" />
                Festivals & Events
              </h2>
              <ul className="divide-y divide-[var(--color-border)]">
                {rich.mainFestivals.map((f) => (
                  <li key={f.name} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-saffron-50">
                        <Flame className="h-5 w-5 text-saffron-600" />
                      </div>
                      <div>
                        <div className="font-medium text-surface-800">{f.name}</div>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-surface-500">{f.when}</div>
                  </li>
                ))}
              </ul>
            </section>

            {/* 7. PLAN YOUR VISIT */}
            <section data-reveal>
              <h2 className="mb-6 flex items-center gap-2 text-2xl font-semibold tracking-tight text-surface-800">
                <MapPin className="h-5 w-5 text-saffron-600" />
                Plan Your Visit
              </h2>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {/* How to Reach */}
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                  <h3 className="mb-4 font-semibold text-surface-800">How to Reach</h3>
                  <div className="space-y-4 text-sm">
                    <ReachItem
                      icon={Plane}
                      label="Nearest Airport"
                      value={rich.howToReach.nearestAirport}
                    />
                    <ReachItem
                      icon={Train}
                      label="Nearest Railway"
                      value={rich.howToReach.nearestRailway}
                    />
                    <ReachItem
                      icon={Car}
                      label="By Road"
                      value={rich.howToReach.roadDirections}
                    />
                  </div>
                </div>

                {/* Accommodation */}
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                  <h3 className="mb-4 flex items-center gap-2 font-semibold text-surface-800">
                    <Building2 className="h-4 w-4 text-saffron-600" />
                    Where to Stay
                  </h3>
                  <ul className="space-y-2 text-sm text-surface-600">
                    {rich.accommodation.map((a) => (
                      <li key={a} className="flex items-start gap-2">
                        <span className="mt-1.5 block h-1 w-1 shrink-0 rounded-full bg-saffron-500" />
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Nearby Attractions */}
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                  <h3 className="mb-4 flex items-center gap-2 font-semibold text-surface-800">
                    <Home className="h-4 w-4 text-saffron-600" />
                    Nearby Attractions
                  </h3>
                  <ul className="space-y-2 text-sm text-surface-600">
                    {rich.nearbyAttractions.map((a) => (
                      <li key={a} className="flex items-start gap-2">
                        <span className="mt-1.5 block h-1 w-1 shrink-0 rounded-full bg-saffron-500" />
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Opening Hours */}
              <div className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-surface-800">
                  <Clock className="h-4 w-4 text-saffron-600" />
                  Opening Hours
                </h3>
                <div className="grid grid-cols-1 gap-3 text-sm text-surface-600 sm:grid-cols-3">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider text-surface-400">Morning</div>
                    <div className="mt-1">{rich.openingHours.morning}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider text-surface-400">Afternoon</div>
                    <div className="mt-1">{rich.openingHours.afternoon}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider text-surface-400">Evening</div>
                    <div className="mt-1">{rich.openingHours.evening}</div>
                  </div>
                </div>
              </div>
            </section>

            {/* 8. DRESS CODE & RULES */}
            <section data-reveal className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-surface-800">
                  <Shirt className="h-5 w-5 text-saffron-600" />
                  Dress Code
                </h3>
                <p className="text-sm leading-relaxed text-surface-600">{rich.dressCode}</p>
              </div>

              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-surface-800">
                  <Info className="h-5 w-5 text-saffron-600" />
                  Rules & Guidelines
                </h3>
                <ul className="space-y-2 text-sm text-surface-600">
                  {rich.rules.map((r) => (
                    <li key={r} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Special Note */}
            {rich.specialNote && (
              <section
                data-reveal
                className="rounded-xl border-l-4 border-amber-500 bg-amber-50 p-5"
              >
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                  <div>
                    <div className="mb-1 text-sm font-semibold text-amber-900">Pilgrim&apos;s Note</div>
                    <p className="text-sm leading-relaxed text-amber-900/90">{rich.specialNote}</p>
                  </div>
                </div>
              </section>
            )}

            {/* 9. PHOTO GALLERY */}
            <section data-reveal>
              <h2 className="mb-5 flex items-center gap-2 text-2xl font-semibold tracking-tight text-surface-800">
                <Camera className="h-5 w-5 text-saffron-600" />
                Photo Gallery
              </h2>
              <PhotoGallery slug={slug} count={rich.photoCount} heroImg={heroImg} gallery={gallery} templeName={rich.name} />
            </section>

            {/* 10. TESTIMONIALS */}
            {rich.testimonials && rich.testimonials.length > 0 && (
              <section data-reveal>
                <h2 className="mb-5 flex items-center gap-2 text-2xl font-semibold tracking-tight text-surface-800">
                  <Heart className="h-5 w-5 text-saffron-600" />
                  Tips from Devotees
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {rich.testimonials.map((t) => (
                    <article
                      key={t.name}
                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
                    >
                      <div className="mb-2 flex items-center gap-1 text-amber-500">
                        {Array.from({ length: t.rating }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-amber-500" />
                        ))}
                      </div>
                      <p className="mb-4 text-sm leading-relaxed text-surface-600">
                        &ldquo;{t.text}&rdquo;
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-saffron-100 text-sm font-bold text-saffron-700">
                          {t.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-surface-800">{t.name}</div>
                          <div className="text-xs text-surface-500">{t.city}</div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* 11. FAQ */}
            {rich.faqs && rich.faqs.length > 0 && (
              <section data-reveal>
                <h2 className="mb-5 flex items-center gap-2 text-2xl font-semibold tracking-tight text-surface-800">
                  <BookOpen className="h-5 w-5 text-saffron-600" />
                  Frequently Asked Questions
                </h2>
                <div className="space-y-3">
                  {rich.faqs.map((f, i) => (
                    <details
                      key={i}
                      className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
                    >
                      <summary className="flex cursor-pointer items-center justify-between gap-3 font-medium text-surface-800">
                        <span>{f.q}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-surface-400 transition-transform group-open:rotate-90" />
                      </summary>
                      <p className="mt-3 text-sm leading-relaxed text-surface-600">{f.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {/* 12. SIMILAR TEMPLES */}
            {similar.length > 0 && (
              <section data-reveal>
                <h2 className="mb-5 flex items-center gap-2 text-2xl font-semibold tracking-tight text-surface-800">
                  <Flame className="h-5 w-5 text-saffron-600" />
                  Similar Temples
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {similar.map((t) => (
                    <Link
                      key={t.slug}
                      href={`/temples/${t.slug}`}
                      className="group overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all hover:-translate-y-0.5 hover:shadow-warm-md"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden bg-orange-100">
                        <img
                          src={getTempleHero(t.slug)}
                          alt={t.name}
                          loading="lazy"
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        {t.isJyotirlinga && (
                          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                            <Star className="h-3 w-3" /> Jyotirlinga
                          </span>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="text-sm font-semibold text-surface-800 group-hover:text-saffron-700">
                          {t.name}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-surface-500">
                          <MapPin className="h-3 w-3" />
                          {t.location}, {t.state}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ─────────────── Sidebar ─────────────── */}
          <aside className="space-y-5">
            <div className="sticky top-24 space-y-5">
              {/* Booking Card */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-warm-sm">
                <h3 className="mb-3 font-semibold text-surface-800">Quick Actions</h3>
                <div className="space-y-2.5">
                  <Link
                    href={`/pujas?temple=${rich.slug}`}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-saffron-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-saffron-700"
                  >
                    <Flame className="h-4 w-4" /> Book a Puja
                  </Link>
                  <Link
                    href={`/darshan/${rich.slug}`}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-white py-2.5 text-sm font-medium text-surface-700 transition-colors hover:border-saffron-300 hover:bg-saffron-50 hover:text-saffron-700"
                  >
                    <Video className="h-4 w-4" /> Live Darshan
                  </Link>
                  {rich.officialDarshanBookingUrl && (
                    <a
                      href={rich.officialDarshanBookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-white py-2.5 text-sm font-medium text-surface-700 transition-colors hover:border-saffron-300"
                    >
                      <ExternalLink className="h-4 w-4" /> Official Darshan
                    </a>
                  )}
                </div>

                {rich.officialWebsite && (
                  <p className="mt-3 text-[11px] italic text-surface-400">
                    External links open the temple&apos;s official website.
                  </p>
                )}
              </div>

              {/* At-a-glance */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <h3 className="mb-4 font-semibold text-surface-800">At a Glance</h3>
                <dl className="space-y-3 text-sm">
                  <Row label="Deity" value={rich.deity} />
                  <Row label="Location" value={`${rich.location}, ${rich.state}`} />
                  {rich.isJyotirlinga && <Row label="Type" value="Jyotirlinga" />}
                  {rich.isShaktiPeetha && <Row label="Also" value="Shakti Peetha" />}
                  <Row label="Pujas" value={`${rich.pujasOffered.length} offered`} />
                  <Row label="Festivals" value={`${rich.mainFestivals.length} major`} />
                </dl>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SIMPLE PAGE — fallback when no rich detail exists
// ══════════════════════════════════════════════════════════════

function SimpleTemplePage({ slug, temple }: { slug: string; temple: TempleDetail }) {
  const heroImg = getTempleHero(slug);
  const gallery = getTempleGallery(slug);

  return (
    <div className="min-h-screen bg-[color:var(--color-bg,#fbf7f1)]">
      <div className="border-b border-[var(--color-border)] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <Link href="/" className="hover:text-saffron-600">Home</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/temples" className="hover:text-saffron-600">Temples</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-surface-700">{temple.name}</span>
          </nav>
        </div>
      </div>

      <section className="relative h-80 overflow-hidden md:h-96">
        <img src={heroImg} alt={temple.name} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-semibold text-white md:text-4xl">{temple.name}</h1>
          <p className="mt-2 flex items-center gap-2 text-white/90">
            <MapPin className="h-4 w-4" /> {temple.city}, {temple.state}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <h2 className="mb-3 text-xl font-semibold text-surface-800">About</h2>
              <p className="leading-relaxed text-surface-600">{temple.description}</p>
            </section>

            {temple.pujaOfferings.length > 0 && (
              <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-surface-800">
                  <Flame className="h-5 w-5 text-saffron-600" /> Available Pujas
                </h2>
                <div className="space-y-3">
                  {temple.pujaOfferings.map((o) => (
                    <div
                      key={o.id}
                      className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] p-4 sm:flex-row sm:items-center"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-surface-800">{o.pujaType.name}</h3>
                        <p className="text-sm text-surface-500">{o.pujaType.description}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-saffron-700">
                          ₹{Number(o.priceOverride || o.pujaType.basePrice).toLocaleString('en-IN')}
                        </span>
                        <Link
                          href={`/pujas/${o.pujaType.slug}`}
                          className="rounded-lg bg-saffron-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-saffron-700"
                        >
                          Book
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {gallery.length > 0 && (
              <section>
                <h2 className="mb-4 text-xl font-semibold text-surface-800">Photos</h2>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {gallery.slice(0, 6).map((img, i) => (
                    <div key={i} className="aspect-[4/3] overflow-hidden rounded-lg">
                      <img src={img} alt={`${temple.name} photo ${i + 1}`} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-4">
            <div className="sticky top-24 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h3 className="mb-3 font-semibold text-surface-800">Actions</h3>
              <div className="space-y-2">
                <Link
                  href={`/pujas?temple=${slug}`}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-saffron-600 py-2.5 text-sm font-medium text-white hover:bg-saffron-700"
                >
                  <Flame className="h-4 w-4" /> Book Puja
                </Link>
                <Link
                  href={`/darshan/${slug}`}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-white py-2.5 text-sm font-medium text-surface-700 hover:border-saffron-300"
                >
                  <Video className="h-4 w-4" /> Live Darshan
                </Link>
                {temple.websiteUrl && (
                  <a
                    href={temple.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-white py-2.5 text-sm font-medium text-surface-700 hover:border-saffron-300"
                  >
                    <ExternalLink className="h-4 w-4" /> Official Website
                  </a>
                )}
              </div>
              <p className="mt-3 text-[11px] italic text-surface-400">
                Full details for this temple coming soon.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Small presentational helpers
// ══════════════════════════════════════════════════════════════

function HeroBadge({
  icon: Icon,
  text,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  tone: 'amber' | 'rose' | 'green';
}) {
  const tones = {
    amber: 'bg-amber-500/90 text-white',
    rose: 'bg-rose-500/90 text-white',
    green: 'bg-green-600/90 text-white',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm ${tones[tone]}`}>
      <Icon className="h-3.5 w-3.5" />
      {text}
    </span>
  );
}

function QuickInfoCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all hover:-translate-y-0.5 hover:shadow-warm-sm">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-saffron-50">
        <Icon className="h-4 w-4 text-saffron-600" />
      </div>
      <div className="text-xs font-medium uppercase tracking-wider text-surface-400">{label}</div>
      <div className="mt-0.5 font-semibold text-surface-800">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-surface-500">{sub}</div>}
    </div>
  );
}

function ReachItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-saffron-50">
        <Icon className="h-4 w-4 text-saffron-600" />
      </div>
      <div>
        <div className="text-xs font-medium uppercase tracking-wider text-surface-400">{label}</div>
        <div className="text-surface-700">{value}</div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-surface-500">{label}</dt>
      <dd className="text-right font-medium text-surface-800">{value}</dd>
    </div>
  );
}

function PhotoGallery({
  slug,
  count,
  heroImg,
  gallery,
  templeName,
}: {
  slug: string;
  count: number;
  heroImg: string;
  gallery: readonly string[];
  templeName: string;
}) {
  // Combine hero + gallery up to `count` total
  const pool = [heroImg, ...gallery];
  const images = Array.from({ length: Math.max(count, 4) }).map((_, i) => pool[i % pool.length]);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {images.map((img, i) => (
        <div
          key={`${slug}-${i}`}
          className={`group relative overflow-hidden rounded-xl ${
            i === 0 ? 'col-span-2 row-span-2 aspect-square md:aspect-[4/3]' : 'aspect-square'
          }`}
        >
          <img
            src={img}
            alt={`${templeName} photo ${i + 1}`}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
        </div>
      ))}
    </div>
  );
}
