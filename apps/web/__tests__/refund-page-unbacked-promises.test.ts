/**
 * LEG-01 / COM-16 / COM-02 residue on the legally operative refund page.
 *
 * An earlier wave aligned the PUJA ladder on /refunds to the engine
 * (apps/api/src/services/cancellation.service.ts DEFAULT_CANCEL_POLICY, via
 * apps/web/lib/cancellation-policy.ts) and removed the "100% to cause" badge
 * from the donate form and the unconditional 80G claim from the receipt PDF,
 * the donation email, /donations and /gaushala.
 *
 * Three promises on /refunds survived that sweep, and /refunds is the page the
 * checkout terms checkbox links to — it is the operative document, not a
 * marketing surface:
 *
 *   section 2  "Puja not performed by temple -> 100% refund + 10% platform
 *              credit", repeated in the bullet below the table, and section 8
 *              "Platform credits: Applied instantly to your Darshya wallet".
 *              CreditLedgerEntry has a `refund_to_credit` reason and ZERO call
 *              sites write it — the only two creditUser() callers pass
 *              'referral_reward'. No code path can issue this credit.
 *
 *   section 4  "Astrology and wellness consultations may be cancelled up to 6
 *              hours before the scheduled session for a full refund." The
 *              handler that decides this (apps/api/src/routes/consultation.ts)
 *              sets refundEligible only when the session is at least 24 hours
 *              away. A devotee who cancels 8 hours out reads "full refund" and
 *              the API records refundEligible:false — the same short-changed
 *              direction LEG-01 was filed for, one product over.
 *
 *   section 5  "the funds are immediately allocated to the gaushala or
 *              beneficiary and an 80G receipt is generated", plus "Once an 80G
 *              receipt has been issued and claimed for tax benefit, reversal is
 *              not possible". Both are the claims COM-16 and COM-02 removed
 *              elsewhere: apps/api/src/routes/donations.ts writes no
 *              Commission, PayoutRequest or TemplePayout on any donation path,
 *              and COMPANY.donationLegal.HAS_80G_VERIFIED is false, so the
 *              document the donor receives is a proof-of-donation receipt, not
 *              an 80G certificate.
 *
 * Every assertion below derives its expectation from the source that decides
 * the behaviour, so re-implementing any of the three flips the test's premise
 * instead of leaving a stale guard behind.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const webRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(__dirname, '../../..');
const read = (rel: string) => readFileSync(path.join(webRoot, rel), 'utf8');
const readRepo = (rel: string) => readFileSync(path.join(repoRoot, rel), 'utf8');

/**
 * Comments on this page quote the strings they explain — the removal notes for
 * DB-06 and LEG-06 already do. Only rendered copy is under test, so strip block
 * and line comments before asserting, or the guard matches its own docs.
 */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

/**
 * JSX wraps prose at the source margin, so a sentence a reader sees as one line
 * is stored with newlines and indentation inside it. Matching rendered copy
 * against a literal phrase therefore silently passes on text that IS present —
 * the first draft of the COM-16 guard below did exactly that, because the page
 * reads "allocated to the\n<indent>gaushala or beneficiary". Collapse runs of
 * whitespace before asserting on anything the devotee reads.
 */
const normalize = (src: string) => src.replace(/\s+/g, ' ');

const refundsSrc = read('app/refunds/page.tsx');
const refundsCopy = normalize(stripComments(refundsSrc));

/** Every .ts/.tsx file under apps/api/src, comments stripped. */
function apiSources(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === 'node_modules' || entry === 'dist') continue;
        walk(full);
      } else if (/\.tsx?$/.test(entry)) {
        out.push(stripComments(readFileSync(full, 'utf8')));
      }
    }
  };
  walk(path.join(repoRoot, 'apps/api/src'));
  return out;
}

