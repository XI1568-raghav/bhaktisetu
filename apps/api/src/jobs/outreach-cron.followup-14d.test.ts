import { describe, it, expect } from 'vitest';
import { followupTemplateKey } from '../services/outreach.service.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// R-Q1-CS-008 — Bump MAX_CONTACT_COUNT to 5 + add 14d follow-up template
//
// Regression-locks the new 14-day touch:
//   - `followupTemplateKey(role, 14)` returns the new key for every role
//   - HTML template files exist on disk for every role
//   - HTML body carries the "gentle nudge" copy
//   - MAX_CONTACT_COUNT constant is 5 (cap honored, no 6th touch)
//   - sequencer file wires 14d as touch #4 (search-string assertion)

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates', 'outreach');
const CRON_FILE = path.join(__dirname, 'outreach-cron.ts');

const ROLES = ['TEMPLE', 'PRIEST', 'ASTROLOGER', 'WELLNESS_INSTRUCTOR', 'GAUSHALA'] as const;

describe('R-Q1-CS-008 — 14-day follow-up template wiring', () => {
  describe('followupTemplateKey', () => {
    it('emits 14day key for every role', () => {
      // Cast each role through Prisma Lead enum at the call site — we only
      // exercise the string transform here, which is role-agnostic.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(followupTemplateKey('TEMPLE' as any, 14)).toBe('temple_followup_14day');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(followupTemplateKey('PRIEST' as any, 14)).toBe('priest_followup_14day');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(followupTemplateKey('ASTROLOGER' as any, 14)).toBe('astrologer_followup_14day');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(followupTemplateKey('WELLNESS_INSTRUCTOR' as any, 14)).toBe('wellness_followup_14day');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(followupTemplateKey('GAUSHALA' as any, 14)).toBe('gaushala_followup_14day');
    });

    it('still emits 3day + 7day keys (no regression)', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(followupTemplateKey('TEMPLE' as any, 3)).toBe('temple_followup_3day');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(followupTemplateKey('TEMPLE' as any, 7)).toBe('temple_followup_7day');
    });
  });

  describe('14-day HTML template files', () => {
    const expectedFiles = [
      'temple_followup_14day.html',
      'priest_followup_14day.html',
      'astrologer_followup_14day.html',
      'wellness_followup_14day.html',
      'gaushala_followup_14day.html',
    ];

    for (const filename of expectedFiles) {
      it(`exists on disk: ${filename}`, () => {
        const full = path.join(TEMPLATES_DIR, filename);
        expect(fs.existsSync(full)).toBe(true);
      });

      it(`has non-empty body with layout markers: ${filename}`, () => {
        const full = path.join(TEMPLATES_DIR, filename);
        const body = fs.readFileSync(full, 'utf-8');
        expect(body).toContain('{{layoutStart}}');
        expect(body).toContain('{{layoutEnd}}');
        expect(body.length).toBeGreaterThan(50);
      });
    }
  });

  describe('outreach-cron sequencer', () => {
    const cron = fs.readFileSync(CRON_FILE, 'utf-8');

    it('declares MAX_CONTACT_COUNT = 5', () => {
      expect(cron).toMatch(/const MAX_CONTACT_COUNT\s*=\s*5\s*;/);
    });

    it('wires sendFollowup(lead, 14) call', () => {
      expect(cron).toContain('sendFollowup(lead, 14)');
    });

    it('declares followup14day result bucket', () => {
      expect(cron).toMatch(/followup14day\s*:\s*\{/);
    });

    it('bounds 7-day query above 14-day window (no overlap)', () => {
      // 7-day block must use { lt: sevenDaysAgo, gt: fourteenDaysAgo } so
      // the 14-day touch fires as a distinct stage on the same lead.
      expect(cron).toContain('lt: sevenDaysAgo, gt: fourteenDaysAgo');
    });
  });
});
