import type { Metadata } from 'next';

// SIDE-FIX-SEO-404 (2026-06-13): flipped dynamicParams=false → true so unknown
// content slugs (om-jai-jagdish-hare-aarti, ganesh-chalisa, etc) render the
// graceful fallback panel via ISR instead of returning 404. Closes long-tail
// SEO 404s eating crawl budget. Founder backfills authoritative content into
// the API/DB; unknown slugs serve a "coming soon" loading state until then.
export const dynamicParams = true;
export const revalidate = 3600;

export function generateStaticParams() {
  return [
    'hanuman-chalisa',
    'shiv-tandav-stotram',
    'gayatri-mantra',
    'mahamrityunjaya-mantra',
    'aditya-hridayam',
    'durga-saptashati',
    'vishnu-sahasranama',
    'lalita-sahasranama',
    'shri-suktam',
    'rudri-path',
    'sundara-kanda',
    'bhaja-govindam',
    // SIDE-FIX-SEO-404 — common long-tail slugs that were 404-ing
    'om-jai-jagdish-hare-aarti',
    'aarti-kunj-bihari-ki',
    'jai-ganesh-deva-aarti',
    'shiv-chalisa',
    'ganesh-chalisa',
    'durga-chalisa',
    'krishna-chalisa',
    'lakshmi-chalisa',
    'saraswati-chalisa',
    // P0-18 (2026-06-15 audit) — slugs linked from the content listing / API
    // response + chalisas.ts that 404'd under @cloudflare/next-on-pages because
    // they were neither in generateStaticParams nor ISR-rendered at the edge.
    // Prerendering them here guarantees 200; getContentBySlug() falls back to
    // the graceful loading panel when the API has no matching entry yet.
    'om-jai-shiv-omkara-aarti',
    'om-jai-lakshmi-mata-aarti',
    'bajrang-baan',
    'hare-krishna-maha-mantra',
    'navratri-festival-guide',
    // PERF (2026-07-31 audit): slowest content page (5.4s) — prerender it.
    'ganesh-mantra-om-gam',
  ].map((slug) => ({ slug }));
}

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
import { getContent, getContentBySlugApi, type ContentItem } from '../../../lib/api';
import AudioPlayer from '../../../components/AudioPlayer';
import { YouTubeEmbed } from '../../../components/YouTubeEmbed';
import { renderContentBody } from '../../../lib/markdown';
import AdSlot from '../../../components/AdSlot';

// ─── Fallback data ────────────────────────────────────────────────────────────

