'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { API_BASE_URL } from './supabase';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  phone: string;
  fullName: string;
  email: string | null;
  avatarUrl: string | null;
  preferredLanguage: string;
  subscriptionTier: string;
  isNewUser?: boolean;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithOtp: (phone: string) => Promise<{ success: boolean; message: string }>;
  verifyOtp: (phone: string, token: string) => Promise<{ success: boolean; message: string; isNewUser?: boolean }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  demoSignIn: () => void;
}

// ─── Demo user data ───────────────────────────────────────────────────────────

const DEMO_USER: AuthUser = {
  id: 'demo-user-001',
  phone: '+919876543210',
  fullName: 'Arjun Sharma',
  email: 'arjun@bhaktisetu.com',
  avatarUrl: null,
  preferredLanguage: 'hi',
  subscriptionTier: 'bhakti_pass',
};

const DEMO_SESSION: AuthSession = {
  accessToken: 'demo-access-token-bhaktisetu',
  refreshToken: 'demo-refresh-token-bhaktisetu',
  expiresIn: 86400,
  expiresAt: Math.floor(Date.now() / 1000) + 86400,
};

// ─── Cookie helpers ────────────────────────────────────────────────────────────

function setCookie(name: string, value: string, days: number = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match && match[2] ? decodeURIComponent(match[2]) : null;
}

function removeCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

// ─── Storage keys ──────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  SESSION: 'bhaktisetu_session',
  USER: 'bhaktisetu_user',
} as const;

// ─── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Persists session data to cookies (for SSR) and localStorage (for client hydration).
   */
  const persistSession = useCallback((sess: AuthSession | null, usr: AuthUser | null) => {
    if (sess && usr) {
      setCookie(STORAGE_KEYS.SESSION, JSON.stringify(sess), 7);
      setCookie(STORAGE_KEYS.USER, JSON.stringify(usr), 7);
      try {
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sess));
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(usr));
      } catch {
        // localStorage may be unavailable
      }
    } else {
      removeCookie(STORAGE_KEYS.SESSION);
      removeCookie(STORAGE_KEYS.USER);
      try {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
        localStorage.removeItem(STORAGE_KEYS.USER);
      } catch {
        // localStorage may be unavailable
      }
    }
  }, []);

  /**
   * Loads session from storage on mount and attempts to refresh if expired.
   */
  useEffect(() => {
    async function loadSession() {
      try {
        let storedSession: AuthSession | null = null;
        let storedUser: AuthUser | null = null;

        // Try localStorage first, fall back to cookies
        try {
          const sessStr = localStorage.getItem(STORAGE_KEYS.SESSION);
          const userStr = localStorage.getItem(STORAGE_KEYS.USER);
          if (sessStr) storedSession = JSON.parse(sessStr);
          if (userStr) storedUser = JSON.parse(userStr);
        } catch {
          const sessCookie = getCookie(STORAGE_KEYS.SESSION);
          const userCookie = getCookie(STORAGE_KEYS.USER);
          if (sessCookie) storedSession = JSON.parse(sessCookie);
          if (userCookie) storedUser = JSON.parse(userCookie);
        }

        if (!storedSession || !storedUser) {
          setIsLoading(false);
          return;
        }

        // Check if token is expired (with 60-second buffer)
        const now = Math.floor(Date.now() / 1000);
        if (storedSession.expiresAt && storedSession.expiresAt < now + 60) {
          // Token expired or about to expire — refresh it
          const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: storedSession.refreshToken }),
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            const newSession: AuthSession = refreshData.session;
            setSession(newSession);
            setUser(storedUser);
            persistSession(newSession, storedUser);
          } else {
            // Refresh failed — clear session
            persistSession(null, null);
          }
        } else {
          // Token still valid
          setSession(storedSession);
          setUser(storedUser);
        }
      } catch (err) {
        console.error('Failed to load auth session:', err);
        persistSession(null, null);
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();
  }, [persistSession]);

  /**
   * Sends OTP to the given phone number.
   */
  const signInWithOtp = useCallback(async (phone: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, message: data.message || 'Failed to send OTP' };
      }

      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, message: 'Network error. Please check your connection.' };
    }
  }, []);

  /**
   * Verifies the OTP and establishes the user session.
   */
  const verifyOtp = useCallback(async (phone: string, token: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, token }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, message: data.message || 'Verification failed' };
      }

      const newSession: AuthSession = data.session;
      const newUser: AuthUser = data.user;

      setSession(newSession);
      setUser(newUser);
      persistSession(newSession, newUser);

      return {
        success: true,
        message: data.message,
        isNewUser: newUser.isNewUser,
      };
    } catch (err) {
      return { success: false, message: 'Network error. Please check your connection.' };
    }
  }, [persistSession]);

  /**
   * Signs out the user and clears the session.
   */
  const signOut = useCallback(async () => {
    try {
      if (session?.accessToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: session.accessToken }),
        });
      }
    } catch {
      // Best-effort logout
    } finally {
      setSession(null);
      setUser(null);
      persistSession(null, null);
    }
  }, [session, persistSession]);

  /**
   * Demo sign-in — instantly logs in with a demo user (no API needed).
   */
  const demoSignIn = useCallback(() => {
    setSession(DEMO_SESSION);
    setUser(DEMO_USER);
    persistSession(DEMO_SESSION, DEMO_USER);
  }, [persistSession]);

  /**
   * Refreshes the user profile data from the API.
   */
  const refreshUser = useCallback(async () => {
    if (!session?.accessToken) return;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        const updatedUser: AuthUser = {
          id: data.user.id,
          phone: data.user.phone,
          fullName: data.user.fullName,
          email: data.user.email,
          avatarUrl: data.user.avatarUrl,
          preferredLanguage: data.user.preferredLanguage,
          subscriptionTier: data.user.subscriptionTier,
        };
        setUser(updatedUser);
        persistSession(session, updatedUser);
      }
    } catch {
      // Silently fail — user data stays stale
    }
  }, [session, persistSession]);

  const value: AuthContextValue = {
    user,
    session,
    isLoading,
    isAuthenticated: !!session && !!user,
    signInWithOtp,
    verifyOtp,
    signOut,
    refreshUser,
    demoSignIn,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
