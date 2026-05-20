import { describe, it, expect } from 'vitest';
import { __testing } from './store-admin.js';

// Pure-Zod gate tests mirror routes/priest-pujas.test.ts. Integration
// coverage for the prisma path is deferred until the suite grows a real
// Fastify+Prisma harness.

const { productCreateSchema, productUpdateSchema } = __testing;

describe('store-admin product — create payload', () => {
  const valid = {
    name: 'Tulsi Mala',
    price: 250,
  };

  it('accepts a minimal valid payload', () => {
    expect(productCreateSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts optional fields', () => {
    expect(
      productCreateSchema.safeParse({
        ...valid,
        description: 'Hand-strung 108 beads',
        imageUrl: 'https://cdn.example.com/p.jpg',
        category: 'mala',
        stock: 50,
        sku: 'TM-108',
        isActive: false,
      }).success
    ).toBe(true);
  });

  it('rejects a name shorter than 2 chars', () => {
    expect(productCreateSchema.safeParse({ ...valid, name: 'A' }).success).toBe(false);
  });

  it('rejects a negative price', () => {
    expect(productCreateSchema.safeParse({ ...valid, price: -1 }).success).toBe(false);
  });

  it('accepts price exactly 0 (free sample)', () => {
    expect(productCreateSchema.safeParse({ ...valid, price: 0 }).success).toBe(true);
  });

  it('rejects negative stock', () => {
    expect(productCreateSchema.safeParse({ ...valid, stock: -5 }).success).toBe(false);
  });

  it('rejects non-integer stock', () => {
    expect(productCreateSchema.safeParse({ ...valid, stock: 5.5 }).success).toBe(false);
  });

  it('rejects an invalid imageUrl', () => {
    expect(
      productCreateSchema.safeParse({ ...valid, imageUrl: 'not-a-url' }).success
    ).toBe(false);
  });

  it('rejects a description exceeding 5000 chars', () => {
    expect(
      productCreateSchema.safeParse({ ...valid, description: 'x'.repeat(5001) }).success
    ).toBe(false);
  });

  it('rejects missing required field (price)', () => {
    const { price: _omit, ...without } = valid;
    void _omit;
    expect(productCreateSchema.safeParse(without).success).toBe(false);
  });
});

describe('store-admin product — update payload', () => {
  it('accepts an empty patch', () => {
    expect(productUpdateSchema.safeParse({}).success).toBe(true);
  });

  it('accepts a single-field patch (toggle pattern)', () => {
    expect(productUpdateSchema.safeParse({ isActive: false }).success).toBe(true);
  });

  it('still rejects a negative price when patched', () => {
    expect(productUpdateSchema.safeParse({ price: -10 }).success).toBe(false);
  });

  it('still rejects an over-long name when patched', () => {
    expect(productUpdateSchema.safeParse({ name: 'x'.repeat(201) }).success).toBe(false);
  });

  it('rejects unknown type for price (string instead of number)', () => {
    expect(productUpdateSchema.safeParse({ price: '250' }).success).toBe(false);
  });
});
