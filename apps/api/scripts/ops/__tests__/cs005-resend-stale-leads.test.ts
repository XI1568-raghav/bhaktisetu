import { describe, it, expect, vi } from 'vitest';
import { __testing, type LeadRow, type SendCandidate } from '../cs005-resend-stale-leads.js';

const {
  skipReason,
  templateForLead,
  buildPlan,
  renderTemplate,
  sendBatch,
  parseCliArgs,
  checkDomainVerifiedGate,
} = __testing;

const NOW = new Date('2026-06-13T10:00:00.000Z');
const FORTY_DAYS_AGO = new Date(NOW.getTime() - 40 * 24 * 3600 * 1000);
const TWO_DAYS_AGO = new Date(NOW.getTime() - 2 * 24 * 3600 * 1000);

function makeLead(overrides: Partial<LeadRow> = {}): LeadRow {
  return {
    id: 'lead-1',
    role: 'PANDIT',
    name: 'Ramesh Sharma',
    city: 'Bengaluru',
    email: 'ramesh@example.com',
    status: 'EMAILED',
    contactCount: 1,
    lastContactedAt: FORTY_DAYS_AGO,
    metadata: null,
    ...overrides,
  };
}

describe('checkDomainVerifiedGate', () => {
  it('refuses to send if RESEND_DOMAIN_VERIFIED env != true', () => {
    expect(checkDomainVerifiedGate({})).toContain('refusing to send');
    expect(checkDomainVerifiedGate({ RESEND_DOMAIN_VERIFIED: 'false' })).toContain('refusing to send');
    expect(checkDomainVerifiedGate({ RESEND_DOMAIN_VERIFIED: '1' })).toContain('refusing to send');
  });

  it('passes when RESEND_DOMAIN_VERIFIED=true', () => {
    expect(checkDomainVerifiedGate({ RESEND_DOMAIN_VERIFIED: 'true' })).toBeNull();
  });
});

describe('skipReason — lead eligibility', () => {
  it('selects leads with status=EMAILED AND lastContactedAt > 30d ago AND reply_count=0', () => {
    const lead = makeLead();
    expect(skipReason(lead, NOW)).toBeNull();
  });

  it('skips leads with status != EMAILED', () => {
    expect(skipReason(makeLead({ status: 'NEW' }), NOW)).toBe('status_not_emailed');
    expect(skipReason(makeLead({ status: 'REPLIED' }), NOW)).toBe('status_not_emailed');
  });

  it('skips leads contacted within last 30 days (too_recent)', () => {
    expect(skipReason(makeLead({ lastContactedAt: TWO_DAYS_AGO }), NOW)).toBe('too_recent');
  });

  it('skips leads with no email', () => {
    expect(skipReason(makeLead({ email: null }), NOW)).toBe('no_email');
    expect(skipReason(makeLead({ email: '   ' }), NOW)).toBe('no_email');
  });

  it('skips leads where reply_count > 0 (already engaged)', () => {
    expect(skipReason(makeLead({ metadata: { reply_count: 1 } }), NOW)).toBe('has_reply');
  });

  it('skips leads where metadata.cs005_resent_at IS NOT NULL (idempotency)', () => {
    const meta = { cs005_resent_at: '2026-06-12T00:00:00.000Z' };
    expect(skipReason(makeLead({ metadata: meta }), NOW)).toBe('already_resent');
  });

  it('skips leads with contactCount=0 (never_contacted)', () => {
    expect(skipReason(makeLead({ contactCount: 0 }), NOW)).toBe('never_contacted');
  });
});

