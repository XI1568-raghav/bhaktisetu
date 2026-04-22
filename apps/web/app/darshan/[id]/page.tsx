export const runtime = 'edge';
import type { Metadata } from 'next';
import {
  MapPin,
  Clock,
  Calendar,
  Users,
  ChevronRight,
  Home,
  MessageCircle,
  Bell,
  ExternalLink,
  Star,
  Video,
} from 'lucide-react';
import {
  getLiveDarshan,
  getScheduledDarshan,
  type DarshanStream,
} from '../../../lib/api';
import DarshanPlayer from '../../../components/DarshanPlayer';

// ─── Fallback data ────────────────────────────────────────────────────────────

const fallbackStream: DarshanStream = {
  id: 'fallback-1',
  templeId: 'temple-kashi',
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
};

const fallbackSchedule = [
  { time: '3:00 AM', event: 'Mangala Aarti', status: 'completed' },
  { time: '4:00 AM', event: 'Shringar Aarti', status: 'completed' },
  { time: '5:00 AM', event: 'Abhishek Darshan', status: 'live' },
  { time: '11:30 AM', event: 'Bhog Aarti', status: 'upcoming' },
  { time: '12:00 PM', event: 'Afternoon Shringar', status: 'upcoming' },
  { time: '7:00 PM', event: 'Sandhya Aarti', status: 'upcoming' },
  { time: '9:00 PM', event: 'Shayan Aarti', status: 'upcoming' },
];

const fallbackRelatedTemples = [
  {
    name: 'Mahakaleshwar Temple',
    city: 'Ujjain',
    deity: 'Lord Shiva',
    slug: 'mahakaleshwar',
    isLive: true,
    viewers: 9800,
  },
  {
    name: 'Somnath Temple',
    city: 'Veraval',
    deity: 'Lord Shiva',
    slug: 'somnath',
    isLive: true,
    viewers: 5420,
  },
  {
    name: 'Kedarnath Temple',
    city: 'Kedarnath',
    deity: 'Lord Shiva',
    slug: 'kedarnath',
    isLive: false,
    viewers: 0,
  },
];

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getStreamById(id: string): Promise<DarshanStream> {
  try {
    const [liveRes, scheduledRes] = await Promise.all([
      getLiveDarshan(),
      getScheduledDarshan(),
    ]);
    const allStreams = [...liveRes.streams, ...scheduledRes.streams];
    const found = allStreams.find((s) => s.id === id);
    if (found) return found;
  } catch {
    // API unavailable
  }
  return fallbackStream;
}

