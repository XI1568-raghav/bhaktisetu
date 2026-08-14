import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
 Music,
 Play,
 Heart,
 Clock,
 TrendingUp,
 Headphones,
 BookOpen,
 Star,
 Search,
 List,
 Grid3X3,
 ChevronRight,
 Download,
 Volume2,
 Sparkles,
} from 'lucide-react';
import { getContent, getDailyContent, type ContentItem } from '../../lib/api';
import ContentPageHeader from '../../components/ContentPageHeader';
import { getContentImage, getDeityImage } from '../../lib/images';

export const metadata: Metadata = {
 alternates: { canonical: 'https://darshya.online/content' },
 title: 'Content',
 description:
 'Explore a vast library of devotional content — Aartis, Chalisas, Mantras, Bhajans, and spiritual stories. Stream or download for offline listening.',
};

// ─── Static fallback data ─────────────────────────────────────────────────────

const tabs = [
 { id: 'all', label: 'All', count: 22 },
 { id: 'aarti', label: 'Aarti', count: 5 },
 { id: 'chalisa', label: 'Chalisa', count: 6 },
 { id: 'mantra', label: 'Mantra', count: 6 },
 { id: 'article', label: 'Articles', count: 5 },
];

const fallbackFeaturedContent: ContentItem[] = [
 {
 id: '1',
 type: 'chalisa',
 title: 'Hanuman Chalisa',
 titleLocal: null,
 slug: 'hanuman-chalisa',
 body: '',
 audioUrl: null,
 videoUrl: null,
 imageUrl: '/images/content/hanuman-chalisa.jpg',
 deity: 'Lord Hanuman',
 language: 'hindi',
 durationSeconds: 582,
 tags: ['chalisa', 'hanuman'],
 isPremium: false,
 viewCount: 12500000,
 likeCount: 890000,
 status: 'published',
 },
 {
 id: '2',
 type: 'aarti',
 title: 'Om Jai Jagdish Hare',
 titleLocal: null,
 slug: 'om-jai-jagdish-hare',
 body: '',
 audioUrl: null,
 videoUrl: null,
 imageUrl: '/images/content/om-jai-jagdish.jpg',
 deity: 'Lord Vishnu',
 language: 'hindi',
 durationSeconds: 378,
 tags: ['aarti', 'vishnu'],
 isPremium: false,
 viewCount: 8300000,
 likeCount: 620000,
 status: 'published',
 },
];

