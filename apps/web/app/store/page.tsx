import type { Metadata } from "next";
import { getTranslations } from '../../lib/t';
import { getProductImage } from "../../lib/images";
import { PRODUCTS, CATEGORIES } from "../../lib/products";
import { listProducts } from "../../lib/medusa";
import { storeItemListJsonLd, type StoreProductLite } from "../../lib/jsonld";
import {
 ShoppingBag,
 Star,
 Heart,
 Search,
 ChevronDown,
 Filter,
 ArrowRight,
 Truck,
 Shield,
 RotateCcw,
 Tag,
 ShoppingCart,
 Package,
 Percent,
 ChevronRight,
 BadgeCheck,
 Flame,
 BookOpen,
 Gem,
 Leaf,
 Home,
} from "lucide-react";

export const metadata: Metadata = {
 title: "Store",
 description:
 "Shop for authentic puja samagri, brass idols, rudraksha, incense, and spiritual essentials. Blessed by temple pandits. Free delivery on orders above Rs 499.",
 alternates: { canonical: "https://darshya.online/store" },
 openGraph: {
   title: "Store | Darshya",
   description:
   "Shop for authentic puja samagri, brass idols, rudraksha, incense, and spiritual essentials. Blessed by temple pandits.",
   url: "https://darshya.online/store",
   type: "website",
   images: ["/og/default"],
 },
 twitter: {
   card: "summary_large_image",
   title: "Store | Darshya",
   description:
   "Shop for authentic puja samagri, brass idols, rudraksha, incense, and spiritual essentials. Blessed by temple pandits.",
   images: ["/og/default"],
 },
};

const categoryIcons: Record<string, React.ElementType> = {
 'puja-essentials': Flame,
 'rudraksha-malas': Gem,
 'idols-murtis': Star,
 'puja-samagri': Package,
 'books-scriptures': BookOpen,
 'spiritual-jewellery': Gem,
 'organic-natural': Leaf,
 'home-temple-decor': Home,
};

const categories = [
 { name: "All Products", count: PRODUCTS.length, slug: 'all', icon: ShoppingBag },
 ...CATEGORIES.map((cat) => ({
 name: cat.name,
 count: cat.count,
 slug: cat.slug,
 icon: categoryIcons[cat.slug] ?? Star,
 })),
];

