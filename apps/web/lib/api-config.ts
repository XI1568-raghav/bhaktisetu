/**
 * API base URL for the Fastify backend.
 *
 * Kept in its own module (separate from `lib/supabase.ts`) so that consumers
 * who only need the URL don't drag `@supabase/supabase-js` into the client bundle.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
