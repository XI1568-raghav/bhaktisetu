import { describe, it, expect } from 'vitest';
import { __testing } from './priests-public.js';

const { publicPriestsQuerySchema } = __testing;

// R-Q1-E-013: server-side filter contract for GET /priests
//
// Coverage:
//   - empty query → both filters absent
//   - specialization only → lowercased, trimmed
//   - deity only → trimmed (case-insensitive match handled in route)
//   - both filters → AND combo, both normalised
//   - whitespace-only / empty-string filters → coerced to undefined
//   - over-long (>64 char) input → rejected before hitting Prisma
//
// Route-level integration (Prisma `has:` + `some:` clauses, Cache-Control
// header, 400 on schema rejection) is exercised by the FastifyInstance
// harness in the broader API suite — these schema tests pin the contract
// that the route handler downstream depends on.

describe('publicPriestsQuerySchema (R-Q1-E-013)', () => {
  it('accepts empty query — both filters absent', () => {
    const result = publicPriestsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.specialization).toBeUndefined();
      expect(result.data.deity).toBeUndefined();
    }
  });

  it('accepts specialization only and lowercases it', () => {
    const result = publicPriestsQuerySchema.safeParse({ specialization: 'Marriage' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.specialization).toBe('marriage');
      expect(result.data.deity).toBeUndefined();
    }
  });

  it('accepts deity only and trims surrounding whitespace', () => {
    const result = publicPriestsQuerySchema.safeParse({ deity: '  Ganesh  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deity).toBe('Ganesh');
      expect(result.data.specialization).toBeUndefined();
    }
  });

  it('accepts both filters at once and normalises each', () => {
    const result = publicPriestsQuerySchema.safeParse({
      specialization: 'Vastu',
      deity: 'Shiva',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.specialization).toBe('vastu');
      expect(result.data.deity).toBe('Shiva');
    }
  });

  it('coerces whitespace-only specialization to undefined (no filter)', () => {
    const result = publicPriestsQuerySchema.safeParse({ specialization: '   ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.specialization).toBeUndefined();
    }
  });

  it('coerces empty-string deity to undefined (no filter)', () => {
    const result = publicPriestsQuerySchema.safeParse({ deity: '' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deity).toBeUndefined();
    }
  });

  it('rejects specialization longer than 64 chars (column budget)', () => {
    const result = publicPriestsQuerySchema.safeParse({
      specialization: 'a'.repeat(65),
    });
    expect(result.success).toBe(false);
  });

  it('rejects deity longer than 64 chars (column budget)', () => {
    const result = publicPriestsQuerySchema.safeParse({
      deity: 'b'.repeat(65),
    });
    expect(result.success).toBe(false);
  });

  it('ignores unrelated query params (passthrough drop)', () => {
    const result = publicPriestsQuerySchema.safeParse({
      specialization: 'marriage',
      deity: 'ganesh',
      page: '5',
      limit: '100',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.specialization).toBe('marriage');
      expect(result.data.deity).toBe('ganesh');
    }
  });
});
