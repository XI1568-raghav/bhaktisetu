import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from '../../lib/t';
import { buttonClass } from '../../components/ui/button-recipe';
import { H1 } from '../../components/ui/heading-recipe';
import { getDeityImage, remoteImage, remoteSrcSet, IMG_W } from "../../lib/images";
import { getPujaTypes, type PujaType } from "../../lib/api";
import { getPujaCompletionCounts } from "../../lib/social-proof";
import { pujaCategoryLabel } from "../../lib/puja-labels";
// PF-06: the fee has to come from the same module the wizard and the detail
// hero read, or the catalogue starts advertising a number checkout will not
// honour the moment either side changes.
import { PLATFORM_FEE_INR, formatInr, pujaTotalInr } from "../../lib/puja-pricing";
import {
 applyPujaCatalogue,
 buildPujaFacets,
 hasActivePujaFilters,
 parsePujaFilters,
 pujaCatalogueHref,
 PUJA_PRICE_OPTIONS,
 PUJA_SORT_OPTIONS,
} from "../../lib/puja-catalogue-filters";
import PujaSocialProof from "../../components/PujaSocialProof";
import AdSlot from "../../components/AdSlot";
import {
 Flame,
 Star,
 MapPin,
 Clock,
 Heart,
 Home,
 Search,
 ChevronDown,
 ChevronRight,
 Filter,
 ArrowRight,
 Users,
 Video,
 Shield,
 CheckCircle2,
 Gift,
 Calendar,
 Tag,
 Sparkles,
} from "lucide-react";

export const revalidate = 600;

export const metadata: Metadata = {
 alternates: { canonical: 'https://darshya.online/pujas' },
 title: "Book Online Pujas at Verified Indian Temples",
 description:
 // CM-06: this description used to advertise dual-currency NRI pricing.
 // There is no foreign-currency rail; Razorpay bills every card in INR.
 "Book authentic pujas at renowned temples across India. Verified pandits, live video streaming, worldwide prasad delivery to your doorstep, and international cards billed in INR. Choose from a curated catalogue of sacred Hindu rituals.",
};

// DB-04 / PF-02 (2026-08-12): these four lists used to be rendered into
// <select> elements with no name, no value and no enclosing form — 36 options
// that could not do anything by construction. The option sets now live in
// lib/puja-catalogue-filters alongside the predicates that consume them, so an
// option can never exist without a filter behind it. The "All Occasions" list
// was deleted outright: no catalogue field backs it (see that module's note).

// View-model the page actually renders. Real API data is mapped onto this
// shape; if the API is unreachable we fall back to a static set of pujas
// whose slugs MATCH real DB seed slugs so /pujas/<slug> still resolves.
interface PujaCard {
 id: string;
 slug: string;
 name: string;
 temple: string;
 category: string;
 deity: string;
 price: number;
 duration: string;
 tag: string;
 tagColor: string;
 hasLiveStream: boolean;
 hasPrasadDelivery: boolean;
 description: string;
 imageUrl: string | null;
}

// A11Y-10: each entry carries its own text colour because not every accent can
// legally hold white — temple-gold is 2.29:1 with white and 6.62:1 with
// surface-800. All eight pairs are >= 4.5:1; __tests__/cta-contrast.test.ts
// recomputes them from app/globals.css on every run.
const TAG_COLORS = [
 'bg-saffron-600 text-white',
 'bg-ganga-blue-dark text-white',
 'bg-tulsi-green-dark text-white',
 'bg-temple-gold text-surface-800',
 'bg-sacred-red text-white',
 'bg-purple-700 text-white',
 'bg-lotus-pink-dark text-white',
 'bg-rudraksha-brown text-white',
];

