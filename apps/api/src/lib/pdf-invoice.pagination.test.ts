import { describe, it, expect } from 'vitest';
import zlib from 'node:zlib';
import { PDFDocument } from 'pdf-lib';
import { generateInvoice } from './pdf-invoice.js';

// Store orders with many lines used to draw past the footer and off the page
// (about 19 items). The table now paginates with repeated headers and the totals
// block on the last page only.

function textOf(buf: Buffer): string {
  const raw = buf.toString('latin1');
  let out = '';
  const re = /[^d]stream\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const start = m.index + m[0].length;
    const end = raw.indexOf('endstream', start);
    if (end < 0) continue;
    try {
      const inflated = zlib.inflateSync(Buffer.from(raw.slice(start, end), 'latin1')).toString('latin1');
      out += '\n' + inflated.replace(/<([0-9A-Fa-f]+)>/g, (w, hex: string) =>
        hex.length % 2 ? w : Buffer.from(hex, 'hex').toString('latin1'));
    } catch { /* not a content stream */ }
  }
  return out;
}

function order(n: number, name = (i: number) => `Item number ${i}`) {
  const items = Array.from({ length: n }, (_, i) => ({ name: name(i + 1), qty: 2, priceInr: 100 }));
  return {
    type: 'store_order' as const,
    orderNumber: 'SO-20261013-ABCDE',
    customerName: 'Test Buyer',
    items,
    shippingAddress: '1 Main Road, Pune, Maharashtra 411001, India',
    totalInr: n * 200,
    createdAt: '2026-10-13',
  };
}

describe('invoice pagination', () => {
  it.each([
    [1, 1],
    [18, 1],
    [19, 1],
    [40, 2],
    [200, 6],
  ])('%i items -> %i page(s), headers repeated, one totals block', async (n, pages) => {
    const buf = await generateInvoice(order(n));
    const doc = await PDFDocument.load(buf);
    expect(doc.getPageCount()).toBe(pages);
    const text = textOf(buf);
    expect(text).toContain(`Item number ${n}`);
    expect(text.split('Description').length - 1).toBe(pages);
    expect(text.split('(continued)').length - 1).toBe(pages - 1);
    expect(text.split('Proof of payment only').length - 1).toBe(1);
    expect(text).toContain(`INR ${(n * 200).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    expect(text.split('Generated at https://darshya.online').length - 1).toBe(pages);
  });

  it('long and unbroken names are wrapped, never drawn off the page', async () => {
    const long = (i: number) => `Handmade rudraksha mala ${i} ${'x'.repeat(150)} ${'word '.repeat(60)}`;
    const buf = await generateInvoice(order(25, long));
    const doc = await PDFDocument.load(buf);
    expect(doc.getPageCount()).toBeGreaterThan(1);
    expect(textOf(buf)).not.toMatch(/x{57,}/);
  });
});
