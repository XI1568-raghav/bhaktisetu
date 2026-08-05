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

// Web ↔ API role alias. API enum uses `pandit`; web uses `priest` for routing
// (`/priest`, getRoleLabel, etc.). Convert at the network boundary only.
function toApiRole(role: UserRole): string {
 return role === 'priest' ? 'pandit' : role;
}
function fromApiRole(role: string | undefined | null): UserRole {
 if (role === 'pandit') return 'priest';
 return (role as UserRole) || 'devotee';
}

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
 /** Display name for analytics identity (PostHog identify). Optional — populated when available. */
 displayName?: string;
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
 signUpWithCredentials: (data: SignUpData) => Promise<{ success: boolean; message: string; accessToken?: string; userId?: string }>;
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

// P0 #198 (2026-08-05): 9 demo accounts (incl. admin@demo.com, password
// 'demo123') + the demo-token generator were shipped in the PRODUCTION client
// bundle — anyone could mint a demo session from the browser console. Gate the
// entire demo surface behind a non-production check so it's stripped/inert in
// prod builds. The UI chips are already gated; this kills the credentials too.
const DEMO_ENABLED =
  process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_SHOW_DEMO === 'true';

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
} : {};

// The handle in the token (`demo-<handle>-token`) tells the API which seeded
// demo user this session is for. Generic `demo-access-token-poojly` would
// always resolve to the devotee — so role-specific surfaces (priest inbox,
// astrologer consultations) would show the WRONG side's data.
function handleForEmail(email: string): string {
 // P0 #198: only resolve a demo handle when the demo surface is enabled; in
 // production this collapses to 'devotee' but is never reached because
 // DEMO_ACCOUNTS is empty and the demo branch is gated below.
 if (!DEMO_ENABLED) return 'devotee';
 const map: Record<string, string> = {
 'devotee@demo.com': 'devotee',
 'pandit@demo.com': 'pandit',
 'priest@demo.com': 'pandit',
 'store@demo.com': 'store',
 'astro@demo.com': 'astro',
 'wellness@demo.com': 'wellness',
 'gaushala@demo.com': 'gaushala',
 'temple@demo.com': 'temple',
 'admin@demo.com': 'admin',
 };
 return map[email.toLowerCase()] ?? 'devotee';
}

function makeDemoSession(email = 'devotee@demo.com'): AuthSession {
 const handle = handleForEmail(email);
 return {
 accessToken: `demo-${handle}-token`,
 refreshToken: `demo-${handle}-refresh`,
 expiresIn: 86400,
 expiresAt: Math.floor(Date.now() / 1000) + 86400,
 };
}

// Default demo user (for legacy demoSignIn). Empty in production — demoSignIn
// is gated below and will no-op rather than mint an admin-shaped session.
const DEMO_USER: AuthUser | null = DEMO_ENABLED ? DEMO_ACCOUNTS['devotee@demo.com']!.user : null;

// ─── Role redirect map ────────────────────────────────────────────────────────

