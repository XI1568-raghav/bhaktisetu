import Link from 'next/link';
import { ShoppingBag, ArrowRight } from 'lucide-react';

type Product = {
  name: string;
  price: string;
  href: string;
  gradient: string;
  emoji: string;
};

const PRODUCTS: Product[] = [
  {
    name: 'Tirupati Prasad',
    price: '₹399',
    href: '/store',
    gradient: 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)',
    emoji: '🪔',
  },
  {
    name: 'Brass Krishna Murti',
    price: '₹2,499',
    href: '/store',
    gradient: 'linear-gradient(135deg, #FBBF24 0%, #B45309 100%)',
    emoji: '🛕',
  },
  {
    name: 'Bhagavad Gita Hardcover',
    price: '₹599',
    href: '/store',
    gradient: 'linear-gradient(135deg, #FCA5A5 0%, #B91C1C 100%)',
    emoji: '📖',
  },
  {
    name: 'Tulsi Mala',
    price: '₹299',
    href: '/store',
    gradient: 'linear-gradient(135deg, #86EFAC 0%, #166534 100%)',
    emoji: '📿',
  },
];

export default function ShopStrip() {
  return (
    <section
      className="py-10 md:py-12"
      style={{ background: 'var(--color-surface)' }}
      aria-labelledby="shop-strip-heading"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="flex items-end justify-between gap-4 mb-5">
          <div>
            <p
              className="text-xs font-medium uppercase tracking-widest mb-1"
              style={{ color: 'var(--color-primary)' }}
            >
              Shop
            </p>
            <h2
              id="shop-strip-heading"
              className="text-xl sm:text-2xl font-semibold tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
            >
              Prasad, idols, books, sacred items.
            </h2>
          </div>
          <Link
            href="/store"
            prefetch={false}
            className="hidden sm:inline-flex items-center gap-1 text-xs font-medium link-underline"
            style={{ color: 'var(--color-primary)' }}
          >
            Visit store <ArrowRight className="w-3 h-3" />
          </Link>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {PRODUCTS.map((p) => (
            <Link
              key={p.name}
              href={p.href}
              prefetch={false}
              className="group rounded-xl overflow-hidden card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div
                className="aspect-square flex items-center justify-center text-5xl sm:text-6xl"
                style={{ background: p.gradient }}
                aria-hidden="true"
              >
                {p.emoji}
              </div>
              <div className="p-2.5 sm:p-3">
                <p
                  className="text-xs sm:text-sm font-medium truncate group-hover:underline"
                  style={{ color: 'var(--color-text)' }}
                >
                  {p.name}
                </p>
                <p
                  className="text-xs sm:text-sm font-semibold mt-0.5"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {p.price}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-5 sm:hidden">
          <Link
            href="/store"
            prefetch={false}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white btn-press"
            style={{ background: 'var(--color-primary)' }}
          >
            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            Visit store <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
