import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  matchesOrderSearch,
  filterOrders,
  statusTabCounts,
} from '../lib/store-admin-orders';

// LC-16 (prod sweep 2026-08-12): sign in as the store owner, open
// /store-admin/orders, type a customer name into "Search by customer name or
// order number…", and compare each status tab's badge with the rows below it.
// The badges were `orders.filter(o => o.status === s).length` over the
// unsearched list; the rows were the search-AND-status list. A tab read 5 and
// rendered 2.

const STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'] as const;
type S = (typeof STATUSES)[number];

const ORDERS: { orderNumber: string; customerName: string; status: S }[] = [
  { orderNumber: 'ORD-1001', customerName: 'Anjali Sharma', status: 'PENDING' },
  { orderNumber: 'ORD-1002', customerName: 'Anjali Verma', status: 'PENDING' },
  { orderNumber: 'ORD-1003', customerName: 'Ravi Kumar', status: 'PENDING' },
  { orderNumber: 'ORD-1004', customerName: 'Ravi Iyer', status: 'PENDING' },
  { orderNumber: 'ORD-1005', customerName: 'Meera Nair', status: 'PENDING' },
  { orderNumber: 'ORD-1006', customerName: 'Anjali Rao', status: 'SHIPPED' },
  { orderNumber: 'ORD-1007', customerName: 'Suresh Pillai', status: 'DELIVERED' },
];

describe('LC-16 — a tab badge equals the rows that tab renders', () => {
  it('the sweep scenario: PENDING reads 5 unsearched, 2 for "anjali"', () => {
    expect(statusTabCounts(ORDERS, '', STATUSES).PENDING).toBe(5);
    expect(statusTabCounts(ORDERS, 'anjali', STATUSES).PENDING).toBe(2);
  });

  it('every badge equals the row count of its own tab, for every search', () => {
    for (const search of ['', 'anjali', 'ravi', 'ORD-100', 'ORD-1007', 'zzz']) {
      const counts = statusTabCounts(ORDERS, search, STATUSES);
      for (const key of ['all', ...STATUSES]) {
        expect(
          filterOrders(ORDERS, search, key).length,
          `tab "${key}" search "${search}"`,
        ).toBe(counts[key]);
      }
    }
  });

  it('"all" is the searched total, not the raw total', () => {
    expect(statusTabCounts(ORDERS, '', STATUSES).all).toBe(7);
    expect(statusTabCounts(ORDERS, 'anjali', STATUSES).all).toBe(3);
  });

  it('a search that matches nothing zeroes every badge', () => {
    const counts = statusTabCounts(ORDERS, 'no-such-buyer', STATUSES);
    expect(Object.values(counts).every((n) => n === 0)).toBe(true);
  });

  it('search matches order number as well as customer name, case-insensitively', () => {
    expect(matchesOrderSearch(ORDERS[0]!, 'ord-1001')).toBe(true);
    expect(matchesOrderSearch(ORDERS[0]!, 'ANJALI')).toBe(true);
    expect(matchesOrderSearch(ORDERS[0]!, 'ravi')).toBe(false);
  });

  it('a blank or whitespace-only search matches everything', () => {
    expect(matchesOrderSearch(ORDERS[0]!, '')).toBe(true);
    expect(matchesOrderSearch(ORDERS[0]!, '   ')).toBe(true);
    expect(statusTabCounts(ORDERS, '   ', STATUSES).all).toBe(ORDERS.length);
  });

  it('the page tallies through the shared helper, not its own filter', () => {
    const src = fs
      .readFileSync(
        path.join(__dirname, '..', 'app', 'store-admin', 'orders', 'page.tsx'),
        'utf8',
      )
      .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(src).toMatch(/statusTabCounts/);
    // The tally that ignored the search box.
    expect(src).not.toMatch(/orders\.filter\(\s*\(o\)\s*=>\s*o\.status\s*===\s*s\s*\)/);
  });
});
