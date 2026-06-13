import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CSV_PATH = resolve(
  __dirname,
  '../../../../data/leads/canada-pandits-2026-06.csv',
);

describe('canada-pandits CSV seed (R-Q3-S-007)', () => {
  const raw = readFileSync(CSV_PATH, 'utf-8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = lines[0].split(',');
  const dataRows = lines.slice(1).map((row) => {
    // simple CSV split — none of our seed values contain commas inside quotes
    // (we author the file by hand so we control this).
    const cells = row.split(',');
    const obj: Record<string, string> = {};
    header.forEach((h, i) => {
      obj[h] = (cells[i] ?? '').trim();
    });
    return obj;
  });

  it('has ≥ 50 lead rows', () => {
    expect(dataRows.length).toBeGreaterThanOrEqual(50);
  });

  it('city distribution: Toronto ≥ 20, Vancouver ≥ 10, Brampton ≥ 5', () => {
    const cityCount: Record<string, number> = {};
    for (const r of dataRows) {
      cityCount[r.city] = (cityCount[r.city] ?? 0) + 1;
    }
    expect(cityCount['Toronto'] ?? 0).toBeGreaterThanOrEqual(20);
    expect(cityCount['Vancouver'] ?? 0).toBeGreaterThanOrEqual(10);
    expect(cityCount['Brampton'] ?? 0).toBeGreaterThanOrEqual(5);
  });

  it('≥ 10 rows marked outreach_status=queued (first batch send)', () => {
    const queued = dataRows.filter((r) => r.outreach_status === 'queued');
    expect(queued.length).toBeGreaterThanOrEqual(10);
  });

  it('every row has temple_affiliation + city + province', () => {
    for (const r of dataRows) {
      expect(r.temple_affiliation, `row ${r.name} affiliation`).toBeTruthy();
      expect(r.city, `row ${r.name} city`).toBeTruthy();
      expect(r.province, `row ${r.name} province`).toBeTruthy();
    }
  });

  it('header matches the 12-column spec', () => {
    expect(header).toEqual([
      'name',
      'temple_affiliation',
      'city',
      'province',
      'source_url',
      'email',
      'phone',
      'linkedin',
      'language_preference',
      'notes',
      'outreach_status',
      'first_contact_at',
    ]);
  });
});
