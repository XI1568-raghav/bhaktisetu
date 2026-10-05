/**
 * Referral programme switch.
 *
 * FALSE while referral credit is unusable: only the referrer is credited
 * (apps/api routes/referrals.ts -> WalletService.creditUser) and nothing in the
 * product spends a wallet balance, so every "earn credit" promise would be
 * unbacked. While false: /refer shows a coming-soon state, it is out of the
 * sitemap, and ReferralCapture (?ref= cookie + /referrals/claim) is not mounted.
 * The API routes and stored referral data are untouched.
 *
 * To turn the programme on later: make credit spendable, then flip this to true.
 * `__tests__/referral-credit-gate.test.tsx` covers both states.
 */
export const HAS_REFERRAL_CREDIT = false;
