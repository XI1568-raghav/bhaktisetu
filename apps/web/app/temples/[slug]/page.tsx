import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  MapPin,
  Star,
  Video,
  Clock,
  Phone,
  Globe,
  Navigation,
  Heart,
  Share2,
  Users,
  Play,
  ChevronRight,
  Flame,

  MessageCircle,
  Info,
  Shield,
  CheckCircle2,
  ThumbsUp,
} from 'lucide-react';
import { getTempleBySlug, type TempleDetail } from '../../../lib/api';
import { getTempleHero, getTempleGallery } from '../../../lib/images';

// Fallback temple data when API is unavailable
const fallbackTemple: TempleDetail = {
  id: '1',
  name: 'Shri Kashi Vishwanath Temple',
  nameLocal: 'श्री काशी विश्वनाथ मंदिर',
  slug: 'kashi-vishwanath',
  description:
    'The Kashi Vishwanath Temple is one of the most famous Hindu temples dedicated to Lord Shiva. It is located in Vishwanath Gali of Varanasi, Uttar Pradesh, India. The temple stands on the western bank of the holy river Ganga, and is one of the twelve Jyotirlingas, the holiest of Shiva temples. The original Vishwanath temple was destroyed by the army of Qutb-ud-din Aibak in 1194 CE. It was rebuilt and demolished multiple times throughout history. The current temple was built in 1780 by Maharani Ahilyabai Holkar of Indore.',
  deityPrimary: 'Lord Shiva',
  deities: ['Lord Shiva', 'Goddess Annapurna'],
  tradition: 'shaiva',
  addressLine: 'Lahori Tola, Varanasi',
  city: 'Varanasi',
  state: 'Uttar Pradesh',
  pincode: '221001',
  country: 'India',
  lat: 25.3109,
  lng: 83.0107,
  phone: '+91-542-2392629',
  email: 'info@shrikashivishwanath.org',
  websiteUrl: 'https://shrikashivishwanath.org',
  images: [],
  timingInfo: {
    'Mangala Aarti': '3:00 AM - 4:00 AM',
    'General Darshan': '4:00 AM - 11:00 AM',
    'Afternoon': '12:00 PM - 7:00 PM',
    'Sapta Rishi Aarti': '7:00 PM - 8:15 PM',
    'Shringar Aarti': '9:00 PM - 10:15 PM',
    'Shayana Aarti': '10:30 PM - 11:00 PM',
  },
  isVerified: true,
  verificationDate: '2026-01-15',
  trustScore: 98,
  liveDarshanEnabled: true,
  streamUrl: null,
  status: 'active',
  priests: [
    {
      priest: {
        id: '1',
        displayName: 'Pandit Ramesh Shastri',
        specializations: ['Rudrabhishek', 'Shiv Puja', 'Maha Mrityunjay Jaap'],
        ratingAvg: 4.9,
        ratingCount: 342,
        avatarUrl: null,
      },
      isPrimary: true,
    },
  ],
  pujaOfferings: [
    {
      id: '1',
      priceOverride: null,
      availableSlots: [
        { time: '06:00', label: 'Morning (6:00 AM)' },
        { time: '09:00', label: 'Morning (9:00 AM)' },
        { time: '14:00', label: 'Afternoon (2:00 PM)' },
        { time: '17:00', label: 'Evening (5:00 PM)' },
      ],
      isActive: true,
      pujaType: {
        id: '1',
        name: 'Rudrabhishek',
        slug: 'rudrabhishek',
        description: 'Sacred abhishekam of Shiva Lingam with milk, honey, curd, and holy water.',
        category: 'planetary',
        deity: 'Lord Shiva',
        durationMinutes: 90,
        basePrice: '501',
        nriPrice: '2501',
        images: [],
      },
    },
    {
      id: '2',
      priceOverride: null,
      availableSlots: [
        { time: '06:00', label: 'Morning' },
        { time: '10:00', label: 'Mid-Morning' },
        { time: '16:00', label: 'Evening' },
      ],
      isActive: true,
      pujaType: {
        id: '4',
        name: 'Maha Mrityunjay Jaap',
        slug: 'maha-mrityunjay-jaap',
        description: '108 recitations of the Maha Mrityunjaya Mantra for health and longevity.',
        category: 'health',
        deity: 'Lord Shiva',
        durationMinutes: 180,
        basePrice: '1100',
        nriPrice: '5001',
        images: [],
      },
    },
    {
      id: '3',
      priceOverride: '751',
      availableSlots: [
        { time: '07:00', label: 'Morning' },
        { time: '11:00', label: 'Late Morning' },
      ],
      isActive: true,
      pujaType: {
        id: '3',
        name: 'Satyanarayan Katha',
        slug: 'satyanarayan-katha',
        description: 'Recitation of the Satyanarayan Katha with prasad distribution.',
        category: 'special_occasion',
        deity: 'Lord Vishnu',
        durationMinutes: 120,
        basePrice: '751',
        nriPrice: '3001',
        images: [],
      },
    },
  ],
  darshanStream: [
    { id: '1', playbackUrl: '', status: 'live', viewerCount: 12450 },
  ],
};

