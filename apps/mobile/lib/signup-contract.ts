/**
 * The signup contract, in one pure module both the screen and the auth context
 * import — so the client cannot drift from `signupSchema` in
 * apps/api/src/routes/auth.ts again.
 *
 * TWO DEFECTS LIVED IN THE GAP THIS FILE CLOSES.
 *
 * 1. ROLE. `signupSchema` parses
 *      role: z.enum(['devotee','pandit','store_owner','astrologer',
 *                    'wellness_instructor','gaushala_manager','temple_manager'])
 *    — `pandit`. `UserRole` in @poojly/api-client, which the mobile signup
 *    screen collects and every RoleGuard in the app is keyed on, says
 *    `priest`. The screen posted the client key straight through. zod does not
 *    coerce, so EVERY pandit signup from the app answered 400 "Invalid enum
 *    value … received 'priest'".
 *
 * 2. PASSWORD. The screen required 6 characters and no character classes; the
 *    API requires 8, at least one letter and at least one digit. A 6-character
 *    password therefore passed the client and was rejected by the server.
 *
 * Both failures were invisible in production because the auth context's
 * signup `catch` used to mint a local session and report success. That is
 * fixed too — see lib/auth-context.tsx — but the honest fix is not to reach
 * the server with a body it cannot parse in the first place.
 *
 * Pure and dependency-free so apps/mobile/vitest.config.ts (plain node, no RN
 * transform) can exercise it.
 */

import type { UserRole } from '@poojly/api-client';

/** Every role key the server's signup enum accepts, verbatim. */
export const API_SIGNUP_ROLES = [
  'devotee',
  'pandit',
  'store_owner',
  'astrologer',
  'wellness_instructor',
  'gaushala_manager',
  'temple_manager',
] as const;

export type ApiSignupRole = (typeof API_SIGNUP_ROLES)[number];

/**
 * Translate a client `UserRole` to the key the signup route parses.
 *
 * `admin` has no translation on purpose: the server's enum has no admin
 * either, and a client-side alias for it would be a self-service role
 * escalation. It maps to `devotee`, which is what the server would have to do
 * with it anyway, and `isAdminEmail` on the server remains the only path to an
 * admin account.
 */
export function toApiSignupRole(role: UserRole): ApiSignupRole {
  switch (role) {
    case 'priest':
      return 'pandit';
    case 'store_owner':
    case 'astrologer':
    case 'wellness_instructor':
    case 'gaushala_manager':
    case 'temple_manager':
    case 'devotee':
      return role;
    case 'admin':
    default:
      return 'devotee';
  }
}

/**
 * The API's password rule, stated as the message the user needs.
 *
 * Returns `null` when the password would be accepted. Special characters are
 * deliberately not required — the server's comment cites NIST 800-63B, and a
 * client that demanded them would reject passwords the platform accepts.
 */
export function describePasswordProblem(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(password)) return 'Password must contain at least one letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one digit.';
  return null;
}