const fallbackContent: ContentItem = {
  id: 'fallback-1',
  type: 'chalisa',
  title: 'Hanuman Chalisa',
  titleLocal: 'हनुमान चालीसा',
  slug: 'hanuman-chalisa',
  body: `## दोहा (Doha)

**श्रीगुरु चरन सरोज रज, निज मनु मुकुरु सुधारि ।
बरनउँ रघुबर बिमल जसु, जो दायकु फल चारि ॥**

**बुद्धिहीन तनु जानिके, सुमिरौं पवन-कुमार ।
बल बुद्धि विद्या देहु मोहि, हरहु कलेस बिकार ॥**

### चौपाई (Chaupai)

**जय हनुमान ज्ञान गुन सागर । जय कपीस तिहुँ लोक उजागर ॥१॥**

**राम दूत अतुलित बल धामा । अंजनि-पुत्र पवनसुत नामा ॥२॥**

**महाबीर बिक्रम बजरंगी । कुमति निवार सुमति के संगी ॥३॥**

**कंचन बरन बिराज सुबेसा । कानन कुंडल कुंचित केसा ॥४॥**

**हाथ बज्र औ ध्वजा बिराजे । काँधे मूँज जनेऊ साजे ॥५॥**

**शंकर सुवन केसरीनंदन । तेज प्रताप महा जग बन्दन ॥६॥**

**विद्यावान गुनी अति चातुर । राम काज करिबे को आतुर ॥७॥**

**प्रभु चरित्र सुनिबे को रसिया । राम लखन सीता मन बसिया ॥८॥**

**सूक्ष्म रूप धरि सियहिं दिखावा । बिकट रूप धरि लंक जरावा ॥९॥**

**भीम रूप धरि असुर सँहारे । रामचंद्र के काज सँवारे ॥१०॥**

**लाय सजीवन लखन जियाये । श्रीरघुबीर हरषि उर लाये ॥११॥**

**रघुपति कीन्ही बहुत बड़ाई । तुम मम प्रिय भरतहि सम भाई ॥१२॥**

**सहस बदन तुम्हरो जस गावैं । अस कहि श्रीपति कंठ लगावैं ॥१३॥**

**सनकादिक ब्रह्मादि मुनीसा । नारद सारद सहित अहीसा ॥१४॥**

**जम कुबेर दिगपाल जहाँ ते । कवि कोविद कहि सके कहाँ ते ॥१५॥**

**तुम उपकार सुग्रीवहिं कीन्हा । राम मिलाय राजपद दीन्हा ॥१६॥**

**तुम्हरो मंत्र विभीषन माना । लंकेश्वर भए सब जग जाना ॥१७॥**

**जुग सहस्र जोजन पर भानू । लील्यो ताहि मधुर फल जानू ॥१८॥**

**प्रभु मुद्रिका मेलि मुख माहीं । जलधि लाँघि गये अचरज नाहीं ॥१९॥**

**दुर्गम काज जगत के जेते । सुगम अनुग्रह तुम्हरे तेते ॥२०॥**

**राम दुआरे तुम रखवारे । होत न आज्ञा बिनु पैसारे ॥२१॥**

**सब सुख लहै तुम्हारी सरना । तुम रक्षक काहू को डर ना ॥२२॥**

**आपन तेज सम्हारो आपै । तीनों लोक हाँक तें काँपै ॥२३॥**

**भूत पिसाच निकट नहिं आवै । महाबीर जब नाम सुनावै ॥२४॥**

**नासै रोग हरै सब पीरा । जपत निरंतर हनुमत बीरा ॥२५॥**

**संकट तें हनुमान छुड़ावै । मन क्रम बचन ध्यान जो लावै ॥२६॥**

**सब पर राम तपस्वी राजा । तिन के काज सकल तुम साजा ॥२७॥**

**और मनोरथ जो कोई लावै । सोइ अमित जीवन फल पावै ॥२८॥**

**चारों जुग परताप तुम्हारा । है परसिद्ध जगत उजियारा ॥२९॥**

**साधु संत के तुम रखवारे । असुर निकंदन राम दुलारे ॥३०॥**

**अष्ट सिद्धि नौ निधि के दाता । अस बर दीन जानकी माता ॥३१॥**

**राम रसायन तुम्हरे पासा । सदा रहो रघुपति के दासा ॥३२॥**

**तुम्हरे भजन राम को पावै । जनम जनम के दुख बिसरावै ॥३३॥**

**अन्तकाल रघुबर पुर जाई । जहाँ जन्म हरि-भक्त कहाई ॥३४॥**

**और देवता चित्त न धरई । हनुमत सेइ सर्ब सुख करई ॥३५॥**

**संकट कटै मिटै सब पीरा । जो सुमिरै हनुमत बलबीरा ॥३६॥**

**जय जय जय हनुमान गोसाईं । कृपा करहु गुरुदेव की नाईं ॥३७॥**

**जो सत बार पाठ कर कोई । छूटहि बंदि महा सुख होई ॥३८॥**

**जो यह पढ़ै हनुमान चालीसा । होय सिद्धि साखी गौरीसा ॥३९॥**

**तुलसीदास सदा हरि चेरा । कीजै नाथ हृदय मँह डेरा ॥४०॥**

### दोहा (Doha)

**पवनतनय संकट हरन, मंगल मूरति रूप ।
राम लखन सीता सहित, हृदय बसहु सुर भूप ॥**

---

### Transliteration

Shri Guru Charan Saroj Raj, Nij Manu Mukuru Sudhari,
Barnau Raghubar Bimal Jasu, Jo Dayaku Phal Chari.

Buddhiheen Tanu Janike, Sumirau Pavan Kumar,
Bal Buddhi Vidya Dehu Mohi, Harahu Kalesh Vikar.

Jai Hanuman Gyan Gun Sagar, Jai Kapis Tihun Lok Ujagar.
Ram Doot Atulit Bal Dhama, Anjani Putra Pavansut Nama.

---
*Composed by Goswami Tulsidas in the 16th century, Hanuman Chalisa consists of 40 chaupais (verses) praising Lord Hanuman.*`,
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
    // Use the direct slug endpoint for efficient fetching with full body text
    const item = await getContentBySlugApi(slug);
    if (item) return item;
  } catch {
    // API unavailable — fall back
  }

  // Fallback: if the slug matches our fallback, return that
  if (slug === fallbackContent.slug) {
    return fallbackContent;
  }

  // Return a generic fallback with the requested slug
  return {
    ...fallbackContent,
    slug,
    title: slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
    body: 'Content is loading. Please check back in a moment.',
  };
}

