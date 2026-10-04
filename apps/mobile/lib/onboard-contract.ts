/**
 * The provider self-onboarding contract, pinned to
 * `apps/api/src/routes/leads-self-onboard.ts`.
 *
 * THE DEFECT THIS CLOSES
 * ----------------------
 * `POST /api/v1/leads/self-onboard` parses a zod DISCRIMINATED UNION on
 * `role`, and each arm carries required role-specific fields on top of the
 * five shared ones:
 *
 *   TEMPLE               templeName, deity
 *   PRIEST               yearsExperience (int), specialties
 *   ASTROLOGER           astrologyType (enum)
 *   WELLNESS_INSTRUCTOR  sessionType (enum)
 *   GAUSHALA             gaushalaName, cowCount (int)
 *
 * `app/(onboard)/_form.tsx` rendered a `*` beside those fields and validated
 * NONE of them — `required` on `ExtraTextField` was decoration, and the submit
 * handler checked only fullName/email/phone/city/state. Worse, the payload
 * builder DROPS an empty extra rather than sending it, so a pandit who left
 * "Years of experience" blank sent a body with no `yearsExperience` at all,
 * got a 400 `{ ok:false, error:'invalid_body', issues:{…} }`, and saw
 * "API error: 400" — the old `apiPost` discarded the body — with no indication
 * of which field to fix. That is a recruitment page that cannot be completed.
 *
 * The two numeric extras are `z.coerce.number().int()`, so "12 years" coerces
 * to NaN and 400s exactly like a blank. They are checked as integers here.
 *
 * Pure and dependency-free so apps/mobile/vitest.config.ts (plain node) can
 * exercise it.
 */

export type OnboardRole =
  | 'TEMPLE'
  | 'PRIEST'
  | 'ASTROLOGER'
  | 'WELLNESS_INSTRUCTOR'
  | 'GAUSHALA';

interface ExtraRule {
  key: string;
  label: string;
  /** `z.coerce.number().int()` on the server — text that is not an integer 400s. */
  integer?: boolean;
  /** Bounds the server enforces, so the message names them before the round trip. */
  min?: number;
  max?: number;
}

/** Verbatim from the route's per-role schemas. Order is the form's order. */
export const REQUIRED_EXTRAS: Readonly<Record<OnboardRole, readonly ExtraRule[]>> =
  Object.freeze({
    TEMPLE: [
      { key: 'templeName', label: 'Temple name' },
      { key: 'deity', label: 'Primary deity' },
    ],
    PRIEST: [
      { key: 'yearsExperience', label: 'Years of experience', integer: true, min: 0, max: 80 },
      { key: 'specialties', label: 'Specialties' },
    ],
    ASTROLOGER: [{ key: 'astrologyType', label: 'Astrology type' }],
    WELLNESS_INSTRUCTOR: [{ key: 'sessionType', label: 'Primary session type' }],
    GAUSHALA: [
      { key: 'gaushalaName', label: 'Gaushala name' },
      { key: 'cowCount', label: 'Approx cow count', integer: true, min: 0, max: 100000 },
    ],
  });

/**
 * Optional extras that are still typed on the server, so a bad value 400s just
 * as hard as a missing required one.
 */
export const OPTIONAL_EXTRA_RULES: Readonly<Record<string, ExtraRule>> = Object.freeze({
  yearsExperience: {
    key: 'yearsExperience',
    label: 'Years of experience',
    integer: true,
    min: 0,
    max: 80,
  },
});

export interface OnboardBaseFields {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
}

/** Same predicate the web onboarding pages and the server's own check use. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkInteger(rule: ExtraRule, raw: string): string | null {
  if (!/^-?\d+$/.test(raw.trim())) {
    return `"${rule.label}" must be a whole number — e.g. 12, not "12 years".`;
  }
  const n = Number(raw.trim());
  if (rule.min !== undefined && n < rule.min) {
    return `"${rule.label}" cannot be less than ${rule.min}.`;
  }
  if (rule.max !== undefined && n > rule.max) {
    return `"${rule.label}" cannot be more than ${rule.max}.`;
  }
  return null;
}

/**
 * The first problem with this application, phrased for the applicant, or
 * `null` when the body would be accepted.
 *
 * Deliberately returns ONE message: an alert listing five failures at once is
 * read as "this form is broken", and the fields are laid out top-to-bottom
 * anyway.
 */
export function describeOnboardProblem(
  role: OnboardRole,
  base: OnboardBaseFields,
  extras: Record<string, string | boolean>,
): string | null {
  if (!base.fullName.trim()) return 'Please enter your full name.';
  if (!EMAIL_RE.test(base.email.trim())) return 'Please enter a valid email address.';

  // `phone: z.string().min(6).max(20)` on the server. "Not empty" let a
  // two-character phone through to a 400.
  const phone = base.phone.trim();
  if (phone.length < 6) return 'Please enter a phone number we can reach you on.';
  if (phone.length > 20) return 'That phone number is too long.';

  if (!base.city.trim()) return 'Please enter your city.';
  if (!base.state.trim()) return 'Please enter your state.';

  for (const rule of REQUIRED_EXTRAS[role]) {
    const value = extras[rule.key];
    const raw = typeof value === 'string' ? value.trim() : '';
    if (raw.length === 0) return `Please fill in "${rule.label}".`;
    if (rule.integer) {
      const problem = checkInteger(rule, raw);
      if (problem) return problem;
    }
  }

  for (const [key, rule] of Object.entries(OPTIONAL_EXTRA_RULES)) {
    if (REQUIRED_EXTRAS[role].some((r) => r.key === key)) continue;
    const value = extras[key];
    const raw = typeof value === 'string' ? value.trim() : '';
    if (raw.length === 0) continue;
    const problem = checkInteger(rule, raw);
    if (problem) return problem;
  }

  return null;
}
