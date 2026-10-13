import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * These forms built `${NEXT_PUBLIC_API_URL}/api/v1/...` by hand, so when the env
 * var already ends in /api/v1 (as in local .env) they posted to
 * /api/v1/api/v1/leads/self-onboard and every "List your temple/gaushala" and
 * waitlist submit was a 404. API_BASE_URL normalises the prefix.
 */
const FILES = [
  'components/SelfOnboardForm.tsx',
  'app/waitlist/WaitlistForm.tsx',
  'app/waitlist/confirm/page.tsx',
  'app/waitlist/welcome/page.tsx',
];

describe('lead / waitlist forms use the normalised API base', () => {
  it.each(FILES)('%s', (f) => {
    const src = readFileSync(join(__dirname, '..', f), 'utf8');
    expect(src).not.toMatch(/\$\{API_URL\}\/api\/v1/);
    expect(src).toMatch(/\$\{API_BASE_URL\}\//);
  });
});
