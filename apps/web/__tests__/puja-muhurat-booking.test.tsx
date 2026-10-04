/**
 * Muhurat layer in the puja booking date picker.
 *
 * Uses a fake `fetch` (no network). The harness below is the exact wiring the
 * booking page uses: useMuhuratGuidance -> DateInput (markers / disabledDates /
 * disabledReasons) + MuhuratGuidance.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { useState } from 'react';

import { DateInput } from '../components/ui/DateInput';
import { MuhuratGuidance, useMuhuratGuidance } from '../components/booking/MuhuratGuidance';
import { fetchPujaMuhurat, pujaTypeForSlug } from '../lib/puja-muhurat';

const SHUBH = {
  date: '2026-10-21',
  grade: 'shubh',
  score: 82,
  windows: [
    { from: '06:30', to: '08:06', label: 'Morning' },
    { from: '11:36', to: '12:24', label: 'Abhijit Muhurat' },
  ],
  rahuKaal: '15:00 - 16:30',
  flags: [],
  reasons: [],
  warnings: [],
};
const AVOID = {
  date: '2026-10-22',
  grade: 'avoid',
  score: 20,
  windows: [],
  rahuKaal: '13:30 - 15:00',
  flags: [],
  reasons: [],
  warnings: ['Amavasya — Griha Pravesh is not performed.'],
};

function okResponse(results: unknown[]) {
  return { ok: true, status: 200, json: async () => ({ results }) } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function Harness({ slug, initial = '2026-10-21' }: { slug: string; initial?: string }) {
  const g = useMuhuratGuidance(slug);
  const [date, setDate] = useState(initial);
  return (
    <div>
      <DateInput
        value={date}
        onChange={setDate}
        min="2026-10-01"
        max="2026-11-30"
        dateMarkers={g.markers}
        disabledDates={g.avoidDates}
        disabledReasons={g.avoidReasons}
        ariaLabel="Puja date"
      />
      <MuhuratGuidance days={g.days} selectedDate={date} />
    </div>
  );
}

function openCalendar() {
  fireEvent.click(screen.getByRole('button', { name: 'Open date picker' }));
}

describe('lib/puja-muhurat', () => {
  it('maps supported slugs only', () => {
    expect(pujaTypeForSlug('griha-pravesh')).toBe('GRIHA_PRAVESH');
    expect(pujaTypeForSlug('satyanarayan-katha')).toBe('SATYANARAYAN');
    expect(pujaTypeForSlug('rudrabhishek')).toBeNull();
    expect(pujaTypeForSlug('constructor')).toBeNull();
  });

  it('resolves to [] when the API answers non-2xx', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    await expect(fetchPujaMuhurat('GRIHA_PRAVESH')).resolves.toEqual([]);
  });

  it('resolves to [] on a malformed body', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ nope: 1 }) });
    await expect(fetchPujaMuhurat('GRIHA_PRAVESH')).resolves.toEqual([]);
  });

  it('resolves to [] when the request times out', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_u: unknown, init: RequestInit) =>
        new Promise((_res, rej) => {
          init.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')));
        }),
    );
    const p = fetchPujaMuhurat('SATYANARAYAN');
    await vi.advanceTimersByTimeAsync(16_000);
    await expect(p).resolves.toEqual([]);
  });
});

describe('booking date picker muhurat layer', () => {
  it('requests the endpoint for a supported puja type', async () => {
    fetchMock.mockResolvedValue(okResponse([SHUBH]));
    render(<Harness slug="griha-pravesh" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const url = String(fetchMock.mock.calls[0]![0]);
    expect(url).toContain('/panchang/puja-muhurat?pujaType=GRIHA_PRAVESH&days=30');
  });

  it('badges a shubh day in the calendar', async () => {
    fetchMock.mockResolvedValue(okResponse([SHUBH]));
    render(<Harness slug="griha-pravesh" initial="2026-10-25" />);
    await screen.findByText(/Green dates are shubh/);
    openCalendar();
    const day = screen.getByRole('button', { name: '21, shubh muhurat' });
    expect(day).toHaveProperty('disabled', false);
    expect(day.className).toContain('bg-green-50');
  });

  it('disables an avoid day and exposes the reason accessibly', async () => {
    fetchMock.mockResolvedValue(okResponse([SHUBH, AVOID]));
    render(<Harness slug="griha-pravesh" />);
    await screen.findByTestId('muhurat-guidance');
    openCalendar();
    const day = screen.getByRole('button', { name: /^22, unavailable\./ });
    expect(day).toHaveProperty('disabled', true);
    expect(day.getAttribute('aria-label')).toContain('Amavasya');
    expect(day.getAttribute('title')).toContain('Amavasya');
  });

  it('renders the day windows as chips', async () => {
    fetchMock.mockResolvedValue(okResponse([SHUBH]));
    render(<Harness slug="griha-pravesh" />);
    const panel = await screen.findByTestId('muhurat-guidance');
    expect(panel.textContent).toContain('06:30–08:06');
    expect(panel.textContent).toContain('11:36–12:24');
    expect(panel.textContent).toContain('Abhijit Muhurat');
    expect(panel.textContent).toContain('Shubh');
  });

  it('marks Rahu Kaal as greyed and to be avoided', async () => {
    fetchMock.mockResolvedValue(okResponse([SHUBH]));
    render(<Harness slug="griha-pravesh" />);
    const rahu = await screen.findByTestId('muhurat-rahukaal');
    expect(rahu.textContent).toContain('15:00–16:30');
    expect(rahu.textContent).toContain('Rahu Kaal, avoid');
    expect(rahu.className).toContain('text-surface-500');
  });

  it('falls back to the plain picker when the API fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<Harness slug="griha-pravesh" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await act(async () => {});
    expect(screen.queryByTestId('muhurat-guidance')).toBeNull();
    expect(screen.queryByText(/Green dates/)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    openCalendar();
    // every in-range day is still selectable, none carries muhurat naming
    const day22 = screen.getByRole('button', { name: '22' });
    expect(day22).toHaveProperty('disabled', false);
  });

  it('does not call the API for an unsupported puja type', async () => {
    render(<Harness slug="rudrabhishek" />);
    await act(async () => {});
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('muhurat-guidance')).toBeNull();
  });
});
