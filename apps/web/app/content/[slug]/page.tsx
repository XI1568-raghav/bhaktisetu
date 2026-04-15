import type { Metadata } from 'next';
import {
  Heart,
  Share2,
  Eye,
  ChevronRight,
  Clock,
  Music,
  BookOpen,
  Play,
  Tag,
  Home,
} from 'lucide-react';
import { getContent, type ContentItem } from '../../../lib/api';
import AudioPlayer from '../../../components/AudioPlayer';

// ─── Fallback data ────────────────────────────────────────────────────────────

const fallbackContent: ContentItem = {
  id: 'fallback-1',
  type: 'chalisa',
  title: 'Hanuman Chalisa',
  titleLocal: null,
  slug: 'hanuman-chalisa',
  body: `<h2>Doha</h2>
<p>Shri Guru Charan Saroj Raj, Nij Man Mukuru Sudhari<br/>
Barnau Raghubar Bimal Jasu, Jo Dayaku Phal Chari</p>

<p>Buddhiheen Tanu Janike, Sumirau Pavan Kumar<br/>
Bal Buddhi Vidya Dehu Mohi, Harahu Kalesh Vikar</p>

<h2>Chaupai</h2>
<p>Jai Hanuman Gyan Gun Sagar<br/>
Jai Kapis Tihun Lok Ujagar</p>

<p>Ram Doot Atulit Bal Dhama<br/>
Anjani Putra Pavan Sut Nama</p>

<p>Mahabir Bikram Bajrangi<br/>
Kumati Nivar Sumati Ke Sangi</p>

<p>Kanchan Baran Biraj Subesa<br/>
Kanan Kundal Kunchit Kesa</p>

<p>Hath Bajra Aur Dhwaja Biraje<br/>
Kandhe Moonj Janeu Saje</p>

<p>Shankar Suvan Kesri Nandan<br/>
Tej Pratap Maha Jag Bandan</p>

<p>Vidyavan Guni Ati Chatur<br/>
Ram Kaj Karibe Ko Atur</p>

<p>Prabhu Charitra Sunibe Ko Rasiya<br/>
Ram Lakhan Sita Man Basiya</p>

<p>Sukshma Roop Dhari Siyahi Dikhawa<br/>
Bikat Roop Dhari Lanka Jarawa</p>

<p>Bheem Roop Dhari Asur Sanhare<br/>
Ramchandra Ke Kaj Sanware</p>`,
  audioUrl: null,
  videoUrl: null,
  imageUrl: '/images/content/hanuman-chalisa.jpg',
  deity: 'Lord Hanuman',
  language: 'hindi',
  durationSeconds: 582,
  tags: ['chalisa', 'hanuman', 'tulsidas', 'devotional'],
  isPremium: false,
  viewCount: 12500000,
  likeCount: 890000,
  status: 'published',
};

