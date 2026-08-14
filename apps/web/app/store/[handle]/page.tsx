import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductDetail from '../../../components/store/ProductDetail';
import { PRODUCTS } from '../../../lib/products';
import { getProductByHandle } from '../../../lib/medusa';
import { getProductImage, IMG_W } from '../../../lib/images';
import { productJsonLd, breadcrumbJsonLd, SITE_URL } from '../../../lib/jsonld';

/**
 * COM-10 (prod sweep 2026-08-12): this route was a redirect shim. Every
 * /store/<handle> URL answered 307 → /store/view?handle=<handle>, and that page
 * resolved the product from `useSearchParams()` on the client. Stripping tags
 * from the delivered HTML of a product page left the global nav, the word
 * "Loading…", and the footer. No title, no price, no description, no
 * availability — so none of the 24 product pages could rank or produce a
 * Product rich result, and every product URL was a redirect rather than a
 * canonical 200. For a $0-budget business whose devotee-CAC thesis is organic
 * reach, that silently zeroed out the store's share of it.
 *
 * The friendly URL is now the real page: the catalogue is read on the server,
 * the 24 handles are prerendered, and the interactive body is a client island
 * that receives the product as a prop (so it renders during SSR instead of
 * waiting for a browser to read the query string).
 *
 * /store/view?handle=… is kept as a legacy alias for old links and bookmarks.
 */

type Params = { handle: string };

// The 24 seed handles are prerendered. `dynamicParams` stays TRUE on purpose:
// /store lists through lib/medusa, which serves the live commerce backend when
// NEXT_PUBLIC_MEDUSA_BACKEND_URL is set, and those handles are not knowable at
// build time. Pinning it to false would make every Medusa-only card on the grid
// link to a hard 404 — the listing and the detail page must agree on what
// exists, which is why both resolve through the same module.
export function generateStaticParams(): Params[] {
  return PRODUCTS.map((p) => ({ handle: p.handle }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProductByHandle(handle);
  if (!product) {
    return { title: 'Product not found' };
  }
  const url = `${SITE_URL}/store/${product.handle}`;
  const image = getProductImage(product.imageKey, IMG_W.WIDE);
  // The price is in the description on purpose: it is the single fact a shopper
  // scans for in a SERP snippet, and it was absent from every product page.
  const description = `${product.title} — ₹${product.price.toLocaleString('en-IN')}. ${product.description}`.slice(
    0,
    300,
  );
  return {
    title: product.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${product.title} | Darshya Store`,
      description,
      url,
      type: 'website',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.title} | Darshya Store`,
      description,
      images: [image],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { handle } = await params;
  const product = await getProductByHandle(handle);
  // COM-09: /store/orders used to land here and render a soft "The product you
  // are looking for does not exist" body with a 200. An unknown handle is a
  // 404 — for crawlers as much as for people.
  if (!product) notFound();

  const url = `${SITE_URL}/store/${product.handle}`;
  const jsonLd = productJsonLd({
    name: product.title,
    description: product.description,
    image: getProductImage(product.imageKey, IMG_W.WIDE),
    sku: product.sku,
    priceInr: product.price,
    url,
    inStock: product.inStock,
  });
  const crumbs = breadcrumbJsonLd([
    { name: 'Store', url: `${SITE_URL}/store` },
    { name: product.title, url },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
      />
      <ProductDetail product={product} />
    </>
  );
}