function categoryTag(category: string, idx: number): { tag: string; tagColor: string } {
 const map: Record<string, string> = {
 Abhishekam: 'Most Popular',
 'Path / Paath': 'Recommended',
 Jaap: 'Health',
 'Dosh Nivaran': 'Dosh Nivaran',
 'Shanti Puja': 'For Prosperity',
 Aarti: 'Daily',
 'Havan / Homam': 'Vedic',
 'Festival Special': 'Festival',
 };
 return {
 tag: map[category] || 'Featured',
 tagColor: TAG_COLORS[idx % TAG_COLORS.length] ?? 'bg-saffron-600 text-white',
 };
}

function formatDuration(minutes: number): string {
 if (!minutes || minutes <= 0) return '1 hour';
 if (minutes < 60) return `${minutes} min`;
 const h = Math.floor(minutes / 60);
 const m = minutes % 60;
 return m === 0 ? `${h} hour${h > 1 ? 's' : ''}` : `${h}h ${m}m`;
}

// Deity fallback when the API row carries no image of its own.
const DEITY_FALLBACK: Record<string, string> = {
  'Lord Shiva': 'lord-shiva',
  'Lord Vishnu': 'lord-vishnu',
  'Lord Ganesha': 'lord-ganesha',
  'Goddess Lakshmi': 'goddess-lakshmi',
  'Lord Hanuman': 'lord-hanuman',
  'Goddess Durga': 'goddess-durga',
  Navagraha: 'lord-surya',
};

/**
 * Card image for a puja, resized to the slot it is painted into.
 * `imageUrl` comes straight off the API row and is frequently a raw
 * Wikimedia Commons original — the largest measured was 14,905 KB in a
 * 343px slot — so it MUST go through remoteImage before reaching an <img>.
 */
function pujaCardImage(puja: PujaCard, width: number): string {
  const fallbackKey = DEITY_FALLBACK[puja.deity] ?? 'lord-shiva';
  return remoteImage(puja.imageUrl ?? getDeityImage(fallbackKey, 'portrait', width), width);
}

function mapPujaTypeToCard(p: PujaType, idx: number): PujaCard {
 const { tag, tagColor } = categoryTag(p.category, idx);
 const price = Number(p.basePrice) || 0;
 const rawImages = (p as unknown as { images?: unknown }).images;
 let firstImage: string | null = null;
 if (Array.isArray(rawImages) && rawImages.length > 0) {
   const f = rawImages[0];
   if (typeof f === 'string') firstImage = f;
   else if (f && typeof f === 'object' && 'url' in f && typeof (f as {url: unknown}).url === 'string') {
     firstImage = (f as {url: string}).url;
   }
 }
 return {
 id: p.id,
 slug: p.slug,
 name: p.name,
 temple: 'Multiple temples',
 category: p.category || 'Puja',
 deity: p.deity || 'Lord Shiva',
 price,
 duration: formatDuration(p.durationMinutes),
 tag,
 tagColor,
 hasLiveStream: true,
 hasPrasadDelivery: p.samagriIncluded,
 description: p.description || `${p.name} performed by verified pandits.`,
 imageUrl: firstImage,
 };
}

