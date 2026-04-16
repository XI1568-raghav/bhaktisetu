import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
  Video,
  Play,
  Users,
  Clock,
  MapPin,
  Bell,
  Calendar,
  Wifi,
  Eye,
  Radio,
  ChevronDown,
  Search,
} from 'lucide-react';
import {
  getLiveDarshan,
  getScheduledDarshan,
  type DarshanStream,
} from '../../lib/api';
import { getTempleHero } from '../../lib/images';

export const metadata: Metadata = {
  title: 'Live Darshan',
  description:
    'Watch live darshan from India\u2019s most sacred temples. Real-time temple ceremonies, aarti, and abhishekam streams from 100+ temples.',
};

// ─── Fallback data ────────────────────────────────────────────────────────────

const fallbackLiveStreams: DarshanStream[] = [
  {
    id: 'live-1',
    templeId: 't1',
    playbackUrl: '',
    status: 'live',
    viewerCount: 12450,
    peakViewers: 18200,
    isPremium: false,
    scheduledStart: null,
    temple: {
      name: 'Shri Kashi Vishwanath Temple',
      slug: 'kashi-vishwanath',
      city: 'Varanasi',
      deityPrimary: 'Lord Shiva',
      images: [],
    },
  },
  {
    id: 'live-2',
    templeId: 't2',
    playbackUrl: '',
    status: 'live',
    viewerCount: 28300,
    peakViewers: 35000,
    isPremium: false,
    scheduledStart: null,
    temple: {
      name: 'Tirumala Venkateswara Temple',
      slug: 'tirupati',
      city: 'Tirumala',
      deityPrimary: 'Lord Venkateswara',
      images: [],
    },
  },
  {
    id: 'live-3',
    templeId: 't3',
    playbackUrl: '',
    status: 'live',
    viewerCount: 8760,
    peakViewers: 12000,
    isPremium: false,
    scheduledStart: null,
    temple: {
      name: 'Siddhivinayak Temple',
      slug: 'siddhivinayak',
      city: 'Mumbai',
      deityPrimary: 'Lord Ganesha',
      images: [],
    },
  },
  {
    id: 'live-4',
    templeId: 't4',
    playbackUrl: '',
    status: 'live',
    viewerCount: 9800,
    peakViewers: 14000,
    isPremium: false,
    scheduledStart: null,
    temple: {
      name: 'Mahakaleshwar Temple',
      slug: 'mahakaleshwar',
      city: 'Ujjain',
      deityPrimary: 'Lord Shiva',
      images: [],
    },
  },
  {
    id: 'live-5',
    templeId: 't5',
    playbackUrl: '',
    status: 'live',
    viewerCount: 5420,
    peakViewers: 8000,
    isPremium: false,
    scheduledStart: null,
    temple: {
      name: 'Somnath Temple',
      slug: 'somnath',
      city: 'Veraval',
      deityPrimary: 'Lord Shiva',
      images: [],
    },
  },
  {
    id: 'live-6',
    templeId: 't6',
    playbackUrl: '',
    status: 'live',
    viewerCount: 15200,
    peakViewers: 22000,
    isPremium: false,
    scheduledStart: null,
    temple: {
      name: 'Sri Harmandir Sahib',
      slug: 'golden-temple',
      city: 'Amritsar',
      deityPrimary: 'Guru Granth Sahib',
      images: [],
    },
  },
  {
    id: 'live-7',
    templeId: 't7',
    playbackUrl: '',
    status: 'live',
    viewerCount: 7100,
    peakViewers: 10000,
    isPremium: false,
    scheduledStart: null,
    temple: {
      name: 'Meenakshi Amman Temple',
      slug: 'meenakshi-amman',
      city: 'Madurai',
      deityPrimary: 'Goddess Meenakshi',
      images: [],
    },
  },
  {
    id: 'live-8',
    templeId: 't8',
    playbackUrl: '',
    status: 'live',
    viewerCount: 4320,
    peakViewers: 6500,
    isPremium: false,
    scheduledStart: null,
    temple: {
      name: 'ISKCON Temple',
      slug: 'iskcon-vrindavan',
      city: 'Vrindavan',
      deityPrimary: 'Lord Krishna',
      images: [],
    },
  },
];