const fallbackContentItems: ContentItem[] = [
 {
 id: '3',
 type: 'mantra',
 title: 'Gayatri Mantra - 108 times',
 titleLocal: null,
 slug: 'gayatri-mantra-108',
 body: '',
 audioUrl: null,
 videoUrl: null,
 imageUrl: null,
 deity: 'Goddess Gayatri',
 language: 'sanskrit',
 durationSeconds: 2700,
 tags: ['mantra', 'gayatri'],
 isPremium: false,
 viewCount: 6100000,
 likeCount: 450000,
 status: 'published',
 },
 {
 id: '4',
 type: 'bhajan',
 title: 'Shiv Tandav Stotram',
 titleLocal: null,
 slug: 'shiv-tandav-stotram',
 body: '',
 audioUrl: null,
 videoUrl: null,
 imageUrl: null,
 deity: 'Lord Shiva',
 language: 'sanskrit',
 durationSeconds: 690,
 tags: ['stotram', 'shiva'],
 isPremium: false,
 viewCount: 5800000,
 likeCount: 410000,
 status: 'published',
 },
 {
 id: '5',
 type: 'mantra',
 title: 'Vishnu Sahasranamam',
 titleLocal: null,
 slug: 'vishnu-sahasranamam',
 body: '',
 audioUrl: null,
 videoUrl: null,
 imageUrl: null,
 deity: 'Lord Vishnu',
 language: 'sanskrit',
 durationSeconds: 1725,
 tags: ['mantra', 'vishnu'],
 isPremium: false,
 viewCount: 4200000,
 likeCount: 320000,
 status: 'published',
 },
 {
 id: '6',
 type: 'mantra',
 title: 'Om Namah Shivaya - 108 times',
 titleLocal: null,
 slug: 'om-namah-shivaya-108',
 body: '',
 audioUrl: null,
 videoUrl: null,
 imageUrl: null,
 deity: 'Lord Shiva',
 language: 'sanskrit',
 durationSeconds: 1930,
 tags: ['mantra', 'shiva'],
 isPremium: false,
 viewCount: 3900000,
 likeCount: 290000,
 status: 'published',
 },
 {
 id: '7',
 type: 'aarti',
 title: 'Aarti Kunj Bihari Ki',
 titleLocal: null,
 slug: 'aarti-kunj-bihari-ki',
 body: '',
 audioUrl: null,
 videoUrl: null,
 imageUrl: null,
 deity: 'Lord Krishna',
 language: 'hindi',
 durationSeconds: 328,
 tags: ['aarti', 'krishna'],
 isPremium: false,
 viewCount: 3500000,
 likeCount: 260000,
 status: 'published',
 },
 {
 id: '8',
 type: 'chalisa',
 title: 'Durga Chalisa',
 titleLocal: null,
 slug: 'durga-chalisa',
 body: '',
 audioUrl: null,
 videoUrl: null,
 imageUrl: null,
 deity: 'Goddess Durga',
 language: 'hindi',
 durationSeconds: 495,
 tags: ['chalisa', 'durga'],
 isPremium: false,
 viewCount: 3100000,
 likeCount: 230000,
 status: 'published',
 },
 {
 id: '9',
 type: 'bhajan',
 title: 'Achyutam Keshavam',
 titleLocal: null,
 slug: 'achyutam-keshavam',
 body: '',
 audioUrl: null,
 videoUrl: null,
 imageUrl: null,
 deity: 'Lord Krishna',
 language: 'hindi',
 durationSeconds: 472,
 tags: ['bhajan', 'krishna'],
 isPremium: false,
 viewCount: 2800000,
 likeCount: 210000,
 status: 'published',
 },
 {
 id: '10',
 type: 'aarti',
 title: 'Ganesh Aarti - Jai Ganesh Deva',
 titleLocal: null,
 slug: 'jai-ganesh-deva',
 body: '',
 audioUrl: null,
 videoUrl: null,
 imageUrl: null,
 deity: 'Lord Ganesha',
 language: 'hindi',
 durationSeconds: 310,
 tags: ['aarti', 'ganesha'],
 isPremium: false,
 viewCount: 2500000,
 likeCount: 190000,
 status: 'published',
 },
 {
 id: '11',
 type: 'bhajan',
 title: 'Shri Ramchandra Kripalu',
 titleLocal: null,
 slug: 'shri-ramchandra-kripalu',
 body: '',
 audioUrl: null,
 videoUrl: null,
 imageUrl: null,
 deity: 'Lord Rama',
 language: 'hindi',
 durationSeconds: 400,
 tags: ['bhajan', 'rama'],
 isPremium: false,
 viewCount: 2300000,
 likeCount: 175000,
 status: 'published',
 },
 {
 id: '12',
 type: 'mantra',
 title: 'Mahamrityunjaya Mantra - 108',
 titleLocal: null,
 slug: 'mahamrityunjaya-mantra-108',
 body: '',
 audioUrl: null,
 videoUrl: null,
 imageUrl: null,
 deity: 'Lord Shiva',
 language: 'sanskrit',
 durationSeconds: 2302,
 tags: ['mantra', 'shiva', 'healing'],
 isPremium: false,
 viewCount: 2100000,
 likeCount: 160000,
 status: 'published',
 },
 {
 id: '13',
 type: 'bhajan',
 title: 'Shri Krishna Govind Hare Murari',
 titleLocal: null,
 slug: 'shri-krishna-govind-hare-murari',
 body: '',
 audioUrl: null,
 videoUrl: null,
 imageUrl: null,
 deity: 'Lord Krishna',
 language: 'hindi',
 durationSeconds: 485,
 tags: ['bhajan', 'krishna'],
 isPremium: false,
 viewCount: 1900000,
 likeCount: 140000,
 status: 'published',
 },
 {
 id: '14',
 type: 'story',
 title: 'The Story of Lord Ganesha',
 titleLocal: null,
 slug: 'story-lord-ganesha',
 body: '',
 audioUrl: null,
 videoUrl: null,
 imageUrl: null,
 deity: 'Lord Ganesha',
 language: 'english',
 durationSeconds: 920,
 tags: ['story', 'ganesha'],
 isPremium: false,
 viewCount: 1200000,
 likeCount: 95000,
 status: 'published',
 },
];

