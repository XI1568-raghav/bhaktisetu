import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RECURRING_SUBSCRIPTION_EVENT_STATUS, RECURRING_PLANS } from './recurring.service.js';

/**
 * PAY-04 / PAY-05 — the runbook and the dispatcher must name the SAME events.
 *
 * Both findings had the same shape and neither was a bug in a branch: the
 * branch was correct and simply never fired, because
 * docs/razorpay-live-activation.md — the document the owner actually works
 * from when configuring the Razorpay dashboard — did not tell them to
 * subscribe the event that reaches it. An unsubscribed event is
 * indistinguishable from a missing feature, and nothing failed loudly:
 *
 *   PAY-05: only `refund.processed` was listed. Accounts that emit
 *           `refund.created` instead left every dashboard-raised refund
 *           un-reversed in the provider ledger.
 *   PAY-04: only activated/charged/cancelled were listed, so `halted` (the
 *           RBI dunning window) and `paused` never arrived and a dead mandate
 *           kept rendering as live.
 *
 * This is the ratchet: add a case to the dispatcher and this fails until the
 * runbook row grows to match.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API_SRC = path.resolve(HERE, '..');
const REPO_ROOT = path.resolve(API_SRC, '../../..');
const RUNBOOK = path.join(REPO_ROOT, 'docs', 'razorpay-live-activation.md');
const DISPATCHER = path.join(API_SRC, 'services', 'payment.service.ts');

/**
 * Strip comments BEFORE looking for `case '<event>':`.
 *
 * payment.service.ts documents its own event names in prose — the PAY-05 block
 * comment says "`refund.processed` is handled alongside `refund.created`" — so
 * a scan over the raw text would happily "find" an event the switch does not
 * actually handle, and the guard would ratchet on its own documentation. That
 * exact failure has bitten this repo repeatedly.
 *
 * Line comments are stripped only when `//` is not preceded by `:`, so the
 * `https://api.razorpay.com/...` literals survive intact.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function dispatcherCaseEvents(): string[] {
  const code = stripComments(fs.readFileSync(DISPATCHER, 'utf8'));
  return [...code.matchAll(/case\s+'([a-z]+\.[a-z_]+)'\s*:/g)].map((m) => m[1]!);
}

/** The webhook table rows, keyed by the endpoint path they configure. */
function runbookRow(endpointFragment: string): string {
  const doc = fs.readFileSync(RUNBOOK, 'utf8');
  const line = doc
    .split('\n')
    .find((l) => l.includes(endpointFragment) && l.trim().startsWith('|'));
  if (!line) throw new Error(`No runbook webhook table row for ${endpointFragment}`);
  return line;
}

describe('PAY-04/PAY-05 — the Razorpay runbook subscribes every event we handle', () => {
  it('the comment stripper does not let prose masquerade as a handled case', () => {
    // Self-test of the guard: the PAY-05 block comment names refund.processed
    // in prose. If stripComments regressed, this fixture would show it.
    const fixture = `
      /* refund.processed is discussed here: case 'refund.ghost': */
      // case 'refund.phantom':
      const url = 'https://api.razorpay.com/v1/subscriptions';
      switch (e) { case 'refund.created': break; }
    `;
    const stripped = stripComments(fixture);
    expect(stripped).toContain("case 'refund.created'");
    expect(stripped).not.toContain('refund.ghost');
    expect(stripped).not.toContain('refund.phantom');
    // The protocol slashes in the URL must survive the line-comment strip.
    expect(stripped).toContain('https://api.razorpay.com/v1/subscriptions');
  });

  it('every payment/refund case in the dispatcher is listed on the payments row', () => {
    const row = runbookRow('/api/v1/payments/webhook');
    const handled = dispatcherCaseEvents().filter(
      (e) => e.startsWith('payment.') || e.startsWith('refund.'),
    );

    // Sanity: the scan found the real switch, not nothing.
    expect(handled).toContain('payment.captured');
    expect(handled).toContain('refund.created');
    expect(handled).toContain('refund.processed');

    const missing = handled.filter((e) => !row.includes(`\`${e}\``));
    expect(missing).toEqual([]);
  });

  it('every recurring subscription event we map is listed on the subscriptions row', () => {
    const row = runbookRow('/api/v1/subscriptions/webhook');
    const mapped = Object.keys(RECURRING_SUBSCRIPTION_EVENT_STATUS);

    expect(mapped.length).toBeGreaterThan(3);

    const missing = mapped.filter((e) => !row.includes(`\`${e}\``));
    expect(missing).toEqual([]);
  });

  it('names the halted/paused mandate states the devotee-facing status depends on', () => {
    const row = runbookRow('/api/v1/subscriptions/webhook');
    expect(row).toContain('`subscription.halted`');
    expect(row).toContain('`subscription.paused`');
    expect(row).toContain('`subscription.authenticated`');
  });

  it('names the Razorpay plan env var for every recurring plan in the catalog', () => {
    // Same drift class, owner-side: `createRecurringSubscription` reads
    // RAZORPAY_PLAN_RECURRING_<PLAN_ID>. A plan added to the catalog without a
    // runbook row silently falls back to minting a throwaway Razorpay plan per
    // subscriber, which nobody notices until the dashboard is unusable.
    const doc = fs.readFileSync(RUNBOOK, 'utf8');
    const missing = RECURRING_PLANS.map(
      (p) => `RAZORPAY_PLAN_RECURRING_${p.id.toUpperCase()}`,
    ).filter((v) => !doc.includes(v));

    expect(missing).toEqual([]);
  });

  it('keeps every recurring plan under the ₹15,000 UPI Autopay no-PIN cap', () => {
    // Not a doc check — the product promise. Above the cap the devotee must
    // re-enter their UPI PIN on every debit, which is the retention the whole
    // recurring rail exists to buy.
    const overCap = RECURRING_PLANS.filter((p) => p.amountInr > 15_000);
    expect(overCap).toEqual([]);
  });
});
