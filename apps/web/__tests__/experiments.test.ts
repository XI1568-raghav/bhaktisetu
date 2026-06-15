import { describe, expect, it } from 'vitest';

import { ACTIVE_EXPERIMENTS } from '../lib/experiments';

describe('ACTIVE_EXPERIMENTS (R-Q1-E-009 spec lock)', () => {
  it('exposes exactly the 3 PostHog flag keys the orchestrator KPI counts', () => {
    const keys = ACTIVE_EXPERIMENTS.map((e) => e.key).sort();
    expect(keys).toEqual(['cta_color_test', 'hero_copy_v2', 'nri_lane_above_fold']);
  });

  it('every experiment ships at least 2 variants (one is the control)', () => {
    for (const exp of ACTIVE_EXPERIMENTS) {
      expect(exp.variants.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('variant names are lowercase, alphanumeric or underscore — PostHog requirement', () => {
    const pattern = /^[a-z0-9_-]+$/;
    for (const exp of ACTIVE_EXPERIMENTS) {
      for (const v of exp.variants) {
        expect(v).toMatch(pattern);
      }
    }
  });

  it('hero_copy_v2 has control + benefit', () => {
    const exp = ACTIVE_EXPERIMENTS.find((e) => e.key === 'hero_copy_v2');
    expect(exp?.variants).toEqual(['control', 'benefit']);
  });

  it('cta_color_test has saffron + indigo', () => {
    const exp = ACTIVE_EXPERIMENTS.find((e) => e.key === 'cta_color_test');
    expect(exp?.variants).toEqual(['saffron', 'indigo']);
  });

  it('nri_lane_above_fold has below + above', () => {
    const exp = ACTIVE_EXPERIMENTS.find((e) => e.key === 'nri_lane_above_fold');
    expect(exp?.variants).toEqual(['below', 'above']);
  });
});
