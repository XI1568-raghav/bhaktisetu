import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * OPS-04 (wiring half) — the probe existed; nothing pointed at it.
 *
 * `apps/api/src/routes/health.ts` and its unit tests landed in an earlier pass:
 * a real `SELECT 1`, TTL-cached, timeout-bounded, anti-flap, 503 on sustained
 * failure. But `server.ts` still answered `/health` from an inline literal:
 *
 *   server.get('/health', async () => ({ status: 'ok', timestamp: ... }));
 *
 * `render.yaml` sets `healthCheckPath: /health` and every uptime monitor reads
 * the same URL, so the probe that decides whether this service is alive could
 * not go red no matter what the database did. Both halves existed; the wiring
 * did not. This file asserts the wiring, and only the wiring.
 *
 * WHY A SOURCE GUARD RATHER THAN BOOTING THE APP
 *
 * `server.ts` exports no build function — it is a bootstrap module that opens a
 * listener, connects Prisma, starts the scheduler and registers ~90 route
 * plugins as an import side effect. There is no seam to boot it inside vitest,
 * so the registration is asserted against the source text.
 *
 * Source guards in this repo have a standing failure mode: they match text that
 * lives inside a COMMENT. That is not hypothetical here — the very block being
 * asserted quotes the deleted stub verbatim in prose, so a naive
 * `expect(src).not.toContain("server.get('/health'")` would fail on the fixed
 * file and pass on a file where the comment was merely deleted. Comments are
 * therefore stripped first, by a scanner that understands string literals, and
 * the stripper itself is tested below rather than trusted.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER_TS = resolve(HERE, '../server.ts');

/**
 * Remove `//` and block comments without touching comment-like text inside a
 * string or template literal. Newlines inside stripped regions are preserved so
 * a reported line number still means something.
 */
export function stripComments(src: string): string {
  let out = '';
  let i = 0;
  let state: 'code' | 'line' | 'block' | 'single' | 'double' | 'tpl' = 'code';

  while (i < src.length) {
    const c = src[i]!;
    const n = src[i + 1];

    if (state === 'code') {
      if (c === '/' && n === '/') {
        state = 'line';
        i += 2;
        continue;
      }
      if (c === '/' && n === '*') {
        state = 'block';
        i += 2;
        continue;
      }
      if (c === "'") state = 'single';
      else if (c === '"') state = 'double';
      else if (c === '`') state = 'tpl';
      out += c;
      i += 1;
      continue;
    }

    if (state === 'line') {
      if (c === '\n') {
        state = 'code';
        out += c;
      }
      i += 1;
      continue;
    }

    if (state === 'block') {
      if (c === '*' && n === '/') {
        state = 'code';
        i += 2;
        continue;
      }
      if (c === '\n') out += c;
      i += 1;
      continue;
    }

    // Inside a string/template literal: copy verbatim, honouring escapes.
    if (c === '\\') {
      out += c + (src[i + 1] ?? '');
      i += 2;
      continue;
    }
    if (
      (state === 'single' && c === "'") ||
      (state === 'double' && c === '"') ||
      (state === 'tpl' && c === '`')
    ) {
      state = 'code';
    }
    out += c;
    i += 1;
  }

  return out;
}

/** The three facts that make /health a real probe, checked against code only. */
export function auditHealthWiring(rawSource: string): string[] {
  const code = stripComments(rawSource);
  const problems: string[] = [];

  if (!/import\s*\{[^}]*\bhealthRoutes\b[^}]*\}\s*from\s*'\.\/routes\/health\.js'/.test(code)) {
    problems.push("server.ts does not import healthRoutes from './routes/health.js'");
  }
  if (!/server\.register\(\s*healthRoutes\b/.test(code)) {
    problems.push('server.ts does not register healthRoutes');
  }
  if (/server\.get\(\s*['"]\/health['"]/.test(code)) {
    problems.push("server.ts still declares an inline server.get('/health') stub");
  }

  return problems;
}

/** Frozen reproduction of the stub as it stood at HEAD before this fix. */
const HEAD_SHAPE = `
  import { healthChannelRoutes } from './routes/health-channels.js';

  // /health = LIVENESS — intentionally cheap + static. Returns 200 as long as
  // the process is alive.
  server.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));
  await server.register(healthChannelRoutes, { prefix: '/health' });
`;

describe('OPS-04 — Render healthCheckPath is wired to the DB-aware probe', () => {
  it('strips comments without eating string literals', () => {
    const stripped = stripComments(
      [
        "const a = '// not a comment';",
        'const b = 1; // a real comment',
        '/* block */ const c = "/* also not a comment */";',
        'const d = `x // y`;',
      ].join('\n'),
    );
    expect(stripped).toContain("'// not a comment'");
    expect(stripped).toContain('"/* also not a comment */"');
    expect(stripped).toContain('`x // y`');
    expect(stripped).not.toContain('a real comment');
    expect(stripped).not.toContain('block */');
    // Line structure survives, so a future line-numbered assertion still works.
    expect(stripped.split('\n')).toHaveLength(4);
  });

  it('flags the pre-fix stub — the guard can actually go red', () => {
    const problems = auditHealthWiring(HEAD_SHAPE);
    expect(problems).toContain("server.ts does not import healthRoutes from './routes/health.js'");
    expect(problems).toContain('server.ts does not register healthRoutes');
    expect(problems).toContain(
      "server.ts still declares an inline server.get('/health') stub",
    );
  });

  it('does not mistake the explanatory comment for a live stub', () => {
    // The fixed server.ts quotes the deleted stub in prose. A guard that read
    // raw text would fail here; this one strips first.
    const commentOnly = `
      import { healthRoutes } from './routes/health.js';
      // server.get('/health', async () => ({ status: 'ok' }));
      await server.register(healthRoutes);
    `;
    expect(auditHealthWiring(commentOnly)).toEqual([]);
  });

  it('server.ts registers healthRoutes and no longer answers /health inline', () => {
    const source = readFileSync(SERVER_TS, 'utf8');
    // Sanity: we are reading the real bootstrap, not an empty/renamed file.
    expect(source).toContain('bootstrap');
    expect(auditHealthWiring(source)).toEqual([]);
  });

  it('/health is still exempt from the rate limiter it is polled through', () => {
    const code = stripComments(readFileSync(SERVER_TS, 'utf8'));
    expect(code).toMatch(/SKIP_RATE_LIMIT_PATHS[^;]*'\/health'/);
  });
});
