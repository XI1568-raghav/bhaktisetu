import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Browser-side Supabase client (singleton).
 * Uses the anon key — RLS policies apply.
 */
let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;

  browserClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}

/**
 * Server-side Supabase client for use in Next.js Server Components / API routes.
 * Creates a new client each time (no singleton) since server components
 * should not share state across requests.
 */
export function getSupabaseServerClient(accessToken?: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    ...(accessToken
      ? {
          global: {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        }
      : {}),
  });
}

/**
 * API base URL for the Fastify backend.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
