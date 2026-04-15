import type { Metadata } from "next";
import { getDeityImage } from "../../lib/images";
import {
  Flame,
  Star,
  MapPin,
  Clock,
  Heart,
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
} from "lucide-react";

export const metadata: Metadata = {
  title: "Pujas",
  description:
    "Book authentic pujas at renowned temples across India. Verified pandits, live streaming, prasad delivery. Choose from 200+ sacred rituals.",
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

const pujas = [
  {
    id: 1,
    name: "Rudrabhishek Puja",
    temple: "Kashi Vishwanath, Varanasi",
    category: "Abhishekam",
    deity: "Lord Shiva",
    price: 1100,
    rating: 4.9,
    reviews: 2340,
    duration: "2 hours",
    tag: "Most Popular",
    tagColor: "bg-saffron-600",
    hasLiveStream: true,
    hasPrasadDelivery: true,
    bookings: 2340,
    description:
      "Sacred abhishekam of the Shiva Lingam with panchamrit — milk, honey, curd, ghee, and sugar. Includes 108 chants of Om Namah Shivaya.",
  },
  {
    id: 2,
    name: "Satyanarayan Katha",
    temple: "ISKCON, Delhi",
    category: "Path / Paath",
    deity: "Lord Vishnu",
    price: 751,
    rating: 4.8,
    reviews: 1820,
    duration: "1.5 hours",
    tag: "Recommended",
    tagColor: "bg-ganga-blue",
    hasLiveStream: true,
    hasPrasadDelivery: true,
    bookings: 1820,
    description:
      "Complete Satyanarayan Katha with five chapters, aarti, and prasad distribution. Ideal for new beginnings and thanksgiving.",
  },
  {
    id: 3,
    name: "Ganesh Atharvashirsha Path",
    temple: "Siddhivinayak, Mumbai",
    category: "Path / Paath",
    deity: "Lord Ganesha",
    price: 501,
    rating: 4.9,
    reviews: 3100,
    duration: "45 min",
    tag: "Trending",
    tagColor: "bg-tulsi-green",
    hasLiveStream: true,
    hasPrasadDelivery: true,
    bookings: 3100,
    description:
      "Recitation of the powerful Ganesh Atharvashirsha for removing obstacles and bringing success. Includes modak prasad.",
  },
  {
    id: 4,
    name: "Mahalakshmi Puja",
    temple: "Mahalakshmi Temple, Kolhapur",
    category: "Shanti Puja",
    deity: "Goddess Lakshmi",
    price: 851,
    rating: 4.7,
    reviews: 1560,
    duration: "1 hour",
    tag: "For Prosperity",
    tagColor: "bg-temple-gold",
    hasLiveStream: true,
    hasPrasadDelivery: true,
    bookings: 1560,
    description:
      "Worship of Goddess Mahalakshmi with kumkum archana, lotus offerings, and Shri Suktam recitation for wealth and prosperity.",
  },
  {
    id: 5,
    name: "Maha Mrityunjaya Jaap",
    temple: "Kashi Vishwanath, Varanasi",
    category: "Jaap",
    deity: "Lord Shiva",
    price: 1500,
    rating: 4.9,
    reviews: 1780,
    duration: "2.5 hours",
    tag: "Health",
    tagColor: "bg-sacred-red",
    hasLiveStream: true,
    hasPrasadDelivery: true,
    bookings: 1780,
    description:
      "108 recitations of the Maha Mrityunjaya Mantra with vedic rituals for health, longevity, and overcoming life-threatening situations.",
  },
  {
    id: 6,
    name: "Navgraha Shanti Puja",
    temple: "Navagraha Temple, Guwahati",
    category: "Dosh Nivaran",
    deity: "Navagraha",
    price: 2100,
    rating: 4.6,
    reviews: 980,
    duration: "3 hours",
    tag: "Astrology",
    tagColor: "bg-purple-600",
    hasLiveStream: true,
    hasPrasadDelivery: false,
    bookings: 980,
    description:
      "Complete Navagraha Shanti Puja to pacify all nine planets. Includes separate homam for each graha and navgraha stotram.",
  },
  {
    id: 7,
    name: "Sunderkand Path",
    temple: "Sankat Mochan, Varanasi",
    category: "Path / Paath",
    deity: "Lord Hanuman",
    price: 351,
    rating: 4.8,
    reviews: 4200,
    duration: "2 hours",
    tag: "Tuesday Special",
    tagColor: "bg-saffron-600",
    hasLiveStream: true,
    hasPrasadDelivery: true,
    bookings: 4200,
    description:
      "Complete recitation of Sunderkand from Ramcharitmanas. Especially auspicious on Tuesdays and Saturdays for strength and courage.",
  },
  {
    id: 8,
    name: "Durga Saptashati Path",
    temple: "Vaishno Devi, Katra",
    category: "Path / Paath",
    deity: "Goddess Durga",
    price: 1800,
    rating: 4.8,
    reviews: 1340,
    duration: "4 hours",
    tag: "Navratri Special",
    tagColor: "bg-lotus-pink",
    hasLiveStream: true,
    hasPrasadDelivery: true,
    bookings: 1340,
    description:
      "Full recitation of the 700 verses of Durga Saptashati (Devi Mahatmyam) with havan and kumkum archana.",
  },
  {
    id: 9,
    name: "Kaal Sarp Dosh Nivaran",
    temple: "Trimbakeshwar, Nashik",
    category: "Dosh Nivaran",
    deity: "Lord Shiva",
    price: 5100,
    rating: 4.6,
    reviews: 620,
    duration: "5 hours",
    tag: "Dosh Nivaran",
    tagColor: "bg-rudraksha-brown",
    hasLiveStream: true,
    hasPrasadDelivery: false,
    bookings: 620,
    description:
      "Comprehensive Kaal Sarp Dosh Nivaran puja with Nag offerings, Tripindi Shraadh, and Rudrabhishek at Trimbakeshwar Jyotirlinga.",
  },
];

export default function PujasPage() {
  return (
    <div className="min-h-screen bg-saffron-50">
      {/* Hero */}
      <section className="bg-surface-900 text-white py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Book Sacred Pujas Online
          </h1>
          <p className="text-surface-300 text-lg max-w-2xl">
            Choose from 200+ authentic pujas performed by verified pandits at
            India&rsquo;s most revered temples. Live streaming and prasad delivery
            included.
          </p>

          {/* Trust badges */}
          <div className="mt-6 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full">
              <Shield className="w-4 h-4" />
              Verified Pandits
            </div>
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full">
              <Video className="w-4 h-4" />
              Live Streaming
            </div>
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full">
              <Gift className="w-4 h-4" />
              Prasad Delivery
            </div>
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full">
              <CheckCircle2 className="w-4 h-4" />
              Money-Back Guarantee
            </div>
          </div>

          {/* Search */}
          <div className="mt-8 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="text"
                placeholder="Search pujas by name, deity, or temple..."
                className="w-full pl-12 pr-4 py-3.5 rounded-lg border border-surface-700 bg-white text-stone-800 placeholder:text-stone-400 shadow-lg focus:outline-none focus:ring-2 focus:ring-saffron-300"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          <div className="relative">
            <select className="appearance-none bg-white border border-stone-200 rounded-lg pl-4 pr-10 py-2.5 text-sm font-medium text-stone-700 hover:border-saffron-300 focus:outline-none focus:ring-2 focus:ring-saffron-200 cursor-pointer">
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select className="appearance-none bg-white border border-stone-200 rounded-lg pl-4 pr-10 py-2.5 text-sm font-medium text-stone-700 hover:border-saffron-300 focus:outline-none focus:ring-2 focus:ring-saffron-200 cursor-pointer">
              {deities.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select className="appearance-none bg-white border border-stone-200 rounded-lg pl-4 pr-10 py-2.5 text-sm font-medium text-stone-700 hover:border-saffron-300 focus:outline-none focus:ring-2 focus:ring-saffron-200 cursor-pointer">
              {occasions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select className="appearance-none bg-white border border-stone-200 rounded-lg pl-4 pr-10 py-2.5 text-sm font-medium text-stone-700 hover:border-saffron-300 focus:outline-none focus:ring-2 focus:ring-saffron-200 cursor-pointer">
              {priceRanges.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
          </div>

          <button className="inline-flex items-center gap-2 bg-saffron-50 border border-saffron-200 rounded-lg px-4 py-2.5 text-sm font-medium text-saffron-700 hover:bg-saffron-100 transition-colors">
            <Tag className="w-4 h-4" />
            Sort: Popularity
          </button>
        </div>

        {/* Results */}
        <p className="text-sm text-stone-500 mb-6">
          Showing <span className="font-semibold text-stone-700">{pujas.length}</span> pujas
        </p>

        {/* Puja Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pujas.map((puja) => (
            <div
              key={puja.id}
              className="group bg-white rounded-xl overflow-hidden border border-stone-100 hover:shadow-md hover:border-surface-300 transition-all duration-300"
            >
              {/* Puja image */}
              <div className="relative aspect-[16/10] bg-gradient-to-br from-saffron-100 to-amber-50">
                <img
                  src={getDeityImage(
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
                  <Heart className="w-4 h-4 text-stone-400" />
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
                <div className="flex items-center gap-1 text-sm text-stone-500 mb-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {puja.temple}
                </div>
                <h3 className="text-lg font-semibold text-stone-900 group-hover:text-saffron-600 transition-colors">
                  {puja.name}
                </h3>
                <p className="text-sm text-stone-500 mt-1 line-clamp-2">
                  {puja.description}
                </p>

                <div className="flex items-center gap-3 mt-3 text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-temple-gold fill-temple-gold" />
                    <span className="font-semibold text-stone-800">
                      {puja.rating}
                    </span>
                  </div>
                  <span className="text-stone-300">|</span>
                  <span className="text-stone-500">
                    {puja.reviews.toLocaleString("en-IN")} reviews
                  </span>
                  <span className="text-stone-300">|</span>
                  <span className="text-stone-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {puja.duration}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between pt-4 border-t border-stone-50">
                  <div>
                    <span className="text-2xl font-bold text-saffron-600">
                      ₹{puja.price.toLocaleString("en-IN")}
                    </span>
                    <span className="text-sm text-stone-400 ml-1">
                      onwards
                    </span>
                  </div>
                  <a
                    href="/pujas"
                    className="inline-flex items-center gap-1 px-5 py-2.5 bg-saffron-600 text-white font-medium text-sm rounded-lg hover:bg-saffron-700 transition-colors"
                  >
                    Book Now
                    <ChevronRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load more */}
        <div className="text-center mt-10">
          <button className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-saffron-200 text-saffron-600 font-medium rounded-lg hover:bg-saffron-50 transition-colors">
            Load More Pujas
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
