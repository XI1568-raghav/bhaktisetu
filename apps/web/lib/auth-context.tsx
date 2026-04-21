'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { API_BASE_URL } from './api-config';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type UserRole = 'devotee' | 'priest' | 'store_owner' | 'astrologer' | 'wellness_instructor' | 'gaushala_manager' | 'temple_manager' | 'admin';

export interface AuthUser {
  id: string;
  phone: string;
  fullName: string;
  email: string | null;
  avatarUrl: string | null;
  preferredLanguage: string;
  subscriptionTier: string;
  isNewUser?: boolean;
  role: UserRole;
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
  signInWithCredentials: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  signUpWithCredentials: (data: SignUpData) => Promise<{ success: boolean; message: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  demoSignIn: () => void;
}

export interface SignUpData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
}

// ─── Demo accounts ───────────────────────────────────────────────────────────

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

// Default demo user (for legacy demoSignIn)
const DEMO_USER: AuthUser = DEMO_ACCOUNTS['devotee@demo.com']!.user;

// ─── Role redirect map ────────────────────────────────────────────────────────

export function getRoleDashboardPath(role: UserRole): string {
  switch (role) {
    case 'priest':
      return '/priest';
    case 'store_owner':
      return '/store-admin';
    case 'astrologer':
      return '/dashboard';
    case 'wellness_instructor':
      return '/dashboard';
    case 'gaushala_manager':
      return '/dashboard';
    case 'temple_manager':
      return '/dashboard';
    case 'admin':
      return '/admin';
    case 'devotee':
    default:
      return '/dashboard';
  }
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'devotee': return 'Devotee';
    case 'priest': return 'Pandit';
    case 'store_owner': return 'Store Owner';
    case 'astrologer': return 'Astrologer';
    case 'wellness_instructor': return 'Wellness Instructor';
    case 'gaushala_manager': return 'Gaushala Manager';
    case 'temple_manager': return 'Temple Manager';
    case 'admin': return 'Admin';
    default: return 'User';
  }
}

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
  SESSION: 'poojly_session',
  USER: 'poojly_user',
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

        // Ensure role field exists (backwards compat)
        if (!storedUser.role) {
          storedUser.role = 'devotee';
        }

        // Check if this is a demo session — skip token refresh
        if (storedSession.accessToken.startsWith('demo-')) {
          setSession(storedSession);
          setUser(storedUser);
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
    } catch {
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
      const newUser: AuthUser = {
        ...data.user,
        role: data.user.role || 'devotee',
      };

      setSession(newSession);
      setUser(newUser);
      persistSession(newSession, newUser);

      return {
        success: true,
        message: data.message,
        isNewUser: newUser.isNewUser,
      };
    } catch {
      return { success: false, message: 'Network error. Please check your connection.' };
    }
  }, [persistSession]);

  /**
   * Sign in with email and password.
   * Checks demo accounts first, then falls through to API.
   */
  const signInWithCredentials = useCallback(async (email: string, password: string) => {
    const emailLower = email.toLowerCase().trim();

    // Check demo accounts
    const demoAccount = DEMO_ACCOUNTS[emailLower];
    if (demoAccount && demoAccount.password === password) {
      const demoSession = makeDemoSession();
      setSession(demoSession);
      setUser(demoAccount.user);
      persistSession(demoSession, demoAccount.user);
      return { success: true, message: 'Signed in successfully' };
    }

    // Try API login
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailLower, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, message: data.message || 'Invalid email or password' };
      }

      const newSession: AuthSession = data.session;
      const newUser: AuthUser = {
        ...data.user,
        role: data.user.role || 'devotee',
      };

      setSession(newSession);
      setUser(newUser);
      persistSession(newSession, newUser);

      return { success: true, message: 'Signed in successfully' };
    } catch {
      // If API is unreachable and not a demo account
      if (demoAccount) {
        return { success: false, message: 'Incorrect password' };
      }
      return { success: false, message: 'Invalid email or password. Try a demo account: devotee@demo.com / demo123' };
    }
  }, [persistSession]);

  /**
   * Sign up with credentials (demo mode: stores locally).
   */
  const signUpWithCredentials = useCallback(async (data: SignUpData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        return { success: false, message: result.message || 'Registration failed' };
      }

      const newSession: AuthSession = result.session;
      const newUser: AuthUser = {
        ...result.user,
        role: data.role,
      };

      setSession(newSession);
      setUser(newUser);
      persistSession(newSession, newUser);

      return { success: true, message: 'Account created successfully' };
    } catch {
      // Demo fallback — create local session
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
      persistSession(demoSession, newUser);

      return { success: true, message: 'Account created successfully (demo mode)' };
    }
  }, [persistSession]);

  /**
   * Signs out the user and clears the session.
   */
  const signOut = useCallback(async () => {
    try {
      if (session?.accessToken && !session.accessToken.startsWith('demo-')) {
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
   * Demo sign-in — instantly logs in with the default devotee demo user.
   */
  const demoSignIn = useCallback(() => {
    const demoSession = makeDemoSession();
    setSession(demoSession);
    setUser(DEMO_USER);
    persistSession(demoSession, DEMO_USER);
  }, [persistSession]);

  /**
   * Refreshes the user profile data from the API.
   */
  const refreshUser = useCallback(async () => {
    if (!session?.accessToken) return;
    if (session.accessToken.startsWith('demo-')) return;

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
          role: data.user.role || user?.role || 'devotee',
        };
        setUser(updatedUser);
        persistSession(session, updatedUser);
      }
    } catch {
      // Silently fail — user data stays stale
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

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