describe('templateForLead — per-role routing', () => {
  it('routes PANDIT → pandit template', () => {
    expect(templateForLead(makeLead({ role: 'PANDIT' }))).toBe('pandit');
  });
  it('routes TEMPLE_MANAGER → temple template', () => {
    expect(templateForLead(makeLead({ role: 'TEMPLE_MANAGER' }))).toBe('temple');
  });
  it('routes GAUSHALA_MANAGER → gaushala template', () => {
    expect(templateForLead(makeLead({ role: 'GAUSHALA_MANAGER' }))).toBe('gaushala');
  });
  it('routes ASTROLOGER → astrologer template', () => {
    expect(templateForLead(makeLead({ role: 'ASTROLOGER' }))).toBe('astrologer');
  });
  it('returns null for unknown role', () => {
    expect(templateForLead(makeLead({ role: 'OTHER' }))).toBeNull();
    expect(templateForLead(makeLead({ role: null }))).toBeNull();
  });
});

describe('buildPlan — segmentation + rate-limit spread', () => {
  function manyLeads(n: number, role: string): LeadRow[] {
    return Array.from({ length: n }, (_, i) =>
      makeLead({ id: `${role}-${i}`, email: `${role}-${i}@example.com`, role }),
    );
  }

  it('groups eligible candidates by role', () => {
    const leads = [
      ...manyLeads(3, 'PANDIT'),
      ...manyLeads(2, 'TEMPLE_MANAGER'),
      ...manyLeads(1, 'GAUSHALA_MANAGER'),
    ];
    const plan = buildPlan(leads, { now: NOW });
    expect(plan.totalCandidates).toBe(6);
    expect(plan.byRole).toEqual({ pandit: 3, temple: 2, gaushala: 1 });
  });

  it('rate-limits to ≤100 sends per UTC day (Resend free tier)', () => {
    const leads = manyLeads(230, 'PANDIT');
    const plan = buildPlan(leads, { now: NOW, perDayCap: 100 });
    expect(plan.totalCandidates).toBe(230);
    expect(plan.byDay).toEqual([
      { day: 1, count: 100 },
      { day: 2, count: 100 },
      { day: 3, count: 30 },
    ]);
    plan.byDay.forEach((d) => expect(d.count).toBeLessThanOrEqual(100));
  });

  it('respects --limit cap', () => {
    const leads = manyLeads(230, 'PANDIT');
    const plan = buildPlan(leads, { now: NOW, limit: 50 });
    expect(plan.totalCandidates).toBe(50);
  });

  it('skips ineligible leads with reasons', () => {
    const leads = [
      makeLead({ id: 'ok' }),
      makeLead({ id: 'recent', lastContactedAt: TWO_DAYS_AGO }),
      makeLead({ id: 'replied', metadata: { reply_count: 1 } }),
      makeLead({ id: 'resent', metadata: { cs005_resent_at: '2026-06-12' } }),
    ];
    const plan = buildPlan(leads, { now: NOW });
    expect(plan.totalCandidates).toBe(1);
    expect(plan.skipped).toHaveLength(3);
    expect(plan.skipped.map((s) => s.reason).sort()).toEqual([
      'already_resent',
      'has_reply',
      'too_recent',
    ]);
  });
});

describe('renderTemplate — per-role copy + unsubscribe', () => {
  it('renders pandit template w/ name + city + unsubscribe link', () => {
    const candidate: SendCandidate = {
      lead: makeLead({ name: 'Ravi', city: 'Pune' }),
      templateKey: 'pandit',
    };
    const r = renderTemplate(candidate);
    expect(r.subject).toContain('Pune');
    expect(r.text).toContain('Pranam Ravi');
    expect(r.text).toContain('unsubscribe');
    expect(r.html).toContain('unsubscribe');
    expect(r.html).toContain('darshya.online/unsubscribe');
  });

  it('all 4 role templates include explicit unsubscribe (compliance)', () => {
    for (const templateKey of ['pandit', 'temple', 'gaushala', 'astrologer'] as const) {
      const r = renderTemplate({ lead: makeLead({ name: 'Test' }), templateKey });
      expect(r.text.toLowerCase()).toMatch(/unsubscribe|remove/);
      expect(r.html).toContain('unsubscribe');
    }
  });

  it('falls back to safe defaults when name/city are null', () => {
    const r = renderTemplate({
      lead: makeLead({ name: null, city: null }),
      templateKey: 'temple',
    });
    expect(r.subject).toMatch(/temple|Bhaktisetu/i);
    expect(r.text).not.toContain('null');
  });
});