export function getRoleDashboardPath(role: UserRole): string {
 switch (role) {
 case 'priest':
 return '/priest';
 case 'store_owner':
 return '/store-admin';
 case 'astrologer':
 return '/astrologer-portal';
 case 'wellness_instructor':
 return '/wellness-portal';
 case 'gaushala_manager':
 return '/gaushala-portal';
 case 'temple_manager':
 return '/temple-portal';
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
 // TODO P1#4: remove once all reads migrated — backend HttpOnly
 // `darshya_session` cookie + in-memory session state will be the
 // only auth surfaces. localStorage write is kept transitionally so
 // existing reads (e.g. shipped legacy bundles) don't break mid-rollout.
 try {
 localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sess));
 localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(usr));
 } catch {
 // localStorage may be unavailable
 }
 // Pillar Analytics — identify PostHog user on session persistence (was never called).
 try {
   if (typeof window !== 'undefined' && window.posthog?.identify) {
     window.posthog.identify(usr.id, {
       email: usr.email,
       role: usr.role,
       display_name: usr.displayName,
     });
   }
 } catch {
   /* posthog not loaded — skip */
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

 // Check if token is expired (60-second buffer). `expiresAt` is stored in
 // MILLISECONDS (signup writes `expires_at * 1000`), so compare in ms.
 // Legacy sessions may carry a seconds-value — treat <1e12 as seconds.
 const nowMs = Date.now();
 const expMs =
 storedSession.expiresAt && storedSession.expiresAt < 1e12
 ? storedSession.expiresAt * 1000
 : storedSession.expiresAt;
 if (expMs && expMs < nowMs + 60_000) {
 // Token expired or about to expire — refresh it.
 // P1#4: credentials:'include' so HttpOnly refresh cookie is sent.
 const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 credentials: 'include',
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

 // Proactive refresh while the tab stays open. Supabase access tokens
 // last ~1h; we refresh ~5 min before expiry so long single-page sessions
 // (gaushala dashboard, etc.) never hit a 401 mid-action.
 useEffect(() => {
 if (!session || session.accessToken.startsWith('demo-')) return;
 const expMs =
 session.expiresAt && session.expiresAt < 1e12
 ? session.expiresAt * 1000
 : session.expiresAt;
 if (!expMs) return;
 const refreshAt = expMs - 5 * 60_000;
 const delay = Math.max(refreshAt - Date.now(), 10_000);
 const timer = setTimeout(async () => {
 try {
 const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 credentials: 'include',
 body: JSON.stringify({ refreshToken: session.refreshToken }),
 });
 if (res.ok) {
 const data = await res.json();
 if (data?.session && user) {
 setSession(data.session);
 persistSession(data.session, user);
 }
 }
 } catch {
 // Silent — next API call's own retry path will surface if still bad.
 }
 }, delay);
 return () => clearTimeout(timer);
 }, [session, user, persistSession]);

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
 role: fromApiRole(data.user.role),
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
 const demoSession = makeDemoSession(emailLower);
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
 role: fromApiRole(data.user.role),
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
 body: JSON.stringify({ ...data, role: toApiRole(data.role) }),
 });

 const result = await res.json();

 if (!res.ok) {
 return { success: false, message: result.message || 'Registration failed' };
 }

 const newSession: AuthSession = result.session;
 const newUser: AuthUser = {
 ...result.user,
 role: fromApiRole(result.user?.role) || data.role,
 };

 setSession(newSession);
 setUser(newUser);
 persistSession(newSession, newUser);

 return {
 success: true,
 message: 'Account created successfully',
 accessToken: newSession?.accessToken,
 userId: newUser.id,
 };
 } catch {
 // P0 #195 (2026-08-03): the API is unreachable — do NOT silently mint a fake
 // demo session for a REAL signup. That fabricated a session the prod API
 // rejects (401 on every call) and told the user their account was created
 // when it was not. Fail loudly so the user can retry; demo sessions are for
 // the explicit demo accounts only.
 return {
 success: false,
 message: 'Could not reach the server to create your account. Please check your connection and try again.',
 };
 }
 }, [persistSession]);

 /**
 * Signs out the user and clears the session.
 */
 const signOut = useCallback(async () => {
 try {
 if (session?.accessToken && !session.accessToken.startsWith('demo-')) {
 // P1#4: credentials:'include' ensures the HttpOnly `darshya_session`
 // cookie is sent so the backend /auth/logout can clear it
 // (Set-Cookie expires=0). Bearer body retained for transition.
 await fetch(`${API_BASE_URL}/auth/logout`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 credentials: 'include',
 body: JSON.stringify({ accessToken: session.accessToken }),
 });
 }
 } catch {
 // Best-effort logout
 } finally {
 setSession(null);
 setUser(null);
 persistSession(null, null);
 // Pillar Analytics — reset PostHog identity on logout (was never called).
 try {
   if (typeof window !== 'undefined' && window.posthog?.reset) {
     window.posthog.reset();
   }
 } catch {
   /* posthog not loaded — skip */
 }
 }
 }, [session, persistSession]);

 /**
 * Demo sign-in — instantly logs in with the default devotee demo user.
 * P0 #198: no-op in production (DEMO_USER is null) so it can never mint a
 * demo session from the shipped bundle.
 */
 const demoSignIn = useCallback(() => {
 if (!DEMO_ENABLED || !DEMO_USER) return;
 const demoSession = makeDemoSession(DEMO_USER.email ?? 'devotee@demo.com');
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
 role: data.user.role ? fromApiRole(data.user.role) : (user?.role || 'devotee'),
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
