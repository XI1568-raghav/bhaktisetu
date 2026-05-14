import Link from 'next/link';
import { Mountain, ArrowRight } from 'lucide-react';

type Destination = {
  name: string;
  region: string;
  fromPrice: string;
  href: string;
  accent: string;
};

const DESTINATIONS: Destination[] = [
  {
    name: 'Char Dham',
    region: 'Uttarakhand Himalayas',
    fromPrice: 'From ₹24,999',
    href: '/yatra/destinations',
    accent: 'var(--color-art-1)',
  },
  {
    name: 'Vaishno Devi',
    region: 'Katra, Jammu',
    fromPrice: 'From ₹8,499',
    href: '/yatra/destinations',
    accent: 'var(--color-art-2)',
  },
  {
    name: 'Tirupati',
    region: 'Andhra Pradesh',
    fromPrice: 'From ₹6,999',
    href: '/yatra/destinations',
    accent: 'var(--color-art-3)',
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
              className="group flex flex-col rounded-xl overflow-hidden card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div
                className="relative h-32 sm:h-36 flex items-start justify-end p-4"
                style={{ background: d.accent }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.7)' }}
                >
                  <Mountain
                    className="w-5 h-5"
                    style={{ color: 'var(--color-primary)' }}
                    aria-hidden="true"
                  />
                </div>
              </div>
              <div className="p-4">
                <h3
                  className="text-base font-semibold tracking-tight mb-0.5"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
                >
                  {d.name}
                </h3>
                <p
                  className="text-xs mb-3"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {d.region}
                </p>
                <div className="flex items-center justify-between">
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
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
