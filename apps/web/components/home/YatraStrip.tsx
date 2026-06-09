import Link from 'next/link';
import { Mountain, ArrowRight } from 'lucide-react';
import { getTempleHero } from '../../lib/images';
import TextReveal from '../motion/TextReveal';
import ScrambleReveal from '../motion/ScrambleReveal';

type Destination = {
  name: string;
  region: string;
  fromPrice: string;
  href: string;
  image: string;
};

const DESTINATIONS: Destination[] = [
  {
    name: 'Char Dham',
    region: 'Uttarakhand Himalayas',
    fromPrice: 'From ₹24,999',
    href: '/yatra/destinations',
    image: getTempleHero('kedarnath'),
  },
  {
    name: 'Vaishno Devi',
    region: 'Katra, Jammu',
    fromPrice: 'From ₹8,499',
    href: '/yatra/destinations',
    image: getTempleHero('vaishno-devi'),
  },
  {
    name: 'Tirupati',
    region: 'Andhra Pradesh',
    fromPrice: 'From ₹6,999',
    href: '/yatra/destinations',
    image: getTempleHero('tirupati'),
  },
];

export default function YatraStrip() {
  return (
    <section className="py-6 md:py-8" aria-labelledby="yatra-strip-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-5">
          <p
            className="text-xs font-medium uppercase tracking-widest mb-1"
            style={{ color: '#059669' }}
          >
            Yatra
          </p>
          <ScrambleReveal
            as="h2"
            className="text-xl sm:text-2xl font-semibold tracking-tight font-[family-name:var(--font-display)] text-surface-800"
          >
            Pilgrimage with peace of mind.
          </ScrambleReveal>
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
              <div className="relative h-40 sm:h-44 overflow-hidden">
                <img
                  src={d.image}
                  alt={d.name}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/40 via-transparent to-transparent" />
                <div className="absolute top-3 right-3 w-9 h-9 rounded-lg flex items-center justify-center backdrop-blur-sm" style={{ background: 'rgba(255,255,255,0.85)' }}>
                  <Mountain className="w-5 h-5" style={{ color: '#059669' }} aria-hidden="true" />
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
                    style={{ color: '#065F46' }}
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
