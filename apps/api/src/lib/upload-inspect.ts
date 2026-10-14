import { presignR2Url, r2 } from './r2.js';
import { judgeUpload, type SniffedType } from './file-sniff.js';

export const KYC_TYPES: readonly SniffedType[] = ['pdf', 'png', 'jpeg'];
export const PHOTO_TYPES: readonly SniffedType[] = ['png', 'jpeg', 'webp'];

export type AttachInspection = { ok: true } | { ok: false; reason: 'missing' | 'empty' | 'wrong_type' | 'unreachable' };

async function inspectUrl(url: string, allowed: readonly SniffedType[]): Promise<AttachInspection> {
  try {
    const res = await fetch(url, { headers: { Range: 'bytes=0-15' }, signal: AbortSignal.timeout(5000) });
    if (res.status === 416) return { ok: false, reason: 'empty' }; // range past a zero-byte object
    if (!res.ok) return { ok: false, reason: res.status >= 500 ? 'unreachable' : 'missing' };
    const head = new Uint8Array(await res.arrayBuffer()).subarray(0, 16);
    const range = res.headers.get('content-range'); // "bytes 0-15/12345"
    const total = range ? Number(range.split('/')[1]) : Number(res.headers.get('content-length') ?? head.length);
    const verdict = judgeUpload({ length: total, contentType: res.headers.get('content-type'), head }, allowed);
    return verdict === 'ok' ? { ok: true } : { ok: false, reason: verdict };
  } catch {
    return { ok: false, reason: 'unreachable' };
  }
}

/** Inspect a private identity document by storage key (size > 0, bytes are pdf/png/jpeg). */
export async function inspectPrivateDocument(key: string): Promise<AttachInspection> {
  if (!r2.enabled) return { ok: true };
  const url = await presignR2Url(key, 60, { private: true });
  if (!url) return { ok: false, reason: 'unreachable' };
  return inspectUrl(url, KYC_TYPES);
}

/** Inspect a profile photo. Only URLs under our own public storage are ours to inspect. */
export async function inspectOwnPhoto(photoUrl: string): Promise<AttachInspection> {
  const base = r2.publicBaseUrl;
  if (!base || !photoUrl.startsWith(base.replace(/\/$/, '') + '/')) return { ok: true };
  return inspectUrl(photoUrl, PHOTO_TYPES);
}

export function attachFailureMessage(r: Exclude<AttachInspection, { ok: true }>, what: string): { status: number; error: string } {
  switch (r.reason) {
    case 'empty': return { status: 400, error: `The ${what} you uploaded is empty. Please choose the file again.` };
    case 'wrong_type': return { status: 400, error: `The ${what} must be a real PDF, PNG or JPEG file. Please upload it again.` };
    case 'missing': return { status: 400, error: `The ${what} was not found. Please upload it again.` };
    default: return { status: 503, error: 'We could not verify the upload just now. Please try again in a moment.' };
  }
}
