export const runtime = 'edge';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ChevronRight,
  Flame,
  Clock,
  Shield,
  Video,
  Gift,
  CheckCircle2,
  Star,
  MapPin,
  Users,
  IndianRupee,
  DollarSign,
  Heart,
  Share2,
  Sparkles,
  BadgeCheck,
  ArrowRight,
  Package,
  Undo2,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────

interface PujaTempleOffering {
  id: string;
  templeName: string;
  templeSlug: string;
  templeCity: string;
  templeState: string;
  priceOverride: string | null;
  availableSlots: { time: string; label: string }[];
  isActive: boolean;
  trustScore: number;
  isVerified: boolean;
}

interface PujaDetail {
  id: string;
  name: string;
  nameLocal: string | null;
  slug: string;
  description: string;
  longDescription: string;
  category: string;
  deity: string;
  durationMinutes: number;
  basePrice: string;
  nriPrice: string;
  samagriIncluded: boolean;
  samagriList: string[];
  benefits: string[];
  images: { url: string; alt: string }[];
  isActive: boolean;
  temples: PujaTempleOffering[];
}

// ─── Fallback data ─────────────────────────────────────────────────

const fallbackPujas: Record<string, PujaDetail> = {
  rudrabhishek: {
    id: '1',
    name: 'Rudrabhishek Puja',
    nameLocal: 'रुद्राभिषेक पूजा',
    slug: 'rudrabhishek',
    description:
      'Sacred abhishekam of the Shiva Lingam with panchamrit — milk, honey, curd, ghee, and sugar. Includes 108 chants of Om Namah Shivaya.',
    longDescription:
      'Rudrabhishek is one of the most powerful and sacred Vedic rituals dedicated to Lord Shiva. During this puja, the Shiva Lingam is bathed with panchamrit (a mixture of five sacred substances: milk, curd, honey, ghee, and sugar) while the priest recites the Rudram from the Yajurveda.\n\nThis ancient ritual is believed to invoke the blessings of Lord Shiva for peace, prosperity, and protection from negative energies. The puja concludes with 108 chants of Om Namah Shivaya and an aarti.\n\nRudrabhishek is especially recommended on Mondays, Maha Shivaratri, Shravan month, and Pradosh days. It is believed to remove sins, grant moksha, and fulfill the desires of devotees who perform it with sincere devotion.',
    category: 'Abhishekam',
    deity: 'Lord Shiva',
    durationMinutes: 120,
    basePrice: '1100',
    nriPrice: '5100',
    samagriIncluded: true,
    samagriList: [
      'Milk (1 litre)',
      'Honey',
      'Curd',
      'Ghee',
      'Sugar',
      'Ganga Jal',
      'Bel Patra (108 leaves)',
      'Flowers & Dhoop',
      'Rudraksha Mala',
      'Vibhuti',
    ],
    benefits: [
      'Removes negative energies and doshas',
      'Brings peace, prosperity, and good health',
      'Grants protection from untimely events',
      'Helps achieve moksha and spiritual growth',
      'Especially powerful during Shravan month',
    ],
    images: [],
    isActive: true,
    temples: [
      {
        id: 'to-1',
        templeName: 'Shri Kashi Vishwanath Temple',
        templeSlug: 'kashi-vishwanath',
        templeCity: 'Varanasi',
        templeState: 'Uttar Pradesh',
        priceOverride: '1100',
        availableSlots: [
          { time: '06:00', label: 'Early Morning (6:00 AM)' },
          { time: '09:00', label: 'Morning (9:00 AM)' },
          { time: '14:00', label: 'Afternoon (2:00 PM)' },
          { time: '17:00', label: 'Evening (5:00 PM)' },
        ],
        isActive: true,
        trustScore: 98,
        isVerified: true,
      },
      {
        id: 'to-2',
        templeName: 'Trimbakeshwar Temple',
        templeSlug: 'trimbakeshwar',
        templeCity: 'Nashik',
        templeState: 'Maharashtra',
        priceOverride: '1500',
        availableSlots: [
          { time: '07:00', label: 'Morning (7:00 AM)' },
          { time: '10:00', label: 'Mid-Morning (10:00 AM)' },
          { time: '16:00', label: 'Afternoon (4:00 PM)' },
        ],
        isActive: true,
        trustScore: 96,
        isVerified: true,
      },
      {
        id: 'to-3',
        templeName: 'Somnath Temple',
        templeSlug: 'somnath',
        templeCity: 'Somnath',
        templeState: 'Gujarat',
        priceOverride: null,
        availableSlots: [
          { time: '06:30', label: 'Morning (6:30 AM)' },
          { time: '11:00', label: 'Late Morning (11:00 AM)' },
        ],
        isActive: true,
        trustScore: 97,
        isVerified: true,
      },
    ],
  },
};

