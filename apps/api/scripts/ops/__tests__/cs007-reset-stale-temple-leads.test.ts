import { describe, it, expect } from 'vitest';
import { __testing } from '../cs007-reset-stale-temple-leads.js';

const {
  selectStaleLeadsSql,
  cs005UnsentGuardSql,
  buildResetUpdate,
  buildAuditLogInsert,
  parseArgs,
  summarize,
} = __testing;

describe('selectStaleLeadsSql', () => {
  it('selects role=TEMPLE + status=EMAILED + reply_count=0 + last_contacted_at < cutoff + cs007_reset_at IS NULL', () => {
    const sql = selectStaleLeadsSql();
    expect(sql).toMatch(/role\s*=\s*'TEMPLE'/i);
    expect(sql).toMatch(/status\s*=\s*'EMAILED'/i);
    expect(sql).toMatch(/reply_count/);
    expect(sql).toMatch(/last_contacted_at\s*<\s*NOW\(\)\s*-\s*INTERVAL\s*'30 days'/i);
    expect(sql).toMatch(/cs007_reset_at['"\)]*\s*IS NULL/i);
  });

  it('targets the actual leads table (snake_case @@map)', () => {
    expect(selectStaleLeadsSql()).toMatch(/FROM\s+leads/i);
  });

  it('honors LIMIT argument', () => {
    expect(selectStaleLeadsSql(200)).toMatch(/LIMIT\s+200/);
    expect(selectStaleLeadsSql(50)).toMatch(/LIMIT\s+50/);
  });

  it('rejects non-positive / non-integer limit (parameter discipline)', () => {
    expect(() => selectStaleLeadsSql(0)).toThrow();
    expect(() => selectStaleLeadsSql(-5)).toThrow();
    expect(() => selectStaleLeadsSql(10.5)).toThrow();
  });
});

describe('cs005UnsentGuardSql', () => {
  it('counts EMAILED leads with no cs005_resent_at marker older than 30d', () => {
    const sql = cs005UnsentGuardSql();
    expect(sql).toMatch(/COUNT\(\*\)/i);
    expect(sql).toMatch(/status\s*=\s*'EMAILED'/i);
    expect(sql).toMatch(/cs005_resent_at['"\)]*\s*IS NULL/i);
    expect(sql).toMatch(/created_at\s*<\s*NOW\(\)\s*-\s*INTERVAL\s*'30 days'/i);
  });
});

describe('buildResetUpdate', () => {
  const sample = {
    id: 'lead-uuid-1',
    status: 'EMAILED',
    contactCount: 2,
    lastContactedAt: '2026-05-04T06:00:00.000Z',
  };

  it('produces SET status=NEW, contact_count=0 against leads table', () => {
    const { sql } = buildResetUpdate(sample, '2026-06-13T10:00:00.000Z');
    expect(sql).toMatch(/UPDATE\s+leads/i);
    expect(sql).toMatch(/status\s*=\s*'NEW'/i);
    expect(sql).toMatch(/contact_count\s*=\s*0/i);
    expect(sql).toMatch(/WHERE\s+id\s*=/i);
  });

  it('embeds metadata snapshot with cs007_reset_at + cs007_prior {status,contact_count,last_contact_at}', () => {
    const { params } = buildResetUpdate(sample, '2026-06-13T10:00:00.000Z');
    const meta = params.find((p) => typeof p === 'string' && p.includes('cs007_reset_at'));
    expect(meta).toBeDefined();
    const parsed = JSON.parse(meta as string);
    expect(parsed.cs007_reset_at).toBe('2026-06-13T10:00:00.000Z');
    expect(parsed.cs007_prior.status).toBe('EMAILED');
    expect(parsed.cs007_prior.contact_count).toBe(2);
    expect(parsed.cs007_prior.last_contact_at).toBe('2026-05-04T06:00:00.000Z');
  });

  it('binds the id as a parameter (no string concat)', () => {
    const { sql, params } = buildResetUpdate(sample, '2026-06-13T10:00:00.000Z');
    expect(sql).not.toContain('lead-uuid-1');
    expect(params).toContain('lead-uuid-1');
  });
});

describe('buildAuditLogInsert', () => {
  it('writes ops_audit_log entry with action=cs007_reset + lead id', () => {
    const { sql, params } = buildAuditLogInsert('lead-uuid-1', '2026-06-13T10:00:00.000Z');
    expect(sql).toMatch(/INSERT\s+INTO\s+ops_audit_log/i);
    expect(sql).toMatch(/action/i);
    expect(params).toContain('cs007_reset');
    expect(params).toContain('lead-uuid-1');
  });
});

describe('parseArgs', () => {
  it('--dry-run flag', () => {
    expect(parseArgs(['--dry-run']).dryRun).toBe(true);
    expect(parseArgs([]).dryRun).toBe(false);
  });

  it('--limit=N flag, defaults to 200', () => {
    expect(parseArgs(['--limit=50']).limit).toBe(50);
    expect(parseArgs([]).limit).toBe(200);
  });

  it('rejects --limit > 500 (safety cap)', () => {
    expect(() => parseArgs(['--limit=10000'])).toThrow();
  });
});

describe('summarize', () => {
  it('counts processed + skipped', () => {
    const s = summarize({ scanned: 200, reset: 195, skipped: 5 });
    expect(s.scanned).toBe(200);
    expect(s.reset).toBe(195);
    expect(s.skipped).toBe(5);
  });
});
