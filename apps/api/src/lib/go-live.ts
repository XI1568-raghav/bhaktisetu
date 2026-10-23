import { onboardingService, type RoleType } from '../services/onboarding.service.js';

/**
 * After a portal profile save: activate the profile (REQUIRE_PROVIDER_APPROVAL
 * unset) and hand back the fresh row so the caller's response carries
 * `approved: true`. An already-approved profile is returned untouched; a failure
 * to activate never fails the save.
 */
export async function goLive<T extends { approved?: boolean | null }>(
  userId: string,
  role: RoleType,
  saved: T,
  reload: () => Promise<T | null>,
): Promise<T> {
  if (saved.approved) return saved;
  try {
    const r = await onboardingService.activateOnSubmit(userId, role);
    if (!r.activated) return saved;
    return (await reload()) ?? saved;
  } catch {
    return saved;
  }
}
