import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JYOTIRLINGAS } from '../lib/jyotirlingas';
import { TIRTHAS } from '../lib/tirthas';
import JyotirlingaIndexPage from '../app/jyotirlinga/page';

// CI-12 — /jyotirlinga told the reader "Each Jyotirlinga is a swayambhu
// (self-manifest) form" and headed the page "12 self-manifest abodes of
// Shiva", directly above a grid that badges only nine of them Swayambhu.
// Somnath, Kashi Vishwanath and Rameshwar carry `swayambhu: false`.
// Meanwhile /tirth/mahakaleshwar-ujjain claimed Mahakaleshwar is "the only
// Swayambhu ... Jyotirlinga", which contradicts the same nine badges.

const SWAYAMBHU_COUNT = JYOTIRLINGAS.filter((j) => j.swayambhu).length;

describe('CI-12 — the swayambhu claim matches the swayambhu data', () => {
  it('the data really is split, not unanimous', () => {
    expect(SWAYAMBHU_COUNT).toBeGreaterThan(0);
    expect(SWAYAMBHU_COUNT).toBeLessThan(JYOTIRLINGAS.length);
  });

  it('the index never claims every Jyotirlinga is swayambhu', () => {
    render(<JyotirlingaIndexPage />);
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/Each Jyotirlinga is a swayambhu/i);
    expect(text).not.toMatch(/12 self-manifest abodes/i);
    // The cross-link used to advertise /tirth as "12 Sacred Tirthas"; that page
    // publishes seventy-odd.
    expect(text).not.toMatch(/12 Sacred Tirthas/i);
  });

  it('the index states the number the badges actually show', () => {
    render(<JyotirlingaIndexPage />);
    const text = document.body.textContent ?? '';
    expect(text).toContain(`${SWAYAMBHU_COUNT} of the 12`);
    // The three that are not swayambhu are named rather than glossed over.
    const notSwayambhu = JYOTIRLINGAS.filter((j) => !j.swayambhu).map((j) => j.name);
    expect(notSwayambhu.length).toBeGreaterThan(0);
  });

  it('the swayambhu badge count on screen equals the data', () => {
    render(<JyotirlingaIndexPage />);
    expect(screen.getAllByText('Swayambhu')).toHaveLength(SWAYAMBHU_COUNT);
  });

  it('/tirth no longer says Mahakaleshwar is the ONLY swayambhu Jyotirlinga', () => {
    const mahakal = TIRTHAS.find((t) => t.slug === 'mahakaleshwar-ujjain');
    expect(mahakal).toBeDefined();
    expect(mahakal!.significance).not.toMatch(/only\s+Swayambhu/i);
    // The claim the data DOES support — one dakshinmukhi Jyotirlinga — stays.
    expect(JYOTIRLINGAS.filter((j) => j.dakshinmukhi)).toHaveLength(1);
    expect(mahakal!.significance).toMatch(/only south-facing/i);
  });

  it('no tirtha calls a Jyotirlinga swayambhu that the Jyotirlinga data denies', () => {
    const denied = JYOTIRLINGAS.filter((j) => !j.swayambhu).map((j) => j.slug);
    const byJyotirlinga: Record<string, string[]> = {
      // Both the surviving record and the retired duplicate that now redirects
      // onto it — dead prose that still contradicts the data is still wrong.
      somnath: ['somnath', 'somnath-jyotirlinga'],
      'kashi-vishwanath': ['kashi-vishwanath'],
      rameshwar: ['rameswaram', 'rameswaram-jyotirlinga'],
    };
    for (const jslug of denied) {
      for (const tslug of byJyotirlinga[jslug] ?? []) {
        const t = TIRTHAS.find((x) => x.slug === tslug);
        if (!t) continue;
        const prose = `${t.presiding} ${t.significance} ${t.established}`;
        expect(prose, `${tslug} calls a non-swayambhu Jyotirlinga swayambhu`).not.toMatch(
          /swayambhu/i,
        );
      }
    }
  });
});
