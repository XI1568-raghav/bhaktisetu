import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

/**
 * AW-02 (prod sweep 2026-08-12, P0) — remaining half.
 *
 * The grid was de-fixtured: apps/web/app/astrology/AstrologyClient.tsx:148 now
 * reads GET /astrology/astrologers/live, and POST /consultation/book refuses a
 * non-UUID astrologer id with 409 before any money moves
 * (apps/api/src/routes/consultation.ts:257-269). That closed the money half.
 *
 * The PROFILE page did not change. /astrology/[id] permanently redirects to
 * /astrology/view?id=… (app/astrology/[id]/page.tsx:15), and that page shipped:
 *
 *   • `allAstrologers` — three invented astrologers with invented consultation
 *     counts and five invented named reviews each ("Priya M.", "Rahul K."…);
 *   • `allAstrologers[id] || allAstrologers['astro_001']` — so ANY unknown id,
 *     including a real UUID the API has not heard of, rendered "Pt. Raghunath
 *     Sharma, 4.9, 12,450 reviews" as though it were that astrologer;
 *   • a hardcoded 72/20/5/2/1 rating breakdown presented as this person's
 *     distribution;
 *   • a `similarAstrologers` rail of three more invented people linking to
 *     /astrology/astro_007|006|011, each of which lands back here and offers a
 *     "Book Paid Consultation" button.
 *
 * A refusal at the payment step is not enough: the page still presents invented
 * people, invented testimonials and a booking CTA. Nothing here may be invented.
 */

const searchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
}));

vi.mock('../lib/api-config', () => ({ API_BASE_URL: 'http://api.test/api/v1' }));

import AstrologerProfilePage from '../app/astrology/view/page';

const REAL_UUID = '71e54617-4a5f-4d0e-9f2f-2b1c9a0d5e33';

/** Exactly what GET /astrology/astrologers/:id returns for a real profile. */
const REAL_PROFILE = {
  id: REAL_UUID,
  userId: '3f2b1c9a-0d5e-4a5f-9f2f-71e546174a5f',
  name: 'Acharya Vinod Sharma',
  specializations: ['Vedic Astrology'],
  languages: ['Hindi', 'English'],
  experienceYears: 12,
  rating: 0,
  consultationCount: 0,
  perMinuteRate: 25,
  isOnline: false,
  bio: 'Vedic astrologer.',
  verified: true,
  source: 'live',
};

function setParam(id: string) {
  searchParams.forEach((_v, k) => searchParams.delete(k));
  if (id) searchParams.set('id', id);
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AW-02 — the astrologer profile page invents nobody', () => {
  it('renders the real astrologer the API returned', async () => {
    setParam(REAL_UUID);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ astrologer: REAL_PROFILE }) })),
    );

    render(<AstrologerProfilePage />);

    expect(await screen.findByText('Acharya Vinod Sharma')).toBeTruthy();
  });

  it('does NOT fall back to an invented astrologer when the API has never heard of the id', async () => {
    setParam('astro_011');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 404, json: async () => ({ error: 'Astrologer not found.' }) })),
    );

    render(<AstrologerProfilePage />);

    await waitFor(() => {
      expect(document.body.textContent).not.toMatch(/Pt\. Raghunath Sharma/);
    });
    expect(document.body.textContent).not.toMatch(/Acharya Bhaskar Rao/);
    expect(document.body.textContent).not.toMatch(/Tarot Priya Singh/);
    // And it must not offer to sell a consultation with a person it cannot name.
    expect(screen.queryByText(/Book Paid Consultation/i)).toBeNull();
  });

  it('says the profile is unavailable and points at the real directory', async () => {
    setParam('astro_001');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 404, json: async () => ({ error: 'Astrologer not found.' }) })),
    );

    render(<AstrologerProfilePage />);

    await screen.findByText(/not available/i);
    const links = Array.from(document.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(links).toContain('/astrology/astrologers/live');
  });

  it('publishes no invented testimonials and no invented rating distribution', async () => {
    setParam(REAL_UUID);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ astrologer: REAL_PROFILE }) })),
    );

    render(<AstrologerProfilePage />);
    await screen.findByText('Acharya Vinod Sharma');

    // The five named review authors that shipped for every astrologer.
    for (const name of ['Priya M.', 'Rahul K.', 'Sneha T.', 'Amit S.', 'Kavya R.']) {
      expect(document.body.textContent).not.toContain(name);
    }
    // The hardcoded 72/20/5/2/1 distribution.
    expect(document.body.textContent).not.toMatch(/72%/);
  });

  it('never links to a fixture astrologer id', async () => {
    setParam(REAL_UUID);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ astrologer: REAL_PROFILE }) })),
    );

    render(<AstrologerProfilePage />);
    await screen.findByText('Acharya Vinod Sharma');

    const links = Array.from(document.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');
    expect(links.some((h) => /astro_\d+/.test(h))).toBe(false);
  });

  it('shows a real 0-rating honestly instead of dressing it as 4.9', async () => {
    setParam(REAL_UUID);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ astrologer: REAL_PROFILE }) })),
    );

    render(<AstrologerProfilePage />);
    await screen.findByText('Acharya Vinod Sharma');

    // The fixture values that used to leak through the spread.
    expect(document.body.textContent).not.toContain('12,450');
    expect(document.body.textContent).not.toContain('34,200');
  });
});

/**
 * AW-02 — no stock portraits.
 *
 * The sibling fix in app/astrology/AstrologyClient.tsx dropped `photo` from the
 * live contract for a stated reason: "the old fixture's stock portraits
 * published strangers' faces as named astrologers' likenesses." A real
 * AstrologerProfile has no photo column, so a fallback here would attach a
 * stranger's face to a real, named person on their own profile page — the same
 * defect, reintroduced through the detail route.
 */
describe('AW-02 — a real astrologer with no photo gets an initial, not a stranger', () => {
  it('renders no <img> when the API sent no photo', async () => {
    setParam(REAL_UUID);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ astrologer: REAL_PROFILE }) })),
    );

    render(<AstrologerProfilePage />);
    await screen.findByText('Acharya Vinod Sharma');

    const portraits = Array.from(document.querySelectorAll('img')).filter(
      (i) => (i.getAttribute('alt') ?? '').includes('Acharya Vinod Sharma'),
    );
    expect(portraits).toHaveLength(0);
    // The initial stands in for the face.
    expect(document.body.textContent).toContain('A');
  });

  it('renders the photo when the API actually supplied one', async () => {
    setParam(REAL_UUID);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          astrologer: { ...REAL_PROFILE, photo: 'https://cdn.example/real-vinod.jpg' },
        }),
      })),
    );

    render(<AstrologerProfilePage />);
    await screen.findByText('Acharya Vinod Sharma');

    const img = document.querySelector('img[alt="Acharya Vinod Sharma"]');
    expect(img?.getAttribute('src')).toBe('https://cdn.example/real-vinod.jpg');
  });
});
