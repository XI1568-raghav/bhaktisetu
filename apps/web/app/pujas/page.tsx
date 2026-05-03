import type { Metadata } from "next";
import Link from "next/link";
import { getDeityImage } from "../../lib/images";
import { getPujaTypes, type PujaType } from "../../lib/api";
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
 title: "Pujas",
 description:
 "Book authentic pujas at renowned temples across India. Verified pandits, live streaming, prasad delivery. Choose from a curated catalogue of sacred rituals.",
};

const categories = [
 "All Categories",
 "Abhishekam",
 "Havan / Homam",
 "Path / Paath",
 "Aarti",
 "Jaap",
 "Dosh Nivaran",
 "Shanti Puja",
 "Festival Special",
];

const deities = [
 "All Deities",
 "Lord Shiva",
 "Lord Vishnu",
 "Lord Krishna",
 "Lord Ganesha",
 "Lord Hanuman",
 "Goddess Durga",
 "Goddess Lakshmi",
 "Goddess Saraswati",
 "Navagraha",
 "Lord Rama",
];

const occasions = [
 "All Occasions",
 "Daily Worship",
 "Birthday / Anniversary",
 "Health & Wellbeing",
 "Career & Education",
 "Marriage & Relationships",
 "Prosperity & Wealth",
 "New Beginning",
 "Shraadh & Pitra",
 "Festival Special",
];

const priceRanges = [
 "Any Price",
 "Under ₹500",
 "₹500 - ₹1,000",
 "₹1,000 - ₹2,500",
 "₹2,500 - ₹5,000",
 "Above ₹5,000",
];

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

const TAG_COLORS = [
 'bg-saffron-600',
 'bg-ganga-blue',
 'bg-tulsi-green',
 'bg-temple-gold',
 'bg-sacred-red',
 'bg-purple-600',
 'bg-lotus-pink',
 'bg-rudraksha-brown',
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
 tagColor: TAG_COLORS[idx % TAG_COLORS.length] ?? 'bg-saffron-600',
 };
}