describe('LEG-01 residue — /refunds publishes a consultation window the API does not honour', () => {
  const consultationSrc = stripComments(readRepo('apps/api/src/routes/consultation.ts'));

  /** Hours of notice the consultation cancel handler actually requires. */
  const apiCutoffHours = (() => {
    const m = consultationSrc.match(
      /cutoffMs\s*=\s*Date\.now\(\)\s*\+\s*(\d+)\s*\*\s*60\s*\*\s*60\s*\*\s*1000/,
    );
    return m ? Number(m[1]) : null;
  })();

  it('the consultation cancel handler gates refunds on a fixed notice window', () => {
    expect(
      apiCutoffHours,
      'consultation.ts refund cutoff not found — the mirror cannot be verified',
    ).not.toBeNull();
    expect(consultationSrc).toContain('refundEligible');
  });

  it('/refunds does not publish a 6-hour full-refund window for consultations', () => {
    expect(refundsCopy).not.toMatch(/6 hours before the scheduled session/i);
  });

  it('/refunds mirrors the handler window in a named constant, not a loose digit', () => {
    const declared = refundsSrc.match(
      /const CONSULTATION_REFUND_NOTICE_HOURS\s*=\s*(\d+)/,
    );
    expect(
      declared,
      '/refunds no longer declares CONSULTATION_REFUND_NOTICE_HOURS',
    ).toBeTruthy();
    expect(Number(declared![1])).toBe(apiCutoffHours);
  });

  it('the consultation paragraph renders that constant rather than a retyped number', () => {
    const sentence = refundsCopy.match(
      /Astrology and wellness consultations[\s\S]{0,260}?refunded in full\./,
    );
    expect(sentence, 'consultation refund sentence not found on /refunds').toBeTruthy();
    expect(sentence![0]).toContain('{CONSULTATION_REFUND_NOTICE_HOURS}');
  });
});

describe('LEG-01 residue — /refunds promises a platform credit no code path can issue', () => {
  const writesRefundCredit = apiSources().some((src) =>
    /reason:\s*['"]refund_to_credit['"]/.test(src),
  );

  it('no API call site writes a refund_to_credit ledger entry', () => {
    // Premise check. If a refund-to-credit rail is ever built this flips, and
    // the two guards below become the wrong assertion rather than a silent one.
    expect(writesRefundCredit).toBe(false);
  });

  it('/refunds does not promise a 10% platform credit', () => {
    if (writesRefundCredit) return;
    expect(refundsCopy).not.toMatch(/10%\s*platform credit/i);
    expect(refundsCopy).not.toMatch(/platform credit for future bookings/i);
  });

  it('/refunds does not promise credits applied instantly to a wallet', () => {
    if (writesRefundCredit) return;
    expect(refundsCopy).not.toMatch(/Applied instantly to your[\s\S]{0,20}wallet/i);
  });
});

describe('COM-16 residue — /refunds justifies non-refundability with a settlement that does not exist', () => {
  const donationsRoute = stripComments(readRepo('apps/api/src/routes/donations.ts'));

  it('the donation route writes no commission, payout or temple-payout record', () => {
    expect(donationsRoute).not.toMatch(/commission\.create/i);
    expect(donationsRoute).not.toMatch(/payoutRequest\.create/i);
    expect(donationsRoute).not.toMatch(/templePayout\.create/i);
  });

  it('/refunds does not claim donations are immediately allocated to the beneficiary', () => {
    expect(refundsCopy).not.toMatch(
      /funds are immediately allocated to the gaushala or beneficiary/i,
    );
  });
});

describe('COM-02 residue — /refunds still calls the donation document an 80G receipt', () => {
  const receiptSrc = stripComments(readRepo('apps/api/src/lib/pdf-receipt.ts'));
  const companySrc = readRepo('apps/web/lib/company.ts');

  it('the receipt generator gates the 80G assertion on donee registration and PAN', () => {
    expect(receiptSrc).toContain('is80GEligible');
    expect(receiptSrc).toMatch(/gaushala80GNumber[\s\S]{0,80}gaushalaPan/);
  });

  it('the platform has no verified 80G registration on file', () => {
    expect(companySrc).toMatch(/HAS_80G_VERIFIED:\s*false/);
  });

  it('/refunds does not state that an 80G receipt is generated for every donation', () => {
    expect(refundsCopy).not.toMatch(/and an 80G receipt is generated/i);
    expect(refundsCopy).not.toMatch(
      /Once an 80G receipt has been issued and claimed for tax benefit/i,
    );
  });

  it('/refunds binds any 80G wording to the same owner-controlled flag every other surface uses', () => {
    // /donations and DonationForm both gate on COMPANY.donationLegal
    // .HAS_80G_VERIFIED. The legal page must not be the one surface that
    // asserts 80G unconditionally.
    if (/80G/i.test(refundsCopy)) {
      expect(refundsSrc).toContain('HAS_80G_VERIFIED');
    }
  });
});