// Generate a default fallback for any slug
function getDefaultFallback(slug: string): PujaDetail {
  const name = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return {
    id: 'default',
    name: `${name} Puja`,
    nameLocal: null,
    slug,
    description: `Experience the sacred ${name} puja performed by verified pandits at renowned temples across India. Live streaming and prasad delivery available.`,
    longDescription: `The ${name} puja is one of the revered Vedic rituals in the Hindu tradition. Performed with devotion and proper Vedic chanting, this puja invokes divine blessings for the well-being and prosperity of the devotee and their family.\n\nOur verified pandits perform this puja with complete adherence to Vedic traditions, ensuring that every mantra is chanted correctly and every ritual is performed as prescribed in the scriptures.\n\nBook this puja through Poojly and receive live video streaming of the entire ceremony, followed by video proof and prasad delivery to your doorstep.`,
    category: 'Special Puja',
    deity: 'Lord Shiva',
    durationMinutes: 90,
    basePrice: '751',
    nriPrice: '3501',
    samagriIncluded: true,
    samagriList: ['Flowers', 'Dhoop & Diya', 'Prasad Items', 'Kumkum & Haldi', 'Coconut'],
    benefits: [
      'Divine blessings for health and prosperity',
      'Removal of obstacles and negative energies',
      'Peace of mind and spiritual growth',
      'Performed by verified Vedic pandits',
    ],
    images: [],
    isActive: true,
    temples: [
      {
        id: 'to-default-1',
        templeName: 'Shri Kashi Vishwanath Temple',
        templeSlug: 'kashi-vishwanath',
        templeCity: 'Varanasi',
        templeState: 'Uttar Pradesh',
        priceOverride: null,
        availableSlots: [
          { time: '06:00', label: 'Morning (6:00 AM)' },
          { time: '10:00', label: 'Mid-Morning (10:00 AM)' },
          { time: '16:00', label: 'Afternoon (4:00 PM)' },
        ],
        isActive: true,
        trustScore: 98,
        isVerified: true,
      },
      {
        id: 'to-default-2',
        templeName: 'Siddhivinayak Temple',
        templeSlug: 'siddhivinayak',
        templeCity: 'Mumbai',
        templeState: 'Maharashtra',
        priceOverride: null,
        availableSlots: [
          { time: '07:00', label: 'Morning (7:00 AM)' },
          { time: '11:00', label: 'Late Morning (11:00 AM)' },
        ],
        isActive: true,
        trustScore: 95,
        isVerified: true,
      },
    ],
  };
}

const API_BASE = process.env.API_URL || 'http://localhost:4000/api/v1';

