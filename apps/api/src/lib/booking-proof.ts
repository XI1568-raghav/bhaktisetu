import { prisma } from './prisma.js';
import { signProofRead } from './r2.js';
import { resolveManagerTempleId } from '../routes/temple-portal.js';

/**
 * Private booking video proof.
 *
 * `PujaBooking.videoProofUrl` holds either
 *   - an object KEY (`booking-proofs/<bookingId>/<ts>-<hex>.<ext>`) in the private
 *     proof bucket: never directly readable, only via a signed URL minted here; or
 *   - LEGACY: an http(s) URL (old public-bucket uploads, Drive/YouTube links), which
 *     is returned as-is.
 */
export const PROOF_SIGNED_URL_TTL_SEC = 300;

const KEY_RE = /^booking-proofs\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/\d{10,16}-[0-9a-f]{12}\.(mp4|webm|mov)$/i;

export function isLegacyProofUrl(v: string | null | undefined): boolean {
  return typeof v === 'string' && /^https?:\/\//i.test(v.trim());
}

/** The booking a well-formed proof key belongs to, or null if the key is malformed. */
export function proofKeyBookingId(key: string): string | null {
  const m = KEY_RE.exec(key);
  return m ? m[1]!.toLowerCase() : null;
}

export interface ProofViewer {
  id: string;
  roles: string[];
}

export interface ProofBooking {
  userId: string;
  templeId: string;
  priestId: string | null;
}

/** devotee owner, assigned pandit, manager of the booking's temple, admin. */
export async function canViewProof(viewer: ProofViewer, booking: ProofBooking): Promise<boolean> {
  if (booking.userId === viewer.id) return true;
  if (viewer.roles.includes('ADMIN')) return true;
  if (booking.priestId) {
    const priest = await prisma.priest.findUnique({ where: { id: booking.priestId }, select: { userId: true } });
    if (priest?.userId === viewer.id) return true;
  }
  if (viewer.roles.includes('TEMPLE_MANAGER')) {
    const templeId = await resolveManagerTempleId(viewer.id);
    if (templeId && templeId === booking.templeId) return true;
  }
  return false;
}

export type ProofResolution =
  | { kind: 'none' }
  | { kind: 'legacy'; url: string }
  | { kind: 'signed'; url: string; expiresIn: number }
  | { kind: 'unavailable' };

/** Turn a stored value into something a player can open. Authorisation is the caller's job. */
export async function resolveProof(bookingId: string, stored: string | null | undefined): Promise<ProofResolution> {
  const v = (stored ?? '').trim();
  if (!v) return { kind: 'none' };
  if (isLegacyProofUrl(v)) return { kind: 'legacy', url: v };
  // A key must belong to THIS booking, so a tampered row cannot expose another's video.
  if (proofKeyBookingId(v) !== bookingId.toLowerCase()) return { kind: 'unavailable' };
  const url = await signProofRead(v, PROOF_SIGNED_URL_TTL_SEC);
  return url ? { kind: 'signed', url, expiresIn: PROOF_SIGNED_URL_TTL_SEC } : { kind: 'unavailable' };
}
