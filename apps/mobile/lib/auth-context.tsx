import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { setCurrentLanguage } from './language';
import { api, ApiClientError, type AuthSession, type AuthUser, type UserRole } from '@poojly/api-client';
import { toApiSignupRole } from './signup-contract';
import { refreshSessionOnce } from './session-refresh';
import { setSuspendedNotice } from './suspended';
import { authFailureMessage } from './auth-errors';

// ─── Demo accounts (mirror of apps/web/lib/auth-context.tsx) ─────────────────
//
// DEMO_ENABLED is true only in development bundles (Expo Go / EAS dev profile).
// Production / preview / testflight builds set DEMO_ENABLED=false so the
// hardcoded admin@demo.com / demo123 ADMIN role bypass cannot ship to stores.
//
// Per CEO audit 2026-07-01 (P0-3): mobile shipped offline ADMIN escalation via
// these hardcoded records mirroring the web side. Web side gated in prior
// commit fc52ea5 — mobile side now matches that policy.

declare const __DEV__: boolean;
const DEMO_ENABLED =
  (typeof __DEV__ !== 'undefined' && __DEV__) ||
  process.env.EXPO_PUBLIC_ALLOW_DEMO_AUTH === 'true';

const DEMO_ACCOUNTS: Record<string, { password: string; user: AuthUser }> = DEMO_ENABLED ? {
  'devotee@demo.com': {
    password: 'demo123',
    user: {
      id: 'demo-devotee-001',
      phone: '+919876543210',
      fullName: 'Arjun Sharma',
      email: 'devotee@demo.com',
      avatarUrl: null,
      preferredLanguage: 'hi',
      subscriptionTier: 'bhakti_pass',
      role: 'devotee',
    },
  },
  'priest@demo.com': {
    password: 'demo123',
    user: {
      id: 'demo-priest-001',
      phone: '+919876543211',
      fullName: 'Pandit Ramesh Sharma',
      email: 'priest@demo.com',
      avatarUrl: null,
      preferredLanguage: 'hi',
      subscriptionTier: 'free',
      role: 'priest',
    },
  },
  'pandit@demo.com': {
    password: 'demo123',
    user: {
      id: 'demo-pandit-001',
      phone: '+919876543214',
      fullName: 'Pandit Ramesh Sharma',
      email: 'pandit@demo.com',
      avatarUrl: null,
      preferredLanguage: 'hi',
      subscriptionTier: 'free',
      role: 'priest',
    },
  },
  'store@demo.com': {
    password: 'demo123',
    user: {
      id: 'demo-store-001',
      phone: '+919876543212',
      fullName: 'Vikram Patel',
      email: 'store@demo.com',
      avatarUrl: null,
      preferredLanguage: 'en',
      subscriptionTier: 'free',
      role: 'store_owner',
    },
  },
  'astro@demo.com': {
    password: 'demo123',
    user: {
      id: 'demo-astro-001',
      phone: '+919876543213',
      fullName: 'Jyotishi Suresh Kumar',
      email: 'astro@demo.com',
      avatarUrl: null,
      preferredLanguage: 'hi',
      subscriptionTier: 'free',
      role: 'astrologer',
    },
  },
  'wellness@demo.com': {
    password: 'demo123',
    user: {
      id: 'demo-wellness-001',
      phone: '+919876543215',
      fullName: 'Ananya Devi',
      email: 'wellness@demo.com',
      avatarUrl: null,
      preferredLanguage: 'en',
      subscriptionTier: 'free',
      role: 'wellness_instructor',
    },
  },
  'gaushala@demo.com': {
    password: 'demo123',
    user: {
      id: 'demo-gaushala-001',
      phone: '+919876543216',
      fullName: 'Govind Prasad',
      email: 'gaushala@demo.com',
      avatarUrl: null,
      preferredLanguage: 'hi',
      subscriptionTier: 'free',
      role: 'gaushala_manager',
    },
  },
  'temple@demo.com': {
    password: 'demo123',
    user: {
      id: 'demo-temple-001',
      phone: '+919876543217',
      fullName: 'Swami Dayananda',
      email: 'temple@demo.com',
      avatarUrl: null,
      preferredLanguage: 'hi',
      subscriptionTier: 'free',
      role: 'temple_manager',
    },
  },
  'admin@demo.com': {
    password: 'demo123',
    user: {
      id: 'demo-admin-001',
      phone: '+919876543218',
      fullName: 'Admin User',
      email: 'admin@demo.com',
      avatarUrl: null,
      preferredLanguage: 'en',
      subscriptionTier: 'free',
      role: 'admin',
    },
  },
} : {};

