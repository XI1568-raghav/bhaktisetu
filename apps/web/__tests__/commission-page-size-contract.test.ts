import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { COMMISSION_PAGE_SIZE, listMyCommissions } from '../lib/commission-api';

/**
 * AW-05 (2026-08-12, P1) — every wellness instructor's and astrologer's
 * Earnings page was permanently blank behind the message "Invalid query".
 *
 * The client shipped `COMMISSION_PAGE_SIZE = 200` (sized for the ADMIN route,
 * whose zod cap is 200) and used the same constant for the PROVIDER route
 * `GET /payouts/commissions`, whose cap is 100. Every provider request was a
 * 400:
 *
 *   {"error":"Invalid query","details":{"fieldErrors":{"pageSize":
 *     ["Number must be less than or equal to 100"]}}}
 *
 * while the identical request with pageSize=100 returned the instructor's real
 * ₹800 PENDING row. Classic both-sides-of-the-contract miss: the page moved to
 * a new endpoint and the page size was never reconciled.
 *
 * This test reads the caps out of the API SOURCE rather than hardcoding them,
 * so it fails again if either route's zod schema is tightened in the future
 * without the client following.
 */

const API_ROOT = resolve(__dirname, '../../api/src/routes');

function maxPageSizeIn(file: string, marker: RegExp): number {
  const src = readFileSync(resolve(API_ROOT, file), 'utf8');
  const window = src.slice(src.search(marker));
  const m = window.match(/pageSize:\s*z\.coerce\.number\(\)[^\n]*?\.max\((\d+)\)/);
  if (!m) throw new Error(`could not locate a pageSize cap in ${file}`);
  return Number(m[1]);
}

describe('AW-05 — commission page size is accepted by BOTH routes', () => {
  it('does not exceed the provider route cap (GET /payouts/commissions)', () => {
    const cap = maxPageSizeIn('payout-requests.ts', /const listSchema = z\.object\(/);
    expect(cap).toBeGreaterThan(0);
    expect(COMMISSION_PAGE_SIZE).toBeLessThanOrEqual(cap);
  });

  it('does not exceed the admin route cap (GET /admin/commissions)', () => {
    const cap = maxPageSizeIn('admin.ts', /pageSize: z\.coerce\.number\(\)\.int\(\)\.positive\(\)/);
    expect(cap).toBeGreaterThan(0);
    expect(COMMISSION_PAGE_SIZE).toBeLessThanOrEqual(cap);
  });

  it('a provider route that enforces its cap still returns rows to the client', async () => {
    // Stand in for the real zod schema: reject anything over the server cap the
    // same way Fastify does, so an over-sized default surfaces as the observed
    // "Invalid query" instead of silently passing in a mock.
    const cap = maxPageSizeIn('payout-requests.ts', /const listSchema = z\.object\(/);
    const row = { id: 'c-1', amount: '800', grossAmount: '1000', platformCut: '200', status: 'PENDING' };

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = new URL(String(input), 'https://api.test');
      const pageSize = Number(url.searchParams.get('pageSize'));
      // The client reads the body with res.text(), so the stub must serialise.
      const body = (o: unknown) => ({ text: async () => JSON.stringify(o) });
      if (pageSize > cap) {
        return {
          ok: false,
          status: 400,
          ...body({
            error: 'Invalid query',
            details: { fieldErrors: { pageSize: [`Number must be less than or equal to ${cap}`] } },
          }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        ...body({ data: [row], total: 1, page: 1, pageSize }),
      } as Response;
    }) as typeof fetch;

    const page = await listMyCommissions('token');
    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(1);
  });
});
