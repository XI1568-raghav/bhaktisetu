'use client';

import { useDisplayCurrency } from './useDisplayCurrency';

/**
 * Visible INR / USD choice. "USD" is the NRI price (2.5x, still billed in INR);
 * the choice is remembered in this browser only.
 */
export function CurrencyToggle({ className = '' }: { className?: string }) {
  const { currency, setCurrency } = useDisplayCurrency();
  const btn = (c: 'INR' | 'USD', label: string) => (
    <button
      type="button"
      onClick={() => setCurrency(c)}
      aria-pressed={currency === c}
      data-currency-option={c}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
        currency === c ? 'bg-saffron-600 text-white' : 'bg-surface-100 text-surface-700 hover:bg-surface-200'
      }`}
    >
      {label}
    </button>
  );
  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`}
      role="group"
      aria-label="Show prices in"
      data-testid="currency-toggle"
    >
      <span className="text-xs text-surface-500">Show prices in</span>
      {btn('INR', '₹ INR (in India)')}
      {btn('USD', '$ USD (I live outside India)')}
    </div>
  );
}