function makeDemoSession(): AuthSession {
  return {
    accessToken: 'demo-access-token-poojly',
    refreshToken: 'demo-refresh-token-poojly',
    expiresIn: 86400,
    expiresAt: Math.floor(Date.now() / 1000) + 86400,
  };
}

// May be undefined in production bundles where DEMO_ACCOUNTS is the empty
// object. Consumers (demoSignIn) must guard before using.
const DEMO_USER: AuthUser | undefined = DEMO_ACCOUNTS['devotee@demo.com']?.user;

// ─── Storage keys ────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  SESSION: 'poojly_session',
  USER: 'poojly_user',
} as const;

// ─── Storage helpers (expo-secure-store) ─────────────────────────────────────

async function loadStored<T>(key: string): Promise<T | null> {
  try {
    const raw = await SecureStore.getItemAsync(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function storeJson(key: string, value: unknown | null): Promise<void> {
  try {
    if (value === null) {
      await SecureStore.deleteItemAsync(key);
    } else {
      await SecureStore.setItemAsync(key, JSON.stringify(value));
    }
  } catch {
    // SecureStore may be unavailable in some envs (e.g. expo-web)
  }
}

/**
 * Reads the current access token. Used by api-client's getAuthToken callback.
 * Exported so apps/mobile/app/_layout.tsx can wire it during initApiClient().
 */
export async function getStoredAccessToken(): Promise<string | undefined> {
  const session = await loadStored<AuthSession>(STORAGE_KEYS.SESSION);
  return session?.accessToken ?? undefined;
}

// ─── onUnauthorised wiring (module-level ref + single-flight latch) ─────────
//
// initApiClient() runs at _layout.tsx module scope, before the AuthProvider
// mounts, so it cannot call signOut() directly (the hook/context don't exist
// yet). Instead we expose a mutable ref that the AuthProvider sets on mount,
// and a single-flight latch so that N concurrent 401s only fire one sign-out
// (api-client itself also de-dupes, but this is the defence-in-depth here).
//
// P0-8b per CEO audit 2026-07-10.

let handleAuthExpired: (() => void) | null = null;

/**
 * Called by the AuthProvider on mount so the api-client onUnauthorised hook
 * can reach back into a live signOut() (clear token + navigate to login).
 */
export function setOnAuthExpired(fn: (() => void) | null): void {
  handleAuthExpired = fn;
}

let handleSuspendedCall: ((message: string) => Promise<void>) | null = null;
let suspendedInProgress = false;

/** api-client onSuspended hook: any call refused for a blocked account signs out WITH the reason. */
export function onSuspendedMobile(message: string): void {
  const fn = handleSuspendedCall;
  if (!fn || suspendedInProgress) return;
  suspendedInProgress = true;
  void fn(message).finally(() => {
    suspendedInProgress = false;
  });
}

let authExpiredInProgress: Promise<void> | null = null;

/**
 * Invoked by api-client when any request receives a 401. Single-flight: the
 * first 401 kicks off the sign-out; concurrent 401s attach to the same promise
 * and do nothing extra. The latch resets once sign-out settles.
 */
export async function onUnauthorisedMobile(): Promise<void> {
  if (authExpiredInProgress) return authExpiredInProgress;
  const fn = handleAuthExpired;
  if (!fn) return;
  authExpiredInProgress = (async () => {
    try {
      await fn();
    } finally {
      authExpiredInProgress = null;
    }
  })();
  return authExpiredInProgress;
}

// ─── Sign-up data type ───────────────────────────────────────────────────────

export interface SignUpData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
}


// ─── Context ─────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithOtp: (phone: string) => Promise<{ success: boolean; message: string }>;
  verifyOtp: (
    phone: string,
    token: string
  ) => Promise<{ success: boolean; message: string; isNewUser?: boolean }>;
  signInWithCredentials: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; message: string }>;
  signUpWithCredentials: (
    data: SignUpData
  ) => Promise<{ success: boolean; message: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  demoSignIn: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Every API request carries Accept-Language from the signed-in profile
  // (see ./language); signing out resets it to 'en'.
  useEffect(() => {
    setCurrentLanguage(user?.preferredLanguage);
  }, [user?.preferredLanguage]);

  const persistSession = useCallback(
    async (sess: AuthSession | null, usr: AuthUser | null) => {
      if (sess && usr) {
        await Promise.all([
          storeJson(STORAGE_KEYS.SESSION, sess),
          storeJson(STORAGE_KEYS.USER, usr),
        ]);
      } else {
        await Promise.all([
          storeJson(STORAGE_KEYS.SESSION, null),
          storeJson(STORAGE_KEYS.USER, null),
        ]);
      }
    },
    []
  );

  // Hydrate from secure storage on mount.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [storedSession, storedUser] = await Promise.all([
          loadStored<AuthSession>(STORAGE_KEYS.SESSION),
          loadStored<AuthUser>(STORAGE_KEYS.USER),
        ]);

        if (cancelled) return;

        if (!storedSession || !storedUser) {
          setIsLoading(false);
          return;
        }

        // Backwards compat — ensure role
        if (!storedUser.role) {
          storedUser.role = 'devotee';
        }

        // Demo session — accept as-is
        if (storedSession.accessToken.startsWith('demo-')) {
          setSession(storedSession);
          setUser(storedUser);
          setIsLoading(false);
          return;
        }

        // If token is expired or about to expire, try refresh
        const now = Math.floor(Date.now() / 1000);
        if (storedSession.expiresAt && storedSession.expiresAt < now + 60) {
          const outcome = await refreshSessionOnce(storedSession.refreshToken, api.post);
          if (cancelled) return;
          if (outcome.kind === 'refreshed') {
            setSession(outcome.session);
            setUser(storedUser);
            await persistSession(outcome.session, storedUser);
          } else if (outcome.kind === 'rejected') {
            if (outcome.suspendedMessage) setSuspendedNotice(outcome.suspendedMessage);
            await persistSession(null, null);
          } else {
            // Offline or the auth provider is down: keep the user signed in;
            // the first call that 401s retries the refresh.
            setSession(storedSession);
            setUser(storedUser);
          }
        } else {
          setSession(storedSession);
          setUser(storedUser);
        }
      } catch {
        await persistSession(null, null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [persistSession]);

  const signInWithOtp = useCallback(async (phone: string) => {
    try {
      const data = await api.post<{ success: boolean; message: string }>(
        '/api/v1/auth/send-otp',
        { phone },
        { noAuth: true }
      );
      return { success: data.success, message: data.message };
    } catch (err) {
      const message = authFailureMessage(err, 'Failed to send OTP');
      return { success: false, message };
    }
  }, []);

  const verifyOtp = useCallback(
    async (phone: string, token: string) => {
      try {
        const data = await api.post<{
          success: boolean;
          message: string;
          session: AuthSession;
          user: AuthUser;
        }>('/api/v1/auth/verify-otp', { phone, token }, { noAuth: true });

        const newUser: AuthUser = { ...data.user, role: data.user.role || 'devotee' };
        setSession(data.session);
        setUser(newUser);
        await persistSession(data.session, newUser);

        return {
          success: true,
          message: data.message,
          isNewUser: newUser.isNewUser,
        };
      } catch (err) {
        const message = authFailureMessage(err, 'Verification failed');
        return { success: false, message };
      }
    },
    [persistSession]
  );

  const signInWithCredentials = useCallback(
    async (email: string, password: string) => {
      const emailLower = email.toLowerCase().trim();
      const demo = DEMO_ACCOUNTS[emailLower];
      if (demo && demo.password === password) {
        const demoSession = makeDemoSession();
        setSession(demoSession);
        setUser(demo.user);
        await persistSession(demoSession, demo.user);
        return { success: true, message: 'Signed in successfully' };
      }

      try {
        const data = await api.post<{ session: AuthSession; user: AuthUser }>(
          '/api/v1/auth/login',
          { email: emailLower, password },
          { noAuth: true }
        );
        const newUser: AuthUser = { ...data.user, role: data.user.role || 'devotee' };
        setSession(data.session);
        setUser(newUser);
        await persistSession(data.session, newUser);
        return { success: true, message: 'Signed in successfully' };
      } catch (err) {
        if (demo) return { success: false, message: 'Incorrect password' };
        // The old fallback read "Invalid email or password. Try a demo
        // account: devotee@demo.com / demo123". That string is a literal in
        // the bundle regardless of DEMO_ENABLED, so a production build
        // advertised a demo credential to any user who hit a non-Error
        // rejection — the same class as the `admin@demo.com` chip already
        // removed from the login screen.
        const message = authFailureMessage(err, 'Invalid email or password.');
        return { success: false, message };
      }
    },
    [persistSession]
  );

  const signUpWithCredentials = useCallback(
    async (data: SignUpData) => {
      try {
        const result = await api.post<{
          session: AuthSession;
          user: AuthUser;
          message?: string;
        }>(
          '/api/v1/auth/signup',
          {
            fullName: data.fullName,
            email: data.email,
            password: data.password,
            // Optional server-side; an empty string fails nothing but stores a
            // blank phone on a unique column, so omit it when absent.
            ...(data.phone ? { phone: data.phone } : {}),
            role: toApiSignupRole(data.role),
          },
          { noAuth: true }
        );
        // Keep the CLIENT vocabulary locally: the server answers `pandit`,
        // every guard and route in this app is keyed on `priest`.
        const newUser: AuthUser = { ...result.user, role: data.role };
        setSession(result.session);
        setUser(newUser);
        await persistSession(result.session, newUser);
        return { success: true, message: 'Account created successfully' };
      } catch (err) {
        // A FAILED SIGNUP MUST NOT PRODUCE A SESSION.
        //
        // This catch used to mint a local `demo-` session carrying whatever
        // role the signup form had selected, then return
        // `{ success: true, message: 'Account created successfully (demo
        // mode)' }`. Three consequences, all shipped:
        //
        //   1. Offline role escalation. RoleGuard reads `user.role` from this
        //      context, so any 4xx — a weak password, an email already taken,
        //      or the `priest`/`pandit` enum bug above — handed the caller a
        //      provider portal with a fabricated identity and no server ever
        //      involved.
        //   2. Every account created this way existed only on the handset. The
        //      devotee believed they had registered; nothing was written.
        //   3. It made the enum bug undetectable for as long as it existed.
        //
        // The dev fallback is kept behind DEMO_ENABLED so the Expo Go flow
        // still works with no backend, exactly like the demo sign-in above,
        // and it says which mode it is in. Production reports the failure.
        if (!DEMO_ENABLED) {
          const message = authFailureMessage(err, 'Could not create your account. Please try again.');
          return { success: false, message };
        }

        const demoSession = makeDemoSession();
        const newUser: AuthUser = {
          id: `user-${Date.now()}`,
          phone: data.phone ? `+91${data.phone.replace(/\D/g, '')}` : '',
          fullName: data.fullName,
          email: data.email,
          avatarUrl: null,
          preferredLanguage: 'hi',
          subscriptionTier: 'free',
          role: data.role,
        };
        setSession(demoSession);
        setUser(newUser);
        await persistSession(demoSession, newUser);
        return { success: true, message: 'Account created successfully (demo mode)' };
      }
    },
    [persistSession]
  );

  const signOut = useCallback(async () => {
    try {
      if (session?.accessToken && !session.accessToken.startsWith('demo-')) {
        await api.post('/api/v1/auth/logout', { accessToken: session.accessToken });
      }
    } catch {
      // best-effort logout
    } finally {
      setSession(null);
      setUser(null);
      await persistSession(null, null);
    }
  }, [session, persistSession]);

  // Wire the module-level onUnauthorised ref so api-client 401s trigger a
  // single signOut + navigate to login. Set on mount, cleared on unmount.
  // (Declared after `signOut` so the ref is in scope.)
  useEffect(() => {
    setOnAuthExpired(async () => {
      const stored = await loadStored<AuthSession>(STORAGE_KEYS.SESSION);
      // Demo / missing session: nothing to refresh.
      if (!stored || stored.accessToken.startsWith('demo-')) {
        await signOut();
        return;
      }
      const outcome = await refreshSessionOnce(stored.refreshToken, api.post);
      if (outcome.kind === 'refreshed') {
        setSession(outcome.session);
        await storeJson(STORAGE_KEYS.SESSION, outcome.session);
      } else if (outcome.kind === 'rejected') {
        if (outcome.suspendedMessage) setSuspendedNotice(outcome.suspendedMessage);
        await signOut();
      }
    });
    handleSuspendedCall = async (message: string) => {
      setSuspendedNotice(message);
      await signOut();
    };
    return () => {
      setOnAuthExpired(null);
      handleSuspendedCall = null;
    };
  }, [signOut]);

  const demoSignIn = useCallback(async () => {
    if (!DEMO_USER) {
      // Production bundle — demo sign-in disabled per CEO audit 2026-07-01 P0-3.
      throw new Error('Demo sign-in disabled in this build.');
    }
    const demoSession = makeDemoSession();
    setSession(demoSession);
    setUser(DEMO_USER);
    await persistSession(demoSession, DEMO_USER);
  }, [persistSession]);

  const refreshUser = useCallback(async () => {
    if (!session?.accessToken) return;
    if (session.accessToken.startsWith('demo-')) return;

    try {
      const data = await api.get<{ success: boolean; user: AuthUser }>('/api/v1/auth/me');
      if (data.success) {
        const updatedUser: AuthUser = {
          ...data.user,
          role: data.user.role || user?.role || 'devotee',
        };
        setUser(updatedUser);
        await persistSession(session, updatedUser);
      }
    } catch {
      // A 401 is handled once by onUnauthorised (refresh, then sign out only if
      // the server rejects the refresh token). Signing out here as well would
      // undo a successful refresh; a 503 or timeout must not sign anyone out.
    }
  }, [session, user?.role, persistSession]);

  const value: AuthContextValue = {
    user,
    session,
    isLoading,
    isAuthenticated: !!session && !!user,
    signInWithOtp,
    verifyOtp,
    signInWithCredentials,
    signUpWithCredentials,
    signOut,
    refreshUser,
    demoSignIn,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