// Catalogue is fetched from Medusa Storefront API when
// NEXT_PUBLIC_MEDUSA_BACKEND_URL is set; otherwise falls back to PRODUCTS
// so the grid never blanks. See lib/medusa.ts.
export default async function StorePage() {
 const products = await listProducts();
 const t = await getTranslations('store');
 const itemListJsonLd = storeItemListJsonLd(products as StoreProductLite[]);
 return (
 <div className="min-h-[100dvh] bg-surface-50">
 <script
   type="application/ld+json"
   dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
 />
 {/* Hero */}
 <section className="bg-[#ede9e3] py-12 md:py-16">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <h1 className="text-3xl md:text-4xl font-bold text-surface-800 mb-3">
 {t('pageTitle')}
 </h1>
 <p className="text-surface-500 text-lg max-w-2xl">
 {t('pageSubtitle')}
 </p>

 {/* Trust badges */}
 <div className="mt-6 flex flex-wrap gap-4">
 <div className="flex items-center gap-2 bg-saffron-600/10 text-surface-700 text-sm px-4 py-2 rounded-full border border-saffron-200/40">
 <Truck className="w-4 h-4 text-saffron-600" />
 {t('freeDelivery')}
 </div>
 <div className="flex items-center gap-2 bg-saffron-600/10 text-surface-700 text-sm px-4 py-2 rounded-full border border-saffron-200/40">
 <BadgeCheck className="w-4 h-4 text-saffron-600" />
 {t('blessed')}
 </div>
 <div className="flex items-center gap-2 bg-saffron-600/10 text-surface-700 text-sm px-4 py-2 rounded-full border border-saffron-200/40">
 <RotateCcw className="w-4 h-4 text-saffron-600" />
 {t('easyReturns')}
 </div>
 <div className="flex items-center gap-2 bg-saffron-600/10 text-surface-700 text-sm px-4 py-2 rounded-full border border-saffron-200/40">
 <Shield className="w-4 h-4 text-saffron-600" />
 {t('secureCheckout')}
 </div>
 </div>

 {/* Search */}
 <div className="mt-8 max-w-2xl">
 <div className="relative">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
 <input
 type="text"
 placeholder={t('search')}
 className="w-full pl-12 pr-4 py-3.5 rounded-lg border border-[var(--color-border)] bg-white text-surface-800 placeholder:text-surface-500 shadow-warm-sm focus:outline-none focus:ring-2 focus:ring-saffron-300"
 />
 </div>
 </div>
 </div>
 </section>

 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
 {/* Category pills */}
 <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
 {categories.map((cat, i) => (
 <button
 key={cat.name}
 className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
 i === 0
 ? "bg-saffron-600 text-white"
 : "bg-white text-surface-600 border border-surface-200 hover:border-saffron-300 hover:text-saffron-600"
 }`}
 >
 {cat.name}
 <span
 className={`text-xs px-1.5 py-0.5 rounded-full ${
 i === 0
 ? "bg-saffron-500 text-saffron-100"
 : "bg-surface-100 text-surface-400"
 }`}
 >
 {cat.count}
 </span>
 </button>
 ))}
 </div>

 {/* Filters row */}
 <div className="flex flex-wrap items-center gap-3 mb-8">
 <div className="relative">
 <select className="appearance-none bg-white border border-surface-200 rounded-lg pl-4 pr-10 py-2.5 text-sm font-medium text-surface-600 hover:border-saffron-300 focus:outline-none focus:ring-2 focus:ring-saffron-200 cursor-pointer">
 <option>Sort: Popular</option>
 <option>Price: Low to High</option>
 <option>Price: High to Low</option>
 <option>Rating: High to Low</option>
 <option>Newest First</option>
 </select>
 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
 </div>

 <div className="relative">
 <select className="appearance-none bg-white border border-surface-200 rounded-lg pl-4 pr-10 py-2.5 text-sm font-medium text-surface-600 hover:border-saffron-300 focus:outline-none focus:ring-2 focus:ring-saffron-200 cursor-pointer">
 <option>Any Price</option>
 <option>Under ₹500</option>
 <option>₹500 - ₹1,000</option>
 <option>₹1,000 - ₹2,500</option>
 <option>Above ₹2,500</option>
 </select>
 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
 </div>

 <button className="inline-flex items-center gap-2 bg-white border border-surface-200 rounded-lg px-4 py-2.5 text-sm font-medium text-surface-600 hover:border-saffron-300 transition-colors">
 <Truck className="w-4 h-4" />
 Free Delivery
 </button>

 <button className="inline-flex items-center gap-2 bg-white border border-surface-200 rounded-lg px-4 py-2.5 text-sm font-medium text-surface-600 hover:border-saffron-300 transition-colors">
 <Star className="w-4 h-4 text-temple-gold" />
 4+ Rating
 </button>

 <span className="text-sm text-surface-500 ml-auto">
 <span className="font-semibold text-surface-600">{products.length}</span> products
 </span>
 </div>

 {/* Promo Banner */}
 <div className="mb-8 bg-saffron-50 rounded-xl p-6 border border-saffron-200 flex items-center gap-6">
 <div className="w-14 h-14 bg-saffron-200 rounded-xl flex items-center justify-center shrink-0">
 <Percent className="w-7 h-7 text-saffron-700" />
 </div>
 <div className="flex-1">
 <h3 className="font-bold text-surface-800">
 Akshaya Tritiya Sale — Up to 50% Off!
 </h3>
 <p className="text-sm text-surface-500 mt-0.5">
 Shop puja essentials, gold-plated idols, and rudraksha malas at
 unbeatable prices. Offer valid till April 30.
 </p>
 </div>
 <a
 href="/store"
 className="hidden sm:inline-flex items-center gap-1 px-5 py-2.5 bg-saffron-600 text-white font-medium text-sm rounded-lg hover:bg-saffron-700 transition-colors shrink-0"
 >
 Shop Sale
 <ArrowRight className="w-4 h-4" />
 </a>
 </div>

 {/* Product Grid */}
 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
 {products.map((product) => (
 <a
 key={product.id}
 href={`/store/${product.handle}`}
 className="group bg-[var(--color-surface)] rounded-xl overflow-hidden border border-[var(--color-border)] card-hover transition-all duration-300"
 >
 {/* Product image */}
 <div className="relative aspect-square bg-gradient-to-br from-surface-50 to-saffron-50 overflow-hidden">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img
 src={getProductImage(product.imageKey)}
 alt={product.title}
 loading="lazy"
 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
 />

 {product.tag && (
 <div className="absolute top-3 left-3">
 <span className="bg-saffron-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
 {product.tag}
 </span>
 </div>
 )}

 {product.discount > 0 && (
 <div className="absolute top-3 right-3">
 <span className="bg-tulsi-green text-white text-xs font-bold px-2 py-1 rounded-full">
 -{product.discount}%
 </span>
 </div>
 )}

 <button
 className="absolute bottom-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors opacity-0 group-hover:opacity-100"
 aria-label="Add to wishlist"
 >
 <Heart className="w-4 h-4 text-surface-400" />
 </button>
 </div>

 <div className="p-4">
 <p className="text-xs text-saffron-600 font-medium mb-1">{product.category}</p>
 <h3 className="text-sm font-medium text-surface-800 line-clamp-2 min-h-[2.5rem] group-hover:text-saffron-600 transition-colors">
 {product.title}
 </h3>

 <div className="flex items-center gap-1 mt-2">
 <div className="flex items-center gap-0.5 bg-tulsi-green/10 px-1.5 py-0.5 rounded">
 <Star className="w-3 h-3 text-tulsi-green fill-tulsi-green" />
 <span className="text-xs font-bold text-tulsi-green">
 {product.rating}
 </span>
 </div>
 <span className="text-xs text-surface-400">
 ({product.reviewCount.toLocaleString("en-IN")})
 </span>
 </div>

 <div className="mt-2 flex items-baseline gap-2">
 <span className="text-lg font-bold text-surface-800">
 ₹{product.price.toLocaleString("en-IN")}
 </span>
 <span className="text-sm text-surface-400 line-through">
 ₹{product.compareAtPrice.toLocaleString("en-IN")}
 </span>
 </div>

 {product.freeDelivery && (
 <div className="mt-2 flex items-center gap-1 text-xs text-tulsi-green font-medium">
 <Truck className="w-3 h-3" />
 Free Delivery
 </div>
 )}

 {/* Add to cart button */}
 <button className="mt-3 w-full py-2.5 bg-saffron-50 text-saffron-700 font-medium text-sm rounded-lg border border-saffron-200 hover:bg-saffron-100 transition-colors flex items-center justify-center gap-1.5 group-hover:bg-saffron-600 group-hover:text-white group-hover:border-saffron-600">
 <ShoppingCart className="w-4 h-4" />
 Add to Cart
 </button>
 </div>
 </a>
 ))}
 </div>

 {/* Load more */}
 <div className="text-center mt-10">
 <button className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-saffron-200 text-saffron-600 font-medium rounded-lg hover:bg-saffron-50 transition-colors">
 Load More Products
 <ArrowRight className="w-4 h-4" />
 </button>
 </div>
 </div>
 </div>
 );
}