// Fallback only used if the API is offline. Slugs MUST match real DB seeds
// so /pujas/<slug> still renders the correct detail page.
const FALLBACK_PUJAS: PujaCard[] = [
 {
 id: 'fb-1',
 slug: 'rudrabhishek',
 name: 'Rudrabhishek Puja',
 temple: 'Kashi Vishwanath, Varanasi',
 category: 'Abhishekam',
 deity: 'Lord Shiva',
 price: 1100,
 duration: '2 hours',
 tag: 'Most Popular',
 tagColor: 'bg-saffron-600 text-white',
 hasLiveStream: true,
 hasPrasadDelivery: true,
 description:
 'Sacred abhishekam of the Shiva Lingam with panchamrit — milk, honey, curd, ghee, and sugar. Includes 108 chants of Om Namah Shivaya.',
 imageUrl: null,
 },
 {
 id: 'fb-2',
 slug: 'satyanarayan-katha',
 name: 'Satyanarayan Katha',
 temple: 'ISKCON, Delhi',
 category: 'Path / Paath',
 deity: 'Lord Vishnu',
 price: 751,
 duration: '1.5 hours',
 tag: 'Recommended',
 tagColor: 'bg-ganga-blue-dark text-white',
 hasLiveStream: true,
 hasPrasadDelivery: true,
 description:
 'Complete Satyanarayan Katha with five chapters, aarti, and prasad distribution. Ideal for new beginnings and thanksgiving.',
 imageUrl: null,
 },
 {
 id: 'fb-3',
 slug: 'mahamrityunjaya',
 name: 'Maha Mrityunjaya Jaap',
 temple: 'Kashi Vishwanath, Varanasi',
 category: 'Jaap',
 deity: 'Lord Shiva',
 price: 1500,
 duration: '2.5 hours',
 tag: 'Health',
 tagColor: 'bg-sacred-red text-white',
 hasLiveStream: true,
 hasPrasadDelivery: true,
 description:
 '108 recitations of the Maha Mrityunjaya Mantra with vedic rituals for health, longevity, and overcoming life-threatening situations.',
 imageUrl: null,
 },
 {
 id: 'fb-4',
 slug: 'navagraha-shanti',
 name: 'Navagraha Shanti Puja',
 temple: 'Navagraha Temple, Guwahati',
 category: 'Dosh Nivaran',
 deity: 'Navagraha',
 price: 2100,
 duration: '3 hours',
 tag: 'Astrology',
 tagColor: 'bg-purple-700 text-white',
 hasLiveStream: true,
 hasPrasadDelivery: false,
 description:
 'Complete Navagraha Shanti Puja to pacify all nine planets. Includes separate homam for each graha and navgraha stotram.',
 imageUrl: null,
 },
 {
 id: 'fb-5',
 slug: 'ganesh-puja',
 name: 'Ganesh Puja',
 temple: 'Siddhivinayak, Mumbai',
 category: 'Path / Paath',
 deity: 'Lord Ganesha',
 price: 501,
 duration: '45 min',
 tag: 'Trending',
 tagColor: 'bg-tulsi-green-dark text-white',
 hasLiveStream: true,
 hasPrasadDelivery: true,
 description:
 'Worship of Lord Ganesha for removing obstacles and bringing success. Includes modak prasad.',
 imageUrl: null,
 },
 {
 id: 'fb-6',
 slug: 'lakshmi-puja',
 name: 'Mahalakshmi Puja',
 temple: 'Mahalakshmi Temple, Kolhapur',
 category: 'Shanti Puja',
 deity: 'Goddess Lakshmi',
 price: 851,
 duration: '1 hour',
 tag: 'For Prosperity',
 tagColor: 'bg-temple-gold text-surface-800',
 hasLiveStream: true,
 hasPrasadDelivery: true,
 description:
 'Worship of Goddess Mahalakshmi with kumkum archana, lotus offerings, and Shri Suktam recitation for wealth and prosperity.',
 imageUrl: null,
 },
];

async function loadPujas(): Promise<PujaCard[]> {
 try {
 const res = await getPujaTypes({ limit: 100 });
 const items = Array.isArray(res?.data) ? res.data : [];
 if (items.length === 0) return FALLBACK_PUJAS;
 return items.map(mapPujaTypeToCard);
 } catch {
 return FALLBACK_PUJAS;
 }
}


const PAGE_SIZE = 12;

// S2C-12 (2026-08-11): the hero search box was dead UI — no value, no onChange,
// no name, no <form> — inside a server component, so typing and pressing Enter
// did nothing and the box silently swallowed top-of-funnel intent. This page
// already reads searchParams for pagination, so the fix is a plain GET form on
// ?q= filtered server-side: no client bundle, Enter submits natively, and the
// filtered result is a shareable URL. DB-04 extends the same pattern to the
// category/deity/price facets and the sort control; the predicates live in
// lib/puja-catalogue-filters so they can be unit-tested without rendering.

