import { describe, it, expect, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { GaushalaService } from './gaushala.service.js';
import { wellnessRoutes } from '../routes/wellness.js';
import { HAS_ADOPTION_EXTRAS, HAS_WELLNESS_PROGRAM_PACKAGES } from '../lib/launch-gates.js';

/**
 * Claim gate (2026-10-05). The gaushala plans and wellness programmes the API
 * serves listed per-donor / per-student deliverables that no code delivers:
 * donor wall, seva certificate, photo/video updates, health reports, visits,
 * plaque, Gau Puja invitation; certificates, workbooks, recordings and
 * libraries. While the gates in lib/launch-gates.ts are false the API states
 * only what is true (cow care at an approved gaushala + a numbered receipt) and
 * publishes the rest as `comingSoon`, never as `features`.
 */

const EXTRAS =
  /donor wall|certificate|photo|video|visit|plaque|Gau Puja|health report|WhatsApp|Festival special|cow adoption|of one cow/i;

describe('gaushala plans', () => {
  const plans = new GaushalaService().getAdoptionPlans();

  it('the gates are closed today', () => {
    expect(HAS_ADOPTION_EXTRAS).toBe(false);
    expect(HAS_WELLNESS_PROGRAM_PACKAGES).toBe(false);
  });

  it('features list only cow care and the receipt', () => {
    expect(plans).toHaveLength(4);
    for (const p of plans) {
      expect(p.features).toHaveLength(2);
      expect(p.features[0]).toMatch(/Goes towards .* cow care at an approved gaushala|feed and care of cows/);
      expect(p.features[1]).toMatch(/receipt/i);
      for (const f of p.features) {
        // the receipt line may say "not a tax-exemption certificate"; nothing else may name a deliverable
        expect(f.replace(/not a tax-exemption certificate/i, '')).not.toMatch(EXTRAS);
      }
    }
  });

  it('never advertises 80G while no 80G registration exists', () => {
    for (const p of plans) {
      expect(p.features.join(' ')).not.toMatch(/80G tax receipt/);
      expect(p.features.join(' ')).toMatch(/not a tax-exemption certificate/);
    }
  });

  it('keeps the extras as comingSoon so a flip is one line', () => {
    for (const p of plans) {
      expect(p.comingSoon.length).toBeGreaterThan(0);
    }
    const all = plans.flatMap((p) => p.comingSoon).join(' | ');
    expect(all).toMatch(/donor wall/);
    expect(all).toMatch(/certificate/);
    expect(all).toMatch(/photo/);
  });
});

describe('wellness programmes', () => {
  it('serve no certificate / workbook / recording features while gated', async () => {
    const app = Fastify();
    await app.register(wellnessRoutes, { prefix: '/wellness' });
    const list = await app.inject({ method: 'GET', url: '/wellness/programs' });
    expect(list.statusCode).toBe(200);
    const body = list.json() as { programs: Array<{ id: string; features: string[]; comingSoon: boolean }> };
    expect(body.programs.length).toBeGreaterThan(0);
    for (const p of body.programs) {
      expect(p.features).toEqual([]);
      expect(p.comingSoon).toBe(true);
    }
    const one = await app.inject({ method: 'GET', url: `/wellness/programs/${body.programs[0]!.id}` });
    expect((one.json() as { program: { features: string[] } }).program.features).toEqual([]);
    expect(JSON.stringify(body)).not.toMatch(/Certificate/);
    await app.close();
  });
});
