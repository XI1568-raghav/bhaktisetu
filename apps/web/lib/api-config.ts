/**
 * API base URL for the Fastify backend.
 *
 * Kept in its own module (separate from `lib/supabase.ts`) so that consumers
 * who only need the URL don't drag `@supabase/supabase-js` into the client bundle.
 *
 * Auto-appends `/api/v1` if the env var doesn't include it, so callers can
 * write `${API_BASE_URL}/ai/chat` without thinking about the prefix.
 */
function resolve(): string {
 const candidate = process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';
 return candidate.endsWith('/api/v1')
 ? candidate
 : `${candidate.replace(/\/$/, '')}/api/v1`;
}

export const API_BASE_URL = resolve();
