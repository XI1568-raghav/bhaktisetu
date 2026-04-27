import { createClient, SupabaseClient } from '@supabase/supabase-js';

// API server reads SUPABASE_URL / SUPABASE_ANON_KEY (no NEXT_PUBLIC_ prefix —
// that's a Next.js convention). Fall back to the prefixed names so a single
// .env file shared with the web app still works in dev.
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const isDemoMode = !supabaseUrl || supabaseUrl === 'https://demo.supabase.co';

/**
 * Admin Supabase client — uses service role key, bypasses RLS.
 * In demo mode, returns a dummy client that will throw on actual calls.
 */
export const supabaseAdmin: SupabaseClient = isDemoMode
  ? (new Proxy({} as SupabaseClient, {
      get: (_target, prop) => {
        if (prop === 'auth') {
          const demoErr = { message: 'Demo mode: Supabase not configured' };
          return {
            getUser: async () => ({ data: { user: null }, error: demoErr }),
            signInWithOtp: async () => ({ data: null, error: demoErr }),
            verifyOtp: async () => ({ data: null, error: demoErr }),
            signInWithPassword: async () => ({ data: null, error: demoErr }),
            signUp: async () => ({ data: null, error: demoErr }),
            signInWithOAuth: async () => ({ data: null, error: demoErr }),
            refreshSession: async () => ({ data: null, error: demoErr }),
            signOut: async () => ({ error: null }),
          };
        }
        return () => { throw new Error('Demo mode: Supabase not configured. Set SUPABASE_URL in the API .env.'); };
      },
    }))
  : createClient(supabaseUrl, supabaseServiceKey);

/**
 * Creates a Supabase client scoped to a specific user's access token.
 */
export const createSupabaseClient = (accessToken?: string): SupabaseClient => {
  if (isDemoMode) return supabaseAdmin;
  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    accessToken
      ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
      : undefined,
  );
};

export { isDemoMode };
