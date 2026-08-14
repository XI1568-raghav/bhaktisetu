import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { __testing } from './priest.js';

/**
 * PF-13, the half the enum did not close.
 *
 * The shipped fix put `z.nativeEnum(BookingStatus)` on `?status` and
 * `z.nativeEnum(PayoutStatus)` on the payouts route, which stops the ONE
 * trigger the sweep happened to type. It does not close the channel. Every
 * handler in this file ends:
 *
 *     } catch (err: any) { reply.code(400).send({ error: err.message }); }
 *
 * — 23 of them. That catch swallows infrastructure errors as readily as
 * deliberate ones, so ANY Prisma fault (a bad date range reaching a DateTime
 * column, a P2023 from a non-UUID id, a dropped connection) still answers 400
 * with a body carrying `E:\NewClaude\bhaktisetu\apps\api\src\services\
 * priest.service.ts:211:26` and four lines of server source.
 *
 * apps/api/src/server.ts's setErrorHandler cannot help: it sanitises only 5xx,
 * and only for errors that PROPAGATE. These are caught and answered 400 by
 * hand, and 400 is on its `safeToEcho` allowlist by design — a deliberate 4xx
 * message ("This booking is not assigned to you") IS meant for the pandit.
 *
 * So the fix has to discriminate at the point of the catch, and that is what is
 * locked here: a Prisma/infrastructure message is replaced, a deliberate
 * service message is preserved verbatim.
 */

const ROUTES = join(__dirname, 'priest.ts');

/** Strip comments so a comment naming the banned pattern cannot trip the guard. */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

// Verbatim shape of the leak the sweep recorded against
// GET /api/v1/priest/bookings?status=not_a_status.
const PRISMA_LEAK = `
Invalid \`prisma.pujaBooking.count()\` invocation in
E:\\NewClaude\\bhaktisetu\\apps\\api\\src\\services\\priest.service.ts:211:26

  208   skip,
  209   take: limit,
  210 }),
→ 211 prisma.pujaBooking.count({
Inconsistent column data: Error creating UUID, invalid character`;

describe('PF-13 — a Prisma fault never reaches the pandit as source code', () => {
  const safe = __testing.safeErrorMessage;

  it('exports the sanitiser the catch blocks are supposed to use', () => {
    expect(typeof safe).toBe('function');
  });

  it('replaces the recorded priest.service.ts leak entirely', () => {
    const out = safe(new Error(PRISMA_LEAK));
    expect(out).not.toContain('priest.service.ts');
    expect(out).not.toContain('E:\\NewClaude');
    expect(out).not.toContain('prisma.');
    expect(out).not.toContain('211');
    expect(out.length).toBeGreaterThan(0);
  });

  it('replaces the payouts-route twin (priest.service.ts:452)', () => {
    const out = safe(
      new Error(
        '\nInvalid `prisma.priestPayout.count()` invocation in\nE:\\NewClaude\\bhaktisetu\\apps\\api\\src\\services\\priest.service.ts:452:27\n',
      ),
    );
    expect(out).not.toMatch(/priest\.service|prisma\.|NewClaude/);
  });

  it('redacts by error code even when the message is short and pathless', () => {
    const err = Object.assign(new Error('Inconsistent column data'), { code: 'P2023' });
    expect(safe(err)).not.toContain('Inconsistent column data');
  });

  it('redacts anything carrying a POSIX server path', () => {
    const out = safe(new Error('failed at /opt/render/project/src/apps/api/dist/x.js:12'));
    expect(out).not.toContain('/opt/render');
  });

  it('PRESERVES the deliberate service messages the pandit is meant to read', () => {
    // These are thrown on purpose by priest.service / the route bodies and are
    // rendered by the portal. A sanitiser that flattened these would trade an
    // information leak for a broken product.
    for (const msg of [
      'This booking is not assigned to you',
      'Priest profile not found',
      'Booking is not in a state that can be started',
      'Video proof is required before completing this booking',
    ]) {
      expect(safe(new Error(msg)), msg).toBe(msg);
    }
  });

  it('never returns an empty string, whatever it is handed', () => {
    for (const input of [new Error(''), undefined, null, {}, 'plain string']) {
      expect(safe(input as unknown), String(input)).toBeTruthy();
    }
  });
});

describe('PF-13 — no handler in priest.ts echoes a raw error message any more', () => {
  const src = code(readFileSync(ROUTES, 'utf8'));

  it('has zero remaining `error: err.message` response bodies', () => {
    const offenders = [...src.matchAll(/send\(\s*\{[^}]*\berror:\s*err\.message/g)].map((m) =>
      m[0].replace(/\s+/g, ' '),
    );
    expect(offenders, `raw-message echoes left: ${offenders.join(' | ')}`).toEqual([]);
  });

  it('still routes every catch through the sanitiser rather than deleting the message', () => {
    // Guard against the lazy "fix": replacing every branch with a constant
    // string would also pass the assertion above while destroying the
    // deliberate 4xx copy the portal renders.
    const catches = (src.match(/\}\s*catch\s*\(\s*err/g) ?? []).length;
    const sanitised = (src.match(/safeErrorMessage\(err\)/g) ?? []).length;
    expect(catches).toBeGreaterThan(15);
    expect(sanitised).toBeGreaterThanOrEqual(catches - 2);
  });
});
