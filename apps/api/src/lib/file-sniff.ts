/**
 * Magic-byte sniffing for uploads. A signed upload URL accepts any bytes under
 * any Content-Type, so the type promised at presign time is re-checked against
 * the stored bytes when the file is attached to a profile.
 */
export type SniffedType = 'pdf' | 'png' | 'jpeg' | 'webp' | 'gif';

export function sniffFileType(b: Uint8Array): SniffedType | null {
  const at = (i: number, s: string) => s.split('').every((c, k) => b[i + k] === c.charCodeAt(0));
  if (b.length >= 5 && at(0, '%PDF-')) return 'pdf';
  if (b.length >= 8 && b[0] === 0x89 && at(1, 'PNG') && b[4] === 0x0d && b[5] === 0x0a) return 'png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b.length >= 12 && at(0, 'RIFF') && at(8, 'WEBP')) return 'webp';
  if (b.length >= 6 && (at(0, 'GIF87a') || at(0, 'GIF89a'))) return 'gif';
  return null;
}

const MIME_TO_TYPE: Record<string, SniffedType> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpeg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export type UploadVerdict = 'ok' | 'empty' | 'wrong_type';

/** Pure verdict from what the store reported (size, content-type) and the leading bytes. */
export function judgeUpload(
  input: { length: number; contentType: string | null; head: Uint8Array },
  allowed: readonly SniffedType[],
): UploadVerdict {
  if (!Number.isFinite(input.length) || input.length <= 0 || input.head.length === 0) return 'empty';
  const sniffed = sniffFileType(input.head);
  if (!sniffed || !allowed.includes(sniffed)) return 'wrong_type';
  const declared = MIME_TO_TYPE[(input.contentType ?? '').split(';')[0]!.trim().toLowerCase()];
  // A declared type that disagrees with the bytes (png bytes labelled pdf) is refused;
  // an absent/unknown one (generic storage default) is judged on the bytes alone.
  if (declared && declared !== sniffed) return 'wrong_type';
  return 'ok';
}
