import Link from 'next/link';
import { Mountain, ArrowRight } from 'lucide-react';
import { getTempleHero, remoteSrcSet, IMG_W } from '../../lib/images';

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
    image: getTempleHero('kedarnath', IMG_W.CARD),
  },
  {
    name: 'Vaishno Devi',
    region: 'Katra, Jammu',
    fromPrice: 'From ₹8,499',
    href: '/yatra/destinations',
    image: getTempleHero('vaishno-devi', IMG_W.CARD),
  },
  {
    name: 'Tirupati',
    region: 'Andhra Pradesh',
    fromPrice: 'From ₹6,999',
    href: '/yatra/destinations',
    image: getTempleHero('tirupati', IMG_W.CARD),
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
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight font-[family-name:var(--font-display)] text-surface-800">
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
              <div className="relative h-40 sm:h-44 overflow-hidden">
                {/*
                 * HOME-01 (2026-08-20): `sizes` without `srcSet` is ignored, so
                 * the declared slot never chose anything and the old value was
                 * wrong twice over — below 768px this grid is ONE column, not
                 * the 80vw it claimed.
                 *
                 * CREDITED ZERO BYTES, deliberately. The real slot is
                 * (1088 - 32)/3 = 352 CSS px on desktop and 100vw - 2rem on a
                 * phone, and the Commons ladder steps 330 -> 500 with nothing
                 * between, so every device still resolves to the same 500px
                 * candidate it downloaded before (kedarnath 99,511 B,
                 * vaishno-devi 59,112 B, tirupati 67,065 B). This is a
                 * correctness fix so the attribute stops lying; the saving is 0
                 * and the ranked list says so.
                 */}
                <img
                  src={d.image}
                  srcSet={remoteSrcSet(d.image, [250, 330, IMG_W.CARD])}
                  sizes="(max-width: 767px) calc(100vw - 2rem), 352px"
                  width={500}
                  height={352}
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