async function getRelatedStreams(
  currentId: string
): Promise<DarshanStream[]> {
  try {
    const res = await getLiveDarshan();
    return res.streams.filter((s) => s.id !== currentId).slice(0, 4);
  } catch {
    return [];
  }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const stream = await getStreamById(id);
  return {
    title: `Live Darshan - ${stream.temple.name}`,
    description: `Watch live darshan from ${stream.temple.name}, ${stream.temple.city}. Dedicated to ${stream.temple.deityPrimary}.`,
  };
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default async function DarshanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const stream = await getStreamById(id);
  const relatedStreams = await getRelatedStreams(id);

  const isLive = stream.status === 'live';
  const templeImage =
    stream.temple.images && stream.temple.images.length > 0 ? stream.temple.images[0]!.url : null;

  return (
    <div className="min-h-screen bg-[#2a2520]">
      {/* Breadcrumb */}
      <div className="border-b border-surface-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-1.5 text-sm text-surface-500">
            <a
              href="/"
              className="hover:text-saffron-400 transition-colors flex items-center gap-1"
            >
              <Home className="w-3.5 h-3.5" />
              Home
            </a>
            <ChevronRight className="w-3.5 h-3.5 text-surface-600" />
            <a
              href="/darshan"
              className="hover:text-saffron-400 transition-colors"
            >
              Live Darshan
            </a>
            <ChevronRight className="w-3.5 h-3.5 text-surface-600" />
            <span className="text-surface-300 font-medium truncate max-w-[200px]">
              {stream.temple.name}
            </span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main — Video Player */}
          <div className="lg:col-span-2 space-y-6">
            {/* Player */}
            <DarshanPlayer
              streamUrl={stream.playbackUrl || null}
              templeName={stream.temple.name}
              templeSlug={stream.temple.slug}
              isLive={isLive}
              viewerCount={stream.viewerCount}
              isPremium={stream.isPremium}
              currentEvent={isLive ? 'Live Darshan' : undefined}
              scheduledStart={stream.scheduledStart}
              templeCity={stream.temple.city}
              templeDeity={stream.temple.deityPrimary}
              templeImage={templeImage}
            />

            {/* Stream info */}
            <div className="bg-surface-800 rounded-xl p-6 border border-surface-700">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white">
                    {stream.temple.name}
                  </h1>
                  <div className="flex items-center gap-3 mt-2 text-sm text-surface-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {stream.temple.city}
                    </span>
                    <span>{stream.temple.deityPrimary}</span>
                    {isLive && (
                      <span className="flex items-center gap-1 text-red-400">
                        <Users className="w-4 h-4" />
                        {stream.viewerCount.toLocaleString('en-IN')} watching
                      </span>
                    )}
                  </div>
                </div>
                <a
                  href={`/temples/${stream.temple.slug}`}
                  className="hidden sm:inline-flex items-center gap-1.5 text-sm text-saffron-400 font-semibold hover:text-saffron-300 transition-colors shrink-0"
                >
                  Temple Page
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-surface-700">
                <div>
                  <div className="text-xs text-surface-500 font-medium uppercase">
                    Status
                  </div>
                  <div className="mt-1">
                    {isLive ? (
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-red-400">
                        <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                        LIVE
                      </span>
                    ) : (
                      <span className="text-sm text-surface-400">Scheduled</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-surface-500 font-medium uppercase">
                    Peak Viewers
                  </div>
                  <div className="text-sm font-semibold text-white mt-1">
                    {stream.peakViewers.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-surface-500 font-medium uppercase">
                    Quality
                  </div>
                  <div className="text-sm font-semibold text-white mt-1">
                    HD 1080p
                  </div>
                </div>
              </div>
            </div>

            {/* Today's Schedule */}
            <div className="bg-surface-800 rounded-xl p-6 border border-surface-700">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-saffron-400" />
                Today&rsquo;s Schedule
              </h2>
              <div className="space-y-0">
                {fallbackSchedule.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 py-3 border-b border-surface-700/50 last:border-0"
                  >
                    <span className="text-sm text-surface-400 font-medium w-20 shrink-0">
                      {item.time}
                    </span>
                    <span className="text-sm text-white flex-1">
                      {item.event}
                    </span>
                    <div>
                      {item.status === 'live' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                          LIVE
                        </span>
                      ) : item.status === 'completed' ? (
                        <span className="text-xs text-surface-600">
                          Completed
                        </span>
                      ) : (
                        <button className="inline-flex items-center gap-1 text-xs text-surface-500 hover:text-saffron-400 transition-colors">
                          <Bell className="w-3.5 h-3.5" />
                          Remind
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat / Prayer request placeholder */}
            <div className="bg-surface-800 rounded-xl p-6 border border-surface-700">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-saffron-400" />
                Live Chat & Prayer Requests
              </h2>
              <div className="bg-surface-700/50 rounded-xl p-8 text-center">
                <MessageCircle className="w-10 h-10 text-surface-600 mx-auto mb-3" />
                <p className="text-surface-400 text-sm mb-4">
                  Join the community chat and submit prayer requests during live
                  darshan.
                </p>
                <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-saffron-600 text-white font-medium text-sm rounded-lg hover:bg-saffron-700 transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  Join Chat
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Temple info card */}
            <div className="bg-surface-800 rounded-xl p-6 border border-surface-700">
              <h3 className="font-bold text-white mb-4">Temple Information</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-surface-500 font-medium uppercase mb-1">
                    Name
                  </div>
                  <div className="text-white font-semibold">
                    {stream.temple.name}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-surface-500 font-medium uppercase mb-1">
                    Primary Deity
                  </div>
                  <div className="text-surface-300">
                    {stream.temple.deityPrimary}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-surface-500 font-medium uppercase mb-1">
                    Location
                  </div>
                  <div className="text-surface-300 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {stream.temple.city}
                  </div>
                </div>
              </div>
              <a
                href={`/temples/${stream.temple.slug}`}
                className="mt-5 flex items-center justify-center gap-1.5 w-full py-2.5 bg-saffron-600 text-white font-medium text-sm rounded-lg hover:bg-saffron-700 transition-colors"
              >
                View Temple Details
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Related Temples */}
            <div className="bg-surface-800 rounded-xl p-6 border border-surface-700">
              <h3 className="font-bold text-white mb-4">
                Related Temples
              </h3>
              <div className="space-y-4">
                {(relatedStreams.length > 0
                  ? relatedStreams.map((s) => ({
                      name: s.temple.name,
                      city: s.temple.city,
                      deity: s.temple.deityPrimary,
                      slug: s.temple.slug,
                      isLive: s.status === 'live',
                      viewers: s.viewerCount,
                      streamId: s.id,
                    }))
                  : fallbackRelatedTemples.map((t) => ({
                      ...t,
                      streamId: t.slug,
                    }))
                ).map((temple) => (
                  <a
                    key={temple.name}
                    href={`/darshan/${temple.streamId}`}
                    className="group flex items-start gap-3 pb-4 border-b border-surface-700/50 last:border-0 last:pb-0"
                  >
                    <div className="w-12 h-12 rounded-lg bg-surface-700 flex items-center justify-center shrink-0">
                      <Video className="w-5 h-5 text-surface-600" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-white truncate group-hover:text-saffron-400 transition-colors">
                        {temple.name}
                      </h4>
                      <p className="text-xs text-surface-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {temple.city}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-surface-600">
                          {temple.deity}
                        </span>
                        {temple.isLive && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400">
                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                            LIVE
                          </span>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Book Puja CTA */}
            <div className="bg-gradient-to-br from-saffron-600 to-temple-gold rounded-xl p-6 text-white">
              <Star className="w-8 h-8 mb-3 opacity-80" />
              <h3 className="font-bold text-lg mb-2">Book a Puja</h3>
              <p className="text-sm text-saffron-100 mb-4">
                Book a special puja at {stream.temple.name} performed by
                verified pandits with video proof.
              </p>
              <a
                href={`/temples/${stream.temple.slug}`}
                className="block w-full py-2.5 bg-white text-saffron-700 font-semibold text-sm rounded-xl hover:bg-saffron-50 transition-colors text-center"
              >
                Browse Pujas
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
