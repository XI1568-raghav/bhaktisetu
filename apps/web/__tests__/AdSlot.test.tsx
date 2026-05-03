import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const useIsPremiumMock = vi.fn();

vi.mock('../components/useIsPremium', () => ({
  useIsPremium: () => useIsPremiumMock(),
}));

import AdSlot from '../components/AdSlot';

describe('AdSlot', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    useIsPremiumMock.mockReset();
    useIsPremiumMock.mockReturnValue(false);
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT = 'ca-pub-test';
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_DARSHAN_BANNER = '1234567890';
    (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle = [];
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('renders nothing for premium users', () => {
    useIsPremiumMock.mockReturnValue(true);
    const { container } = render(
      <AdSlot slotId="DARSHAN_BANNER" format="horizontal" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when AdSense client env var is missing', () => {
    delete process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
    const { container } = render(
      <AdSlot slotId="DARSHAN_BANNER" format="horizontal" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when slot env var is missing', () => {
    delete process.env.NEXT_PUBLIC_ADSENSE_SLOT_DARSHAN_BANNER;
    const { container } = render(
      <AdSlot slotId="DARSHAN_BANNER" format="horizontal" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the ad container with correct a11y label', () => {
    render(<AdSlot slotId="DARSHAN_BANNER" format="horizontal" />);
    const region = screen.getByRole('complementary', { name: /advertisement/i });
    expect(region).toBeInTheDocument();
  });

  it('uses custom label when provided', () => {
    render(
      <AdSlot slotId="DARSHAN_BANNER" format="square" label="Sponsored" />,
    );
    expect(screen.getByText(/sponsored/i)).toBeInTheDocument();
  });

  it('quarantines ads inside subtrees marked data-ad-quarantine', () => {
    const { container } = render(
      <div data-ad-quarantine="true">
        <AdSlot slotId="DARSHAN_BANNER" format="horizontal" />
      </div>,
    );
    // After mount effect runs, the ad component should still mount initially,
    // but the ins element is replaced with null on next render — both observable
    // states are acceptable; assert no live ad <ins> with the AdSense class.
    const ins = container.querySelector('ins.adsbygoogle');
    // jsdom synchronously runs effects, so quarantined render returns null.
    expect(ins).toBeNull();
  });

  it('emits a slot data attribute matching slotId', () => {
    render(<AdSlot slotId="DARSHAN_BANNER" format="in-feed" />);
    const region = screen.getByRole('complementary');
    expect(region).toHaveAttribute('data-ad-slot', 'DARSHAN_BANNER');
  });
});