describe('sendBatch — failure isolation', () => {
  it('respects --dry-run (no Resend API call, no DB write)', async () => {
    // dry-run is enforced at CLI layer (main() short-circuits before sendBatch).
    // Here we assert parseCliArgs threading.
    expect(parseCliArgs(['--dry-run']).dryRun).toBe(true);
    expect(parseCliArgs([]).dryRun).toBe(false);
    expect(parseCliArgs(['--limit=50']).limit).toBe(50);
    expect(parseCliArgs(['--limit=99999']).limit).toBe(500); // clamped
  });

  it('writes metadata.cs005_resent_at = now() after successful send (onSuccess invoked)', async () => {
    const sent: { from: string; to: string }[] = [];
    const onSuccess = vi.fn(async () => undefined);
    const onFailure = vi.fn(async () => undefined);
    const resendClient = {
      emails: {
        send: vi.fn(async (args: { from: string; to: string; subject: string; html: string; text: string }) => {
          sent.push({ from: args.from, to: args.to });
          return { id: 'msg-1' };
        }),
      },
    };

    const candidates: SendCandidate[] = [
      { lead: makeLead({ id: 'A', email: 'a@x.com' }), templateKey: 'pandit' },
      { lead: makeLead({ id: 'B', email: 'b@x.com' }), templateKey: 'temple' },
    ];
    const results = await sendBatch(candidates, {
      resendClient,
      fromAddress: 'Bhaktisetu <test@darshya.online>',
      onSuccess,
      onFailure,
    });

    expect(sent).toHaveLength(2);
    expect(onSuccess).toHaveBeenCalledTimes(2);
    expect(onFailure).not.toHaveBeenCalled();
    expect(results.every((r) => r.ok)).toBe(true);
    expect(results[0]!.resentAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('logs failures to onFailure without aborting batch', async () => {
    const onSuccess = vi.fn(async () => undefined);
    const onFailure = vi.fn(async () => undefined);
    const resendClient = {
      emails: {
        send: vi.fn(async (args: { to: string }) => {
          if (args.to === 'b@x.com') throw new Error('Resend 422 invalid');
          return { id: 'msg' };
        }),
      },
    };

    const candidates: SendCandidate[] = [
      { lead: makeLead({ id: 'A', email: 'a@x.com' }), templateKey: 'pandit' },
      { lead: makeLead({ id: 'B', email: 'b@x.com' }), templateKey: 'pandit' },
      { lead: makeLead({ id: 'C', email: 'c@x.com' }), templateKey: 'pandit' },
    ];
    const results = await sendBatch(candidates, {
      resendClient,
      fromAddress: 'Bhaktisetu <test@darshya.online>',
      onSuccess,
      onFailure,
    });

    expect(results).toHaveLength(3);
    expect(results.filter((r) => r.ok)).toHaveLength(2);
    expect(results.filter((r) => !r.ok)).toHaveLength(1);
    expect(onSuccess).toHaveBeenCalledTimes(2);
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onFailure.mock.calls[0]![0]).toBe('B');
  });

  it('continues batch even when onFailure audit-log itself throws', async () => {
    const onSuccess = vi.fn(async () => undefined);
    const onFailure = vi.fn(async () => {
      throw new Error('ops_audit_log table missing');
    });
    const resendClient = {
      emails: {
        send: vi.fn(async () => {
          throw new Error('Resend 500');
        }),
      },
    };
    const candidates: SendCandidate[] = [
      { lead: makeLead({ id: 'A', email: 'a@x.com' }), templateKey: 'pandit' },
      { lead: makeLead({ id: 'B', email: 'b@x.com' }), templateKey: 'pandit' },
    ];
    const results = await sendBatch(candidates, {
      resendClient,
      fromAddress: 'test',
      onSuccess,
      onFailure,
    });
    expect(results).toHaveLength(2);
    expect(results.every((r) => !r.ok)).toBe(true);
  });
});
