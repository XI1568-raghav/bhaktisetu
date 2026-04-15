import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const isDemoMode = !supabaseUrl || supabaseUrl === 'https://demo.supabase.co';

/**
 * Admin Supabase client — uses service role key, bypasses RLS.
 * In demo mode, returns a dummy client that will throw on actual calls.
 */
export const supabaseAdmin: SupabaseClient = isDemoMode
  ? (new Proxy({} as SupabaseClient, {
      get: (_target, prop) => {
        if (prop === 'auth') {
          return {
            getUser: async () => ({ data: { user: null }, error: { message: 'Demo mode: Supabase not configured' } }),
            signInWithOtp: async () => ({ data: null, error: { message: 'Demo mode' } }),
            verifyOtp: async () => ({ data: null, error: { message: 'Demo mode' } }),
            refreshSession: async () => ({ data: null, error: { message: 'Demo mode' } }),
            signOut: async () => ({ error: null }),
          };
        }
        return () => { throw new Error('Demo mode: Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL in .env.local'); };
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