const fallbackScheduledStreams: DarshanStream[] = [
  {
    id: 'sched-1',
    templeId: 's1',
    playbackUrl: '',
    status: 'scheduled',
    viewerCount: 0,
    peakViewers: 0,
    isPremium: false,
    scheduledStart: '5:30 AM',
    temple: {
      name: 'Jagannath Temple',
      slug: 'jagannath-puri',
      city: 'Puri',
      deityPrimary: 'Lord Jagannath',
      images: [],
    },
  },
  {
    id: 'sched-2',
    templeId: 's2',
    playbackUrl: '',
    status: 'scheduled',
    viewerCount: 0,
    peakViewers: 0,
    isPremium: false,
    scheduledStart: '6:00 AM',
    temple: {
      name: 'Kedarnath Temple',
      slug: 'kedarnath',
      city: 'Kedarnath',
      deityPrimary: 'Lord Shiva',
      images: [],
    },
  },
  {
    id: 'sched-3',
    templeId: 's3',
    playbackUrl: '',
    status: 'scheduled',
    viewerCount: 0,
    peakViewers: 0,
    isPremium: false,
    scheduledStart: '7:00 AM',
    temple: {
      name: 'Badrinath Temple',
      slug: 'badrinath',
      city: 'Badrinath',
      deityPrimary: 'Lord Vishnu',
      images: [],
    },
  },
  {
    id: 'sched-4',
    templeId: 's4',
    playbackUrl: '',
    status: 'scheduled',
    viewerCount: 0,
    peakViewers: 0,
    isPremium: false,
    scheduledStart: '7:30 AM',
    temple: {
      name: 'Dwarkadhish Temple',
      slug: 'dwarkadhish',
      city: 'Dwarka',
      deityPrimary: 'Lord Krishna',
      images: [],
    },
  },
];

const fallbackScheduleTable = [
  { time: '3:00 AM', temple: 'Kashi Vishwanath', event: 'Mangala Aarti', status: 'completed' as const },
  { time: '4:00 AM', temple: 'Mahakaleshwar', event: 'Bhasma Aarti', status: 'live' as const },
  { time: '4:30 AM', temple: 'ISKCON Vrindavan', event: 'Mangala Aarti', status: 'live' as const },
  { time: '5:00 AM', temple: 'Tirupati Balaji', event: 'Suprabhatam', status: 'live' as const },
  { time: '5:30 AM', temple: 'Jagannath, Puri', event: 'Mangala Aarti', status: 'upcoming' as const },
  { time: '6:00 AM', temple: 'Kedarnath', event: 'Maha Abhishek', status: 'upcoming' as const },
  { time: '7:00 AM', temple: 'Somnath', event: 'Morning Aarti', status: 'upcoming' as const },
  { time: '11:30 AM', temple: 'Kashi Vishwanath', event: 'Bhog Aarti', status: 'upcoming' as const },
  { time: '7:00 PM', temple: 'All Major Temples', event: 'Sandhya Aarti', status: 'upcoming' as const },
];

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function fetchLiveStreams(): Promise<DarshanStream[]> {
  try {
    const res = await getLiveDarshan();
    if (!res || !Array.isArray(res.streams)) return fallbackLiveStreams;
    return res.streams.length > 0 ? res.streams : fallbackLiveStreams;
  } catch {
    return fallbackLiveStreams;
  }
}

async function fetchScheduledStreams(): Promise<DarshanStream[]> {
  try {
    const res = await getScheduledDarshan();
    if (!res || !Array.isArray(res.streams)) return fallbackScheduledStreams;
    return res.streams.length > 0 ? res.streams : fallbackScheduledStreams;
  } catch {
    return fallbackScheduledStreams;
  }
}

// ─── Async Sections ───────────────────────────────────────────────────────────

