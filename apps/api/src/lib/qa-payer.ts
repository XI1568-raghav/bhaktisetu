/**
 * QA payer allowlist: lets named tester accounts run real end-to-end journeys
 * on production for about Rs 1 per flow.
 *
 * `QA_PAYER_EMAILS` is a comma-separated list of account emails (case-insensitive,
 * whitespace ignored). Unset or empty = the feature is OFF and every function
 * here answers "not a QA payer". Only the AUTHENTICATED user's email is ever
 * compared; no request body, header or query value can switch this on.
 *
 * What it waives (see docs/runbooks/qa-one-rupee-payments.md):
 *   - puja booking platform fee (Rs 51) and prasad delivery fee (Rs 150)
 *   - donation minimum (Rs 101 -> Rs 1)
 *   - consultation minimum (Rs 50 -> Rs 1) and minimum minutes (5 -> 1)
 *   - store delivery fee (Rs 49 under Rs 499 -> 0)
 *
 * Everything else (commission split, refund ladder, payout rails) is unchanged:
 * a QA payer exercises the same code as a customer, only with smaller numbers.
 */

/** Parse the allowlist from an env value. Exported for tests. */
export function parseQaPayerEmails(raw: string | undefined | null): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0 && e.includes('@')),
  );
}

/** True only when `email` is on the QA_PAYER_EMAILS allowlist (read per call so a restart is the only deploy step). */
export function isQaPayerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = parseQaPayerEmails(process.env.QA_PAYER_EMAILS);
  if (list.size === 0) return false;
  return list.has(email.trim().toLowerCase());
}

/** Convenience for route handlers: `request.currentUser` may be absent. */
export function isQaPayer(user: { email?: string | null } | null | undefined): boolean {
  return isQaPayerEmail(user?.email);
}

// Normal-customer floors, and the QA values. One place so the routes and the
// tests agree.
export const DONATION_MIN_INR = 101;
export const QA_DONATION_MIN_INR = 1;
export const CONSULTATION_MIN_AMOUNT_INR = 50;
export const QA_CONSULTATION_MIN_AMOUNT_INR = 1;
export const CONSULTATION_MIN_MINUTES = 5;
export const QA_CONSULTATION_MIN_MINUTES = 1;
