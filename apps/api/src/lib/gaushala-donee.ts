/**
 * Resolve the id a caller supplies for a gaushala cause onto the ONE key the
 * rest of the platform reads.
 *
 * S-05 (prod sweep 2026-08-12): `donations.gaushala_id` was whatever string the
 * client sent — the public directory sends static fixture ids like `gs_001`,
 * while `GET /gaushala-portal/donations` filters on the manager's User UUID
 * (`{ gaushalaId: currentUser.id }`). So a verified ₹2,100 donation with a live
 * 80G receipt showed as ₹0 in the recipient's portal, permanently, and no
 * reconciliation was possible.
 *
 * Three legitimate spellings of the same gaushala collapse here:
 *   - GaushalaProfile.id  (what /providers/gaushala lists)
 *   - GaushalaProfile.userId (what the portal filters on — the canonical key)
 *   - a legacy directory fixture id, matched by the fixture's NAME against an
 *     approved profile. Not a guess: `gs_001` IS "Shri Krishna Gaushala" and so
 *     is the onboarded profile of that name.
 *
 * Anything else is refused. A donation must never be taken for a donee that
 * does not exist — there would be nobody to pay, and the 80G receipt would name
 * a body that never received the money.
 */

import { prisma } from './prisma.js';
import { gaushalaService } from '../services/gaushala.service.js';
import { gaushalaQuality } from './cause-quality.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ResolvedGaushalaDonee {
  /** The value to write to donations.gaushala_id — always the owner's User id. */
  doneeUserId: string;
  profileId: string;
  gaushalaName: string;
}

export type GaushalaDoneeResult =
  | { ok: true; donee: ResolvedGaushalaDonee }
  | { ok: false; reason: 'not_onboarded' };

/** Name of a legacy directory fixture, or null when the id isn't one. */
export function fixtureGaushalaName(id: string): string | null {
  const fixture = gaushalaService.getGaushalaById(id) as { name?: string } | null;
  return fixture?.name ?? null;
}

export async function resolveGaushalaDonee(
  gaushalaId: string,
): Promise<GaushalaDoneeResult> {
  const id = gaushalaId.trim();
  if (!id) return { ok: false, reason: 'not_onboarded' };

  const or: Record<string, unknown>[] = [];
  if (UUID_RE.test(id)) {
    or.push({ id }, { userId: id });
  } else {
    const name = fixtureGaushalaName(id);
    if (!name) return { ok: false, reason: 'not_onboarded' };
    or.push({ gaushalaName: name });
  }

  const profile = await prisma.gaushalaProfile.findFirst({
    where: { approved: true, OR: or },
    select: { id: true, userId: true, gaushalaName: true, description: true, address: true },
  });
  if (!profile) return { ok: false, reason: 'not_onboarded' };
  // An approved-but-junk profile must not take money (see lib/cause-quality.ts).
  if (!gaushalaQuality(profile).ok) return { ok: false, reason: 'not_onboarded' };

  return {
    ok: true,
    donee: {
      doneeUserId: profile.userId,
      profileId: profile.id,
      gaushalaName: profile.gaushalaName,
    },
  };
}
