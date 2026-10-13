import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The org pages used to build `${NEXT_PUBLIC_API_URL}/api/v1/...` by hand, which
// doubles the prefix when the env var already ends in /api/v1 (the documented
// value). They must go through API_BASE_URL, which normalises it once.
const FILES = ['page.tsx', 'accept/page.tsx', 'settings/page.tsx', 'members/page.tsx'];

describe('app/org/* API prefix', () => {
  for (const f of FILES) {
    it(`${f} uses API_BASE_URL and never hand-builds /api/v1`, () => {
      const src = readFileSync(join(__dirname, '..', 'app', 'org', f), 'utf8');
      expect(src).toContain('API_BASE_URL');
      expect(src).not.toMatch(/process\.env\.NEXT_PUBLIC_API_URL/);
      expect(src).not.toMatch(/\$\{API\}\/api\/v1/);
      expect(src).not.toMatch(/orgFetch\(\s*[`"']\/api\/v1/);
    });
  }
});
