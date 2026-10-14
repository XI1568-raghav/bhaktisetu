'use client';

import {
 createContext,
 useContext,
 useEffect,
 useState,
 useCallback,
 type ReactNode,
 type MouseEvent as ReactMouseEvent,
} from 'react';
import {
 API_BASE_URL,
 fetchWithTimeout,
 isNetworkFailure,
 NETWORK_ERROR_MESSAGE,
 UNREADABLE_RESPONSE_MESSAGE,
 readJsonBody,
 authHttpErrorMessage,
} from './api-config';
import { hasStoredProfile, reviveSessionFromCookieResult } from './session-revive';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type UserRole = 'devotee' | 'priest' | 'store_owner' | 'astrologer' | 'wellness_instructor' | 'gaushala_manager' | 'temple_manager' | 'admin';

// Web ↔ API role alias. API enum uses `pandit`; web uses `priest` for routing
// (`/priest`, getRoleLabel, etc.). Convert at the network boundary only.
function toApiRole(role: UserRole): string {
 return role === 'priest' ? 'pandit' : role;
}
// A-011 (2026-08-10): exported. The Google OAuth callback persisted the raw
// API role, so a pandit was stored as `pandit` — a value no web-side role
// check (`getRoleDashboardPath`, `AuthGuard.allowedRoles`) knows about, which
// silently degrades to the devotee dashboard. EVERY path that persists a user
// must run the API role through this.
export function fromApiRole(role: string | undefined | null): UserRole {
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
 /** Self-declared 'I live outside India' flag (users.isNri). Optional: only present once /auth/me has been read. */
 isNri?: boolean;
 /** Display name for analytics identity (PostHog identify). Optional — populated when available. */
 displayName?: string;
}

export interface AuthSession {
 accessToken: string;
 refreshToken: string;
 expiresIn: number;
 expiresAt: number;
}

/**
 * AUTH-09 — how far a sign-out reaches.
 *
 * `global` ends every session the account holds (the API burns every
 * `refresh_token_jtis` row); `local` ends only the one on this device.
 * Mirrors `logoutSchema` in apps/api/src/routes/auth.ts.
 */
export type SignOutScope = 'local' | 'global';

export interface SignOutOptions {
 scope?: SignOutScope;
}

/**
 * What `signOut` will actually be handed at runtime.
 *
 * Eight portal layouts wire it straight into a button — `onClick={signOut}` in
 * app/{admin,astrologer-portal,gaushala-portal,priest,store-admin,
 * temple-portal,wellness-portal}/layout.tsx and app/dashboard/page.tsx — so the
 * first argument is frequently a React MouseEvent and not an options bag. A
 * bare `(options?: SignOutOptions)` signature makes every one of those eight a
 * compile error (TypeScript's weak-type check: a MouseEvent shares no property
 * with SignOutOptions), which is why the previous pass left the signature
 * alone. Admitting the event in the type — and ignoring it at runtime via
 * `readSignOutScope` — keeps those call sites untouched and still gives callers
 * that DO pass options full checking on `scope`.
 */
export type SignOutArg = SignOutOptions | ReactMouseEvent;

/**
 * Reads a scope out of whatever `signOut` was called with.
 *
 * Deliberately structural rather than a cast: `onClick={signOut}` passes a
 * MouseEvent, which has no `scope`, so this returns undefined and the API's
 * global default applies — the pre-existing behaviour of every such button.
 * An unrecognised string is also treated as absent rather than forwarded, so a
 * typo can never widen or narrow a sign-out by accident.
 */
