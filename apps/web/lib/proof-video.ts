import { API_BASE_URL } from './api-config';

/**
 * Booking video proof is stored privately as an object KEY
 * (`booking-proofs/<bookingId>/…`). A key cannot be opened directly: the API
 * mints a short-lived signed URL, only for the devotee, the assigned pandit, the
 * temple's manager and admins. Older rows hold a plain http(s) URL and open as-is.
 */
export function isProofKey(v: string | null | undefined): boolean {
  return typeof v === 'string' && /^booking-proofs\//.test(v.trim());
}

export async function fetchProofUrl(bookingId: string, token: string | null | undefined): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/video`, {
      headers: { Authorization: `Bearer ${token ?? ''}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { videoUrl?: string | null };
    return body.videoUrl ?? null;
  } catch {
    return null;
  }
}

/** Open the proof in a new tab, asking the API for a fresh signed URL when it is private. */
export async function openProof(
  bookingId: string,
  stored: string,
  token: string | null | undefined,
): Promise<boolean> {
  if (!isProofKey(stored)) {
    window.open(stored, '_blank', 'noopener,noreferrer');
    return true;
  }
  // Open the tab inside the click so popup blockers allow it, then point it at the signed URL.
  const tab = window.open('', '_blank');
  const url = await fetchProofUrl(bookingId, token);
  if (!url) {
    tab?.close();
    return false;
  }
  if (tab) tab.location.href = url;
  else window.location.href = url;
  return true;
}
