import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * I-04 / I18N-03 — the wiring guard.
 *
 * The catalogue, the resolver, the plugin and their tests all existed and were
 * green while production still answered English, because src/server.ts never
 * called any of it. Every other test in this lane builds its own Fastify, so
 * nothing could notice. This one asserts the single line that decides whether
 * any of the rest reaches a user.
 *
 * server.ts cannot be imported here: it calls `bootstrap()` at module scope and
 * binds a port. So this reads the source, which makes it a source-text guard —
 * and a source-text guard MUST strip comments before matching. That is not
 * hypothetical here: the comment block explaining the fix contains the literal
 * `server.register(routes, { prefix })`, and against the raw text this file's
 * ordering assertion fails (the "register" match lands at offset 7713, ahead of
 * the real call at 10084) even though the wiring is correct.
 */

const SERVER_TS = resolve(__dirname, '../server.ts');

/** Source with block and line comments removed. See the note above. */
function executableSource(): string {
  return readFileSync(SERVER_TS, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

describe('src/server.ts installs the localizing error serializer', () => {
  it('calls errorLocalizationPlugin', () => {
    expect(executableSource()).toContain('errorLocalizationPlugin(server');
  });

  it('calls it rather than registering it', () => {
    // `server.register(errorLocalizationPlugin)` would encapsulate both the
    // error handler and the onSend hook in a child context, invisible to every
    // sibling route plugin — green tests, dead in production.
    expect(executableSource()).not.toMatch(/register\(\s*errorLocalizationPlugin/);
  });

  it('installs it above every route registration (AW-08)', () => {
    const code = executableSource();
    const wiredAt = code.indexOf('errorLocalizationPlugin(server');
    const firstRegister = code.indexOf('server.register(');
    expect(wiredAt).toBeGreaterThanOrEqual(0);
    expect(firstRegister).toBeGreaterThanOrEqual(0);
    expect(wiredAt).toBeLessThan(firstRegister);
  });

  it('keeps no second, un-localizing setErrorHandler', () => {
    // A handler installed after the plugin's would win and silently drop
    // localization for every thrown error in the API.
    expect(executableSource()).not.toContain('server.setErrorHandler(');
  });
});
