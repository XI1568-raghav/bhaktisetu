import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..', 'docs', 'sales', 'wellness-instructors');

const REQUIRED_FILES = [
  'README.md',
  'target-list.csv',
  'target-list-research.md',
  'vetting-rubric.md',
  'outreach-email-template.md',
  'outreach-instagram-dm.md',
  'intake-form-spec.md',
  'crm-tracking.csv',
  'acceptance-harness.md',
];

const ALLOWED_DISCIPLINES = new Set([
  'hatha_yoga',
  'ashtanga_yoga',
  'iyengar_yoga',
  'vinyasa_yoga',
  'ayurveda_practitioner',
  'ayurveda_panchakarma',
  'yoga_therapy',
  'pranayama_meditation',
]);

function parseCsv(content: string): string[][] {
  const lines = content.trim().split(/\r?\n/);
  return lines.map((line) => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cells.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current);
    return cells;
  });
}

describe('R-Q1-S-010 wellness instructors onboarding artifacts', () => {
  describe('files exist', () => {
    for (const f of REQUIRED_FILES) {
      it(`has ${f}`, () => {
        expect(existsSync(join(ROOT, f))).toBe(true);
      });
    }
  });

  describe('target-list.csv schema', () => {
    const path = join(ROOT, 'target-list.csv');
    const rows = parseCsv(readFileSync(path, 'utf8'));
    const header = rows[0];
    const body = rows.slice(1);

    it('has the required columns in order', () => {
      expect(header).toEqual([
        'name',
        'discipline',
        'credentials_claimed',
        'city_or_remote',
        'instagram_handle',
        'website',
        'years_experience',
        'languages',
        'priority_tier',
        'research_source',
        'notes',
      ]);
    });

    it('has at least 15 candidate rows', () => {
      expect(body.length).toBeGreaterThanOrEqual(15);
    });

    it('every discipline cell is in the allowed enum', () => {
      for (const r of body) {
        expect(ALLOWED_DISCIPLINES.has(r[1])).toBe(true);
      }
    });

    it('has at least 3 Ayurveda rows', () => {
      const ayurveda = body.filter((r) => r[1].startsWith('ayurveda'));
      expect(ayurveda.length).toBeGreaterThanOrEqual(3);
    });

    it('has at least 8 yoga rows', () => {
      const yoga = body.filter((r) => r[1].includes('yoga'));
      expect(yoga.length).toBeGreaterThanOrEqual(8);
    });

    it('every row has 11 columns (RFC-4180-clean)', () => {
      for (const r of body) {
        expect(r.length).toBe(11);
      }
    });
  });

  describe('crm-tracking.csv schema', () => {
    const path = join(ROOT, 'crm-tracking.csv');
    const rows = parseCsv(readFileSync(path, 'utf8'));
    const header = rows[0];
    const body = rows.slice(1);

    it('has the required columns in order', () => {
      expect(header).toEqual([
        'instructor_id',
        'name',
        'status',
        'last_touch_date',
        'next_action',
        'blocker',
        'verified_at',
        'live_at',
      ]);
    });

    it('pre-seeds 15 lead rows', () => {
      expect(body.length).toBeGreaterThanOrEqual(15);
      for (const r of body) {
        expect(r[2]).toBe('lead');
      }
    });
  });

  describe('vetting-rubric.md', () => {
    const text = readFileSync(join(ROOT, 'vetting-rubric.md'), 'utf8');
    it('declares 6 gates', () => {
      const gates = text.match(/^##\s+Gate\s+\d/gim) || [];
      expect(gates.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('intake-form-spec.md', () => {
    const text = readFileSync(join(ROOT, 'intake-form-spec.md'), 'utf8');
    const requiredFields = [
      'id',
      'name',
      'discipline',
      'credentials_doc_url',
      'years_experience',
      'languages_csv',
      'instagram_handle',
      'sample_class_url',
      'hourly_rate_inr',
      'availability_json',
      'mou_signed_at',
      'status',
    ];
    for (const f of requiredFields) {
      it(`declares field ${f}`, () => {
        expect(text).toContain(f);
      });
    }
  });
});
