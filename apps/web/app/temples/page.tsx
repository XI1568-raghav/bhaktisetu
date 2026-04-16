import type { Metadata } from 'next';
import Link from 'next/link';
import {
  MapPin,
  Star,
  Video,
  Clock,
  Search,
  ChevronDown,
  Heart,
  Users,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { getTemples, type TempleListItem } from '../../lib/api';
import { getTempleHero } from '../../lib/images';

export const metadata: Metadata = {
  title: 'Temples',
  description:
    'Explore 500+ sacred temples across India. Find temples by city, tradition, or deity. Watch live darshan, book pujas, and read reviews.',
};

const cities = [
  'All Cities',
  'Varanasi',
  'Tirumala',
  'Haridwar',
  'Puri',
  'Mumbai',
  'Delhi',
  'Ujjain',
  'Mathura',
  'Dwarka',
  'Rishikesh',
];

const traditions = [
  'All Traditions',
  'Shaiva',
  'Vaishnava',
  'Shakta',
  'Smarta',
  'ISKCON',
  'Jain',
  'Buddhist',
  'Sikh',
];

const deities = [
  'All Deities',
  'Lord Shiva',
  'Lord Vishnu',
  'Lord Krishna',
  'Lord Rama',
  'Lord Ganesha',
  'Lord Hanuman',
  'Goddess Durga',
  'Goddess Lakshmi',
  'Goddess Saraswati',
];

// Fallback data for when API is unavailable (dev mode without database)
const fallbackTemples = [
  {
    slug: 'kashi-vishwanath',
    name: 'Shri Kashi Vishwanath Temple',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    tradition: 'shaiva',
    deityPrimary: 'Lord Shiva',
    deities: ['Lord Shiva'],
    description:
      'One of the most famous Hindu temples dedicated to Lord Shiva, located on the western bank of the holy river Ganga. One of the 12 Jyotirlingas.',
    isVerified: true,
    trustScore: 98,
    liveDarshanEnabled: true,
    images: [],
    lat: 25.3109,
    lng: 83.0107,
    darshanStream: [{ viewerCount: 12450, status: 'live' }],
  },
  {
    slug: 'tirumala-tirupati',
    name: 'Tirumala Venkateswara Temple',
    city: 'Tirupati',
    state: 'Andhra Pradesh',
    tradition: 'vaishnava',
    deityPrimary: 'Lord Venkateswara',
    deities: ['Lord Venkateswara', 'Goddess Padmavathi'],
    description:
      'The richest and most visited temple in the world, dedicated to Lord Venkateswara (Balaji), an incarnation of Lord Vishnu.',
    isVerified: true,
    trustScore: 99,
    liveDarshanEnabled: true,
    images: [],
    lat: 13.6833,
    lng: 79.3474,
    darshanStream: [{ viewerCount: 28300, status: 'live' }],
  },
  {
    slug: 'siddhivinayak',
    name: 'Shree Siddhivinayak Temple',
    city: 'Mumbai',
    state: 'Maharashtra',
    tradition: 'smarta',
    deityPrimary: 'Lord Ganesha',
    deities: ['Lord Ganesha'],
    description:
      "One of Mumbai's most revered temples, dedicated to Lord Ganesha. The temple's deity is said to be 'Navasacha Ganpati' (fulfiller of wishes).",
    isVerified: true,
    trustScore: 96,
    liveDarshanEnabled: true,
    images: [],
    lat: 19.0169,
    lng: 72.8306,
    darshanStream: [{ viewerCount: 8760, status: 'live' }],
  },
  {
    slug: 'somnath',
    name: 'Somnath Temple',
    city: 'Somnath',
    state: 'Gujarat',
    tradition: 'shaiva',
    deityPrimary: 'Lord Shiva',
    deities: ['Lord Shiva'],
    description:
      'The first among the twelve Jyotirlinga shrines of Lord Shiva, located at the confluence of three rivers — Kapila, Hiran, and Saraswati.',
    isVerified: true,
    trustScore: 97,
    liveDarshanEnabled: true,
    images: [],
    lat: 20.888,
    lng: 70.4014,
    darshanStream: [{ viewerCount: 5420, status: 'live' }],
  },
  {
    slug: 'jagannath-puri',
    name: 'Shri Jagannath Temple',
    city: 'Puri',
    state: 'Odisha',
    tradition: 'vaishnava',
    deityPrimary: 'Lord Jagannath',
    deities: ['Lord Jagannath', 'Balabhadra', 'Subhadra'],
    description:
      'One of the Char Dham pilgrimage sites, this temple is famous for the annual Rath Yatra festival and the sacred Mahaprasad.',
    isVerified: true,
    trustScore: 98,
    liveDarshanEnabled: false,
    images: [],
    lat: 19.805,
    lng: 85.8181,
    darshanStream: [],
  },
];

interface TempleCardData {
  slug: string;
  name: string;
  city: string;
  state: string;
  tradition: string;
  deityPrimary: string;
  description: string;
  isVerified: boolean;
  trustScore: number;
  liveDarshanEnabled: boolean;
  viewers: number;
  isJyotirlinga: boolean;
}

function mapToCardData(temple: TempleListItem | (typeof fallbackTemples)[0]): TempleCardData {
  const viewers =
    'darshanStream' in temple && Array.isArray(temple.darshanStream)
      ? temple.darshanStream.reduce(
          (sum: number, s: { viewerCount: number }) => sum + (s.viewerCount || 0),
          0,
        )
      : 0;

  return {
    slug: temple.slug,
    name: temple.name,
    city: temple.city,
    state: 'state' in temple ? temple.state : '',
    tradition: temple.tradition,
    deityPrimary: temple.deityPrimary,
    description: temple.description,
    isVerified: temple.isVerified,
    trustScore: temple.trustScore,
    liveDarshanEnabled: temple.liveDarshanEnabled,
    viewers,
    isJyotirlinga:
      temple.deityPrimary === 'Lord Shiva' &&
      temple.trustScore >= 97 &&
      temple.tradition === 'shaiva',
  };
}

export default async function TemplesPage() {
  let temples: TempleCardData[];
  let total = 0;

  try {
    const result = await getTemples({ limit: 20 });
    temples = result.data.map(mapToCardData);
    total = result.pagination.total;
  } catch {
    // Fallback to static data when API is unavailable
    temples = fallbackTemples.map(mapToCardData);
    total = temples.length;
  }

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Hero Header */}
      <section className="bg-[#ede9e3] py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-3 text-3xl font-bold text-surface-800 md:text-4xl">
            Sacred Temples of India
          </h1>
          <p className="max-w-2xl text-lg text-surface-500">
            Explore verified temples across the country. Watch live darshan, book pujas, and plan
            your pilgrimage.
          </p>

          {/* Search bar */}
          <div className="mt-8 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-500" />
              <input
                type="text"
                placeholder="Search temples by name, city, or deity..."
                className="w-full rounded-lg border border-[var(--color-border)] bg-white py-3.5 pl-12 pr-4 text-surface-800 shadow-warm-sm placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-saffron-300"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="mb-8 flex flex-wrap gap-3">
          <div className="relative">
            <select className="cursor-pointer appearance-none rounded-lg border border-surface-200 bg-white py-2.5 pl-4 pr-10 text-sm font-medium text-surface-600 hover:border-saffron-300 focus:outline-none focus:ring-2 focus:ring-saffron-200">
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          </div>

          <div className="relative">
            <select className="cursor-pointer appearance-none rounded-lg border border-surface-200 bg-white py-2.5 pl-4 pr-10 text-sm font-medium text-surface-600 hover:border-saffron-300 focus:outline-none focus:ring-2 focus:ring-saffron-200">
              {traditions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          </div>

          <div className="relative">
            <select className="cursor-pointer appearance-none rounded-lg border border-surface-200 bg-white py-2.5 pl-4 pr-10 text-sm font-medium text-surface-600 hover:border-saffron-300 focus:outline-none focus:ring-2 focus:ring-saffron-200">
              {deities.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          </div>

          <button className="inline-flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-4 py-2.5 text-sm font-medium text-surface-600 transition-colors hover:border-saffron-300">
            <Video className="h-4 w-4 text-red-500" />
            Live Darshan Only
          </button>
        </div>

        {/* Results count */}
        <p className="mb-6 text-sm text-surface-500">
          Showing <span className="font-semibold text-surface-600">{temples.length}</span> of{' '}
          <span className="font-semibold text-surface-600">{total}</span> temples
        </p>

        {/* Temple Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {temples.map((temple) => (
            <Link
              key={temple.slug}
              href={`/temples/${temple.slug}`}
              className="group overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] card-hover transition-all duration-300"
            >
              {/* Temple image */}
              <div className="relative aspect-[16/10] bg-gradient-to-br from-orange-100 to-amber-50">
                <img
                  src={getTempleHero(temple.slug)}
                  alt={`${temple.name} - ${temple.city}`}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

                {/* Badges */}
                <div className="absolute left-3 top-3 flex items-center gap-2">
                  {temple.liveDarshanEnabled && (
                    <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                      LIVE
                    </span>
                  )}
                  {temple.isJyotirlinga && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-white">
                      <Star className="h-3 w-3" />
                      Jyotirlinga
                    </span>
                  )}
                  {temple.isVerified && (
                    <span className="flex items-center gap-1 rounded-full bg-green-600 px-2 py-1 text-xs font-bold text-white">
                      <Shield className="h-3 w-3" />
                      Verified
                    </span>
                  )}
                </div>

                {temple.liveDarshanEnabled && temple.viewers > 0 && (
                  <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    <Users className="h-3 w-3" />
                    {temple.viewers.toLocaleString('en-IN')} watching
                  </div>
                )}

                <button
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 transition-colors hover:bg-white"
                  aria-label="Add to favorites"
                >
                  <Heart className="h-4 w-4 text-surface-400" />
                </button>
              </div>

              {/* Info */}
              <div className="p-5">
                <h3 className="mb-2 text-lg font-semibold leading-tight text-surface-800 transition-colors group-hover:text-saffron-600">
                  {temple.name}
                </h3>

                <p className="mb-2 flex items-center gap-1 text-sm text-surface-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {temple.city}, {temple.state}
                </p>

                <p className="mb-3 line-clamp-2 text-sm text-surface-600">{temple.description}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                      <span className="font-semibold text-surface-700">
                        {(temple.trustScore / 20).toFixed(1)}
                      </span>
                    </div>
                    <span className="text-surface-200">|</span>
                    <span className="text-sm capitalize text-surface-500">{temple.tradition}</span>
                  </div>
                  <span className="text-sm font-medium text-saffron-600">
                    {temple.deityPrimary}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Load more */}
        {total > temples.length && (
          <div className="mt-10 text-center">
            <button className="inline-flex items-center gap-2 rounded-lg border border-saffron-200 bg-white px-6 py-3 font-medium text-saffron-600 transition-colors hover:bg-saffron-50">
              Load More Temples
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
