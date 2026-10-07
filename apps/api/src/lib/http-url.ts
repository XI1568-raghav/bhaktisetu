import { z } from 'zod';

/**
 * User-supplied URLs are stored and later rendered as links or media sources.
 * `z.string().url()` alone accepts any scheme, so `javascript:`, `data:`,
 * `file:` and `vbscript:` values pass. This is the one place that restricts
 * them to http(s). Use `httpUrl('imageUrl')` instead of `z.string().url()`.
 */
export function isHttpUrl(value: string): boolean {
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    const u = new URL(value);
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.length > 0;
  } catch {
    return false;
  }
}

export function httpUrl(field: string, max = 2000) {
  const message = `${field} must be a full URL starting with http:// or https://`;
  return z.string().max(max).refine(isHttpUrl, message);
}