async function getTemple(slug: string): Promise<TempleDetail | null> {
  try {
    return await getTempleBySlug(slug);
  } catch {
    // Return fallback for the known temple, or null
    if (slug === 'kashi-vishwanath') return fallbackTemple;
    return fallbackTemple; // Show fallback for any slug in dev mode
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const temple = await getTemple(slug);
  if (!temple) return { title: 'Temple Not Found' };

  return {
    title: `${temple.name} - ${temple.city}`,
    description: `Explore ${temple.name} in ${temple.city}. Watch live darshan, book pujas, read reviews, and plan your visit. Deity: ${temple.deityPrimary}.`,
    openGraph: {
      title: temple.name,
      description: temple.description.slice(0, 160),
      type: 'website',
    },
  };
}

export default async function TempleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const temple = await getTemple(slug);
  if (!temple) notFound();

  const viewers = temple.darshanStream?.reduce((sum, s) => sum + (s.viewerCount || 0), 0) ?? 0;
  const isJyotirlinga =
    temple.deityPrimary === 'Lord Shiva' && temple.trustScore >= 97 && temple.tradition === 'shaiva';
  const timings = temple.timingInfo as Record<string, string> | null;

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Breadcrumb */}
      <div className="border-b border-surface-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <Link href="/" className="hover:text-saffron-600">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/temples" className="hover:text-saffron-600">
              Temples
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-surface-700">{temple.name}</span>
          </nav>
        </div>
      </div>

      {/* Gallery Section */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid h-72 grid-cols-4 grid-rows-2 gap-3 overflow-hidden rounded-xl md:h-96" style={{borderRadius: '12px'}}>
            <div className="group relative col-span-2 row-span-2 cursor-pointer overflow-hidden bg-gradient-to-br from-orange-200 to-orange-100">
              <img
                src={getTempleHero(slug)}
                alt={`${temple.name} - Main view`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <span className="absolute bottom-4 left-4 text-sm font-semibold text-white drop-shadow-lg">
                {temple.name}
              </span>
            </div>
            {(() => {
              const gallery = getTempleGallery(slug);
              const labels = ['Temple View', 'Sanctum', 'Aarti', 'Courtyard'];
              return labels.map((label, i) => ({
                label,
                img: gallery[i] ?? getTempleHero(slug),
              }));
            })().map((item) => (
              <div
                key={item.label}
                className="group relative cursor-pointer overflow-hidden bg-gradient-to-br from-amber-100 to-orange-50"
              >
                <img
                  src={item.img}
                  alt={`${temple.name} - ${item.label}`}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                <span className="absolute bottom-2 left-2 text-[11px] font-medium text-white drop-shadow-md">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Column */}
          <div className="space-y-8 lg:col-span-2">
            {/* Temple header */}
            <div className="rounded-xl border border-surface-100 bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    {isJyotirlinga && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600">
                        <Star className="h-3 w-3 fill-amber-500" />
                        Jyotirlinga
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full bg-saffron-50 px-2.5 py-1 text-xs font-medium capitalize text-saffron-600">
                      {temple.tradition}
                    </span>
                    {temple.isVerified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-600">
                        <Shield className="h-3 w-3" />
                        Verified
                      </span>
                    )}
                  </div>
                  <h1 className="mb-1 text-2xl font-semibold tracking-tight text-surface-800 md:text-3xl">
                    {temple.name}
                  </h1>
                  {temple.nameLocal && (
                    <p className="mb-1 text-lg text-surface-400">{temple.nameLocal}</p>
                  )}
                  <p className="flex items-center gap-1 text-surface-500">
                    <MapPin className="h-4 w-4" />
                    {temple.city}, {temple.state}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button className="rounded-lg bg-surface-50 p-2.5 transition-colors hover:bg-surface-100">
                    <Heart className="h-5 w-5 text-surface-400" />
                  </button>
                  <button className="rounded-lg bg-surface-50 p-2.5 transition-colors hover:bg-surface-100">
                    <Share2 className="h-5 w-5 text-surface-400" />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-500 text-amber-500" />
                    ))}
                  </div>
                  <span className="font-bold text-surface-700">
                    {(temple.trustScore / 20).toFixed(1)}
                  </span>
                </div>
                <span className="text-surface-200">|</span>
                <span className="flex items-center gap-1 text-sm text-surface-500">
                  <Flame className="h-4 w-4 text-saffron-500" />
                  {temple.pujaOfferings.length} pujas available
                </span>
                {temple.priests.length > 0 && (
                  <>
                    <span className="text-surface-200">|</span>
                    <span className="text-sm text-surface-500">
                      {temple.priests.length} verified priest{temple.priests.length > 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Live Darshan */}
            {temple.liveDarshanEnabled && (
              <div className="overflow-hidden rounded-xl border border-surface-100 bg-white">
                <div className="relative flex aspect-video items-center justify-center bg-gradient-to-br from-surface-800 to-surface-900">
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30">
                      <Play className="ml-1 h-8 w-8 text-white" />
                    </div>
                    <p className="text-sm text-white/80">Click to watch live darshan</p>
                  </div>
                  <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                    LIVE NOW
                  </div>
                  {viewers > 0 && (
                    <div className="absolute right-4 top-4 flex items-center gap-1 rounded-lg bg-black/60 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                      <Users className="h-3.5 w-3.5" />
                      {viewers.toLocaleString('en-IN')} watching
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* About */}
            <div className="rounded-xl border border-surface-100 bg-white p-6">
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold tracking-tight text-surface-800">
                <Info className="h-5 w-5 text-saffron-500" />
                About the Temple
              </h2>
              <p className="whitespace-pre-line leading-relaxed text-surface-600">
                {temple.description}
              </p>
            </div>

            {/* Available Pujas */}
            {temple.pujaOfferings.length > 0 && (
              <div className="rounded-xl border border-surface-100 bg-white p-6">
                <h2 className="mb-6 flex items-center gap-2 text-2xl font-semibold tracking-tight text-surface-800">
                  <Flame className="h-5 w-5 text-saffron-500" />
                  Available Pujas
                </h2>
                <div className="space-y-4">
                  {temple.pujaOfferings.map((offering) => (
                    <div
                      key={offering.id}
                      className="flex flex-col gap-4 rounded-xl border border-surface-100 p-4 transition-all hover:border-saffron-200 hover:bg-saffron-50/30 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h3 className="font-semibold text-surface-800">
                            {offering.pujaType.name}
                          </h3>
                          <span className="rounded-full bg-saffron-100 px-2 py-0.5 text-xs font-medium capitalize text-saffron-600">
                            {offering.pujaType.category.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="mb-2 text-sm text-surface-500">
                          {offering.pujaType.description}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-surface-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {offering.pujaType.durationMinutes} min
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                            Video Proof
                          </span>
                          <span>
                            {offering.availableSlots.length} time slots
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                        <div className="text-xl font-bold text-saffron-600">
                          ₹{Number(offering.priceOverride || offering.pujaType.basePrice).toLocaleString('en-IN')}
                        </div>
                        <Link
                          href={`/pujas/${offering.pujaType.slug}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-saffron-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-saffron-700"
                        >
                          Book Now
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Priests */}
            {temple.priests.length > 0 && (
              <div className="rounded-xl border border-surface-100 bg-white p-6">
                <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold tracking-tight text-surface-800">
                  <Shield className="h-5 w-5 text-saffron-500" />
                  Verified Priests
                </h2>
                <div className="space-y-4">
                  {temple.priests.map((tp) => (
                    <div
                      key={tp.priest.id}
                      className="flex items-center gap-4 rounded-xl border border-surface-100 p-4"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-saffron-100">
                        <span className="text-lg font-bold text-saffron-600">
                          {tp.priest.displayName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-surface-800">
                            {tp.priest.displayName}
                          </h3>
                          {tp.isPrimary && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-surface-500">
                          {tp.priest.specializations.join(', ')}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-sm">
                          <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                          <span className="font-medium text-surface-600">
                            {tp.priest.ratingAvg.toFixed(1)}
                          </span>
                          <span className="text-surface-400">
                            ({tp.priest.ratingCount} reviews)
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews section */}
            <div className="rounded-xl border border-surface-100 bg-white p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-surface-800">
                  <MessageCircle className="h-5 w-5 text-saffron-500" />
                  Reviews
                </h2>
                <button className="text-sm font-semibold text-saffron-600 hover:underline">
                  Write a Review
                </button>
              </div>

              <div className="mb-6 flex items-center gap-6 rounded-xl bg-surface-100 p-4">
                <div className="text-center">
                  <div className="text-xl font-semibold text-surface-800">
                    {(temple.trustScore / 20).toFixed(1)}
                  </div>
                  <div className="mt-1 flex items-center justify-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-500 text-amber-500" />
                    ))}
                  </div>
                  <div className="mt-1 text-xs text-surface-500">Trust Score</div>
                </div>
                <div className="flex-1 space-y-1.5">
                  {[
                    { stars: 5, pct: 82 },
                    { stars: 4, pct: 12 },
                    { stars: 3, pct: 4 },
                    { stars: 2, pct: 1 },
                    { stars: 1, pct: 1 },
                  ].map((row) => (
                    <div key={row.stars} className="flex items-center gap-2">
                      <span className="w-3 text-xs text-surface-500">{row.stars}</span>
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-100">
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs text-surface-400">{row.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="py-8 text-center text-sm text-surface-400">
                Reviews will appear here once devotees start booking pujas at this temple.
              </p>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <div className="sticky top-24 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <h3 className="mb-4 font-semibold text-surface-800">Temple Info</h3>

              <div className="space-y-4">
                <SidebarItem icon={Flame} label="Primary Deity" value={temple.deityPrimary} />

                {timings && Object.keys(timings).length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-saffron-50">
                      <Clock className="h-4 w-4 text-saffron-500" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-surface-700">Timings</div>
                      <div className="space-y-0.5 text-sm text-surface-500">
                        {Object.entries(timings).map(([name, time]) => (
                          <div key={name}>
                            <span className="font-medium">{name}:</span> {time}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <SidebarItem
                  icon={MapPin}
                  label="Address"
                  value={`${temple.addressLine}, ${temple.city}, ${temple.state} ${temple.pincode}`}
                />

                {temple.phone && (
                  <SidebarItem icon={Phone} label="Contact" value={temple.phone} />
                )}

                {temple.websiteUrl && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-saffron-50">
                      <Globe className="h-4 w-4 text-saffron-500" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-surface-700">Website</div>
                      <a
                        href={temple.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-saffron-600 hover:underline"
                      >
                        {temple.websiteUrl.replace('https://', '')}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-6 space-y-3">
                <Link
                  href="/pujas"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-saffron-600 py-3 font-medium text-white transition-colors hover:bg-saffron-700"
                >
                  <Flame className="h-4 w-4" />
                  Book a Puja
                </Link>
                {temple.liveDarshanEnabled && (
                  <Link
                    href="/darshan"
                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-saffron-200 bg-white py-3 font-medium text-saffron-600 transition-colors hover:bg-saffron-50"
                  >
                    <Video className="h-4 w-4" />
                    Watch Live Darshan
                  </Link>
                )}
                <button className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium text-surface-600 transition-colors hover:bg-surface-50">
                  <Navigation className="h-4 w-4" />
                  Get Directions
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarItem({
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
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-saffron-50">
        <Icon className="h-4 w-4 text-saffron-500" />
      </div>
      <div>
        <div className="text-sm font-medium text-surface-700">{label}</div>
        <div className="text-sm text-surface-500">{value}</div>
      </div>
    </div>
  );
}