async function getRelatedContent(content: ContentItem): Promise<ContentItem[]> {
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
    description: `${content.type.charAt(0).toUpperCase() + content.type.slice(1)} - ${content.title}. ${content.deity ? `Dedicated to ${content.deity}.` : ''} Listen and read on Darshya.`,
    openGraph: {
      title: content.title,
      description: `${content.type} on Darshya`,
      images: content.imageUrl ? [content.imageUrl] : [],
    },
  };
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default async function ContentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = await getContentBySlug(slug);
  const related = await getRelatedContent(content);

  const isAudio = audioTypes.includes(content.type.toLowerCase());

  // Convert markdown body to HTML for rendering
  const bodyHtml = content.body ? renderContentBody(content.body) : '';

  return (
    <div className="bg-saffron-50 min-h-[100dvh]">
      {/* Breadcrumb */}
      <div className="border-surface-100 border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <nav className="text-surface-500 flex items-center gap-1.5 text-sm">
            <a
              href="/"
              className="hover:text-saffron-600 flex items-center gap-1 transition-colors"
            >
              <Home className="h-3.5 w-3.5" />
              Home
            </a>
            <ChevronRight className="text-surface-300 h-3.5 w-3.5" />
            <a href="/content" className="hover:text-saffron-600 transition-colors">
              Content
            </a>
            <ChevronRight className="text-surface-300 h-3.5 w-3.5" />
            <a
              href={`/content?type=${content.type}`}
              className="hover:text-saffron-600 capitalize transition-colors"
            >
              {content.type}
            </a>
            <ChevronRight className="text-surface-300 h-3.5 w-3.5" />
            <span className="text-surface-800 max-w-[200px] truncate font-medium">
              {content.title}
            </span>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Header */}
            <div className="border-surface-100 rounded-xl border bg-white p-6">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-saffron-600 bg-saffron-50 rounded-full px-2.5 py-1 text-xs font-bold uppercase">
                  {content.type}
                </span>
                {content.deity && (
                  <span className="text-surface-400 text-xs font-medium">{content.deity}</span>
                )}
                {content.isPremium && (
                  <span className="text-temple-gold bg-temple-gold/10 rounded-full px-2 py-0.5 text-xs font-bold">
                    PREMIUM
                  </span>
                )}
              </div>

              <h1 className="text-surface-800 mb-2 text-2xl font-bold sm:text-3xl">
                {content.title}
              </h1>
              {content.titleLocal && (
                <p className="text-surface-500 font-[family-name:var(--font-noto-devanagari)] text-lg">
                  {content.titleLocal}
                </p>
              )}

              {/* Stats row */}
              <div className="text-surface-500 mt-4 flex flex-wrap items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {formatCount(content.viewCount)} views
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="h-4 w-4" />
                  {formatCount(content.likeCount)} likes
                </span>
                {content.durationSeconds && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDuration(content.durationSeconds)}
                  </span>
                )}
                <span className="bg-surface-100 rounded-full px-2 py-0.5 text-xs capitalize">
                  {content.language}
                </span>
              </div>

              {/* Action buttons */}
              <div className="border-surface-100 mt-5 flex items-center gap-3 border-t pt-5">
                <button className="bg-saffron-50 text-saffron-600 hover:bg-saffron-100 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors">
                  <Heart className="h-4 w-4" />
                  Like
                </button>
                <button className="bg-surface-50 text-surface-600 hover:bg-surface-100 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors">
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
              </div>
            </div>

            {/* Video / Audio player */}
            {content.videoUrl ? (
              <YouTubeEmbed url={content.videoUrl} title={content.title} />
            ) : isAudio && content.audioUrl ? (
              <AudioPlayer
                title={content.title}
                artist={content.deity ?? undefined}
                audioUrl={content.audioUrl}
                imageUrl={content.imageUrl}
                duration={content.durationSeconds ?? 0}
                deity={content.deity}
                type={content.type}
              />
            ) : null}

            {/* Body / Text content */}
            {bodyHtml && (
              <div className="border-surface-100 rounded-xl border bg-white p-6">
                <h2 className="text-surface-800 mb-4 flex items-center gap-2 text-lg font-bold">
                  {isAudio ? (
                    <>
                      <Music className="text-saffron-500 h-5 w-5" />
                      Full Text / Lyrics
                    </>
                  ) : (
                    <>
                      <BookOpen className="text-saffron-500 h-5 w-5" />
                      Read
                    </>
                  )}
                </h2>
                <div
                  className="prose prose-stone prose-headings:text-surface-800 prose-headings:font-bold prose-p:text-surface-600 prose-p:leading-relaxed max-w-none font-[family-name:var(--font-noto-devanagari)]"
                  dangerouslySetInnerHTML={{ __html: bodyHtml }}
                />
              </div>
            )}

            {/* Tags */}
            {content.tags.length > 0 && (
              <div className="border-surface-100 rounded-xl border bg-white p-6">
                <h3 className="text-surface-800 mb-3 flex items-center gap-1.5 text-sm font-bold">
                  <Tag className="text-surface-400 h-4 w-4" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {content.tags.map((tag) => (
                    <a
                      key={tag}
                      href={`/content?search=${encodeURIComponent(tag)}`}
                      className="text-surface-500 bg-surface-50 hover:bg-saffron-50 hover:text-saffron-600 border-surface-100 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
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
            <AdSlot slotId="CONTENT_SIDEBAR" format="vertical" label="Sponsored" />
            <div className="border-surface-100 rounded-xl border bg-white p-6">
              <h3 className="text-surface-800 mb-4 font-bold">Related Content</h3>
              <div className="space-y-4">
                {related.map((item) => (
                  <a
                    key={item.id}
                    href={`/content/${item.slug}`}
                    className="group border-surface-50 flex items-start gap-3 border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div className="from-saffron-100 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br to-amber-50">
                      {audioTypes.includes(item.type.toLowerCase()) ? (
                        <Music className="text-saffron-400 h-5 w-5" />
                      ) : (
                        <BookOpen className="text-saffron-400 h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-saffron-600 text-xs font-semibold uppercase">
                        {item.type}
                      </span>
                      <h4 className="text-surface-800 group-hover:text-saffron-600 truncate text-sm font-semibold transition-colors">
                        {item.title}
                      </h4>
                      <div className="text-surface-400 mt-0.5 flex items-center gap-2 text-xs">
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
            <div className="from-saffron-50 border-saffron-100 rounded-xl border bg-gradient-to-br to-amber-50 p-6">
              <h3 className="text-surface-800 mb-3 font-bold">Browse by Type</h3>
              <div className="space-y-2">
                {['Aarti', 'Chalisa', 'Mantra', 'Bhajan', 'Stories'].map((t) => (
                  <a
                    key={t}
                    href={`/content?type=${t.toLowerCase()}`}
                    className="text-surface-600 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-white"
                  >
                    {t}
                    <ChevronRight className="text-surface-300 h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
