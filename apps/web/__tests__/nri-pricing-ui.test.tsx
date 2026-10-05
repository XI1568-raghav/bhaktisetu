/**
 * The USD view: remembered choice, timezone default, and that the dollar line
 * always carries the exact INR amount the order will be created for.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PujaPrice } from '../components/pricing/PujaPrice';
import { CurrencyToggle } from '../components/pricing/CurrencyToggle';
import { DISPLAY_CURRENCY_STORAGE_KEY, nriTotalInr, usdFromInr } from '../lib/nri-pricing';

function setTimeZone(tz: string) {
  vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(
    () => ({ resolvedOptions: () => ({ timeZone: tz }) }) as unknown as Intl.DateTimeFormat,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PujaPrice', () => {
  it('shows rupees for a browser in India', async () => {
    setTimeZone('Asia/Kolkata');
    const { container } = render(<PujaPrice domesticPuja={1100} part="main" />);
    await act(async () => {});
    expect(container.textContent).toBe('₹1,100');
  });

  it('defaults to dollars when the browser timezone is not India', async () => {
    setTimeZone('America/New_York');
    const { container } = render(<PujaPrice domesticPuja={1100} part="main" />);
    await act(async () => {});
    expect(container.textContent).toBe(`$${usdFromInr(2750)}`);
  });

  it('the USD note shows the exact INR amount that will be charged', async () => {
    setTimeZone('America/New_York');
    const { container } = render(<PujaPrice domesticPuja={1100} part="note" />);
    await act(async () => {});
    const charged = nriTotalInr(1100, false); // 2801
    expect(container.textContent).toContain(`$${usdFromInr(charged)}`);
    expect(container.textContent).toContain('charged as ₹2,801');
    expect(container.textContent).toContain('your bank converts at its own rate');
  });

  it('a remembered INR choice beats a non-India timezone', async () => {
    setTimeZone('America/New_York');
    window.localStorage.setItem(DISPLAY_CURRENCY_STORAGE_KEY, 'INR');
    const { container } = render(<PujaPrice domesticPuja={1100} part="main" />);
    await act(async () => {});
    expect(container.textContent).toBe('₹1,100');
  });

  it('keeps the existing INR fee line for rupee viewers', async () => {
    setTimeZone('Asia/Kolkata');
    const { container } = render(<PujaPrice domesticPuja={1100} part="note" />);
    await act(async () => {});
    expect(container.textContent).toBe('+ ₹51 platform fee · ₹1,151 total');
  });
});

describe('CurrencyToggle', () => {
  it('switches the displayed price and remembers the choice', async () => {
    setTimeZone('Asia/Kolkata');
    const { container } = render(
      <>
        <CurrencyToggle />
        <span data-testid="price">
          <PujaPrice domesticPuja={1100} part="main" />
        </span>
      </>,
    );
    await act(async () => {});
    expect(screen.getByTestId('price').textContent).toBe('₹1,100');

    fireEvent.click(container.querySelector('[data-currency-option="USD"]')!);
    expect(screen.getByTestId('price').textContent).toBe(`$${usdFromInr(2750)}`);
    expect(window.localStorage.getItem(DISPLAY_CURRENCY_STORAGE_KEY)).toBe('USD');

    fireEvent.click(container.querySelector('[data-currency-option="INR"]')!);
    expect(screen.getByTestId('price').textContent).toBe('₹1,100');
    expect(window.localStorage.getItem(DISPLAY_CURRENCY_STORAGE_KEY)).toBe('INR');
  });

  it('still works when localStorage throws', async () => {
    setTimeZone('Asia/Kolkata');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { container } = render(
      <>
        <CurrencyToggle />
        <span data-testid="price">
          <PujaPrice domesticPuja={1100} part="main" />
        </span>
      </>,
    );
    await act(async () => {});
    fireEvent.click(container.querySelector('[data-currency-option="USD"]')!);
    expect(screen.getByTestId('price').textContent).toBe(`$${usdFromInr(2750)}`);
  });
});

describe('booking wizard wiring', () => {
  const src = readFileSync(path.resolve(__dirname, '../app/pujas/book/page.tsx'), 'utf8');
  it('tells the server it is showing the NRI price', () => {
    expect(src).toMatch(/nriPricing:\s*isNriPricing/);
  });
  it('totals in USD mode come from nriTotalInr, the same INR the API charges', () => {
    expect(src).toMatch(/nriTotalInr\(basePrice, wantsPrasad\)/);
  });
  it('refuses to open Razorpay when the order amount is not the amount shown', () => {
    expect(src).toMatch(/Number\(data\.amount\) !== Math\.round\(totalPrice \* 100\)/);
  });
});
