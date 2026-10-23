/**
 * REQUIRE_PROVIDER_APPROVAL — the one switch for "does a provider need an admin
 * before going live?".
 *
 * Default (unset, "false", "0", "no", "off") = NO approval: a provider profile is
 * live and its portal usable the moment onboarding is submitted. Set it to
 * "true" / "1" / "yes" / "on" to restore the old behaviour (profile created with
 * approved=false and an admin flips it on /admin/approvals). Read at call time so
 * a restart is the only thing needed to flip it, and tests can toggle it.
 *
 * What the switch does NOT touch (TC-08): auto-activation never writes
 * `Priest.isVerified` or `Priest.verificationStatus`. "Live" means
 * `PanditProfile.approved` (the existing activation flag) plus an ACTIVE Priest
 * row; nobody reviewed the pandit, so nothing may say they were.
 */
export function requireProviderApproval(): boolean {
  const v = (process.env.REQUIRE_PROVIDER_APPROVAL ?? '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}
