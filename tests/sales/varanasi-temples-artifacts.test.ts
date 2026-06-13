import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../docs/sales/varanasi-temples');

function readCsv(filename: string): { headers: string[]; rows: string[][] } {
  const raw = readFileSync(resolve(ROOT, filename), 'utf8').trim();
  const lines = raw.split(/\r?\n/);
  // simple RFC-4180-ish parser handling quoted commas
  const parseRow = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (ch === ',' && !inQuote) {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  };
  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);
  return { headers, rows };
}

describe('R-Q1-S-004 Varanasi temple onboarding artifacts', () => {
  it('directory exists with all expected files', () => {
    const expected = [
      'README.md',
      'target-list.csv',
      'target-list-research.md',
      'outreach-script-hindi.md',
      'outreach-script-english.md',
      'whatsapp-templates.md',
      'verification-checklist.md',
      'intake-form-spec.md',
      'crm-tracking.csv',
      'acceptance-harness.md',
    ];
    for (const f of expected) {
      expect(existsSync(resolve(ROOT, f)), `missing ${f}`).toBe(true);
    }
  });

  it('target-list.csv has >=25 rows with required columns', () => {
    const { headers, rows } = readCsv('target-list.csv');
    const required = [
      'temple_name',
      'deity',
      'trust_name',
      'address',
      'priest_contact_name',
      'phone',
      'email',
      '80g_status_known',
      'live_stream_capable',
      'priority_tier',
      'research_source',
      'notes',
    ];
    for (const col of required) {
      expect(headers, `missing column ${col}`).toContain(col);
    }
    expect(rows.length).toBeGreaterThanOrEqual(25);
    // every row must have research_source non-empty
    const srcIdx = headers.indexOf('research_source');
    for (const row of rows) {
      expect(row[srcIdx]?.trim(), `empty research_source in row: ${row[0]}`).not.toBe('');
    }
  });

  it('crm-tracking.csv has required columns and valid status values', () => {
    const { headers, rows } = readCsv('crm-tracking.csv');
    const required = [
      'temple_id',
      'temple_name',
      'status',
      'last_touch_date',
      'owner',
      'next_action',
      'blocker',
      'verified_at',
      'live_at',
    ];
    for (const col of required) {
      expect(headers, `missing column ${col}`).toContain(col);
    }
    const validStatuses = new Set([
      'lead',
      'contacted',
      'meeting_set',
      'docs_received',
      'verifying',
      'verified',
      'live',
      'dropped',
    ]);
    const statusIdx = headers.indexOf('status');
    for (const row of rows) {
      expect(validStatuses.has(row[statusIdx]?.trim()), `invalid status: ${row[statusIdx]}`).toBe(true);
    }
    // pre-seeded from target list
    expect(rows.length).toBeGreaterThanOrEqual(25);
  });

  it('verification-checklist.md contains all 8 mandatory gates', () => {
    const text = readFileSync(resolve(ROOT, 'verification-checklist.md'), 'utf8');
    const gates = [
      'Trust registration certificate sighted (12A + 80G)',
      'PAN of trust verified',
      'Bank account in trust name (cancelled cheque)',
      'Authorized signatory ID + photo',
      'Temple physical visit OR verified video walk-through',
      'Live-stream technical check (bandwidth ≥4 Mbps up, camera angle approved)',
      'Pandit roster with 3+ named pujaris available for scheduled darshan slots',
      'Signed MOU (revenue split + 80G receipt issuance flow)',
    ];
    for (const gate of gates) {
      expect(text, `missing gate: ${gate}`).toContain(gate);
    }
  });

  it('intake-form-spec.md lists >=12 fields with type and required flag', () => {
    const text = readFileSync(resolve(ROOT, 'intake-form-spec.md'), 'utf8');
    // count table rows (markdown table format `| field | type | required |`)
    const fieldLines = text.split(/\r?\n/).filter((l) => /^\|\s*[a-z_0-9]+\s*\|/i.test(l));
    expect(fieldLines.length).toBeGreaterThanOrEqual(12);
    // must mention type + required flag in header somewhere
    expect(/type/i.test(text)).toBe(true);
    expect(/required/i.test(text)).toBe(true);
  });

  it('outreach scripts cover Hindi + English + WhatsApp', () => {
    expect(existsSync(resolve(ROOT, 'outreach-script-hindi.md'))).toBe(true);
    expect(existsSync(resolve(ROOT, 'outreach-script-english.md'))).toBe(true);
    expect(existsSync(resolve(ROOT, 'whatsapp-templates.md'))).toBe(true);
    const hindi = readFileSync(resolve(ROOT, 'outreach-script-hindi.md'), 'utf8');
    expect(hindi).toMatch(/Pranam|Pandit-ji|Trust-ji/);
    const eng = readFileSync(resolve(ROOT, 'outreach-script-english.md'), 'utf8');
    expect(eng).toMatch(/\{\{BOOKING_LINK\}\}/);
  });
});
