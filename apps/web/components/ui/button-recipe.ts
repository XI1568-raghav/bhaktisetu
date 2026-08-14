/**
 * The one primary-CTA recipe, as plain data.
 *
 * DU-03 (prod sweep 2026-08-12) measured 11 pixel heights, 11 paddings, 4 radii
 * and 5 type styles for the primary CTA across ten screens. `<Button>` fixes
 * that for call sites that can render a client component — but most of the
 * sprawl lives in Server Components and in anchors that already carry
 * experiment/analytics attributes, and a `'use client'` module cannot hand a
 * callable function to a Server Component (the import resolves to a client
 * reference proxy and calling it throws).
 *
 * So the recipe lives here, in a module with no `'use client'` directive, and
 * `components/ui/Button.tsx` is a thin wrapper over it. A Server Component
 * adopts the single recipe with `className={buttonClass('primary', 'md')}`.
 *
 * Every decision is a token, not a magic number:
 *   size    → one fixed height each, md/lg clear the 44px tap floor (RESP-06+)
 *   radius  → rounded-lg only (--radius-lg), never per-call-site
 *   fill    → saffron-600, the weight that carries white text at 4.96:1
 *             (saffron-500 is 3.79:1 — see A11Y-10 / __tests__/cta-contrast)
 *   focus   → inherits the global :focus-visible ring from globals.css
 */

export const BUTTON_SIZES = {
  /** Compact — dense toolbars and table rows only. Below the 44px tap floor. */
  sm: 'h-9 px-3 text-sm gap-1.5',
  /** Default. 44px, the WCAG 2.5.5 target size. */
  md: 'h-11 px-5 text-base gap-2',
  /** Hero / page-level primary action. */
  lg: 'h-12 px-7 text-base gap-2',
} as const;

export const BUTTON_VARIANTS = {
  primary: 'bg-saffron-600 text-white hover:bg-saffron-700 active:bg-saffron-700',
  secondary:
    'bg-surface-100 text-surface-800 border border-surface-300 hover:bg-surface-200 active:bg-surface-200',
  ghost: 'bg-transparent text-surface-700 hover:bg-surface-100 active:bg-surface-200',
  danger: 'bg-vermillion-600 text-white hover:bg-maroon-700 active:bg-maroon-700',
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;
export type ButtonSize = keyof typeof BUTTON_SIZES;

/** Shared across every variant and size — the part that must never vary. */
export const BUTTON_BASE =
  'inline-flex items-center justify-center rounded-lg font-semibold whitespace-nowrap ' +
  'transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none ' +
  'aria-disabled:opacity-50 aria-disabled:pointer-events-none';

export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra = '',
): string {
  return [BUTTON_BASE, BUTTON_SIZES[size], BUTTON_VARIANTS[variant], extra]
    .filter(Boolean)
    .join(' ');
}