function readSignOutScope(arg: SignOutArg | undefined): SignOutScope | undefined {
 if (!arg || typeof arg !== 'object') return undefined;
 const raw = (arg as { scope?: unknown }).scope;
 return raw === 'local' || raw === 'global' ? raw : undefined;
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
 /**
  * AUTH-09: the argument is OPTIONAL and omitting it keeps today's behaviour
  * exactly — no `scope` on the wire, and the API's own default (global) applies.
  * See the implementation for why global must stay the default.
  */
 signOut: (options?: SignOutArg) => Promise<void>;
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
// 'demo123') were shipped in the PRODUCTION client bundle. To strip them in
// prod, the map must be provably dead at compile time: Next folds
// `process.env.NODE_ENV` to the literal 'production', so the assignment below
// becomes `const DEMO_ACCOUNTS = {}` and Terser drops the data object as
// unreferenced. A ternary/function keeps both branches — only this form strips.
const _DEMO_ACCOUNTS_DATA: Record<string, { password: string; user: AuthUser }> = {
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

// P0 #198: gate the map behind a compile-time-dead branch in production so
// Terser drops _DEMO_ACCOUNTS_DATA as unreferenced. The gate MUST reference only
// NODE_ENV (which Next inlines as the literal 'production', letting Terser fold
// and drop the data). Do NOT include NEXT_PUBLIC_SHOW_DEMO here — it's read at
// runtime (n.env), so it never folds and the data would stay bundled. Demo in
// prod is enabled instead by the separate server/seed path, not the bundle.
let _demoAccounts: Record<string, { password: string; user: AuthUser }> = {};
if (process.env.NODE_ENV !== 'production') {
  _demoAccounts = _DEMO_ACCOUNTS_DATA;
}
const DEMO_ACCOUNTS: Record<string, { password: string; user: AuthUser }> = _demoAccounts;
const DEMO_ENABLED = Object.keys(DEMO_ACCOUNTS).length > 0;

// The handle in the token (`demo-<handle>-token`) tells the API which seeded
// demo user this session is for. Generic `demo-access-token-poojly` would
// always resolve to the devotee — so role-specific surfaces (priest inbox,
// astrologer consultations) would show the WRONG side's data.
function handleForEmail(email: string): string {
 // P0 #198: only resolve a demo handle when the demo surface is enabled; in
 // production this collapses to 'devotee' but is never reached because
 // DEMO_ACCOUNTS is empty and the demo branch is gated below. The early return
 // also lets Terser drop the demo-email map from the prod bundle.
 if (!DEMO_ENABLED) return 'devotee';
 if (process.env.NODE_ENV === 'production') return 'devotee';
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
 // A-007 (2026-08-10): Secure on https so the cookie can never be set or sent
 // over a plaintext hop. Deliberately omitted on http://localhost — some
 // browsers drop Secure cookies there, which would break local dev sign-in.
 const secure =
   typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
 document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secure}`;
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

/**
 * Single writer for the browser-side auth stores. Exported so /auth/callback
 * (Google OAuth) persists through exactly this path instead of its own copy —
 * the duplicated copy is what produced A-011.
 *
 * A-007 (2026-08-10): the access + refresh tokens now live in ONE JS-readable
 * store, not two. `poojly_session` used to be written to BOTH localStorage and
 * a `path=/` cookie, and the cookie copy meant the browser attached both
 * tokens to every same-origin request (page navigations, RSC payloads, static
 * assets) — so they landed in the Next server's request logs and the CDN edge
 * on top of being readable by any injected script. Nothing reads that cookie:
 * middleware.ts gates on `poojly_user` only, and every other in-app reader
 * (org pages, AartiOptIn, NotificationPrompt) reads localStorage. It is now
 * written ONLY when localStorage is unavailable (Safari private mode et al),
 * which is the one case where loadSession's cookie fallback is the sole way a
 * session survives a reload — and a stale cookie from an older build is
 * actively cleared whenever localStorage works.
 *
 * NOTE: this only shrinks the blast radius, and the note that used to sit here
 * is now OUT OF DATE — it said full remediation waited on the API accepting the
 * httpOnly `darshya_refresh` cookie on POST /auth/refresh, "its Zod schema
 * currently REQUIRES refreshToken in the body". It no longer does:
 * apps/api/src/routes/auth.ts:54-55 marks the field `.optional()` and
 * `resolveRefreshToken` (:78-82) falls back to the cookie. loadSession now uses
 * exactly that (see the SEC-02 revive branch below), so a token-free browser
 * can already come back signed in.
 *
 * SEC-02 STEP 4 IS DONE — the token write below is gone. What used to force it
 * was never the API; it was the files that read
 * `localStorage['poojly_session'].accessToken` by hand and built their own
 * Bearer header, all outside this module. Re-grepped 2026-08-28 after the last
 * three were migrated (app/org/{accept,members,settings}, joining
 * app/org/page.tsx, components/AartiOptIn and components/NotificationPrompt):
 * NOTHING outside this file reads the key any more. app/auth/verify/page.tsx
 * had already dropped off that list.
 *
 * The API side is done too: apps/api/src/middlewares/auth.ts treats an empty or
 * whitespace-only `Authorization: Bearer` as ABSENT rather than as the
 * empty-string token, so a page that interpolates a missing token falls through
 * to the httpOnly `darshya_session` cookie instead of 401ing.
 */
export function persistAuthStorage(sess: AuthSession | null, usr: AuthUser | null) {
  if (!sess || !usr) {
    removeCookie(STORAGE_KEYS.SESSION);
    removeCookie(STORAGE_KEYS.USER);
    try {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
      localStorage.removeItem(STORAGE_KEYS.USER);
    } catch {
      // localStorage may be unavailable
    }
    return;
  }

  // The user cookie stays — middleware.ts gates portal paths on its presence.
  // It carries profile fields only, never a token.
  setCookie(STORAGE_KEYS.USER, JSON.stringify(usr), 7);

  // SEC-02 step 4 (2026-08-28) — THE TOKEN IS NO LONGER WRITTEN ANYWHERE A
  // SCRIPT CAN READ IT.
  //
  // The httpOnly `darshya_session` / `darshya_refresh` cookies are the durable
  // store now, and loadSession revives from them (see the revive branch below).
  // Every prerequisite is in place: the API accepts the cookie as a credential
  // (#200), both session kinds can revive from cookies alone — Supabase via
  // POST /auth/refresh, magic-link/email via POST /auth/session/revive — and no
  // file outside this module reads `poojly_session` by hand any more. The last
  // three that did (app/org/{accept,members,settings}) were migrated in the same
  // pass; the write was the only thing keeping them alive, and they were the
  // only thing keeping the write.
  //
  // The stale copy is actively REMOVED rather than left to expire: a browser
  // that signed in before this shipped would otherwise carry the exposure for
  // the entry's full lifetime, which is exactly what the finding is about.
  //
  // DEMO SESSIONS ARE THE ONE CARVE-OUT and it is compile-time dead in
  // production — the NODE_ENV test is first so Terser folds the whole branch
  // away, the same trick #198 used on DEMO_ACCOUNTS. A `demo-*` token is minted
  // locally by this file, has no cookie behind it and so nothing to revive
  // from, and is refused by the API in production. Without it the demo
  // walkthrough would forget itself on every reload.
  const isDemoSession =
    process.env.NODE_ENV !== 'production' && sess.accessToken.startsWith('demo-');

  try {
    if (isDemoSession) localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sess));
    else localStorage.removeItem(STORAGE_KEYS.SESSION);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(usr));
  } catch {
    // localStorage unavailable (Safari private mode). Nothing to fall back to
    // and nothing lost: the profile marker was already written to the cookie
    // above, and the httpOnly session pair is what this browser reloads from.
  }

  // A-007 kept a `path=/` cookie copy of the session for the localStorage-
  // unavailable case (Safari private mode). That is no longer a fallback worth
  // having: the browser attaches a `path=/` cookie to every same-origin
  // navigation, RSC payload and static asset, so it is strictly worse exposure
  // than the localStorage entry just removed — and the httpOnly pair already
  // covers that browser. Any copy an older build left behind is cleared.
  removeCookie(STORAGE_KEYS.SESSION);
}

/**
 * SEC-02 — persist the profile and NOTHING ELSE.
 *
 * Used by the cookie-revive path. That session was reconstructed from the
 * httpOnly `darshya_refresh` cookie, which means the cookie is already a
 * complete and durable store for it; writing a JS-readable copy alongside would
 * hand an injected script the credential back for no gain whatsoever. The
 * session lives in React state for the lifetime of the tab and is re-minted
 * from the cookie on the next load.
 *
 * `poojly_user` carries profile fields only — never a token — and is written to
 * both stores because middleware.ts reads the cookie while the in-app readers
 * read localStorage.
 */
function persistProfileOnly(usr: AuthUser): void {
  setCookie(STORAGE_KEYS.USER, JSON.stringify(usr), 7);
  try {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(usr));
  } catch {
    // localStorage unavailable — the cookie above is enough for the gate.
  }
}

// ─── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * AUTH-07 retry budget for the proactive token refresh.
 *
 * Bounded on purpose: a browser that cannot reach the API must not sit in a
 * retry loop for the life of the tab. Backoff is 30s, 60s, 2m, 4m, 5m (capped),
 * which covers a Render cold start and a short connectivity gap and gives up
 * well inside the token's own remaining life.
 */
const REFRESH_RETRY_BASE_MS = 30_000;
const MAX_REFRESH_ATTEMPTS = 5;

// ─── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
 const [user, setUser] = useState<AuthUser | null>(null);
 const [session, setSession] = useState<AuthSession | null>(null);
 const [isLoading, setIsLoading] = useState(true);
 // AUTH-07: bumping this re-arms the proactive-refresh effect below. Without
 // it a failed refresh could never schedule another one.
 const [refreshAttempt, setRefreshAttempt] = useState(0);

 /**
 * Persists session data via the shared writer (see persistAuthStorage) and
 * keeps the analytics identity in sync.
 */
 const persistSession = useCallback((sess: AuthSession | null, usr: AuthUser | null) => {
 persistAuthStorage(sess, usr);
 if (sess && usr) {
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
 let fromLocalStorage = false;

 // Try localStorage first, fall back to cookies
 try {
 const sessStr = localStorage.getItem(STORAGE_KEYS.SESSION);
 const userStr = localStorage.getItem(STORAGE_KEYS.USER);
 if (sessStr) storedSession = JSON.parse(sessStr);
 if (userStr) storedUser = JSON.parse(userStr);
 fromLocalStorage = !!(storedSession && storedUser);
 } catch {
 const sessCookie = getCookie(STORAGE_KEYS.SESSION);
 const userCookie = getCookie(STORAGE_KEYS.USER);
 if (sessCookie) storedSession = JSON.parse(sessCookie);
 if (userCookie) storedUser = JSON.parse(userCookie);
 }

 // SEC-02: the profile can be in the cookie while localStorage holds
 // nothing — /auth/verify writes only localStorage, persistAuthStorage
 // writes both, and a browser that evicted localStorage keeps the cookie.
 // Fill it in before deciding this visitor is signed out.
 if (!storedUser) {
 const userCookie = getCookie(STORAGE_KEYS.USER);
 if (userCookie) {
 try {
 storedUser = JSON.parse(userCookie);
 } catch {
 storedUser = null;
 }
 }
 }

 // ── SEC-02: no JS-readable token, but this browser has signed in before.
 //
 // This is the branch that makes the whole migration possible. Until now it
 // did not exist: "no `poojly_session` in localStorage" meant "signed out",
 // full stop, so deleting the localStorage write logged every user out on
 // their next page load and the token could never leave.
 //
 // The httpOnly `darshya_refresh` cookie is now sufficient on its own — see
 // the evidence in lib/session-revive.ts — so a token-free browser can mint
 // a live session and come back signed in.
 //
 // Gated on the profile marker (`poojly_user`, token-free) so an anonymous
 // visitor never pays a cross-origin round-trip and the homepage never needs
 // the API to be up in order to render.
 //
 // The revived session is put in MEMORY ONLY. It was reconstructed from a
 // cookie, so writing a JS-readable copy of it would re-create the exact
 // exposure this exists to remove.
 //
 // As of SEC-02 step 4 this IS the ordinary path, not a fallback: nothing
 // outside this module reads `poojly_session` any more, so persistAuthStorage
 // has stopped writing it and every signed-in browser arrives here on a cold
 // load. Only a demo session (dev-only) still has a local token to find.
 if (!storedSession && hasStoredProfile()) {
 const outcome = storedUser
 ? await reviveSessionFromCookieResult()
 : { session: null, apiAnswered: true };
 if (outcome.session && storedUser) {
 const revivedUser: AuthUser = { ...storedUser, role: fromApiRole(storedUser.role) };
 setSession(outcome.session as AuthSession);
 setUser(revivedUser);
 persistProfileOnly(revivedUser);
 } else if (outcome.apiAnswered) {
 // The marker outlived the cookie. Clear it: middleware.ts gates every
 // portal on its mere presence, so leaving it behind keeps handing a
 // signed-out visitor the portal shell instead of a clean 307 to login.
 persistSession(null, null);
 }
 // SEC-02 step 4: and if the API never ANSWERED, keep the marker. `null` used
 // to mean both "your cookies are dead" and "we never heard back", and this
 // branch cleared on either — survivable while only a token-free browser
 // reached it, but step 4 sends EVERY signed-in browser through here on every
 // cold load. A waking Render dyno past the 20s budget would otherwise sign
 // the whole user base out. This visitor renders as signed out for this load
 // and revives on the next one, which is the honest answer to "we do not know".
 setIsLoading(false);
 return;
 }

 if (!storedSession || !storedUser) {
 setIsLoading(false);
 return;
 }

 // A-007 (2026-08-10): localStorage answered, so the token cookie an older
 // build wrote is pure extra exposure — drop it instead of waiting out its
 // 7-day expiry. Only safe on this branch: when localStorage is unavailable
 // the cookie is the ONLY copy of the session.
 if (fromLocalStorage) {
 removeCookie(STORAGE_KEYS.SESSION);
 }

 // A-011 (2026-08-10): re-translate on every load, not just when the field is
 // missing. A user persisted before the /auth/callback fix carries the raw API
 // role (`pandit`), which survived every reload and permanently bounced that
 // pandit off /priest. fromApiRole is idempotent, so this also covers the
 // already-correct values and the legacy no-role case.
 const normalizedRole = fromApiRole(storedUser.role);
 const roleWasStale = normalizedRole !== storedUser.role;
 storedUser.role = normalizedRole;
 if (roleWasStale) {
 persistSession(storedSession, storedUser);
 }

 // A-003 (2026-08-10): the portal gate in middleware.ts is the `poojly_user`
 // cookie, but /auth/verify (magic link) writes only localStorage. Re-sync the
 // cookie from the session we just loaded so a valid session is never bounced
 // back to /auth/login by the newly gated /temple-portal and /payouts. Written
 // only when absent, so this can't extend an expiring cookie on every mount.
 if (fromLocalStorage && !getCookie(STORAGE_KEYS.USER)) {
 setCookie(STORAGE_KEYS.USER, JSON.stringify(storedUser), 7);
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
 const refreshRes = await fetchWithTimeout(`${API_BASE_URL}/auth/refresh`, {
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
 // Refresh failed — clear session. A suspended account gets told why.
 const failBody = await readJsonBody(refreshRes).catch(() => null);
 persistSession(null, null);
 if (isSuspendedBody(refreshRes.status, failBody)) {
   window.location.assign(suspendedLoginHref(suspensionReason(failBody)));
 }
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
 //
 // AUTH-07 (2026-08-20): THIS USED TO BE SILENT *AND* TERMINAL.
 //
 // The body was `if (res.ok) { … }` with no `else` and an empty `catch`, so a
 // failed refresh set no state at all — and this effect re-arms only when one
 // of its dependencies changes. Nothing changed, so the timer was never
 // scheduled again. ONE transient failure (a cold dyno, a dropped connection,
 // a 502) meant the token was never renewed, expired minutes later, and the
 // next action the user took 401'd with no explanation. `refreshAttempt` is
 // what lets the effect re-arm: it is a dependency, and bumping it IS the
 // retry.
 useEffect(() => {
 if (!session || session.accessToken.startsWith('demo-')) return;
 const expMs =
 session.expiresAt && session.expiresAt < 1e12
 ? session.expiresAt * 1000
 : session.expiresAt;
 if (!expMs) return;
 const refreshAt = expMs - 5 * 60_000;
 // A retry must not wait for the (already passed) refresh point again —
 // that is what turns a 30s backoff into a 10s-floor busy loop.
 const delay =
 refreshAttempt === 0
 ? Math.max(refreshAt - Date.now(), 10_000)
 : Math.min(REFRESH_RETRY_BASE_MS * 2 ** (refreshAttempt - 1), 5 * 60_000);

 const timer = setTimeout(async () => {
 // The session cannot be renewed. Signing out is the honest end state:
 // leaving a dead token in place makes every later action 401 with no
 // explanation, which is exactly what this finding describes.
 const giveUp = () => {
 setSession(null);
 setUser(null);
 persistSession(null, null);
 };
 const retryOrGiveUp = () => {
 if (Date.now() >= expMs || refreshAttempt >= MAX_REFRESH_ATTEMPTS) {
 giveUp();
 return;
 }
 setRefreshAttempt(refreshAttempt + 1);
 };

 try {
 const res = await fetchWithTimeout(`${API_BASE_URL}/auth/refresh`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 credentials: 'include',
 body: JSON.stringify({ refreshToken: session.refreshToken }),
 });
 if (res.ok) {
 const data = await readJsonBody<{ session?: AuthSession }>(res);
 if (data?.session && user) {
 setSession(data.session);
 persistSession(data.session, user);
 setRefreshAttempt(0);
 return;
 }
 // 200 with a body we cannot use is not a success.
 retryOrGiveUp();
 return;
 }
 if (res.status === 401 || res.status === 403) {
 // Definitive: the refresh credential itself is dead (expired,
 // rotated away, or family-revoked after a replay). Retrying cannot
 // help and would only delay telling the user.
 const failBody = res.status === 403 ? await readJsonBody(res).catch(() => null) : null;
 giveUp();
 if (isSuspendedBody(res.status, failBody)) {
   window.location.assign(suspendedLoginHref(suspensionReason(failBody)));
 }
 return;
 }
 retryOrGiveUp();
 } catch {
 // Network/timeout — the recoverable case, and the one the old empty
 // catch made permanent.
 retryOrGiveUp();
 }
 }, delay);
 return () => clearTimeout(timer);
 }, [session, user, persistSession, refreshAttempt]);

 // Any API call answered 403 "suspended" (lib/api-config.ts announces it): sign
 // out and say why on the login page instead of leaving a half-working session.
 useEffect(() => {
 const onSuspended = (e: Event) => {
   const reason = (e as CustomEvent<{ reason: string | null }>).detail?.reason ?? null;
   setSession(null);
   setUser(null);
   persistSession(null, null);
   if (!window.location.pathname.startsWith('/auth/')) {
     window.location.assign(suspendedLoginHref(reason));
   }
 };
 window.addEventListener(SUSPENDED_EVENT, onSuspended);
 return () => window.removeEventListener(SUSPENDED_EVENT, onSuspended);
 }, [persistSession]);

 /**
 * Sends OTP to the given phone number.
 */
 const signInWithOtp = useCallback(async (phone: string) => {
 try {
 const res = await fetchWithTimeout(`${API_BASE_URL}/auth/send-otp`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ phone }),
 });

 // AUTH-02: status BEFORE body. A gateway 502/503 answers with HTML, and
 // parsing that first threw a SyntaxError into the catch below — where it
 // came back out as "Network error", a sentence that names the wrong cause.
 if (!res.ok) {
 const errBody = await readJsonBody<{ message?: string }>(res);
 return {
 success: false,
 message: errBody?.message || authHttpErrorMessage(res.status, 'Failed to send OTP'),
 };
 }

 const data = await readJsonBody<{ message?: string }>(res);
 return { success: true, message: data?.message ?? 'OTP sent.' };
 } catch {
 return { success: false, message: 'Network error. Please check your connection.' };
 }
 }, []);

 /**
 * Verifies the OTP and establishes the user session.
 */
 const verifyOtp = useCallback(async (phone: string, token: string) => {
 try {
 const res = await fetchWithTimeout(`${API_BASE_URL}/auth/verify-otp`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ phone, token }),
 });

 // AUTH-02: status BEFORE body — see signInWithOtp above.
 if (!res.ok) {
 const errBody = await readJsonBody<{ message?: string }>(res);
 return {
 success: false,
 message: errBody?.message || authHttpErrorMessage(res.status, 'Verification failed'),
 };
 }

 const data = await readJsonBody<{ session?: AuthSession; user?: AuthUser; message?: string }>(res);
 if (!data?.session || !data?.user) {
 return { success: false, message: UNREADABLE_RESPONSE_MESSAGE };
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
 message: data.message ?? 'Signed in successfully',
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
 // SEC-02 (2026-08-12): `credentials: 'include'` is what lets the browser
 // KEEP the auth cookies this response carries. POST /auth/login calls
 // setAuthCookies() (apps/api/src/routes/auth.ts), issuing httpOnly
 // `darshya_session` + `darshya_refresh` — but the web is served from
 // darshya.online and the API from api.darshya.online, so this is a
 // cross-origin request, and `fetch` defaults to `credentials:'same-origin'`.
 // In that mode the browser DISCARDS the response's Set-Cookie headers. The
 // cookies were therefore never stored on the primary sign-in path, which is
 // why the JS-readable localStorage token is still the only credential that
 // works and why SEC-02 could not be closed. /refresh and /logout already
 // opted in; this door had been missed.
 //
 // Purely additive: the JSON Bearer response and the localStorage write below
 // are untouched, so no signed-in user is disturbed by this shipping. Retiring
 // the localStorage copy is a separate, larger step — 95 files under apps/web
 // hand-build `Authorization: Bearer ${session.accessToken}`, and seven of them
 // read it straight out of localStorage rather than from useAuth(), so cutting
 // the write now would 401 those surfaces. (The other half of that sentence —
 // "POST /auth/refresh still REQUIRES refreshToken in its Zod schema" — was
 // true when it was written and is not any more; see persistAuthStorage.)
 const res = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 credentials: 'include',
 body: JSON.stringify({ email: emailLower, password }),
 });

 // AUTH-02 (2026-08-20): STATUS FIRST. This used to be
 // `const data = await res.json(); if (!res.ok) …`, and the order was the
 // whole defect. A cold, crashed or suspended API answers through a gateway
 // that sends 502/503 with an HTML body; `res.json()` on HTML throws a
 // SyntaxError, which is not a network failure by isNetworkFailure's
 // definition, so it fell through the catch below to the last line and told
 // a user whose password was CORRECT that their email or password was
 // wrong. They then go and reset a password that was never the problem.
 // A 5xx is our failure and must say so.
 if (!res.ok) {
 const errBody = await readJsonBody<{ message?: string }>(res);
 return {
 success: false,
 message:
 errBody?.message || authHttpErrorMessage(res.status, 'Invalid email or password'),
 };
 }

 const data = await readJsonBody<{ session?: AuthSession; user?: AuthUser }>(res);
 if (!data?.session || !data?.user) {
 return { success: false, message: UNREADABLE_RESPONSE_MESSAGE };
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
 } catch (err) {
 // Do not blame the credentials for a network failure. This catch fires for
 // an unreachable/stalled API just as readily as for a real rejection, and it
 // used to answer "Invalid email or password." either way — sending a user
 // off to reset a password that was never wrong. The server's own 401 is
 // handled above, via `!res.ok`; anything reaching here never got an answer.
 if (isNetworkFailure(err)) {
 return { success: false, message: NETWORK_ERROR_MESSAGE };
 }
 if (demoAccount) {
 return { success: false, message: 'Incorrect password' };
 }
 // P0 #198: never advertise demo credentials in the login error (prod).
 return { success: false, message: 'Invalid email or password.' };
 }
 }, [persistSession]);

 /**
 * Sign up with credentials (demo mode: stores locally).
 */
 const signUpWithCredentials = useCallback(async (data: SignUpData) => {
 try {
 const res = await fetchWithTimeout(`${API_BASE_URL}/auth/register`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ ...data, role: toApiRole(data.role) }),
 });

 // AUTH-02: status BEFORE body — a gateway 502 was being reported as
 // "Registration failed", which reads as "we rejected your details".
 if (!res.ok) {
 const errBody = await readJsonBody<{ message?: string }>(res);
 return {
 success: false,
 message: errBody?.message || authHttpErrorMessage(res.status, 'Registration failed'),
 };
 }

 const result = await readJsonBody<{ session?: AuthSession | null; user?: AuthUser }>(res);
 if (!result?.user) {
 return { success: false, message: UNREADABLE_RESPONSE_MESSAGE };
 }
 // Email confirmation ON: the account exists but there is no session yet. That
 // is a success the signup page already knows how to present (no accessToken),
 // not an unreadable reply.
 if (!result.session) {
 return { success: true, message: 'Account created. Please confirm your email to sign in.' };
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
 *
 * AUTH-09 — scope is now sayable, and it was not before.
 *
 * POST /auth/logout accepts `scope: 'local' | 'global'`
 * (apps/api/src/routes/auth.ts `logoutSchema`), but this function hardcoded a
 * body of `{ accessToken }`, so every sign-out in the product was global and no
 * screen could offer "just this device" even if it wanted to. The local session
 * is cleared either way; what `scope` decides is whether the user's OTHER
 * devices stay signed in.
 *
 * GLOBAL REMAINS THE DEFAULT, and deliberately by OMISSION rather than by
 * sending `scope: 'global'`: every current caller invokes `signOut()` bare, and
 * the API reads an absent field as global. Defaulting to `local` here would
 * silently stop revoking other sessions on a lost or shared device — a security
 * regression dressed as a UX improvement. Callers that want the narrow scope
 * must ask for it, and should say so in the UI first (see /auth/logout, which
 * discloses the multi-device effect).
 */
 const signOut = useCallback(async (options?: SignOutArg) => {
 const scope = readSignOutScope(options);
 try {
 if (session?.accessToken && !session.accessToken.startsWith('demo-')) {
 // P1#4: credentials:'include' ensures the HttpOnly `darshya_session`
 // cookie is sent so the backend /auth/logout can clear it
 // (Set-Cookie expires=0). Bearer body retained for transition.
 await fetchWithTimeout(`${API_BASE_URL}/auth/logout`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 credentials: 'include',
 body: JSON.stringify({
   accessToken: session.accessToken,
   // Omitted, not defaulted — see the note above.
   ...(scope ? { scope } : {}),
 }),
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
 const res = await fetchWithTimeout(`${API_BASE_URL}/auth/me`, {
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
 isNri: data.user.isNri === true,
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
