import { Shield, Users, BadgeCheck, FileCheck, Video } from 'lucide-react';

type TrustItem = {
  Icon: typeof Shield;
  text: string;
};

const ITEMS: TrustItem[] = [
  { Icon: Shield, text: '200+ verified temples' },
  { Icon: Users, text: '500+ vetted pandits' },
  { Icon: BadgeCheck, text: '₹0 hidden fees' },
  { Icon: FileCheck, text: '80G receipt available' },
  { Icon: Video, text: 'Live video proof' },
];

export default function TrustStrip() {
  return (
    <section
      aria-label="Trust and verification signals"
      className="w-full"
      style={{ background: 'var(--color-surface-offset)', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] sm:text-xs font-medium">
          {ITEMS.map((item, i) => (
            <li key={item.text} className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <item.Icon className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
                <span style={{ color: 'var(--color-text)' }}>{item.text}</span>
              </span>
              {i < ITEMS.length - 1 && (
                <span className="hidden sm:inline w-1 h-1 rounded-full" style={{ background: 'var(--color-text-faint)' }} aria-hidden="true" />
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
