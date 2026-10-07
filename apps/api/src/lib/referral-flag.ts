/**
 * Referral programme switch (API twin of apps/web/lib/referral-flag.ts).
 *
 * FALSE while referral credit is unusable: only the referrer is credited
 * (WalletService.creditUser) and nothing in the product spends a wallet balance,
 * so any reward would be unbacked. While false, `POST /referrals/reward` answers
 * 404 `referral_credit_unavailable` and never touches the wallet. The code, lookup,
 * claim and list routes keep working, so stored referral data is untouched.
 *
 * To turn the programme on later: make credit spendable, then flip this to true
 * together with the web flag.
 */
export const HAS_REFERRAL_CREDIT = false;
