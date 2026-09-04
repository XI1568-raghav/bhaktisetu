import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import EmailCapture from '../components/EmailCapture';

/**
 * TC-03 — `EmailCapture`'s DEFAULT subtitle promised something nothing grants.
 *
 *   'Daily panchang, festival reminders and exclusive launch credits —
 *    straight to your inbox.'
 *
 * There is a real credit system — `UserCredit` / `CreditLedgerEntry`, written
 * through `WalletService.creditUser`. It has exactly two callers in the whole
 * API: routes/referrals.ts:233 and services/payment.service.ts:107. Of the five
 * `CreditLedgerReason` values, four are marked "(future)" in the schema and the
 * only live one is `referral_reward`.
 *
 * `POST /waitlist` creates a Waitlist row, generates a referral code and sends
 * a confirmation email. It does not touch the wallet, and no job or webhook
 * grants a credit for joining. So every landing surface that mounts
 * `<EmailCapture>` without its own subtitle offered "exclusive launch credits"
 * for an email address, and nothing anywhere could ever issue one.
 *
 * The success message is NOT changed and was checked rather than assumed:
 * "Check your inbox to confirm" is true. routes/waitlist.ts:122-134 sends
 * `confirmEmailHtml` with a real `/waitlist/confirm?code=` link, and
 * GET /confirm flips `status: 'CONFIRMED'`. A handoff note listed that string
 * as an unbacked default; it is backed.
 *
 * Confirmed RED before the fix: the rendered default subtitle contained
 * "exclusive launch credits".
 */

afterEach(cleanup);

describe('TC-03 — EmailCapture promises nothing the waitlist cannot deliver', () => {
  it('its default subtitle offers no launch credit', () => {
    render(<EmailCapture source="test" />);
    const body = document.body.textContent ?? '';
    expect(body.length).toBeGreaterThan(30);
    expect(body).not.toMatch(/credits?\b/i);
  });

  it('still says what joining actually gets you', () => {
    // A rewrite, not a deletion — the form keeps a real reason to fill it in.
    render(<EmailCapture source="test" />);
    const body = document.body.textContent ?? '';
    expect(body).toMatch(/panchang|festival|reminder/i);
  });

  it('keeps the confirm-your-inbox message, which the API does honour', () => {
    // routes/waitlist.ts really does send a confirmation email with a
    // /waitlist/confirm link. Deleting this would be over-correction.
    const src = fs.readFileSync(
      path.resolve(__dirname, '../components/EmailCapture.tsx'),
      'utf8',
    );
    expect(src).toMatch(/Check your inbox to confirm/);
  });

  it('a caller may still pass its own subtitle', () => {
    render(<EmailCapture source="test" subtitle="Bespoke copy for this surface." />);
    expect(screen.getByText('Bespoke copy for this surface.')).toBeTruthy();
  });
});

/**
 * The API-side fact this rests on, asserted rather than described: if a
 * waitlist credit grant is ever added, this fails and the copy can come back.
 */
describe('TC-03 — the waitlist really grants no credit', () => {
  const API = path.resolve(__dirname, '../../api');

  it('POST /waitlist touches no wallet', () => {
    const src = fs
      .readFileSync(path.join(API, 'src/routes/waitlist.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(src).not.toMatch(/WalletService|creditUser|userCredit/i);
  });

  it('the only live credit reason is a referral reward', () => {
    const schema = fs.readFileSync(path.join(API, 'prisma/schema.prisma'), 'utf8');
    const block = /enum CreditLedgerReason \{([\s\S]*?)\}/.exec(schema)?.[1] ?? '';
    expect(block).toMatch(/referral_reward/);
    // Every other value is annotated "(future)" in the schema itself.
    for (const reason of ['refund_to_credit', 'promo_grant', 'redemption_debit']) {
      const line = block.split('\n').find((l) => l.includes(reason)) ?? '';
      expect(line, `${reason} is no longer marked future`).toMatch(/future/i);
    }
  });
});
