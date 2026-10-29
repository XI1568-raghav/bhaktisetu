import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('yatra inquiry submit', () => {
  it('mints one clientRequestId per submit so automatic retries cannot double-send', () => {
    const src = readFileSync(join(process.cwd(), 'app/yatra/book/page.tsx'), 'utf-8');
    const mint = src.indexOf('const clientRequestId');
    const post = src.indexOf('await postJsonWithRetry(');
    expect(mint).toBeGreaterThan(-1);
    expect(mint).toBeLessThan(post);
    expect(src).toMatch(/payload = \{\s*clientRequestId,/);
  });
});
