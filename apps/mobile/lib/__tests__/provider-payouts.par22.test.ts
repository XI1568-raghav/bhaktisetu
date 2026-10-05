import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { payoutGate } from '../payout-gate';
import type { PayoutBalanceVM } from '../api-contracts';

/**
 * PAR-22, the half that was still missing.
 *
 * The earlier pass built the four screens the finding names by title — astrologer
 * earnings, wellness earnings, temple payouts, temple bookings — and
 * provider-earnings.par22.test.ts pins those. It did not cover the web surface
 * that serves the REST of the provider roles.
 *
 * apps/web/app/payouts/page.tsx describes itself as "the single payout surface
 * for ALL provider roles" and enumerates them:
 *
 *   priest · astrologer · wellness_instructor · store_owner ·
 *   temple_manager · gaushala_manager · admin
 *
 * On mobile, three of those had no money surface at all:
 *
 *   astrologer        (astrologer)/earnings.tsx reads astrologer-portal/earnings
 *                     — a ledger. No balance, no way to withdraw.
 *   store_owner       (store-admin)/revenue.tsx is STORE revenue (gross sales),
 *                     which is not the provider's withdrawable balance.
 *   gaushala_manager  nothing whatsoever.
 *
 * A provider who can see what they earned but cannot ask for it is the exact
 * dead end the web /payouts page was built to close (#233: "every other provider
 * role had a dead/empty earnings page with no way to actually withdraw").
 *
 * `temple_manager` is deliberately NOT in the list below. (temple)/payouts.tsx
 * reads temple-portal/payouts, which is the TemplePayout revenue-share rail —
 * a different ledger from the PayoutRequest rail, not a substitute for it. It is
 * out of scope here rather than silently counted as covered.
 */

// ─── the gate, as behaviour rather than as source text ───────────────────────

const READY: PayoutBalanceVM = {
  availableInr: 1260,
  upcomingInr: null,
  pendingInr: 0,
  paidOutInr: 4200,
  kycVerified: true,
  kycOnFile: true,
};

describe('PAR-22 payoutGate', () => {
  it('allows a withdrawal when KYC is verified, a payout method is on file and money is available', () => {
    expect(payoutGate(READY, false)).toEqual({ canRequest: true, reason: null });
  });

  it('refuses — and says why — when KYC is not verified', () => {
    const gate = payoutGate({ ...READY, kycVerified: false }, false);
    expect(gate.canRequest).toBe(false);
    expect(gate.reason).toMatch(/kyc/i);
  });

  it('refuses when no bank account or UPI ID is on file', () => {
    const gate = payoutGate({ ...READY, kycOnFile: false }, false);
    expect(gate.canRequest).toBe(false);
    expect(gate.reason).toMatch(/bank|upi/i);
  });

  it('reports the KYC block first when BOTH gates are shut', () => {
    // Order matters to the provider: adding a bank account does nothing until
    // KYC clears, so naming the bank first sends them down a dead path.
    const gate = payoutGate({ ...READY, kycVerified: false, kycOnFile: false }, false);
    expect(gate.reason).toMatch(/kyc/i);
  });

  it('refuses a zero balance without implying a KYC problem', () => {
    const gate = payoutGate({ ...READY, availableInr: 0 }, false);
    expect(gate.canRequest).toBe(false);
    expect(gate.reason).toMatch(/nothing|available/i);
    expect(gate.reason).not.toMatch(/kyc/i);
  });

  it('treats an UNPARSEABLE available amount as not-withdrawable, never as zero-and-fine', () => {
    // `money()` yields null when the server sends something non-numeric.
    // Coercing that to 0 and reporting "nothing available" states a balance the
    // server never gave; the honest answer is that it is unknown.
    const gate = payoutGate({ ...READY, availableInr: null }, false);
    expect(gate.canRequest).toBe(false);
    expect(gate.reason).toMatch(/could not|unknown|unavailable/i);
  });

  it('refuses while a request is already in flight, so one tap cannot double-submit', () => {
    expect(payoutGate(READY, true).canRequest).toBe(false);
  });

  it('refuses a null balance rather than offering a withdrawal against nothing', () => {
    // A 403 or a network failure selects to null. Rendering an enabled button
    // there asks the provider to withdraw a balance we never loaded.
    const gate = payoutGate(null, false);
    expect(gate.canRequest).toBe(false);
    expect(gate.reason).toMatch(/could not|unavailable/i);
  });
});

// ─── the screens ─────────────────────────────────────────────────────────────

const APP = path.resolve(__dirname, '../../app');
const LIB = path.resolve(__dirname, '..');

