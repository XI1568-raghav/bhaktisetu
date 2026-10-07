import { z } from 'zod';

/**
 * A URL that must be a web link. `z.string().url()` alone accepts any scheme
 * (`javascript:`, `data:`, `file:`), which would then be stored and rendered
 * as a link for other users. Use this for every user-supplied URL field.
 */
export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function httpUrlSchema(field: string, max = 2000) {
  return z
    .string()
    .trim()
    .max(max)
    .refine(isHttpUrl, `${field} must be a valid http:// or https:// URL`);
}
