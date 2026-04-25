import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, type AuthSession, type AuthUser, type UserRole } from '@poojly/api-client';

// ─── Demo accounts (mirror of apps/web/lib/auth-context.tsx) ─────────────────

const DEMO_ACCOUNTS: Record<string, { password: string; user: AuthUser }> = {
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
};

function makeDemoSession(): AuthSession {
  return {
    accessToken: 'demo-access-token-poojly',
    refreshToken: 'demo-refresh-token-poojly',
    expiresIn: 86400,
    expiresAt: Math.floor(Date.now() / 1000) + 86400,
  };
}

const DEMO_USER: AuthUser = DEMO_ACCOUNTS['devotee@demo.com']!.user;

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
          try {
            const refreshed = await api.post<{ success: boolean; session: AuthSession }>(
              '/api/v1/auth/refresh',
              { refreshToken: storedSession.refreshToken },
              { noAuth: true }
            );
            if (refreshed.success && refreshed.session) {
              setSession(refreshed.session);
              setUser(storedUser);
              await persistSession(refreshed.session, storedUser);
            } else {
              await persistSession(null, null);
            }
          } catch {
            await persistSession(null, null);
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
      const message = err instanceof Error ? err.message : 'Failed to send OTP';
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
        const message = err instanceof Error ? err.message : 'Verification failed';
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
        const message =
          err instanceof Error
            ? err.message
            : 'Invalid email or password. Try a demo account: devotee@demo.com / demo123';
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
        }>('/api/v1/auth/signup', data, { noAuth: true });
        const newUser: AuthUser = { ...result.user, role: data.role };
        setSession(result.session);
        setUser(newUser);
        await persistSession(result.session, newUser);
        return { success: true, message: 'Account created successfully' };
      } catch {
        // Demo fallback — local session
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

  const demoSignIn = useCallback(async () => {
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
      // silent
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
