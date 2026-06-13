import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Page from '../page';

const ORIGINAL_ENV = { ...process.env };

const validPspJson = {
  psp: {
    monitors: [
      {
        friendlyName: 'api-health',
        statusClass: 'up',
        uptime: '99.95',
        custom_uptime_ratio: '99.95',
      },
      {
        friendlyName: 'web-root',
        statusClass: 'up',
        uptime: '99.92',
      },
      {
        friendlyName: 'api-temples',
        statusClass: 'up',
        uptime: '99.88',
      },
      {
        friendlyName: 'web-panchang',
        statusClass: 'down',
        uptime: '98.50',
      },
    ],
  },
};

describe('/status page (SSR)', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_UPTIME_STATUS_URL =
      'https://stats.uptimerobot.com/api/getMonitorList/test';
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
  });

  it('renders all 4 monitor rows when fetch returns valid PSP JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => validPspJson,
      } as unknown as Response),
    );
    const ui = await Page();
    render(ui);
    expect(screen.getByText(/api-health/)).toBeInTheDocument();
    expect(screen.getByText(/web-root/)).toBeInTheDocument();
    expect(screen.getByText(/api-temples/)).toBeInTheDocument();
    expect(screen.getByText(/web-panchang/)).toBeInTheDocument();
  });

  it('shows uptime % from mocked JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => validPspJson,
      } as unknown as Response),
    );
    const ui = await Page();
    render(ui);
    expect(screen.getByText(/99\.95%/)).toBeInTheDocument();
  });

  it('handles fetch error gracefully with fallback', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValueOnce(new Error('boom')),
    );
    const ui = await Page();
    render(ui);
    expect(
      screen.getByText(/Status temporarily unavailable/i),
    ).toBeInTheDocument();
  });

  it('renders fallback and skips fetch when NEXT_PUBLIC_UPTIME_STATUS_URL unset', async () => {
    delete process.env.NEXT_PUBLIC_UPTIME_STATUS_URL;
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const ui = await Page();
    render(ui);
    expect(
      screen.getByText(/Status temporarily unavailable/i),
    ).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
