// P0 #PBO-8 (2026-07-09): canonical lead-role → onboarding-role mapping.
//
// The self-onboard + admin-lead-conversion routes accept a LEAD role enum
// (TEMPLE, PRIEST, GAUSHALA, ASTROLOGER, WELLNESS_INSTRUCTOR) while the
// OnboardingService expects an onboarding RoleType (TEMPLE_MANAGER, PANDIT,
// GAUSHALA_MANAGER, ASTROLOGER, WELLNESS_INSTRUCTOR). Previously the mapping
// was implicit/scattered, so a lead with role 'PRIEST' could be passed to the
// onboarding service as 'PRIEST' (not a valid RoleType) and silently fall
// through to the default step list. This is the single source of truth.

export const LEAD_ROLE_VALUES = [
  'TEMPLE',
  'PRIEST',
  'ASTROLOGER',
  'WELLNESS_INSTRUCTOR',
  'GAUSHALA',
] as const;
export type LeadRole = (typeof LEAD_ROLE_VALUES)[number];

export const ONBOARDING_ROLE_TYPES = [
  'PANDIT',
  'STORE_OWNER',
  'ASTROLOGER',
  'WELLNESS_INSTRUCTOR',
  'GAUSHALA_MANAGER',
  'TEMPLE_MANAGER',
] as const;
export type OnboardingRoleType = (typeof ONBOARDING_ROLE_TYPES)[number];

const LEAD_TO_ONBOARDING: Record<LeadRole, OnboardingRoleType> = {
  TEMPLE: 'TEMPLE_MANAGER',
  PRIEST: 'PANDIT',
  ASTROLOGER: 'ASTROLOGER',
  WELLNESS_INSTRUCTOR: 'WELLNESS_INSTRUCTOR',
  GAUSHALA: 'GAUSHALA_MANAGER',
};

export function mapLeadRoleToOnboarding(role: LeadRole): OnboardingRoleType {
  return LEAD_TO_ONBOARDING[role];
}

export function isLeadRole(role: string): role is LeadRole {
  return (LEAD_ROLE_VALUES as readonly string[]).includes(role);
}