function formatDuration(minutes: number): string {
 if (!minutes || minutes <= 0) return '1 hour';
 if (minutes < 60) return `${minutes} min`;
 const h = Math.floor(minutes / 60);
 const m = minutes % 60;
 return m === 0 ? `${h} hour${h > 1 ? 's' : ''}` : `${h}h ${m}m`;
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
 tagColor: 'bg-saffron-600',
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
 tagColor: 'bg-ganga-blue',
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
 tagColor: 'bg-sacred-red',
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
 tagColor: 'bg-purple-600',
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
 tagColor: 'bg-tulsi-green',
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
 tagColor: 'bg-temple-gold',
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

export default async function PujasPage() {
 const pujas = await loadPujas();
 return (
 <div className="min-h-screen bg-surface-50">
 {/* Hero */}
 <section className="bg-[#ede9e3] py-12 md:py-16">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <h1 className="text-3xl md:text-4xl font-bold text-surface-800 mb-3">
 Book Sacred Pujas Online
 </h1>
 <p className="text-surface-500 text-lg max-w-2xl">
 Choose from 200+ authentic pujas performed by verified pandits at
 India&rsquo;s most revered temples. Live streaming and prasad delivery
 included.
 </p>

 {/* Trust badges */}
 <div className="mt-6 flex flex-wrap gap-4">
 <div className="flex items-center gap-2 bg-saffron-600/10 text-surface-700 text-sm px-4 py-2 rounded-full border border-saffron-200/40">
 <Shield className="w-4 h-4 text-saffron-600" />
 Verified Pandits
 </div>
 <div className="flex items-center gap-2 bg-saffron-600/10 text-surface-700 text-sm px-4 py-2 rounded-full border border-saffron-200/40">
 <Video className="w-4 h-4 text-saffron-600" />
 Live Streaming
 </div>
 <div className="flex items-center gap-2 bg-saffron-600/10 text-surface-700 text-sm px-4 py-2 rounded-full border border-saffron-200/40">
 <Gift className="w-4 h-4 text-saffron-600" />
 Prasad Delivery
 </div>
 <div className="flex items-center gap-2 bg-saffron-600/10 text-surface-700 text-sm px-4 py-2 rounded-full border border-saffron-200/40">
 <CheckCircle2 className="w-4 h-4 text-saffron-600" />
 Money-Back Guarantee
 </div>
 </div>

 {/* Search */}
 <div className="mt-8 max-w-2xl">
 <div className="relative">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
 <input
 type="text"
 placeholder="Search pujas by name, deity, or temple..."
 className="w-full pl-12 pr-4 py-3.5 rounded-lg border border-[var(--color-border)] bg-white text-surface-800 placeholder:text-surface-500 shadow-warm-sm focus:outline-none focus:ring-2 focus:ring-saffron-300"
 />
 </div>
 </div>
 </div>
 </section>

 {/* At-home services — featured */}
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
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
 <h3 className="text-2xl font-bold text-surface-800 tracking-tight">
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
 <h3 className="text-2xl font-bold tracking-tight">
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
 1,500+ weddings
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

 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
 {/* Filters */}
 <div className="flex flex-wrap gap-3 mb-8">
 <div className="relative">
 <select className="appearance-none bg-white border border-surface-200 rounded-lg pl-4 pr-10 py-2.5 text-sm font-medium text-surface-600 hover:border-saffron-300 focus:outline-none focus:ring-2 focus:ring-saffron-200 cursor-pointer">
 {categories.map((c) => (
 <option key={c} value={c}>
 {c}
 </option>
 ))}
 </select>
 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
 </div>

 <div className="relative">
 <select className="appearance-none bg-white border border-surface-200 rounded-lg pl-4 pr-10 py-2.5 text-sm font-medium text-surface-600 hover:border-saffron-300 focus:outline-none focus:ring-2 focus:ring-saffron-200 cursor-pointer">
 {deities.map((d) => (
 <option key={d} value={d}>
 {d}
 </option>
 ))}
 </select>
 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
 </div>

 <div className="relative">
 <select className="appearance-none bg-white border border-surface-200 rounded-lg pl-4 pr-10 py-2.5 text-sm font-medium text-surface-600 hover:border-saffron-300 focus:outline-none focus:ring-2 focus:ring-saffron-200 cursor-pointer">
 {occasions.map((o) => (
 <option key={o} value={o}>
 {o}
 </option>
 ))}
 </select>
 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
 </div>

 <div className="relative">
 <select className="appearance-none bg-white border border-surface-200 rounded-lg pl-4 pr-10 py-2.5 text-sm font-medium text-surface-600 hover:border-saffron-300 focus:outline-none focus:ring-2 focus:ring-saffron-200 cursor-pointer">
 {priceRanges.map((p) => (
 <option key={p} value={p}>
 {p}
 </option>
 ))}
 </select>
 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
 </div>

 <button className="inline-flex items-center gap-2 bg-saffron-50 border border-saffron-200 rounded-lg px-4 py-2.5 text-sm font-medium text-saffron-700 hover:bg-saffron-100 transition-colors">
 <Tag className="w-4 h-4" />
 Sort: Popularity
 </button>
 </div>

 {/* Results */}
 <p className="text-sm text-surface-500 mb-6">
 Showing <span className="font-semibold text-surface-600">{pujas.length}</span> pujas
 </p>

 {/* Sponsored — between trending tags and the All Pujas grid */}
 <AdSlot slotId="PUJAS_BANNER" format="horizontal" label="Sponsored" className="w-full mb-6" />

 {/* Puja Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {pujas.map((puja) => (
 <div
 key={puja.id}
 className="group bg-[var(--color-surface)] rounded-xl overflow-hidden border border-[var(--color-border)] card-hover transition-all duration-300"
 >
 {/* Puja image */}
 <div className="relative aspect-[16/10] bg-gradient-to-br from-saffron-100 to-amber-50">
 <img
 src={puja.imageUrl ?? getDeityImage(
 puja.deity === 'Lord Shiva' ? 'lord-shiva' :
 puja.deity === 'Lord Vishnu' ? 'lord-vishnu' :
 puja.deity === 'Lord Ganesha' ? 'lord-ganesha' :
 puja.deity === 'Goddess Lakshmi' ? 'goddess-lakshmi' :
 puja.deity === 'Lord Hanuman' ? 'lord-hanuman' :
 puja.deity === 'Goddess Durga' ? 'goddess-durga' :
 puja.deity === 'Navagraha' ? 'lord-surya' :
 'lord-shiva'
 )}
 alt={`${puja.name} - ${puja.deity}`}
 loading="lazy"
 className="absolute inset-0 w-full h-full object-cover"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
 <div className="absolute top-3 left-3">
 <span
 className={`${puja.tagColor} text-white text-xs font-bold px-2.5 py-1 rounded-full`}
 >
 {puja.tag}
 </span>
 </div>
 <button
 className="absolute top-3 right-3 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors"
 aria-label="Add to wishlist"
 >
 <Heart className="w-4 h-4 text-surface-400" />
 </button>

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
 <span className="text-surface-500 truncate">{puja.category}</span>
 </div>

 <div className="mt-4 flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--color-divider)' }}>
 <div>
 <span className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
 ₹{puja.price.toLocaleString("en-IN")}
 </span>
 <span className="text-xs ml-1" style={{ color: 'var(--color-text-faint)' }}>
 onwards
 </span>
 </div>
 <a
 href={`/pujas/${puja.slug}`}
 className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
 style={{ background: 'var(--color-primary)', color: '#fff' }}
 >
 Book Now
 </a>
 </div>
 </div>
 </div>
 ))}
 </div>

 </div>
 </div>
 );
}
