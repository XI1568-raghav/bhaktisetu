'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { buttonClass, type ButtonSize, type ButtonVariant } from './button-recipe';

/**
 * The one primary-CTA recipe.
 *
 * DU-03 (prod sweep 2026-08-12): apps/web/components/ui held only DateInput
 * and CityAutocomplete — there was no Button anywhere in the app — so the
 * primary call to action was hand-rolled on every screen. Measured across the
 * ten audited screens it shipped in 11 pixel heights, 11 paddings, 4 radii and
 * 5 type styles, and two different saffron weights were both in play as the
 * resting fill (DU-04).
 *
 * Every decision here is a token, not a magic number:
 *   size    → one fixed height each, md/lg clear the 44px tap floor (RESP-06+)
 *   radius  → rounded-lg only (--radius-lg), never per-call-site
 *   fill    → saffron-600, the weight that carries white text at 4.96:1
 *             (saffron-500 is 3.79:1 — see A11Y-10 / __tests__/cta-contrast)
 *   focus   → inherits the global :focus-visible ring from globals.css
 *
 * Adopting it is a one-line swap at a call site:
 *   <Button href={`/pujas/${slug}`}>Book Now</Button>
 */

export {
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  BUTTON_BASE,
  buttonClass,
} from './button-recipe';
export type { ButtonVariant, ButtonSize } from './button-recipe';

type Common = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children?: ReactNode;
  /** Renders a spinner, marks the control busy, and blocks interaction. */
  loading?: boolean;
  disabled?: boolean;
};

type AsButton = Common &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof Common> & { href?: undefined };

type AsLink = Common &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof Common> & { href: string };

export function Button(props: AsButton): React.ReactElement;
export function Button(props: AsLink): React.ReactElement;
export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  loading = false,
  disabled = false,
  href,
  ...rest
}: (AsButton | AsLink) & { href?: string }) {
  const blocked = disabled || loading;
  const cls = buttonClass(variant, size, className);

  const inner = (
    <>
      {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
      {children}
    </>
  );

  if (href !== undefined) {
    const anchorProps = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    // A disabled link must stop being a link: no href, out of the tab order.
    // Rendering <Link href=""> would still navigate to the current route.
    if (blocked) {
      return (
        <a {...anchorProps} className={cls} aria-disabled="true" tabIndex={-1} role="link">
          {inner}
        </a>
      );
    }
    return (
      <Link {...anchorProps} href={href} className={cls}>
        {inner}
      </Link>
    );
  }

  const buttonProps = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      type={buttonProps.type ?? 'button'}
      {...buttonProps}
      className={cls}
      disabled={blocked}
      aria-disabled={blocked ? 'true' : undefined}
      aria-busy={loading ? 'true' : undefined}
    >
      {inner}
    </button>
  );
}

export default Button;
