import Link from 'next/link';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import TextReveal from '../motion/TextReveal';

type Product = {
  name: string;
  category: string;
  price: string;
  href: string;
  accentColor: string;
};

const PRODUCTS: Product[] = [
  {
    name: 'Tirupati Prasad',
    category: 'Prasad',
    price: '₹399',
    href: '/store',
    accentColor: '#E16318',
  },
  {
    name: 'Brass Krishna Murti',
    category: 'Idols',
    price: '₹2,499',
    href: '/store',
    accentColor: '#E16318',
  },
  {
    name: 'Bhagavad Gita Hardcover',
    category: 'Books',
    price: '₹599',
    href: '/store',
    accentColor: '#4F46E5',
  },
  {
    name: 'Tulsi Mala',
    category: 'Sacred items',
    price: '₹299',
    href: '/store',
    accentColor: '#D97706',
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
              style={{ color: '#D97706' }}
            >
              Shop
            </p>
            <FadeScaleReveal
              as="h2"
              className="text-xl sm:text-2xl font-semibold tracking-tight font-[family-name:var(--font-display)] text-surface-800"
            >
              Prasad, idols, books, sacred items.
            </FadeScaleReveal>
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
              className="group flex flex-col rounded-xl p-4 card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
              }}
            >
              <p
                className="text-[10px] sm:text-[11px] font-medium uppercase tracking-widest mb-2"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {p.category}
              </p>
              <p
                className="text-sm font-semibold leading-snug mb-3 flex-1 group-hover:underline"
                style={{
                  fontFamily: 'var(--font-display)',
                  color: 'var(--color-text)',
                }}
              >
                {p.name}
              </p>
              <div className="flex items-center justify-between">
                <p
                  className="text-sm font-semibold"
                  style={{ color: p.accentColor }}
                >
                  {p.price}
                </p>
                <ArrowRight
                  className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5"
                  style={{ color: p.accentColor }}
                />
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
