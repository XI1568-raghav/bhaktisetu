'use client';

import Link from 'next/link';
import { ArrowRight, X } from 'lucide-react';
import { OnboardingGate, type PrimaryIntent } from './_useOnboardingSafe';

import { buttonClass } from '../../components/ui/button-recipe';
type IntentMeta = {
  label: string;
  href: string;
};

const INTENT_MAP: Record<Exclude<PrimaryIntent, null | undefined | 'explore'>, IntentMeta> = {
  darshan: { label: 'Live Darshan', href: '/darshan' },
  puja: { label: 'Book a Puja', href: '/pujas' },
  wisdom: { label: 'Read & Learn', href: '/content' },
  consult: { label: 'Ask a Pandit', href: '/ask-pandit' },
};

function Card({
  meta,
  onDismiss,
}: {
  meta: IntentMeta;
  onDismiss?: () => void;
}) {
  return (
    <section
      className="py-4"
      aria-label={`Continue your journey to ${meta.label}`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="relative w-full rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4"
          style={{
            background:
              'linear-gradient(90deg, var(--color-primary-highlight) 0%, var(--color-art-2) 100%)',
            border: '1px solid var(--color-primary)',
          }}
        >
          <div className="flex-1 min-w-0 pr-8 sm:pr-0">
            <p
              className="text-xs font-medium uppercase tracking-widest mb-1"
              style={{ color: 'var(--color-primary)' }}
            >
              Continue your journey
            </p>
            <h2
              className="text-base sm:text-lg font-semibold tracking-tight"
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--color-text)',
              }}
            >
              Continue your journey to {meta.label}
            </h2>
          </div>
          <Link
            href={meta.href}
            prefetch={false}
            className={buttonClass('primary', 'md', 'btn-press shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2')}
          >
            {meta.label}
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss"
              className="absolute top-2 right-2 sm:static sm:ml-1 inline-flex items-center justify-center w-7 h-7 rounded-full hover:bg-white/40 transition-colors focus-visible:outline-none focus-visible:ring-2"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

// Returning-user pinned card. Renders nothing when:
//   - the onboarding hook is unavailable (parallel PR not merged), or
//   - no primaryIntent is recorded, or
//   - intent === 'explore' (no guided destination).
// The dismiss button clears the stored intent only — language and NRI flags
// remain untouched (the real hook owns those fields).
export default function ContinueJourneyCard() {
  return (
    <OnboardingGate fallback={null}>
      {(api) => {
        const intent = api.data?.primaryIntent;
        if (!intent || intent === 'explore') return null;
        const meta = INTENT_MAP[intent as Exclude<typeof intent, null | undefined | 'explore'>];
        if (!meta) return null;

        const dismiss = api.clearIntent
          ? api.clearIntent
          : api.setPrimaryIntent
            ? () => api.setPrimaryIntent?.(null)
            : undefined;

        return <Card meta={meta} onDismiss={dismiss} />;
      }}
    </OnboardingGate>
  );
}