/** Source with comments stripped — a guard must match code, not its own prose. */
function strip(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function code(rel: string): string {
  return strip(readFileSync(path.join(APP, rel), 'utf8'));
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** [role, group, screen file, the screen that must link to it if hidden] */
const ROLES: Array<[string, string, string, string | null]> = [
  // astrologer already carries six tabs, so its payout screen is hidden and
  // reached from the earnings screen — "what did I earn" next to "send it to me".
  ['astrologer', '(astrologer)', '(astrologer)/payouts.tsx', '(astrologer)/earnings.tsx'],
  ['store owner', '(store-admin)', '(store-admin)/payouts.tsx', null],
  ['gaushala manager', '(gaushala)', '(gaushala)/payouts.tsx', null],
  // The pandit was the ONE role the web page names that this file left out,
  // and the omission looked like coverage: (priest)/payouts.tsx has existed the
  // whole time. It reads /priest/payouts — the legacy PriestPayout sidecar,
  // which is a list of payouts an admin already created. No balance, no
  // request endpoint, no button. Seeing history is not being able to withdraw.
  ['pandit', '(priest)', '(priest)/payouts.tsx', null],
];

describe('PAR-22 — every provider role can reach the payout surface', () => {
  for (const [role, group, screen, linkFrom] of ROLES) {
    const layout = `${group}/_layout.tsx`;

    it(`${role} has a payouts screen`, () => {
      expect(existsSync(path.join(APP, screen))).toBe(true);
    });

    it(`${role}'s payouts screen is declared in its layout`, () => {
      // Undeclared is not "hidden" in expo-router — it is a stray extra tab.
      // See tab-route-registration.par15.test.ts.
      expect(code(layout)).toMatch(/name=["']payouts["']/);
    });

    it(`${role} can actually get to it`, () => {
      const decl = code(layout)
        .split('<Tabs.Screen')
        .find((c) => /name=["']payouts["']/.test(c))!;
      if (!/href:\s*null/.test(decl)) return; // on the tab bar; nothing more to prove

      // Off the bar, so something on the bar must PUSH it. A registered route
      // with no link is the same dead end as a missing screen.
      expect(linkFrom, `${role} hides payouts but names no screen linking to it`).toBeTruthy();
      // Deliberately the navigation call and the literal route, not the word
      // "payouts": a negative control that replaced the real router.push with a
      // no-op still passed a bare /payouts/ match, because `styles.payoutLink`
      // and accessibilityLabel="Payouts" survive in the same file. A guard that
      // a dead button satisfies is not a guard.
      const route = escapeRe(`/${group}/payouts`); // e.g. /\(astrologer\)/payouts
      const nav = new RegExp(`router\\.(push|replace|navigate)\\(\\s*['"\`]${route}`);
      expect(code(linkFrom!), `${linkFrom} must navigate to ${group}/payouts`).toMatch(nav);
    });
  }

  it('every payout screen reads the provider-scoped routes, never the admin one', () => {
    // /admin/commissions 403s every provider role no matter what query string is
    // attached — the reason the web wellness earnings page was dead before it
    // was repointed. Pinned on the shared component the screens render.
    const shared = strip(readFileSync(path.join(LIB, 'provider-payouts.tsx'), 'utf8'));
    expect(shared).toMatch(/usePayoutBalance/);
    expect(shared).toMatch(/useProviderCommissions/);
    expect(shared).toMatch(/useRequestPayout/);
    expect(shared).not.toMatch(/admin\/commissions/);
  });

  it('the shared screen decides the button through payoutGate, not inline booleans', () => {
    const shared = strip(readFileSync(path.join(LIB, 'provider-payouts.tsx'), 'utf8'));
    expect(shared).toMatch(/payoutGate\(/);
  });

  it('no payout screen renders a hardcoded rupee figure', () => {
    // PAR-10 deleted "Earnings (mo) ₹54,200" — a string literal with no endpoint
    // behind it — from the wellness dashboard. Not again, in four more places.
    const files = [
      path.join(LIB, 'provider-payouts.tsx'),
      ...ROLES.map(([, , screen]) => path.join(APP, screen)),
      path.join(APP, '(wellness)/earnings.tsx'),
    ];
    for (const f of files) {
      expect(strip(readFileSync(f, 'utf8')), f).not.toMatch(/['"`]\s*₹\s*[\d,]+/);
    }
  });

  it('the wellness earnings screen was not duplicated to build these', () => {
    // Four hand-copied payout screens drift, and the one that drifts is the one
    // that keeps paying out under a stale gate. They share one component.
    const wellness = code('(wellness)/earnings.tsx');
    expect(wellness).toMatch(/provider-payouts/);
    for (const [, , screen] of ROLES) {
      expect(code(screen), screen).toMatch(/provider-payouts/);
    }
  });
});

describe('PAR-22 — the pandit can ask for the money, not only look at it', () => {
  const src = code('(priest)/payouts.tsx');

  it('renders the shared withdrawal surface', () => {
    // Not a fifth hand-written copy: the gate has four refusal reasons and the
    // ledger has a deliberate null convention, and the copy that drifts is the
    // one still offering a withdrawal the server refuses.
    expect(src).toMatch(/ProviderPayouts/);
    expect(src).toMatch(/provider-payouts/);
  });

  it('keeps the legacy PriestPayout rail instead of hiding money it cannot pay', () => {
    // DI-05, and this is the reason the two lists have to coexist:
    // payout.service.ts:280-290 reports `legacyPandit` SEPARATELY and keeps it
    // OUT of availableInr, because POST /payouts/request settles Commission
    // rows only. A pandit whose earnings sit on the sidecar rail would see the
    // new surface say Rs 0 available. Dropping the old list to make room for
    // the new one hides real money that is genuinely owed.
    expect(src).toMatch(/usePriestPayouts/);
  });

  it('says on screen that the legacy rail settles separately', () => {
    // Comments are stripped before this runs, so the sentence has to be in the
    // rendered copy. Two money lists with no explanation read as a duplicate —
    // or worse, as money the Request button is about to send.
    expect(src).toMatch(/settled separately|settles separately|separate rail/i);
  });

  it('pull-to-refresh reaches the legacy list too', () => {
    // The shared component owns the RefreshControl. A footer with its own query
    // that the refresh does not touch is a list that silently goes stale under
    // a control that claims to have refreshed the screen.
    expect(src).toMatch(/onExtraRefresh/);
    const shared = strip(readFileSync(path.join(LIB, 'provider-payouts.tsx'), 'utf8'));
    expect(shared).toMatch(/onExtraRefresh/);
  });

  it('does not put a rupee literal on the legacy rows either', () => {
    expect(src).not.toMatch(/['"`]\s*₹\s*[\d,]+/);
  });
});
