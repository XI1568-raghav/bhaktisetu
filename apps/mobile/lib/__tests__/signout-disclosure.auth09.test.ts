import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import {
  SIGN_OUT_TITLE,
  SIGN_OUT_GLOBAL_MESSAGE,
} from '../signout-copy';

/**
 * AUTH-09 — "Signing out on one device signs the user out of every device,
 * with no indication anywhere that it will."
 *
 * The web half of this was closed: seven portal layouts and the nav menu route
 * through /auth/logout, which says "For your security this signs you out on all
 * your devices, not just this one", and /profile offers an explicit per-device
 * choice. The MOBILE half was not. Six screens asked "Are you sure?" — a
 * question about a consequence they never stated — and `signOut` in
 * lib/auth-context.tsx posts /api/v1/auth/logout with no `scope`, which the API
 * defaults to `global`:
 *
 *   apps/api/src/routes/auth.ts   `const scope = parseResult.data.scope ?? 'global'`
 *                                 then, for global, supabase.auth.signOut() plus
 *                                 UPDATE refresh_token_jtis SET used_at = now()
 *                                 WHERE user_id = $1 AND used_at IS NULL
 *                                 and the same sweep over email_sessions.
 *
 * So every tap on the phone ends the session on the desktop too, silently.
 *
 * WHY A SOURCE SCAN. This runner is `environment: 'node'` and deliberately does
 * not render React Native (see vitest.config.ts). The screens are .tsx with no
 * exported handler, so the reachable contract is: every screen that signs out
 * reaches for the shared constants, and none of them still carries the old
 * question. Comments are stripped first — a guard a docblock can satisfy is not
 * a guard.
 *
 * The screen list is DISCOVERED, not hardcoded. A hardcoded list of six is how
 * a seventh screen ships without the disclosure; this walks every route file
 * and derives the population from `signOut(` itself.
 */

const APP_DIR = path.resolve(__dirname, '../../app');

/** Source with block and line comments removed. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/** Every .tsx route file under apps/mobile/app, recursively. */
function routeFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...routeFiles(full));
    else if (entry.name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/**
 * Screens that actually END a session on a user's deliberate action: they call
 * `signOut(` from an `Alert.alert` confirmation. `_layout.tsx` and the auth
 * context wire `signOut` to a 401 handler instead — an involuntary sign-out has
 * nothing to disclose beforehand, because the user did not choose it.
 */
function deliberateSignOutScreens(): string[] {
  return routeFiles(APP_DIR).filter((f) => {
    const src = stripComments(readFileSync(f, 'utf8'));
    return /Alert\.alert\(/.test(src) && /\bsignOut\(/.test(src);
  });
}

describe('AUTH-09 — the mobile sign-out says it is global before it happens', () => {
  it('names the other devices, not just this one', () => {
    expect(SIGN_OUT_GLOBAL_MESSAGE).toMatch(/all your devices/i);
    expect(SIGN_OUT_GLOBAL_MESSAGE).toMatch(/not just this one/i);
    // It must be a statement of consequence, not the question it replaced.
    expect(SIGN_OUT_GLOBAL_MESSAGE).not.toMatch(/are you sure/i);
    expect(SIGN_OUT_TITLE).toBe('Sign Out');
  });

  it('finds the sign-out screens by what they do, not by a list', () => {
    // If this drops to zero the two tests below become vacuously true, which is
    // exactly how a scan-based guard rots.
    const screens = deliberateSignOutScreens();
    expect(screens.length).toBeGreaterThanOrEqual(6);
  });

  it('every one of them uses the shared disclosure', () => {
    const missing: string[] = [];
    for (const f of deliberateSignOutScreens()) {
      const src = stripComments(readFileSync(f, 'utf8'));
      const usesShared =
        /SIGN_OUT_GLOBAL_MESSAGE/.test(src) && /from '.*signout-copy'/.test(src);
      if (!usesShared) missing.push(path.relative(APP_DIR, f));
    }
    expect(missing).toEqual([]);
  });

  it('no screen still asks the question without stating the answer', () => {
    const stale: string[] = [];
    for (const f of deliberateSignOutScreens()) {
      const src = stripComments(readFileSync(f, 'utf8'));
      if (/Are you sure/i.test(src)) stale.push(path.relative(APP_DIR, f));
    }
    expect(stale).toEqual([]);
  });
});