const fallbackRelated: ContentItem[] = [
  {
    id: 'rel-1',
    type: 'mantra',
    title: 'Hanuman Beej Mantra - 108 times',
    titleLocal: null,
    slug: 'hanuman-beej-mantra',
    body: '',
    audioUrl: null,
    videoUrl: null,
    imageUrl: null,
    deity: 'Lord Hanuman',
    language: 'sanskrit',
    durationSeconds: 1800,
    tags: ['mantra', 'hanuman'],
    isPremium: false,
    viewCount: 340000,
    likeCount: 45000,
    status: 'published',
  },
  {
    id: 'rel-2',
    type: 'aarti',
    title: 'Aarti Keeje Hanuman Lala Ki',
    titleLocal: null,
    slug: 'aarti-hanuman-lala',
    body: '',
    audioUrl: null,
    videoUrl: null,
    imageUrl: null,
    deity: 'Lord Hanuman',
    language: 'hindi',
    durationSeconds: 318,
    tags: ['aarti', 'hanuman'],
    isPremium: false,
    viewCount: 560000,
    likeCount: 67000,
    status: 'published',
  },
  {
    id: 'rel-3',
    type: 'bhajan',
    title: 'Bajrang Baan',
    titleLocal: null,
    slug: 'bajrang-baan',
    body: '',
    audioUrl: null,
    videoUrl: null,
    imageUrl: null,
    deity: 'Lord Hanuman',
    language: 'hindi',
    durationSeconds: 720,
    tags: ['bhajan', 'hanuman', 'protection'],
    isPremium: false,
    viewCount: 780000,
    likeCount: 92000,
    status: 'published',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-IN');
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const audioTypes = ['aarti', 'mantra', 'bhajan', 'chalisa', 'stotram'];

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getContentBySlug(slug: string): Promise<ContentItem> {
  try {
    const res = await getContent();
    const found = res.data.find((item) => item.slug === slug);
    if (found) return found;
  } catch {
    // API unavailable
  }
  return fallbackContent;
}

async function getRelatedContent(
  content: ContentItem
): Promise<ContentItem[]> {
  try {
    // Fetch by same deity or same type
    const [byDeity, byType] = await Promise.all([
      content.deity ? getContent({ deity: content.deity }) : null,
      getContent({ type: content.type }),
    ]);

    const related: ContentItem[] = [];
    const seen = new Set<string>([content.id]);

    const addItems = (items: ContentItem[]) => {
      for (const item of items) {
        if (!seen.has(item.id) && related.length < 6) {
          seen.add(item.id);
          related.push(item);
        }
      }
    };

    if (byDeity) addItems(byDeity.data);
    if (byType) addItems(byType.data);

    return related;
  } catch {
    return fallbackRelated;
  }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const content = await getContentBySlug(slug);
  return {
    title: content.title,
    description: `${content.type.charAt(0).toUpperCase() + content.type.slice(1)} - ${content.title}. ${content.deity ? `Dedicated to ${content.deity}.` : ''} Listen and read on Bhaktisetu.`,
    openGraph: {
      title: content.title,
      description: `${content.type} on Bhaktisetu`,
      images: content.imageUrl ? [content.imageUrl] : [],
    },
  };
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const content = await getContentBySlug(slug);
  const related = await getRelatedContent(content);

  const isAudio = audioTypes.includes(content.type.toLowerCase());

  return (
    <div className="min-h-screen bg-saffron-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-1.5 text-sm text-stone-500">
            <a href="/" className="hover:text-saffron-600 transition-colors flex items-center gap-1">
              <Home className="w-3.5 h-3.5" />
              Home
            </a>
            <ChevronRight className="w-3.5 h-3.5 text-stone-300" />
            <a href="/content" className="hover:text-saffron-600 transition-colors">
              Content
            </a>
            <ChevronRight className="w-3.5 h-3.5 text-stone-300" />
            <a
              href={`/content?type=${content.type}`}
              className="hover:text-saffron-600 transition-colors capitalize"
            >
              {content.type}
            </a>
            <ChevronRight className="w-3.5 h-3.5 text-stone-300" />
            <span className="text-stone-900 font-medium truncate max-w-[200px]">
              {content.title}
            </span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl p-6 border border-stone-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold text-saffron-600 bg-saffron-50 px-2.5 py-1 rounded-full uppercase">
                  {content.type}
                </span>
                {content.deity && (
                  <span className="text-xs text-stone-400 font-medium">
                    {content.deity}
                  </span>
                )}
                {content.isPremium && (
                  <span className="text-xs font-bold text-temple-gold bg-temple-gold/10 px-2 py-0.5 rounded-full">
                    PREMIUM
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-2">
                {content.title}
              </h1>
              {content.titleLocal && (
                <p className="text-lg text-stone-500 font-[family-name:var(--font-noto-devanagari)]">
                  {content.titleLocal}
                </p>
              )}

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-stone-500">
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {formatCount(content.viewCount)} views
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  {formatCount(content.likeCount)} likes
                </span>
                {content.durationSeconds && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDuration(content.durationSeconds)}
                  </span>
                )}
                <span className="text-xs bg-stone-100 px-2 py-0.5 rounded-full capitalize">
                  {content.language}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 mt-5 pt-5 border-t border-stone-100">
                <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-saffron-50 text-saffron-600 font-semibold text-sm rounded-lg hover:bg-saffron-100 transition-colors">
                  <Heart className="w-4 h-4" />
                  Like
                </button>
                <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-50 text-stone-600 font-semibold text-sm rounded-lg hover:bg-stone-100 transition-colors">
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              </div>
            </div>

            {/* Audio Player (for audio types) */}
            {isAudio && (
              <AudioPlayer
                title={content.title}
                artist={content.deity ?? undefined}
                audioUrl={content.audioUrl}
                imageUrl={content.imageUrl}
                duration={content.durationSeconds ?? 0}
                deity={content.deity}
                type={content.type}
              />
            )}

            {/* Body / Text content */}
            {content.body && (
              <div className="bg-white rounded-xl p-6 border border-stone-100">
                <h2 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
                  {isAudio ? (
                    <>
                      <Music className="w-5 h-5 text-saffron-500" />
                      Full Text / Lyrics
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-5 h-5 text-saffron-500" />
                      Read
                    </>
                  )}
                </h2>
                <div
                  className="prose prose-stone prose-headings:text-stone-900 prose-headings:font-bold prose-p:text-stone-700 prose-p:leading-relaxed max-w-none"
                  dangerouslySetInnerHTML={{ __html: content.body }}
                />
              </div>
            )}

            {/* Tags */}
            {content.tags.length > 0 && (
              <div className="bg-white rounded-xl p-6 border border-stone-100">
                <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-stone-400" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {content.tags.map((tag) => (
                    <a
                      key={tag}
                      href={`/content?search=${encodeURIComponent(tag)}`}
                      className="text-xs font-medium text-stone-500 bg-stone-50 px-3 py-1.5 rounded-full hover:bg-saffron-50 hover:text-saffron-600 transition-colors border border-stone-100"
                    >
                      #{tag}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar — related content */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-stone-100">
              <h3 className="font-bold text-stone-900 mb-4">Related Content</h3>
              <div className="space-y-4">
                {related.map((item) => (
                  <a
                    key={item.id}
                    href={`/content/${item.slug}`}
                    className="group flex items-start gap-3 pb-4 border-b border-stone-50 last:border-0 last:pb-0"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-saffron-100 to-amber-50 flex items-center justify-center shrink-0">
                      {audioTypes.includes(item.type.toLowerCase()) ? (
                        <Music className="w-5 h-5 text-saffron-400" />
                      ) : (
                        <BookOpen className="w-5 h-5 text-saffron-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-saffron-600 uppercase">
                        {item.type}
                      </span>
                      <h4 className="text-sm font-semibold text-stone-900 truncate group-hover:text-saffron-600 transition-colors">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5">
                        {item.deity && <span>{item.deity}</span>}
                        {item.durationSeconds && (
                          <span>{formatDuration(item.durationSeconds)}</span>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div className="bg-gradient-to-br from-saffron-50 to-amber-50 rounded-xl p-6 border border-saffron-100">
              <h3 className="font-bold text-stone-900 mb-3">Browse by Type</h3>
              <div className="space-y-2">
                {['Aarti', 'Chalisa', 'Mantra', 'Bhajan', 'Stories'].map(
                  (t) => (
                    <a
                      key={t}
                      href={`/content?type=${t.toLowerCase()}`}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white transition-colors text-sm text-stone-700 font-medium"
                    >
                      {t}
                      <ChevronRight className="w-4 h-4 text-stone-300" />
                    </a>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
