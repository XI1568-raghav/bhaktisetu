import type { Metadata } from "next";
import { getTranslations } from '../../lib/t';
import { H1 } from '../../components/ui/heading-recipe';
import { getProductImage, remoteSrcSet, IMG_W } from "../../lib/images";
import { PRODUCTS, CATEGORIES } from "../../lib/products";
import { listProducts, isMedusaEnabled } from "../../lib/medusa";
import { storeItemListJsonLd, type StoreProductLite } from "../../lib/jsonld";
import AddToCartButton from "../../components/store/AddToCartButton";
import StoreFilterBar from "../../components/store/StoreFilterBar";
import SellerShelf from "../../components/store/SellerShelf";
import { getLiveProducts } from "../../lib/store-live";
import { parseStoreFilters, filterAndSortProducts } from "../../lib/store-filters";
import {
 ShoppingBag,
 Star,
 Search,
 Truck,
 Shield,
 RotateCcw,
 Package,
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
   images: ["/og/default.png"],
 },
 twitter: {
   card: "summary_large_image",
   title: "Store | Darshya",
   description:
   "Shop for authentic puja samagri, brass idols, rudraksha, incense, and spiritual essentials. Blessed by temple pandits.",
   images: ["/og/default.png"],
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
export default async function StorePage({
 searchParams,
}: {
 searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
 // COM-11: the seed catalogue and the seller catalogue are fetched
 // independently — a seller shelf must not disappear because Medusa is down,
 // and the seed grid must not disappear because the API is. Both degrade to
 // their own empty state.
 const [allProducts, sellerProducts] = await Promise.all([
   listProducts(),
   getLiveProducts(),
 ]);
 // S-04: the filter bar used to be inert decoration on this server component.
 // State now lives in the URL, so the filtering happens here (shareable,
 // crawlable) and the client half only pushes query params.
 const filters = parseStoreFilters(searchParams ? await searchParams : {});
 const products = filterAndSortProducts(allProducts, filters);
 const t = await getTranslations('store');
 const itemListJsonLd = storeItemListJsonLd(products as StoreProductLite[]);
 // P2-41: Medusa is configured but every product resolved from the seed
 // fallback — i.e. the Storefront API is down or returning non-OK. Surface a
 // banner so devotees know live inventory/pricing may be stale. When Medusa
 // isn't configured at all the seed catalogue *is* the source of truth, so no
 // banner is warranted in that case.
 const isStoreDegraded =
   isMedusaEnabled() && allProducts.length > 0 && allProducts.every((p) => p.source === 'seed');
 return (
 <div className="min-h-[100dvh] bg-surface-50">
 <script
   type="application/ld+json"
   dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
 />
 {isStoreDegraded && (
   <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm">
     <div className="container-wide py-2.5 flex items-center gap-2">
       <Package className="w-4 h-4 shrink-0" />
       <span>
         Live store inventory is temporarily unavailable. Showing our curated
         catalogue — checkout is unaffected, but prices and stock may refresh shortly.
       </span>
     </div>
   </div>
 )}
 {/* Hero */}
 <section className="bg-[#ede9e3] py-12 md:py-16">
 <div className="container-wide">
 <h1 className={`${H1.catalogue} mb-3`}>
 {t('pageTitle')}
 </h1>
 <p className="prose-body text-surface-500 max-w-2xl">
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

 {/* S-04: search, category pills and the filter row moved into
     StoreFilterBar (a client component) so they actually work. */}
 </div>
 </section>

 <div className="container-wide py-8">
 <StoreFilterBar
 filters={filters}
 categories={categories.map((c) => ({ name: c.name, slug: c.slug, count: c.count }))}
 resultCount={products.length}
 searchPlaceholder={t('search')}
 />

 {/* Product Grid
   DU-08 / A11Y-15: the measured level sequence was h1 then 24 consecutive
   h3 card titles - one skipped level, and a screen-reader user navigating
   by heading got a flat list with nothing to jump past. The grid now sits
   in a named section. The label is visually hidden because the hero title
   above already says "Bhakti Store" on screen; AT needs the grouping,
   sighted users do not need it twice. */}
 <section aria-labelledby="store-all-products">
 <h2 id="store-all-products" className="sr-only">
 All products
 </h2>
 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
 {products.map((product) => (
 <div
 key={product.id}
 className="group relative bg-[var(--color-surface)] rounded-xl overflow-hidden border border-[var(--color-border)] card-hover transition-all duration-300"
 >
 {/* Product image */}
 <div className="relative aspect-square bg-gradient-to-br from-surface-50 to-saffron-50 overflow-hidden">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img
 src={getProductImage(product.imageKey, IMG_W.CARD)}
 srcSet={remoteSrcSet(getProductImage(product.imageKey, IMG_W.CARD), [
 IMG_W.THUMB,
 IMG_W.CARD,
 ])}
 sizes="(max-width: 768px) 50vw, 280px"
 alt={product.title}
 width={500}
 height={500}
 loading="lazy"
 decoding="async"
 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
 />

 {product.tag && (
 <div className="absolute top-3 left-3">
 <span data-product-tag className="bg-saffron-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
 {product.tag}
 </span>
 </div>
 )}

 {/* LEG-17: a "-32%" badge used to render here from `product.discount`,
     a hardcoded seed field in lib/products.ts. It was computed against
     `compareAtPrice`, a reference price no product was ever sold at —
     this catalogue has never taken an order. A discount claim measured
     against a price that was never charged is a fabricated discount
     under the Consumer Protection Act 2019, and unlike the expired
     festival-sale banner COM-13 removed from this page it carried no
     end date, so it could never expire on its own. Re-introduce a
     badge only from a dated prior-price record the component can hide
     once it lapses. Guarded by
     __tests__/leg17-store-fabricated-reference-price.test.tsx. */}

 </div>

 <div className="p-4">
 <p className="text-xs text-saffron-600 font-medium mb-1">{product.category}</p>
 {/* A11Y-11: one link per card, stretched over the whole card via ::after,
     so the buttons below are siblings of the link instead of children. */}
 <h3 className="text-sm font-medium text-surface-800 line-clamp-2 min-h-[2.5rem] group-hover:text-saffron-600 transition-colors">
 <a
 href={`/store/${product.handle}`}
 className="after:absolute after:inset-0 after:content-['']"
 >
 {product.title}
 </a>
 </h3>

 {/* LEG-17: a star rating and a review tally used to render here —
     `{product.rating}` in a badge and `({product.reviewCount})` beside
     it. Both were fabricated on BOTH data paths, so there was no input
     that made them true:

       - Seed path (the live one, `isMedusaEnabled()` is false):
         lib/products.ts hardcodes `rating: 4.7, reviewCount: 342` on
         prod_001, and all 24 seed rows carry one: ratings 4.4-4.9 and
         review counts 145-2,100, totalling 12,366 reviews that do not
         exist. This catalogue has never taken an order — the same
         premise the removed discount badge below rests on — so it has
         never collected a review either.
       - Medusa path: lib/medusa.ts maps every real product with
         `rating: 4.5, reviewCount: 0`, printing a 4.5-star average
         explicitly derived from zero reviews.

     A `Review` model and a GET /store/reviews route both exist
     (apps/api), so this is a real number's placeholder, not a missing
     feature: restore the badge when the grid is joined to that table
     and only for products that actually have reviews. A fabricated star
     average is the strongest purchase signal on a product grid, which
     makes it the same consumer-protection defect as the fabricated
     reference price, not a lesser one.
     Guarded by __tests__/leg17-store-fabricated-review-counts.test.tsx. */}

 {/* LEG-17: the struck-through `compareAtPrice` that sat beside this
     price is gone — see the note on the removed discount badge above. */}
 <div className="mt-2 flex items-baseline gap-2">
 <span className="text-lg font-bold text-surface-800">
 ₹{product.price.toLocaleString("en-IN")}
 </span>
 </div>

 {product.freeDelivery && (
 <div className="mt-2 flex items-center gap-1 text-xs text-tulsi-green-dark font-medium">
 <Truck className="w-3 h-3" />
 Free Delivery
 </div>
 )}

 {/* Add to cart — a real control, outside the card link (A11Y-11). */}
 <AddToCartButton
 product={{
 id: product.id,
 handle: product.handle,
 title: product.title,
 price: product.price,
 // LEG-17: never carry the fabricated seed reference price into the
 // cart. CartProduct.compareAtPrice is `number | null`, and the cart
 // persists to localStorage under poojly_cart, so passing it here
 // would outlive this page.
 compareAtPrice: null,
 image: getProductImage(product.imageKey, IMG_W.CARD),
 category: product.category,
 inStock: product.inStock,
 freeDelivery: product.freeDelivery,
 }}
 />
 </div>
 </div>
 ))}
 </div>
 </section>

 {/* S-04: a filter that matches nothing must say so — never silently fall
     back to the unfiltered catalogue. */}
 {products.length === 0 && (
 <div className="rounded-xl border border-dashed border-surface-200 bg-white p-10 text-center">
 <Search className="w-8 h-8 text-surface-300 mx-auto mb-3" />
 <p className="font-medium text-surface-700">No products match these filters</p>
 <p className="text-sm text-surface-500 mt-1">
 Try a different category or price range, or clear the filters above.
 </p>
 </div>
 )}

 {/* Load more — the full catalog is already fetched (listProducts limit=100),
     so a pagination button had nothing to load (dead CTA). Replace with an
     honest catalog-count note instead. */}
 {products.length > 0 && (
 <div className="text-center mt-10">
 <p className="text-sm text-surface-500">
 Showing {products.length} of {allProducts.length} products.
 </p>
 </div>
 )}
 </div>

 {/* COM-11: inventory listed by real onboarded sellers. Renders nothing at
     all while no seller has listed anything (which is the case today) —
     the marketplace must not advertise supply it does not have. */}
 <SellerShelf products={sellerProducts} />
 </div>
 );
}