async function LiveStreamsSection() {
  const streams = await fetchLiveStreams();

  return (
    <section className="py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold tracking-tight text-white mb-6 flex items-center gap-2">
          <Wifi className="w-5 h-5 text-red-400" />
          Live Now
          <span className="text-sm font-normal text-surface-500 ml-2">
            {streams.length} stream{streams.length !== 1 ? 's' : ''}
          </span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {streams.map((stream) => {
            const templeImage =
              stream.temple.images && stream.temple.images.length > 0
                ? stream.temple.images[0]!.url
                : null;
            return (
              <a
                key={stream.id}
                href={`/darshan/${stream.id}`}
                className="group rounded-xl overflow-hidden bg-surface-800 border border-surface-700 hover:border-surface-600 hover:shadow-lg transition-all duration-300"
              >
                {/* Video preview */}
                <div className="relative aspect-video bg-gradient-to-br from-surface-800 to-surface-900">
                  <img
                    src={templeImage ? templeImage : getTempleHero(stream.temple.slug)}
                    alt={stream.temple.name}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 group-hover:scale-110 transition-all">
                      <Play className="w-6 h-6 text-white ml-0.5" />
                    </div>
                  </div>

                  {/* Live badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    LIVE
                  </div>

                  {/* HD badge */}
                  <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-bold px-2 py-0.5 rounded backdrop-blur-sm">
                    HD
                  </div>

                  {/* Viewer count */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-md backdrop-blur-sm">
                    <Eye className="w-3 h-3" />
                    {stream.viewerCount.toLocaleString('en-IN')}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-white group-hover:text-saffron-400 transition-colors truncate">
                    {stream.temple.name}
                  </h3>
                  <p className="text-sm text-surface-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {stream.temple.city}
                  </p>
                  <p className="text-xs text-surface-600 mt-1">
                    {stream.temple.deityPrimary}
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

async function ScheduledStreamsSection() {
  const streams = await fetchScheduledStreams();

  return (
    <section className="py-10 border-t border-surface-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold tracking-tight text-white mb-6 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-saffron-400" />
          Upcoming Streams
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {streams.map((stream) => (
            <div
              key={stream.id}
              className="group rounded-xl overflow-hidden bg-surface-800 border border-surface-700 hover:border-surface-600 transition-all"
            >
              {/* Upcoming stream preview */}
              <div className="relative aspect-video bg-gradient-to-br from-surface-800 to-surface-900">
                <img
                  src={getTempleHero(stream.temple.slug)}
                  alt={`${stream.temple.name} - Upcoming stream`}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover opacity-40"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Clock className="w-8 h-8 text-surface-400 mx-auto mb-1" />
                    <span className="text-sm text-surface-400">Upcoming</span>
                  </div>
                </div>

                {/* Scheduled time badge */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-surface-600 text-surface-200 text-xs font-bold px-2.5 py-1 rounded-full">
                  <Clock className="w-3 h-3" />
                  {stream.scheduledStart ?? 'TBD'}
                </div>
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-white truncate">
                  {stream.temple.name}
                </h3>
                <p className="text-sm text-surface-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {stream.temple.city}
                </p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-saffron-400 font-medium">
                    {stream.temple.deityPrimary}
                  </span>
                  <button className="flex items-center gap-1 text-xs text-surface-400 hover:text-saffron-400 transition-colors">
                    <Bell className="w-3.5 h-3.5" />
                    Remind Me
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function DarshanPage() {
  return (
    <div className="min-h-screen bg-[#2a2520]">
      {/* Hero */}
      <section className="bg-gradient-to-b from-[#352f28] to-[#2a2520] py-12 md:py-16 border-b border-surface-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-1.5 bg-red-600/20 text-red-400 text-sm font-bold px-3 py-1.5 rounded-full">
              <Radio className="w-4 h-4" />
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              LIVE
            </div>
            <span className="text-surface-400 text-sm">
              Temples streaming now
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Live Darshan
          </h1>
          <p className="text-surface-400 text-lg max-w-2xl">
            Experience divine darshan from India&rsquo;s most sacred temples in real
            time. HD quality streams with temple audio.
          </p>

          {/* Search and filters */}
          <div className="mt-8 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-64 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
              <input
                type="text"
                placeholder="Search temples..."
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-surface-700 text-white placeholder:text-surface-500 border border-surface-600 focus:outline-none focus:ring-2 focus:ring-saffron-500/50 focus:border-saffron-500"
              />
            </div>
            <div className="relative">
              <select className="appearance-none bg-surface-700 border border-surface-600 rounded-xl pl-4 pr-10 py-3 text-sm font-medium text-surface-300 hover:border-surface-600 focus:outline-none focus:ring-2 focus:ring-saffron-500/50 cursor-pointer">
                <option>All Deities</option>
                <option>Lord Shiva</option>
                <option>Lord Vishnu</option>
                <option>Lord Krishna</option>
                <option>Lord Ganesha</option>
                <option>Goddess Durga</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500 pointer-events-none" />
            </div>
            <div className="relative">
              <select className="appearance-none bg-surface-700 border border-surface-600 rounded-xl pl-4 pr-10 py-3 text-sm font-medium text-surface-300 hover:border-surface-600 focus:outline-none focus:ring-2 focus:ring-saffron-500/50 cursor-pointer">
                <option>All Regions</option>
                <option>North India</option>
                <option>South India</option>
                <option>East India</option>
                <option>West India</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Live Streams */}
      <Suspense
        fallback={
          <div className="py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="h-6 bg-surface-700 rounded w-40 mb-6" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-video bg-surface-700 rounded-t-2xl" />
                    <div className="bg-surface-800 rounded-b-2xl p-4 space-y-2">
                      <div className="h-4 bg-surface-700 rounded w-3/4" />
                      <div className="h-3 bg-surface-700 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        }
      >
        <LiveStreamsSection />
      </Suspense>

      {/* Scheduled Streams */}
      <Suspense
        fallback={
          <div className="py-10 border-t border-surface-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="h-6 bg-surface-700 rounded w-48 mb-6" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-video bg-surface-700 rounded-t-2xl" />
                    <div className="bg-surface-800 rounded-b-2xl p-4 space-y-2">
                      <div className="h-4 bg-surface-700 rounded w-3/4" />
                      <div className="h-3 bg-surface-700 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        }
      >
        <ScheduledStreamsSection />
      </Suspense>

      {/* Daily Schedule */}
      <section className="py-10 border-t border-surface-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight text-white mb-6">
            Today&rsquo;s Darshan Schedule
          </h2>

          <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-surface-700 text-sm font-semibold text-surface-400">
              <div className="col-span-2">Time</div>
              <div className="col-span-4">Temple</div>
              <div className="col-span-3">Event</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1"></div>
            </div>

            {fallbackScheduleTable.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 p-4 border-b border-surface-700/50 last:border-0 text-sm items-center hover:bg-surface-700/30 transition-colors"
              >
                <div className="md:col-span-2 text-surface-300 font-medium">
                  <span className="md:hidden text-surface-500 text-xs mr-2">Time:</span>
                  {row.time}
                </div>
                <div className="md:col-span-4 text-white font-medium">
                  <span className="md:hidden text-surface-500 text-xs mr-2">Temple:</span>
                  {row.temple}
                </div>
                <div className="md:col-span-3 text-surface-400">
                  <span className="md:hidden text-surface-500 text-xs mr-2">Event:</span>
                  {row.event}
                </div>
                <div className="md:col-span-2">
                  {row.status === 'live' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                      LIVE
                    </span>
                  ) : row.status === 'completed' ? (
                    <span className="text-xs text-surface-600">Completed</span>
                  ) : (
                    <span className="text-xs text-surface-500">Upcoming</span>
                  )}
                </div>
                <div className="md:col-span-1 md:text-right">
                  {row.status === 'live' ? (
                    <a
                      href="/darshan"
                      className="text-saffron-400 hover:text-saffron-300"
                    >
                      <Play className="w-4 h-4" />
                    </a>
                  ) : row.status === 'upcoming' ? (
                    <button className="text-surface-600 hover:text-surface-400">
                      <Bell className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