const collections = [
 {
 name: 'Morning Mantras',
 filterType: 'mantra',
 count: 6,
 description: 'Start your day with sacred chants',
 gradient: 'from-amber-400 to-saffron-600',
 },
 {
 name: 'Evening Aarti Collection',
 filterType: 'aarti',
 count: 5,
 description: 'Complete sandhya aarti for all deities',
 gradient: 'from-saffron-500 to-lotus-pink',
 },
 {
 name: 'Chalisas',
 filterType: 'chalisa',
 count: 6,
 description: 'Sacred 40-verse hymns for daily recitation',
 gradient: 'from-ganga-blue to-purple-600',
 },
 {
 name: 'Spiritual Articles',
 filterType: 'article',
 count: 5,
 description: 'Reflections, scriptures, and devotional reading',
 gradient: 'from-ganga-blue to-tulsi-green',
 },
 {
 name: 'Sacred Texts',
 filterType: 'article',
 href: '/content/books',
 count: 3,
 description: 'Bhagavad Gita, Ramayana, Upanishads — full reader',
 gradient: 'from-saffron-700 to-saffron-800',
 },
] as Array<{
 name: string;
 filterType: string;
 href?: string;
 count: number;
 description: string;
 gradient: string;
}>;

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

// ─── Data fetching ────────────────────────────────────────────────────────────

const PAGE_SIZE = 12;

interface PagedContent {
 items: ContentItem[];
 total: number;
 totalPages: number;
 page: number;
}

async function fetchContentData(
 type?: string,
 search?: string,
 page: number = 1,
): Promise<PagedContent> {
 const safePage = Math.max(1, page);
 try {
 // When the user is searching, the API filter doesn't cover free-text;
 // pull a wider window then filter + paginate locally so search works
 // across the whole catalogue rather than just one server page.
 if (search) {
 const params: { type?: string; limit?: number } = { limit: 200 };
 if (type && type !== 'all') params.type = type;
 const res = await getContent(params);
 const q = search.toLowerCase();
 const filtered = res.data.filter(
 (i) =>
 i.title.toLowerCase().includes(q) ||
 (i.deity && i.deity.toLowerCase().includes(q)) ||
 i.tags.some((t) => t.toLowerCase().includes(q)),
 );
 const total = filtered.length;
 const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
 const start = (safePage - 1) * PAGE_SIZE;
 return {
 items: filtered.slice(start, start + PAGE_SIZE),
 total,
 totalPages,
 page: Math.min(safePage, totalPages),
 };
 }

 const params: { type?: string; page: number; limit: number } = {
 page: safePage,
 limit: PAGE_SIZE,
 };
 if (type && type !== 'all') params.type = type;
 const res = await getContent(params);
 return {
 items: res.data,
 total: res.pagination?.total ?? res.data.length,
 totalPages: Math.max(1, res.pagination?.totalPages ?? 1),
 page: res.pagination?.page ?? safePage,
 };
 } catch {
 let items = [...fallbackFeaturedContent, ...fallbackContentItems];
 if (type && type !== 'all') {
 items = items.filter(
 (i) => i.type.toLowerCase() === type.toLowerCase(),
 );
 }
 if (search) {
 const q = search.toLowerCase();
 items = items.filter(
 (i) =>
 i.title.toLowerCase().includes(q) ||
 (i.deity && i.deity.toLowerCase().includes(q)) ||
 i.tags.some((t) => t.toLowerCase().includes(q)),
 );
 }
 const total = items.length;
 const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
 const start = (safePage - 1) * PAGE_SIZE;
 return {
 items: items.slice(start, start + PAGE_SIZE),
 total,
 totalPages,
 page: Math.min(safePage, totalPages),
 };
 }
}

function buildContentHref(
 type: string | undefined,
 search: string | undefined,
 page: number,
): string {
 const params = new URLSearchParams();
 if (type && type !== 'all') params.set('type', type);
 if (search) params.set('search', search);
 if (page > 1) params.set('page', String(page));
 const qs = params.toString();
 return `/content${qs ? `?${qs}` : ''}`;
}

