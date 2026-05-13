import Link from 'next/link';
import { Mountain, ArrowRight } from 'lucide-react';

type Destination = {
  name: string;
  region: string;
  fromPrice: string;
  href: string;
  gradient: string;
};

const DESTINATIONS: Destination[] = [
  {
    name: 'Char Dham',
    region: 'Uttarakhand Himalayas',
    fromPrice: 'From ₹24,999',
    href: '/yatra/destinations',
    gradient:
      'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 50%, #93C5FD 100%)',
  },
  {
    name: 'Vaishno Devi',
    region: 'Katra, Jammu',
    fromPrice: 'From ₹8,499',
    href: '/yatra/destinations',
    gradient:
      'linear-gradient(135deg, #7C2D12 0%, #C2410C 50%, #FDBA74 100%)',
  },
  {
    name: 'Tirupati',
    region: 'Andhra Pradesh',
    fromPrice: 'From ₹6,999',
    href: '/yatra/destinations',
    gradient:
      'linear-gradient(135deg, #166534 0%, #15803D 50%, #BBF7D0 100%)',
  },
];

export default function YatraStrip() {
  return (
    <section className="py-10 md:py-12" aria-labelledby="yatra-strip-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-5">
          <p
            className="text-xs font-medium uppercase tracking-widest mb-1"
            style={{ color: 'var(--color-primary)' }}
          >
            Yatra
          </p>
          <h2
            id="yatra-strip-heading"
            className="text-xl sm:text-2xl font-semibold tracking-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            Pilgrimage with peace of mind.
          </h2>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {DESTINATIONS.map((d) => (
            <Link
              key={d.name}
              href={d.href}
              prefetch={false}
              className="group relative flex flex-col rounded-xl overflow-hidden card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ border: '1px solid var(--color-border)' }}
            >
              <div
                className="relative h-40 flex items-end p-4"
                style={{ background: d.gradient }}
                aria-hidden="true"
              >
                <Mountain className="absolute top-3 right-3 w-5 h-5 text-white/80" />
                <div>
                  <h3 className="text-white text-lg font-semibold tracking-tight">
                    {d.name}
                  </h3>
                  <p className="text-white/85 text-xs mt-0.5">{d.region}</p>
                </div>
              </div>
              <div
                className="p-3 flex items-center justify-between"
                style={{ background: 'var(--color-surface)' }}
              >
                <p
                  className="text-xs font-semibold"
                  style={{ color: 'var(--color-text)' }}
                >
                  {d.fromPrice}
                </p>
                <span
                  className="inline-flex items-center gap-1 text-xs font-medium link-underline"
                  style={{ color: 'var(--color-primary)' }}
                >
                  Explore{' '}
                  <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