async function getPujaBySlug(slug: string): Promise<PujaDetail> {
  try {
    const res = await fetch(`${API_BASE}/pujas/types/${slug}`, {
      next: { revalidate: 300, tags: [`puja-${slug}`] },
    });
    if (!res.ok) throw new Error('API error');
    return res.json();
  } catch {
    return fallbackPujas[slug] || getDefaultFallback(slug);
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const puja = await getPujaBySlug(slug);

  return {
    title: `${puja.name} - Book Online`,
    description: `Book ${puja.name} online at verified temples. ${puja.description.slice(0, 120)}...`,
    openGraph: {
      title: `${puja.name} | Poojly`,
      description: puja.description.slice(0, 160),
    },
  };
}

export default async function PujaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const puja = await getPujaBySlug(slug);

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Breadcrumb */}
      <div className="border-b border-surface-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-surface-500">
            <Link href="/" className="hover:text-orange-600">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/pujas" className="hover:text-orange-600">
              Pujas
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-surface-700">{puja.name}</span>
          </nav>
        </div>
      </div>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-saffron-600 via-saffron-500 to-temple-gold">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
            {/* Left: Puja Info */}
            <div className="lg:col-span-3">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  <Flame className="h-3 w-3" />
                  {puja.category}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  {puja.deity}
                </span>
              </div>
              <h1 className="mb-1 text-3xl font-bold text-white md:text-4xl">
                {puja.name}
              </h1>
              {puja.nameLocal && (
                <p className="mb-4 text-lg text-white/80">{puja.nameLocal}</p>
              )}
              <p className="mb-6 max-w-xl text-base leading-relaxed text-white/90">
                {puja.description}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-sm text-white/90">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {puja.durationMinutes} minutes
                </span>
                <span className="text-white/40">|</span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {puja.temples.length} temple{puja.temples.length !== 1 ? 's' : ''}
                </span>
                {puja.samagriIncluded && (
                  <>
                    <span className="text-white/40">|</span>
                    <span className="flex items-center gap-1.5">
                      <Package className="h-4 w-4" />
                      Samagri Included
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Right: Price Card */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
                <div className="mb-4">
                  <p className="mb-1 text-sm font-medium text-white/70">Starting from</p>
                  <div className="flex items-baseline gap-3">
                    <div className="flex items-center gap-1">
                      <IndianRupee className="h-6 w-6 text-white" />
                      <span className="text-xl font-semibold text-white">
                        {Number(puja.basePrice).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-sm text-white/70">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span>NRI Price: ${Number(puja.nriPrice).toLocaleString('en-US')}</span>
                  </div>
                </div>

                <Link
                  href={`/pujas/${puja.slug}/book`}
                  className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3.5 text-base font-medium text-saffron-600 shadow-lg transition-all hover:bg-saffron-50 hover:shadow-xl"
                >
                  <Flame className="h-5 w-5" />
                  Book This Puja
                </Link>

                <div className="flex items-center justify-center gap-3">
                  <button className="flex items-center gap-1 text-sm text-white/80 hover:text-white">
                    <Heart className="h-4 w-4" />
                    Save
                  </button>
                  <span className="text-white/30">|</span>
                  <button className="flex items-center gap-1 text-sm text-white/80 hover:text-white">
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <div className="border-b border-surface-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { icon: Shield, label: 'Verified Pandits', desc: 'Aadhaar-verified priests' },
              { icon: Video, label: 'Live Video Proof', desc: 'Watch your puja live' },
              { icon: Gift, label: 'Prasad Delivery', desc: 'Sacred prasad to your door' },
              { icon: Undo2, label: 'Money-Back Guarantee', desc: '100% refund if not satisfied' },
            ].map((badge) => (
              <div
                key={badge.label}
                className="flex items-center gap-3 rounded-xl border border-surface-100 bg-saffron-50/50 p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-saffron-100">
                  <badge.icon className="h-5 w-5 text-saffron-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-surface-700">{badge.label}</p>
                  <p className="text-xs text-surface-500">{badge.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Column */}
          <div className="space-y-8 lg:col-span-2">
            {/* About the Puja */}
            <div className="rounded-xl border border-surface-100 bg-white p-6">
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold tracking-tight text-surface-800">
                <Sparkles className="h-5 w-5 text-saffron-500" />
                About This Puja
              </h2>
              <div className="prose prose-stone max-w-none">
                {puja.longDescription.split('\n\n').map((para, i) => (
                  <p key={i} className="mb-4 leading-relaxed text-surface-600">
                    {para}
                  </p>
                ))}
              </div>
            </div>

            {/* Benefits */}
            {puja.benefits.length > 0 && (
              <div className="rounded-xl border border-surface-100 bg-white p-6">
                <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold tracking-tight text-surface-800">
                  <CheckCircle2 className="h-5 w-5 text-tulsi-green" />
                  Benefits
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {puja.benefits.map((benefit, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 rounded-lg bg-green-50/50 p-3"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-tulsi-green" />
                      <span className="text-sm text-surface-600">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Samagri List */}
            {puja.samagriIncluded && puja.samagriList.length > 0 && (
              <div className="rounded-xl border border-surface-100 bg-white p-6">
                <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold tracking-tight text-surface-800">
                  <Package className="h-5 w-5 text-saffron-500" />
                  Samagri (Materials Included)
                </h2>
                <p className="mb-4 text-sm text-surface-500">
                  All puja materials are arranged by the temple. No need to send anything separately.
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {puja.samagriList.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-lg border border-surface-100 bg-amber-50/40 px-3 py-2"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-saffron-500" />
                      <span className="text-sm text-surface-600">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Temples Offering This Puja */}
            <div className="rounded-xl border border-surface-100 bg-white p-6">
              <h2 className="mb-6 flex items-center gap-2 text-2xl font-semibold tracking-tight text-surface-800">
                <MapPin className="h-5 w-5 text-saffron-500" />
                Available at {puja.temples.length} Temple{puja.temples.length !== 1 ? 's' : ''}
              </h2>
              <div className="space-y-4">
                {puja.temples.map((temple) => {
                  const price = temple.priceOverride || puja.basePrice;
                  return (
                    <div
                      key={temple.id}
                      className="flex flex-col gap-4 rounded-xl border border-surface-100 p-4 transition-all hover:border-saffron-200 hover:bg-saffron-50/30 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h3 className="font-semibold text-surface-800">{temple.templeName}</h3>
                          {temple.isVerified && (
                            <BadgeCheck className="h-4 w-4 text-tulsi-green" />
                          )}
                        </div>
                        <p className="mb-2 flex items-center gap-1 text-sm text-surface-500">
                          <MapPin className="h-3.5 w-3.5" />
                          {temple.templeCity}, {temple.templeState}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-surface-400">
                          <span className="flex items-center gap-1 rounded-full bg-surface-100 px-2 py-0.5">
                            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                            {(temple.trustScore / 20).toFixed(1)}
                          </span>
                          <span className="rounded-full bg-surface-100 px-2 py-0.5">
                            {temple.availableSlots.length} time slots
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                        <div className="text-xl font-bold text-saffron-600">
                          ₹{Number(price).toLocaleString('en-IN')}
                        </div>
                        <Link
                          href={`/pujas/${puja.slug}/book?temple=${temple.templeSlug}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-saffron-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-saffron-700"
                        >
                          Book Now
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Sticky CTA Card */}
            <div className="sticky top-24 space-y-6">
              <div className="rounded-xl border border-surface-100 bg-white p-6">
                <h3 className="mb-3 font-semibold text-surface-800">Puja Details</h3>
                <div className="space-y-4">
                  <SidebarRow icon={Flame} label="Deity" value={puja.deity} />
                  <SidebarRow icon={Clock} label="Duration" value={`${puja.durationMinutes} minutes`} />
                  <SidebarRow
                    icon={IndianRupee}
                    label="Price (INR)"
                    value={`₹${Number(puja.basePrice).toLocaleString('en-IN')} onwards`}
                  />
                  <SidebarRow
                    icon={DollarSign}
                    label="Price (USD/NRI)"
                    value={`$${Number(puja.nriPrice).toLocaleString('en-US')}`}
                  />
                  <SidebarRow
                    icon={MapPin}
                    label="Temples"
                    value={`${puja.temples.length} temple${puja.temples.length !== 1 ? 's' : ''}`}
                  />
                  <SidebarRow
                    icon={Package}
                    label="Samagri"
                    value={puja.samagriIncluded ? 'Included' : 'Not included'}
                  />
                </div>

                <div className="mt-6 space-y-3">
                  <Link
                    href={`/pujas/${puja.slug}/book`}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-saffron-600 py-3 font-medium text-white transition-colors hover:bg-saffron-700"
                  >
                    <Flame className="h-4 w-4" />
                    Book This Puja
                  </Link>
                  <Link
                    href="/pujas"
                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-saffron-200 bg-white py-3 font-medium text-saffron-600 transition-colors hover:bg-saffron-50"
                  >
                    Explore More Pujas
                  </Link>
                </div>
              </div>

              {/* FAQ-style info */}
              <div className="rounded-xl border border-surface-100 bg-white p-6">
                <h3 className="mb-3 font-semibold text-surface-800">How It Works</h3>
                <div className="space-y-3">
                  {[
                    { step: '1', title: 'Book Online', desc: 'Select temple, date, and time slot' },
                    { step: '2', title: 'Pandit Performs Puja', desc: 'Verified priest performs the ritual' },
                    { step: '3', title: 'Watch Live', desc: 'Stream the puja on your device' },
                    { step: '4', title: 'Receive Prasad', desc: 'Sacred prasad delivered to your home' },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-saffron-100 text-xs font-bold text-saffron-600">
                        {item.step}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-surface-700">{item.title}</p>
                        <p className="text-xs text-surface-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarRow({
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
