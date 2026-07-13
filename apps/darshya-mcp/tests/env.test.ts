import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

describe('loadEnv', () => {
  const orig = { ...process.env };
  beforeEach(() => {
    process.env = { ...orig };
  });
  afterEach(() => {
    process.env = { ...orig };
  });

  it('returns DIRECT_URL parsed from a .env file', async () => {
    const tmp = join(process.cwd(), '.env.test-1');
    writeFileSync(tmp, 'DIRECT_URL=postgresql://u:p@host:5432/db\nOTHER=ignored\n');
    const { loadEnv } = await import('../src/env.js');
    const env = loadEnv(tmp);
    expect(env.DIRECT_URL).toBe('postgresql://u:p@host:5432/db');
    rmSync(tmp);
  });

  it('throws a clear error when DIRECT_URL is absent', async () => {
    const tmp = join(process.cwd(), '.env.test-2');
    writeFileSync(tmp, 'SOMETHING_ELSE=1\n');
    const { loadEnv } = await import('../src/env.js');
    expect(() => loadEnv(tmp)).toThrow(/DIRECT_URL/);
    rmSync(tmp);
  });

  it('prefers an already-exported DIRECT_URL over the file', async () => {
    process.env.DIRECT_URL = 'postgresql://env:env@host/db';
    const tmp = join(process.cwd(), '.env.test-3');
    writeFileSync(tmp, 'DIRECT_URL=postgresql://file:file@host/db\n');
    const { loadEnv } = await import('../src/env.js');
    expect(loadEnv(tmp).DIRECT_URL).toBe('postgresql://env:env@host/db');
    rmSync(tmp);
  });
});
