/**
 * CM-05 (prod sweep 2026-08-12) — social proof must be REAL or ABSENT.
 *
 * This codebase's signature defect is fabricated content presented as real
 * (a homepage that claimed "500+ pujas completed", fictional astrologers, a
 * pandit profile that showed a stranger's verified identity on a 401). The
 * whole value of these tests is the NEGATIVE space: the component must be
 * structurally incapable of putting a number on screen that the database did
 * not produce.
 *
 * Live data at the time of writing (Postgres darshya_utf8, 2026-08-13):
 *   rudrabhishek       13 completed/delivered/video_uploaded bookings
 *   ganesh-puja         0
 *   satyanarayan-katha  0
 *   reviews table       0 rows
 *   service_ratings     0 rows
 * So two of the three pujas that HAVE bookings must render nothing at all,
 * and no star / rating / testimonial may appear anywhere.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PujaSocialProof from '../components/PujaSocialProof';
import {
  MIN_COMPLETIONS_TO_SHOW,
  getPujaCompletionCounts,
  completionsFromPayload,
} from '../lib/social-proof';

afterEach(() => {
  vi.unstubAllGlobals();
});

const TESTID = 'puja-social-proof';

describe('PujaSocialProof — cannot fabricate', () => {
  it('renders NOTHING when the query returned no rows (count 0)', () => {
    const { container } = render(<PujaSocialProof count={0} pujaName="Ganesh Puja" />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId(TESTID)).toBeNull();
  });

  it('renders NOTHING below the honesty threshold', () => {
    for (let n = 1; n < MIN_COMPLETIONS_TO_SHOW; n += 1) {
      const { container, unmount } = render(<PujaSocialProof count={n} pujaName="X" />);
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });

  it('renders NOTHING for missing / non-numeric / negative counts', () => {
    const bad = [undefined, null, NaN, Infinity, -5, '13', {}] as unknown[];
    for (const value of bad) {
      const { container, unmount } = render(
        <PujaSocialProof count={value as number} pujaName="X" />,
      );
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });

  it('renders the exact count it was given — never a rounded or padded number', () => {
    render(<PujaSocialProof count={13} pujaName="Rudrabhishek" />);
    const el = screen.getByTestId(TESTID);
    expect(el).toHaveTextContent('13');
    expect(el.textContent).not.toMatch(/\+|over|more than|500/i);
  });

  it('never renders stars, ratings, reviews or testimonials', () => {
    render(<PujaSocialProof count={13} pujaName="Rudrabhishek" />);
    const text = screen.getByTestId(TESTID).textContent ?? '';
    expect(text).not.toMatch(/★|⭐|☆/);
    expect(text).not.toMatch(/rating|review|testimonial|out of 5|\/5/i);
  });

  it('never renders a devotee name, a booking number or a proof-video URL', () => {
    render(<PujaSocialProof count={13} pujaName="Rudrabhishek" />);
    const html = screen.getByTestId(TESTID).innerHTML;
    expect(html).not.toMatch(/BS-\d{8}/);
    // No linked/embedded media of any kind (the lucide icon's SVG xmlns is not
    // a link, so match on the attributes that would actually load something).
    expect(html).not.toMatch(/\b(?:src|href|poster|data-video)\s*=/i);
    expect(html).not.toMatch(/<video|<iframe/i);
    expect(html).not.toMatch(/cdn\.|drive\.google|\.mp4/i);
  });
});

describe('completionsFromPayload — only trusts server integers', () => {
  it('maps the live /pujas/types/popular payload to slug → count', () => {
    // Verbatim shape of GET http://127.0.0.1:4000/api/v1/pujas/types/popular
    const live = { pujaTypes: [{ slug: 'rudrabhishek', bookingCount: 13, templeCount: 2 }] };
    expect(completionsFromPayload(live)).toEqual({ rudrabhishek: 13 });
  });

  it('drops non-integer, negative and non-finite counts instead of guessing', () => {
    const payload = {
      pujaTypes: [
        { slug: 'a', bookingCount: '13' },
        { slug: 'b', bookingCount: -1 },
        { slug: 'c', bookingCount: 2.5 },
        { slug: 'd', bookingCount: null },
        { slug: 'e' },
        { bookingCount: 9 },
        { slug: 'f', bookingCount: 4 },
      ],
    };
    expect(completionsFromPayload(payload)).toEqual({ f: 4 });
  });

  it('returns an empty map for garbage payloads', () => {
    for (const p of [null, undefined, {}, [], 'nope', { pujaTypes: 'nope' }]) {
      expect(completionsFromPayload(p)).toEqual({});
    }
  });
});

describe('getPujaCompletionCounts — fails closed', () => {
  it('returns {} when the API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')));
    await expect(getPujaCompletionCounts()).resolves.toEqual({});
  });

  it('returns {} on a non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
    );
    await expect(getPujaCompletionCounts()).resolves.toEqual({});
  });

  it('returns {} when the body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('unexpected token');
        },
      }),
    );
    await expect(getPujaCompletionCounts()).resolves.toEqual({});
  });

  it('passes through real counts from a healthy response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ pujaTypes: [{ slug: 'rudrabhishek', bookingCount: 13 }] }),
      }),
    );
    await expect(getPujaCompletionCounts()).resolves.toEqual({ rudrabhishek: 13 });
  });
});