export default async function PujasPage({
 searchParams,
}: {
 searchParams: Promise<{
  page?: string;
  q?: string;
  category?: string;
  deity?: string;
  price?: string;
  sort?: string;
 }>;
}) {
 const catalogue = await loadPujas();
 // CM-05: real completed-puja counts, straight from a COUNT on puja_bookings.
 // `{}` on any API failure, so the badge disappears rather than inventing one.
 // DB-04: the same counts are what "Sort: Popularity" orders on — no proxy,
 // no invented score, and no reordering at all when the map is empty.
 const completions = await getPujaCompletionCounts();
 const sp = await searchParams;
 // Facets come from the catalogue about to be rendered, so every option in the
 // dropdown has at least one puja behind it. Hard-coding the labels is what
 // produced the dead controls: the old list offered "Abhishekam" and
 // "Path / Paath" while the API answers "planetary" and "special_occasion".
 const facets = buildPujaFacets(catalogue);
 const filters = parsePujaFilters(sp, facets);
 const query = filters.q;
 const allPujas = applyPujaCatalogue(catalogue, filters, completions);
 const filtersActive = hasActivePujaFilters(filters);
 const requestedPage = Math.max(1, Math.min(Number(sp.page) || 1, 50));
 const visibleCount = Math.min(requestedPage * PAGE_SIZE, allPujas.length);
 const pujas = allPujas.slice(0, visibleCount);
 const hasMore = visibleCount < allPujas.length;
 const nextPage = requestedPage + 1;
 // Keep every active facet when paginating, otherwise "Load more" would
 // silently drop them and re-show the unfiltered catalogue.
 const nextPageHref = pujaCatalogueHref(filters, { page: nextPage });
 const t = await getTranslations('pujas');
 return (
 <div className="min-h-[100dvh] bg-surface-50">
 {/* Hero */}
 <section className="bg-[#ede9e3] py-12 md:py-16">
 <div className="container-wide">
 <h1 className={`${H1.catalogue} mb-3`}>
 {t('pageTitle')}
 </h1>
 <p className="text-surface-500 text-lg max-w-2xl">
 {t('pageSubtitle')}
 </p>

 {/* Trust badges */}
 <div className="mt-6 flex flex-wrap gap-4">
 <div className="flex items-center gap-2 bg-saffron-600/10 text-surface-700 text-sm px-4 py-2 rounded-full border border-saffron-200/40">
 <Shield className="w-4 h-4 text-saffron-600" />
 {t('verifiedPandits')}
 </div>
 <div className="flex items-center gap-2 bg-saffron-600/10 text-surface-700 text-sm px-4 py-2 rounded-full border border-saffron-200/40">
 <Video className="w-4 h-4 text-saffron-600" />
 {t('liveStreaming')}
 </div>
 <div className="flex items-center gap-2 bg-saffron-600/10 text-surface-700 text-sm px-4 py-2 rounded-full border border-saffron-200/40">
 <Gift className="w-4 h-4 text-saffron-600" />
 {t('prasadDelivery')}
 </div>
 <div className="flex items-center gap-2 bg-saffron-600/10 text-surface-700 text-sm px-4 py-2 rounded-full border border-saffron-200/40">
 <CheckCircle2 className="w-4 h-4 text-saffron-600" />
 {t('videoProof')}
 </div>
 </div>

 {/* Search — S2C-12: real GET form, no client JS needed */}
 <form action="/pujas" method="get" role="search" className="mt-8 max-w-2xl">
 <div className="relative">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
 <input
 type="search"
 name="q"
 defaultValue={query}
 aria-label={t('searchPlaceholder')}
 placeholder={t('searchPlaceholder')}
 className="w-full pl-12 pr-4 py-3.5 rounded-lg border border-[var(--color-border)] bg-white text-surface-800 placeholder:text-surface-500 shadow-warm-sm focus:outline-none focus:ring-2 focus:ring-saffron-300"
 />
 {/* Enter submits a single-input form natively; this keeps the control
     reachable for assistive tech and mobile keyboards without changing
     the visual design. */}
 <button type="submit" className="sr-only">
 Search pujas
 </button>
 </div>
 </form>

 {/* PF-07: at 390x844 the first bookable card was at absolute top 1932px —
     2.3 screens of hero copy, facets and category tiles before a phone user
     could see anything to buy. A plain in-page anchor: no client JS, no
     effect on the desktop grid, and it keeps working as the block above it
     grows. Hidden from md up, where the grid is already near the fold. */}
 <a
 href="#catalogue"
 className="md:hidden mt-4 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-saffron-700 underline underline-offset-4"
 >
 Skip to all pujas
 <ChevronDown className="w-4 h-4" aria-hidden="true" />
 </a>
 </div>
 </section>

 {/* At-home services — featured */}
 <div className="container-wide pt-10">
 <div className="mb-4 flex items-end justify-between">
 <div>
 <h2 className="text-2xl md:text-3xl font-bold text-surface-800 tracking-tight">
 Pandits at your home
 </h2>
 <p className="text-sm text-surface-500 mt-1">
 Book verified pandits for home pujas and marriage ceremonies.
 </p>
 </div>
 </div>

 <div className="grid md:grid-cols-2 gap-5">
 <Link
 href="/pujas/home-puja"
 className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-gradient-to-br from-saffron-50 via-sandal-cream/30 to-white p-8 hover:shadow-warm-md transition-all"
 >
 <div className="relative z-10">
 <div className="inline-flex items-center gap-2 bg-saffron-500/10 text-saffron-700 text-xs font-semibold px-3 py-1 rounded-full mb-4 border border-saffron-500/20">
 <Home className="w-3.5 h-3.5" />
 Home Puja
 </div>
 {/* DU-07: was text-2xl — identical to the h2 above it, so size stopped
     tracking importance and a reader could not tell section from sub-item. */}
 <h3 className="text-xl font-bold text-surface-800 tracking-tight">
 Book a Pandit at Your Home
 </h3>
 <p className="mt-2 text-surface-500 text-sm">
 Griha Pravesh, Satyanarayan Katha, Navratri, Rudrabhishek, and 4 more. Starting ₹1,100.
 </p>
 <div className="mt-6 flex items-center gap-4 text-xs text-surface-600">
 <span className="flex items-center gap-1.5">
 <Shield className="w-3.5 h-3.5 text-tulsi-green" />
 Aadhaar verified
 </span>
 <span className="flex items-center gap-1.5">
 <Sparkles className="w-3.5 h-3.5 text-saffron-600" />
 Samagri included
 </span>
 </div>
 <div className="mt-6 inline-flex items-center gap-1 font-semibold text-saffron-700 group-hover:translate-x-0.5 transition-transform">
 Explore home pujas
 <ArrowRight className="w-4 h-4" />
 </div>
 </div>
 <Home
 className="absolute -right-6 -bottom-6 w-40 h-40 text-saffron-500/10"
 strokeWidth={1}
 />
 </Link>

 <Link
 href="/pujas/marriage"
 className="group relative overflow-hidden rounded-2xl border border-vermillion-500/20 bg-gradient-to-br from-vermillion-500 via-saffron-600 to-saffron-500 p-8 hover:shadow-warm-md transition-all text-white"
 >
 <div className="relative z-10">
 <div className="inline-flex items-center gap-2 bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4 backdrop-blur-sm">
 <Heart className="w-3.5 h-3.5" />
 Marriage Ceremony
 </div>
 <h3 className="text-xl font-bold tracking-tight">
 Book a Pandit for Your Wedding
 </h3>
 <p className="mt-2 text-white/90 text-sm">
 Sampoorna vivah sanskar with 7 pheras. Hindu, Arya Samaj, South Indian, Sikh blends. Starting ₹11,000.
 </p>
 <div className="mt-6 flex items-center gap-4 text-xs text-white/90">
 <span className="flex items-center gap-1.5">
 <Shield className="w-3.5 h-3.5" />
 Vedic certified
 </span>
 <span className="flex items-center gap-1.5">
 <Sparkles className="w-3.5 h-3.5" />
 Full samagri included
 </span>
 </div>
 <div className="mt-6 inline-flex items-center gap-1 font-semibold group-hover:translate-x-0.5 transition-transform">
 Explore wedding pandits
 <ArrowRight className="w-4 h-4" />
 </div>
 </div>
 <Heart
 className="absolute -right-6 -bottom-6 w-40 h-40 text-white/10"
 strokeWidth={1}
 />
 </Link>
 </div>
 </div>

 <div className="container-wide py-8">
 {/* Filters — DB-04 / PF-02: a real GET form. Same zero-client-JS pattern as
     the ?q= search above, so each facet is a shareable URL and the server does
     the filtering. `q` rides along in a hidden field: applying a facet must not
     throw away the search the devotee already typed. */}
 <form action="/pujas" method="get" className="flex flex-wrap items-center gap-3 mb-8">
 {query && <input type="hidden" name="q" value={query} />}

 <div className="relative">
 <label htmlFor="puja-filter-category" className="sr-only">Filter by category</label>
 <select
 id="puja-filter-category"
 name="category"
 defaultValue={filters.category}
 className="appearance-none bg-white border border-surface-200 rounded-lg pl-4 pr-10 py-2.5 text-sm font-medium text-surface-600 hover:border-saffron-300 focus:outline-none focus:ring-2 focus:ring-saffron-200 cursor-pointer"
 >
 {facets.categories.map((c) => (
 <option key={c.label} value={c.value}>
 {c.label}
 </option>
 ))}
 </select>
 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
 </div>

 <div className="relative">
 <label htmlFor="puja-filter-deity" className="sr-only">Filter by deity</label>
 <select
 id="puja-filter-deity"
 name="deity"
 defaultValue={filters.deity}
 className="appearance-none bg-white border border-surface-200 rounded-lg pl-4 pr-10 py-2.5 text-sm font-medium text-surface-600 hover:border-saffron-300 focus:outline-none focus:ring-2 focus:ring-saffron-200 cursor-pointer"
 >
 {facets.deities.map((d) => (
 <option key={d.label} value={d.value}>
 {d.label}
 </option>
 ))}
 </select>
 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
 </div>

 <div className="relative">
 <label htmlFor="puja-filter-price" className="sr-only">Filter by price</label>
 <select
 id="puja-filter-price"
 name="price"
 defaultValue={filters.price}
 className="appearance-none bg-white border border-surface-200 rounded-lg pl-4 pr-10 py-2.5 text-sm font-medium text-surface-600 hover:border-saffron-300 focus:outline-none focus:ring-2 focus:ring-saffron-200 cursor-pointer"
 >
 {PUJA_PRICE_OPTIONS.map((p) => (
 <option key={p.label} value={p.value}>
 {p.label}
 </option>
 ))}
 </select>
 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
 </div>

 <div className="relative">
 <label htmlFor="puja-sort" className="sr-only">Sort pujas</label>
 <select
 id="puja-sort"
 name="sort"
 defaultValue={filters.sort}
 className="appearance-none bg-saffron-50 border border-saffron-200 rounded-lg pl-4 pr-10 py-2.5 text-sm font-medium text-saffron-700 hover:bg-saffron-100 focus:outline-none focus:ring-2 focus:ring-saffron-200 cursor-pointer"
 >
 {PUJA_SORT_OPTIONS.map((s) => (
 <option key={s.value} value={s.value}>
 Sort: {s.label}
 </option>
 ))}
 </select>
 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-saffron-500 pointer-events-none" />
 </div>

 {/* A <select> cannot submit itself without client JS, so the form carries a
     visible Apply. One control that plainly needs a click beats five that
     look live and do nothing. */}
 <button
 type="submit"
 className={buttonClass('primary', 'md')}
 >
 <Tag className="w-4 h-4" />
 Apply
 </button>

 {filtersActive && (
 <Link
 href="/pujas"
 className="inline-flex items-center px-3 py-2.5 text-sm font-semibold text-saffron-700 hover:underline"
 >
 Clear filters
 </Link>
 )}
 </form>

 {/* Results */}
 <p className="text-sm text-surface-500 mb-6">
 Showing <span className="font-semibold text-surface-600">{pujas.length}</span> of <span className="font-semibold text-surface-600">{allPujas.length}</span> pujas
 {query && (
 <>
 {' '}matching <span className="font-semibold text-surface-600">&ldquo;{query}&rdquo;</span>
 </>
 )}
 {filtersActive && (
 <>
 {' · '}
 <Link href="/pujas" className="text-saffron-700 font-semibold hover:underline">
 Clear filters
 </Link>
 </>
 )}
 </p>

 {/* Sponsored — between trending tags and the All Pujas grid */}
 <AdSlot slotId="PUJAS_BANNER" format="horizontal" label="Sponsored" className="w-full mb-6" />

 {/* S2C-12: a live search needs a real zero-result state, otherwise a
     non-matching query renders a silently blank grid — the same dead end
     the inert box created. DB-04: the facets can now empty the grid too, so
     the copy distinguishes "your filters matched nothing" from "the
     catalogue is empty" instead of blaming the catalogue for a filter. */}
 {pujas.length === 0 && (
 <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-10 text-center">
 <Search className="w-8 h-8 text-surface-300 mx-auto mb-3" />
 <h3 className="text-lg font-semibold text-surface-800">
 {query ? (
 <>No pujas match &ldquo;{query}&rdquo;</>
 ) : filtersActive ? (
 'No pujas match these filters'
 ) : (
 'No pujas available right now'
 )}
 </h3>
 <p className="text-sm text-surface-500 mt-1 max-w-md mx-auto">
 {filtersActive
 ? 'Try a wider price range or a different deity — or browse the full catalogue.'
 : 'Please check back shortly.'}
 </p>
 {filtersActive && (
 <Link
 href="/pujas"
 className={buttonClass('primary', 'md', 'mt-5')}
 >
 Browse all pujas
 </Link>
 )}
 </div>
 )}

 {/* Puja Grid — PF-07: the jump target for the phone anchor in the hero.
     scroll-mt clears the 64px fixed header, otherwise the first row of cards
     lands underneath it. */}
 <div id="catalogue" className="scroll-mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {/* CM-09 (prod sweep 2026-08-12): the card body was inert — the image, the
     title and the price were dead, and the only interactive region was an
     89x34px bare <a> on the button, which also said "Book Now" while landing
     on an article. Shoppers tap product images; the whole card is now the
     target, it is a next/link (client navigation, not a full document load),
     and the control says what it does. */}
 {pujas.map((puja) => (
 <Link
 key={puja.id}
 href={`/pujas/${puja.slug}`}
 // CM-09: the WHOLE card is the tap target, not just the pill inside it. The
 // pill was already h-11, but a thumb aiming at the card body outside it hit
 // nothing. min-h-[44px] states the floor on the card itself.
 //
 // Deliberately does NOT name the pill's label here: cta-contrast.test.ts
 // locates that control by searching for its text, so repeating the label in a
 // comment makes the comment the first match and the assertion reads the wrong
 // 400-char window.
 className="group block min-h-[44px] bg-[var(--color-surface)] rounded-xl overflow-hidden border border-[var(--color-border)] card-hover transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-300 focus-visible:ring-offset-2"
 >
 {/* Puja image */}
 <div className="relative aspect-[16/10] bg-gradient-to-br from-saffron-100 to-amber-50">
 <img
 src={pujaCardImage(puja, IMG_W.CARD)}
 srcSet={remoteSrcSet(pujaCardImage(puja, IMG_W.WIDE), [IMG_W.THUMB, IMG_W.CARD])}
 sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 380px"
 alt={`${puja.name} - ${puja.deity}`}
 width={500}
 height={313}
 loading="lazy"
 decoding="async"
 className="absolute inset-0 w-full h-full object-cover"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
 <div className="absolute top-3 left-3">
 <span
 className={`${puja.tagColor} text-xs font-bold px-2.5 py-1 rounded-full`}
 >
 {puja.tag}
 </span>
 </div>
 {/* Feature badges */}
 <div className="absolute bottom-3 left-3 flex items-center gap-2">
 {puja.hasLiveStream && (
 <span className="flex items-center gap-1 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-md backdrop-blur-sm">
 <Video className="w-3 h-3" />
 Live Stream
 </span>
 )}
 {puja.hasPrasadDelivery && (
 <span className="flex items-center gap-1 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-md backdrop-blur-sm">
 <Gift className="w-3 h-3" />
 Prasad
 </span>
 )}
 </div>
 </div>

 <div className="p-5">
 <div className="flex items-center gap-1 text-sm text-surface-500 mb-1">
 <MapPin className="w-3.5 h-3.5" />
 {puja.temple}
 </div>
 <h3 className="text-lg font-semibold text-surface-800 group-hover:text-saffron-600 transition-colors">
 {puja.name}
 </h3>
 <p className="text-sm text-surface-500 mt-1 line-clamp-2">
 {puja.description}
 </p>

 <div className="flex items-center gap-3 mt-3 text-sm">
 <span className="text-surface-500 flex items-center gap-1">
 <Clock className="w-3.5 h-3.5" />
 {puja.duration}
 </span>
 <span className="text-surface-300">|</span>
 {/* CM-10: this printed the raw column value ("special_occasion"). */}
 <span className="text-surface-500 truncate">{pujaCategoryLabel(puja.category)}</span>
 </div>

 {/* CM-05: the only social proof on this card, and it renders only when
   the API returned a real completed-booking count for THIS slug. Pujas
   with none — and every card in the offline FALLBACK_PUJAS path, since
   the counts fetch fails alongside the catalogue fetch — show nothing. */}
 <div className="mt-2 empty:hidden">
 <PujaSocialProof count={completions[puja.slug] ?? 0} />
 </div>

 <div className="mt-4 flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--color-divider)' }}>
 <div>
 <span className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
 ₹{puja.price.toLocaleString("en-IN")}
 </span>
 <span className="text-xs ml-1" style={{ color: 'var(--color-text-faint)' }}>
 onwards
 </span>
 {/* PF-06: the surcharge used to surface at step 3 of the wizard, after a
     temple, a date, a slot, devotee names and a sankalp had been entered.
     It travels with the price now, on the first surface that shows one. */}
 {puja.price > 0 && (
 <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-faint)' }}>
 + ₹{formatInr(PLATFORM_FEE_INR)} platform fee · ₹
 {formatInr(pujaTotalInr(puja.price, false))} total
 </div>
 )}
 </div>
 {/* DU-03: kept as a literal recipe rather than buttonClass() because it is
     a <span> inside the card link, and __tests__/cta-contrast.test.ts reads
     the painted fill straight out of this source. Same numbers as
     buttonClass('primary','md'). */}
 <span className="bg-saffron-600 group-hover:bg-saffron-700 inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-base font-semibold text-white whitespace-nowrap transition-colors">
 View details
 </span>
 </div>
 </div>
 </Link>
 ))}
 </div>

 {hasMore && (
 <div className="mt-8 flex justify-center">
 <Link
 href={nextPageHref}
 className={buttonClass('primary', 'md')}
 prefetch={false}
 aria-label={`Load next ${PAGE_SIZE} pujas`}
 >
 Load more pujas
 </Link>
 </div>
 )}

 </div>
 </div>
 );
}
