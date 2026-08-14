'use client';

import type { LucideIcon } from 'lucide-react';
import { CheckCircle } from 'lucide-react';

export interface WizardStep {
  id: number;
  label: string;
  icon: LucideIcon;
}

/**
 * Shared booking-wizard step indicator.
 *
 * A11Y-08: the wizards rendered the steps as bare <div>s with no ordered-list
 * semantics, no aria-current and no live region, so a screen-reader user who
 * pressed Continue got no announcement that anything had changed and no idea
 * how many steps remained. This component is the accessible replacement:
 *
 *   - <nav> + <ol>/<li>, so the sequence is exposed as a sequence;
 *   - aria-current="step" on exactly the active item;
 *   - a polite live region that re-announces "Step N of M, <label>" whenever
 *     `current` changes (it is always mounted — a region inserted at the same
 *     time as its text is not reliably announced);
 *   - decorative icons hidden from AT (the label next to them is the name).
 *
 * A11Y-10: the active pill was painted saffron-500 (3.79:1 with white) and the
 * completed pill bg-tulsi-green (3.30:1). Both now use the passing weight.
 */
export function WizardSteps({
  steps,
  current,
  label = 'Booking progress',
}: {
  steps: readonly WizardStep[];
  current: number;
  label?: string;
}) {
  const activeIndex = steps.findIndex((s) => s.id === current);
  const activeStep = activeIndex >= 0 ? steps[activeIndex] : undefined;

  return (
    <nav aria-label={label}>
      <ol className="flex items-center gap-2 md:gap-3 overflow-x-auto">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const active = s.id === current;
          const done = s.id < current;
          return (
            <li
              key={s.id}
              aria-current={active ? 'step' : undefined}
              className="flex items-center gap-2 md:gap-3 flex-shrink-0"
            >
              <span
                className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm transition-colors ${
                  active
                    ? 'bg-saffron-600 text-white'
                    : done
                      ? 'bg-tulsi-green-dark text-white'
                      : 'bg-surface-100 text-surface-500'
                }`}
              >
                {done ? (
                  <CheckCircle className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Icon className="w-4 h-4" aria-hidden="true" />
                )}
                <span className="sr-only">{done ? 'Completed:' : `Step ${i + 1}:`}</span>
              </span>
              <span
                className={`text-xs md:text-sm font-medium whitespace-nowrap ${
                  active ? 'text-surface-800' : 'text-surface-600'
                }`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`w-4 md:w-8 h-px ${done ? 'bg-tulsi-green-dark' : 'bg-surface-200'}`}
                />
              )}
            </li>
          );
        })}
      </ol>
      <p className="sr-only" role="status" aria-live="polite">
        {activeStep
          ? `Step ${activeIndex + 1} of ${steps.length}, ${activeStep.label}`
          : `Step 1 of ${steps.length}`}
      </p>
    </nav>
  );
}

export default WizardSteps;