async function fetchDailyContent() {
 try {
 return await getDailyContent();
 } catch {
 return {
 aarti: fallbackFeaturedContent.find((c) => c.type === 'aarti') ?? null,
 mantra: fallbackContentItems.find((c) => c.type === 'mantra') ?? null,
 chalisa:
 fallbackFeaturedContent.find((c) => c.type === 'chalisa') ?? null,
 article: null,
 };
 }
}

// ─── Daily Content Section ────────────────────────────────────────────────────

async function DailyContentSection() {
 const daily = await fetchDailyContent();
 const dailyItems = [daily.aarti, daily.chalisa, daily.mantra, daily.article].filter(
 Boolean
 ) as ContentItem[];

 if (dailyItems.length === 0) return null;

 return (
 <section className="mb-12">
 <h2 className="text-2xl font-semibold tracking-tight text-surface-800 mb-2 flex items-center gap-2">
 <Sparkles className="w-5 h-5 text-temple-gold" />
 Today&rsquo;s Featured
 </h2>
 <p className="text-sm text-surface-500 mb-6">
 Curated daily devotional content for your spiritual journey
 </p>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {dailyItems.map((item) => (
 <a
 key={item.id}
 href={`/content/${item.slug}`}
 className="group flex gap-5 bg-white rounded-xl p-5 border border-surface-100 hover:shadow-md transition-all"
 >
 <div className="relative w-32 h-32 shrink-0 rounded-xl bg-gradient-to-br from-saffron-200 to-amber-100 flex items-center justify-center overflow-hidden">
 <img
 src={getDeityImage(
 item.deity === 'Lord Hanuman' ? 'lord-hanuman' :
 item.deity === 'Lord Vishnu' ? 'lord-vishnu' :
 item.deity === 'Lord Shiva' ? 'lord-shiva' :
 item.deity === 'Lord Krishna' ? 'lord-krishna' :
 item.deity === 'Lord Ganesha' ? 'lord-ganesha' :
 item.deity === 'Goddess Gayatri' ? 'goddess-saraswati' :
 'lord-shiva',
 'square'
 )}
 alt={item.title}
 loading="lazy"
 className="absolute inset-0 w-full h-full object-cover"
 />
 <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
 <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
 <Play className="w-5 h-5 text-saffron-600 ml-0.5" />
 </div>
 </div>
 <span className="absolute bottom-2 right-2 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded backdrop-blur-sm">
 {formatDuration(item.durationSeconds)}
 </span>
 </div>
 <div className="flex-1 min-w-0">
 <span className="inline-block text-xs font-semibold text-saffron-600 bg-saffron-50 px-2 py-0.5 rounded-full mb-2 uppercase">
 {item.type}
 </span>
 <h3 className="text-lg font-bold text-surface-800 group-hover:text-saffron-600 transition-colors">
 {item.title}
 </h3>
 {item.deity && (
 <p className="text-sm text-surface-500">{item.deity}</p>
 )}
 <div className="flex items-center gap-3 mt-3 text-xs text-surface-400">
 <span className="flex items-center gap-1">
 <Headphones className="w-3 h-3" />
 {formatCount(item.viewCount)}
 </span>
 <span className="flex items-center gap-1">
 <Heart className="w-3 h-3" />
 {formatCount(item.likeCount)}
 </span>
 </div>
 </div>
 </a>
 ))}
 </div>
 </section>
 );
}

// ─── Content List Section ─────────────────────────────────────────────────────

