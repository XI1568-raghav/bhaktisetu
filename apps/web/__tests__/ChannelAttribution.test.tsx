import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';

import { ChannelAttribution } from '../components/ChannelAttribution';

type PHRegister = { register: ReturnType<typeof vi.fn>; capture: ReturnType<typeof vi.fn> };

function installPosthog(): PHRegister {
  const ph: PHRegister = {
    register: vi.fn(),
    capture: vi.fn(),
  };
  (window as unknown as { posthog: PHRegister }).posthog = ph;
  return ph;
}

function setHref(search: string): void {
  // happy-dom does honor history.replaceState; just rewrite the URL search.
  window.history.replaceState({}, '', `/test${search}`);
}

const STORAGE_KEY = 'darshya_attr';

describe('ChannelAttribution', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setHref('');
    delete (window as unknown as { posthog?: unknown }).posthog;
  });

  it('captures utm_source=reddit into signup_channel and stores attribution', () => {
    setHref('?utm_source=reddit&utm_campaign=q1-100signups');
    const ph = installPosthog();

    render(<ChannelAttribution />);

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
    expect(stored).toBeTruthy();
    expect(stored.signup_channel).toBe('reddit');
    expect(stored.utm_source).toBe('reddit');
    expect(stored.utm_campaign).toBe('q1-100signups');
    expect(stored.first_touch_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    expect(ph.register).toHaveBeenCalledTimes(1);
    expect(ph.capture).toHaveBeenCalledWith(
      'attribution_captured',
      expect.objectContaining({ signup_channel: 'reddit' }),
    );
  });

  it('derives signup_channel from ref-prefix tw_ when no utm_source', () => {
    setHref('?ref=tw_20260614');
    installPosthog();

    render(<ChannelAttribution />);

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
    expect(stored.signup_channel).toBe('twitter');
    expect(stored.ref).toBe('tw_20260614');
  });

  it('maps wa_ → whatsapp, tg_ → telegram, ig_ → instagram', () => {
    setHref('?ref=wa_familygroup');
    installPosthog();
    render(<ChannelAttribution />);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).signup_channel).toBe('whatsapp');

    window.localStorage.clear();
    setHref('?ref=tg_sanatan_main');
    render(<ChannelAttribution />);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).signup_channel).toBe('telegram');

    window.localStorage.clear();
    setHref('?ref=ig_postid123');
    render(<ChannelAttribution />);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).signup_channel).toBe('instagram');
  });

  it('preserves first-touch attribution and does not clobber stored', () => {
    // Existing stored attribution
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ signup_channel: 'reddit', utm_source: 'reddit', first_touch_at: '2026-06-01T00:00:00.000Z' }),
    );
    setHref('?utm_source=twitter');
    const ph = installPosthog();

    render(<ChannelAttribution />);

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(stored.signup_channel).toBe('reddit');
    expect(stored.first_touch_at).toBe('2026-06-01T00:00:00.000Z');
    // Should re-register the existing attribution, not the new URL params.
    expect(ph.register).toHaveBeenCalledWith(expect.objectContaining({ signup_channel: 'reddit' }));
    expect(ph.capture).not.toHaveBeenCalled();
  });

  it('no-ops when there are no attribution params and nothing stored', () => {
    setHref('?something=else');
    const ph = installPosthog();

    render(<ChannelAttribution />);

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(ph.register).not.toHaveBeenCalled();
    expect(ph.capture).not.toHaveBeenCalled();
  });

  it('handles missing posthog gracefully', () => {
    setHref('?utm_source=reddit');
    // no posthog installed

    expect(() => render(<ChannelAttribution />)).not.toThrow();

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(stored.signup_channel).toBe('reddit');
  });

  it('truncates oversized utm fields', () => {
    const longCampaign = 'a'.repeat(500);
    setHref(`?utm_source=reddit&utm_campaign=${longCampaign}`);
    installPosthog();

    render(<ChannelAttribution />);

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(stored.utm_campaign.length).toBe(128);
  });

  it('normalizes utm_source=x to twitter (alias)', () => {
    setHref('?utm_source=x');
    installPosthog();

    render(<ChannelAttribution />);

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(stored.signup_channel).toBe('twitter');
    expect(stored.utm_source).toBe('x');
  });
});
