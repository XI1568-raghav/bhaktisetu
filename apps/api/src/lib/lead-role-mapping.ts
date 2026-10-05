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

/**
 * The profile fields a lead supplied, in the shape OnboardingService reads.
 *
 * `lead.name` is the CONTACT PERSON. For a temple or a gaushala the
 * organisation's own name (and deity / cow count) travels in `lead.metadata`,
 * written by leads-self-onboard. Building the profile from `lead.name` made a
 * temple called "Ramesh Sharma" that no Temple row could ever match.
 */
export function leadProfileSeed(
  role: LeadRole,
  lead: {
    name?: string | null;
    city?: string | null;
    state?: string | null;
    source?: string | null;
    metadata?: unknown;
  },
): Record<string, unknown> {
  const meta = (lead.metadata && typeof lead.metadata === 'object' ? lead.metadata : {}) as Record<string, unknown>;
  const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  const base = {
    displayName: lead.name ?? undefined,
    city: lead.city,
    state: lead.state,
    bio: `Converted from lead pipeline (${lead.source ?? 'unknown'}).`,
  };
  if (role === 'TEMPLE') {
    return { ...base, templeName: text(meta.templeName) ?? lead.name ?? undefined, deity: text(meta.deity) };
  }
  if (role === 'GAUSHALA') {
    const cows = Number(meta.cowCount);
    return {
      ...base,
      gaushalaName: text(meta.gaushalaName) ?? lead.name ?? undefined,
      totalCows: Number.isFinite(cows) && cows >= 0 ? cows : 0,
    };
  }
  return { ...base, templeName: lead.name ?? undefined };
}