async function ContentListSection({
 type,
 search,
 page,
}: {
 type?: string;
 search?: string;
 page: number;
}) {
 const paged = await fetchContentData(type, search, page);
 const items = paged.items;
 const activeType = type || 'all';
 const label =
 tabs.find((t) => t.id === activeType)?.label ?? 'All Content';

 if (items.length === 0) {
 return (
 <section>
 <h2 className="text-2xl font-semibold tracking-tight text-surface-800 mb-6">
 {search ? `Search results for "${search}"` : label}
 </h2>
 <div className="bg-white rounded-xl p-12 border border-surface-100 text-center">
 <Music className="w-12 h-12 text-surface-300 mx-auto mb-3" />
 <p className="text-surface-500">
 No content found.{' '}
 {search
 ? 'Try a different search term.'
 : 'Check back soon for new additions.'}
 </p>
 </div>
 </section>
 );
 }

 const currentPage = paged.page;
 const totalPages = paged.totalPages;
 const hasPrev = currentPage > 1;
 const hasNext = currentPage < totalPages;

 return (
 <section>
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-2xl font-semibold tracking-tight text-surface-800">
 {search ? `Results for "${search}"` : `All ${label}`}
 </h2>
 <span className="text-sm text-surface-400">
 {paged.total} item{paged.total !== 1 ? 's' : ''}
 </span>
 </div>

 {/* List header */}
 <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-surface-400 uppercase tracking-wider border-b border-surface-200">
 <div className="col-span-1">#</div>
 <div className="col-span-4">Title</div>
 <div className="col-span-2">Deity</div>
 <div className="col-span-1">Type</div>
 <div className="col-span-1">
 <Clock className="w-3.5 h-3.5" />
 </div>
 <div className="col-span-1">Views</div>
 <div className="col-span-1">Likes</div>
 <div className="col-span-1"></div>
 </div>

 {/* Content list */}
 <div className="divide-y divide-surface-100">
 {items.map((item, i) => (
 <a
 key={item.id}
 href={`/content/${item.slug}`}
 className="group grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 py-3.5 items-center hover:bg-saffron-50/50 rounded-lg transition-colors"
 >
 {/* # / Play button */}
 <div className="hidden md:block col-span-1">
 <span className="text-sm text-surface-400 group-hover:hidden">
 {i + 1}
 </span>
 <Play className="w-4 h-4 text-saffron-600 hidden group-hover:block" />
 </div>

 {/* Title */}
 <div className="col-span-4 flex items-center gap-3">
 <div className="md:hidden w-10 h-10 bg-saffron-100 rounded-lg flex items-center justify-center shrink-0">
 <Play className="w-4 h-4 text-saffron-500" />
 </div>
 <div className="min-w-0">
 <div className="font-medium text-surface-800 truncate group-hover:text-saffron-600 transition-colors">
 {item.title}
 </div>
 <div className="md:hidden text-sm text-surface-500">
 {item.deity ?? item.type} &middot;{' '}
 {formatDuration(item.durationSeconds)}
 </div>
 </div>
 </div>

 {/* Deity */}
 <div className="hidden md:block col-span-2 text-sm text-surface-600 truncate">
 {item.deity ?? '-'}
 </div>

 {/* Type */}
 <div className="hidden md:block col-span-1">
 <span className="text-xs font-medium text-saffron-600 bg-saffron-50 px-2 py-0.5 rounded-full capitalize">
 {item.type}
 </span>
 </div>

 {/* Duration */}
 <div className="hidden md:block col-span-1 text-sm text-surface-500">
 {formatDuration(item.durationSeconds)}
 </div>

 {/* Views */}
 <div className="hidden md:block col-span-1 text-sm text-surface-500">
 {formatCount(item.viewCount)}
 </div>

 {/* Likes */}
 <div className="hidden md:flex col-span-1 items-center gap-1 text-sm text-surface-600">
 <Heart className="w-3.5 h-3.5 text-lotus-pink" />
 {formatCount(item.likeCount)}
 </div>

 {/* Actions */}
 <div className="hidden md:flex col-span-1 items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
 <span className="text-surface-400 hover:text-saffron-600">
 <Download className="w-4 h-4" />
 </span>
 </div>
 </a>
 ))}
 </div>

 {/* Pagination */}
 {totalPages > 1 && (
 <nav
 aria-label="Content pagination"
 className="mt-8 flex items-center justify-between border-t border-surface-100 pt-6"
 >
 {hasPrev ? (
 <a
 href={buildContentHref(type, search, currentPage - 1)}
 rel="prev"
 className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-surface-200 text-sm font-medium text-surface-700 hover:border-saffron-300 hover:text-saffron-600 transition-colors"
 >
 <ChevronRight className="w-4 h-4 rotate-180" />
 Previous
 </a>
 ) : (
 <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-100 text-sm font-medium text-surface-300 cursor-not-allowed">
 <ChevronRight className="w-4 h-4 rotate-180" />
 Previous
 </span>
 )}

 <span className="text-sm text-surface-500">
 Page <span className="font-semibold text-surface-700">{currentPage}</span>{' '}
 of <span className="font-semibold text-surface-700">{totalPages}</span>
 </span>

 {hasNext ? (
 <a
 href={buildContentHref(type, search, currentPage + 1)}
 rel="next"
 className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-surface-200 text-sm font-medium text-surface-700 hover:border-saffron-300 hover:text-saffron-600 transition-colors"
 >
 Next
 <ChevronRight className="w-4 h-4" />
 </a>
 ) : (
 <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-100 text-sm font-medium text-surface-300 cursor-not-allowed">
 Next
 <ChevronRight className="w-4 h-4" />
 </span>
 )}
 </nav>
 )}
 </section>
 );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default async function ContentPage({
 searchParams,
}: {
 searchParams: Promise<{ type?: string; search?: string; page?: string }>;
}) {
 const { type, search, page: pageParam } = await searchParams;
 const activeType = type || 'all';
 const parsedPage = Number.parseInt(pageParam ?? '1', 10);
 const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

 return (
 <div className="min-h-[100dvh] bg-saffron-50">
 {/* Hero with Language Switcher */}
 <ContentPageHeader currentType={type} currentSearch={search} />

 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
 {/* Tabs */}
 <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-8 border-b border-surface-200">
 {tabs.map((tab) => (
 <a
 key={tab.id}
 href={`/content${tab.id === 'all' ? '' : `?type=${tab.id}`}${search ? `${tab.id === 'all' ? '?' : '&'}search=${encodeURIComponent(search)}` : ''}`}
 className={`shrink-0 px-5 py-3 text-sm font-semibold rounded-t-lg transition-colors ${
 activeType === tab.id
 ? 'text-saffron-600 bg-white border border-surface-200 border-b-white -mb-px'
 : 'text-surface-500 hover:text-surface-600 hover:bg-surface-50'
 }`}
 >
 {tab.label}
 <span
 className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
 activeType === tab.id
 ? 'bg-saffron-100 text-saffron-600'
 : 'bg-surface-100 text-surface-400'
 }`}
 >
 {tab.count}
 </span>
 </a>
 ))}
 </div>

 {/* Featured daily content (only shown on "All" tab without search) */}
 {activeType === 'all' && !search && (
 <Suspense
 fallback={
 <div className="mb-12 animate-pulse">
 <div className="h-6 bg-surface-200 rounded w-48 mb-6" />
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="h-40 bg-surface-100 rounded-xl" />
 <div className="h-40 bg-surface-100 rounded-xl" />
 </div>
 </div>
 }
 >
 <DailyContentSection />
 </Suspense>
 )}

 {/* Curated Collections (only on "All" tab without search) */}
 {activeType === 'all' && !search && (
 <section className="mb-12">
 <h2 className="text-2xl font-semibold tracking-tight text-surface-800 mb-6">
 Curated Collections
 </h2>
 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
 {collections.map((col, i) => {
 const collectionImages = [
 getContentImage('mantra', 'thumbnail'),
 getContentImage('aarti', 'thumbnail'),
 getContentImage('chalisa', 'thumbnail'),
 getContentImage('stotram', 'thumbnail'),
 ];
 return (
 <a
 key={col.name}
 href={col.href ?? `/content?type=${col.filterType}`}
 className="group rounded-xl overflow-hidden hover:shadow-lg transition-all"
 >
 <div
 className={`relative aspect-square bg-gradient-to-br ${col.gradient} p-4 flex flex-col justify-end`}
 >
 <img
 src={collectionImages[i] || collectionImages[0]}
 alt={col.name}
 loading="lazy"
 className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity"
 />
 <div className="relative text-white">
 <h3 className="font-bold text-sm leading-tight drop-shadow-sm">
 {col.name}
 </h3>
 <p className="text-xs text-white/70 mt-1">
 {col.href ? `${col.count} books` : `${col.count} tracks`}
 </p>
 </div>
 </div>
 </a>
 );
 })}
 </div>
 </section>
 )}

 {/* Content List */}
 <Suspense
 fallback={
 <div className="animate-pulse space-y-3">
 {Array.from({ length: 8 }).map((_, i) => (
 <div key={i} className="h-14 bg-surface-100 rounded-lg" />
 ))}
 </div>
 }
 >
 <ContentListSection type={type} search={search} page={page} />
 </Suspense>
 </div>
 </div>
 );
}
