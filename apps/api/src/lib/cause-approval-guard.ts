import { prisma } from './prisma.js';
import {
  assessCauseQuality,
  CauseQualityError,
  gaushalaQuality,
  templeQuality,
  type CauseQualityResult,
} from './cause-quality.js';

/**
 * Quality verdict for the user's profile of a cause role, or null when the
 * role is not a cause role or the user has no such profile (nothing to gate).
 */
export async function assessCauseProfile(
  userId: string,
  role: string,
): Promise<CauseQualityResult | null> {
  if (role === 'GAUSHALA_MANAGER') {
    const p = await prisma.gaushalaProfile.findUnique({ where: { userId } });
    return p ? gaushalaQuality(p) : null;
  }
  if (role === 'TEMPLE_MANAGER') {
    const p = await prisma.templeProfile.findUnique({ where: { userId } });
    return p ? templeQuality(p) : null;
  }
  return null;
}

/** Throws CauseQualityError if approving would publish a junk cause profile. */
export async function assertCauseApprovable(
  userId: string,
  roles: string[],
  opts: { missingProfileFails?: boolean } = {},
): Promise<void> {
  for (const role of roles) {
    let verdict = await assessCauseProfile(userId, role);
    // A role being (re)assigned in the same request gets an empty stub profile
    // seeded after this check, and an empty stub always fails the bar.
    if (!verdict && opts.missingProfileFails && (role === 'GAUSHALA_MANAGER' || role === 'TEMPLE_MANAGER')) {
      verdict = assessCauseQuality({});
    }
    if (verdict && !verdict.ok) throw new CauseQualityError(role, verdict.reasons);
  }
}
