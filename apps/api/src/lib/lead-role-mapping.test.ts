import { describe, it, expect } from 'vitest';
import {
  mapLeadRoleToOnboarding,
  isLeadRole,
  LEAD_ROLE_VALUES,
} from './lead-role-mapping.js';

// P0 #PBO-8 (2026-07-09): the lead-role -> onboarding-role mapping is the
// single source of truth bridging the two enums. These tests lock it so a
// silent fall-through (PRIEST -> invalid RoleType) can't regress.

describe('mapLeadRoleToOnboarding', () => {
  it('maps every lead role to a valid onboarding RoleType', () => {
    expect(mapLeadRoleToOnboarding('TEMPLE')).toBe('TEMPLE_MANAGER');
    expect(mapLeadRoleToOnboarding('PRIEST')).toBe('PANDIT');
    expect(mapLeadRoleToOnboarding('GAUSHALA')).toBe('GAUSHALA_MANAGER');
    expect(mapLeadRoleToOnboarding('ASTROLOGER')).toBe('ASTROLOGER');
    expect(mapLeadRoleToOnboarding('WELLNESS_INSTRUCTOR')).toBe('WELLNESS_INSTRUCTOR');
  });

  it('covers every LEAD_ROLE_VALUES entry (no lead role unmapped)', () => {
    for (const r of LEAD_ROLE_VALUES) {
      expect(() => mapLeadRoleToOnboarding(r)).not.toThrow();
    }
  });

  it('never returns the raw lead enum for the three renamed roles', () => {
    // The bug: PRIEST/TEMPLE/GAUSHALA are NOT valid OnboardingRoleTypes.
    expect(mapLeadRoleToOnboarding('PRIEST')).not.toBe('PRIEST');
    expect(mapLeadRoleToOnboarding('TEMPLE')).not.toBe('TEMPLE');
    expect(mapLeadRoleToOnboarding('GAUSHALA')).not.toBe('GAUSHALA');
  });
});

describe('isLeadRole', () => {
  it('accepts the five lead roles', () => {
    for (const r of LEAD_ROLE_VALUES) expect(isLeadRole(r)).toBe(true);
  });

  it('rejects onboarding-role types + arbitrary strings', () => {
    expect(isLeadRole('PANDIT')).toBe(false);
    expect(isLeadRole('TEMPLE_MANAGER')).toBe(false);
    expect(isLeadRole('admin')).toBe(false);
    expect(isLeadRole('')).toBe(false);
  });
});
