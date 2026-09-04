'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import ProductDetail from '../../../components/store/ProductDetail';
import { getProductByHandle } from '../../../lib/products';
import { buttonClass } from '../../../components/ui/button-recipe';
import { H1 } from '../../../components/ui/heading-recipe';

/**
 * LEGACY ALIAS. The canonical product page is /store/<handle> (a server
 * component — see COM-10 in app/store/[handle]/page.tsx). This route stays for
 * old links, bookmarks and any external referrer still pointing at
 * /store/view?handle=…; it renders the same body, just resolved in the browser.
 *
 * Nothing internal should link here. The rendered body lives in
 * components/store/ProductDetail so the two routes cannot drift apart — this
 * page used to hold the only copy of it, which is why the product detail was
 * client-only and invisible to crawlers.
 */

function ProductDetailInner() {
  const sp = useSearchParams();
  const handle = sp.get('handle') ?? '';
  const product = getProductByHandle(handle) ?? null;

  if (!product) {
    return (
      <div className="min-h-[100dvh] bg-saffron-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 text-surface-300 mx-auto mb-4" />
          <h1 className={`${H1.portal} mb-2`}>Product Not Found</h1>
          <p className="text-surface-500 mb-4">The product you are looking for does not exist.</p>
          <Link
            href="/store"
            className={buttonClass('primary', 'md')}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Store
          </Link>
        </div>
      </div>
    );
  }

  return <ProductDetail product={product} />;
}

export default function ProductViewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] flex items-center justify-center">
          <div className="text-surface-500">Loading…</div>
        </div>
      }
    >
      <ProductDetailInner />
    </Suspense>
  );
}
