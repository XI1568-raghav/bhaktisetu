/**
 * JSON-column read/write helpers for append-only audit + structured fields
 * stored as Prisma `Json`/`Json[]` (P2-30).
 *
 * Problem: StoreOrder.statusHistory is a `Json[]` column that callers append to
 * by hand at multiple sites (status mutation, manual payment-confirm). Each
 * site re-implemented `Array.isArray(x) ? x : []` + spread, with no shared
 * shape validation — so a malformed history entry (wrong key, non-ISO date)
 * could silently land in the audit trail. Similarly, StoreOrder.items is a
 * loose `Json` blob validated only at checkout; downstream readers re-narrow
 * it ad-hoc with `as unknown as ...`.
 *
 * This module centralises:
 *   - `appendStatusHistory(current, entry)` — type-checked append for the
 *     order status audit log. Validates the entry shape, coerces `changedAt`
 *     to an ISO string, and tolerates a null/malformed current value (returns
 *     `[entry]` instead of crashing).
 *   - `validateStoreOrderItems(items)` — Zod parse of the items array shape
 *     ({ productId, qty, priceAtPurchase }) for safe downstream narrowing.
 *
 * Scope: ONLY the order-history append sites are wired this pass. Other Json
 * columns (pujaBooking.devoteeNames, storeOrder.shippingAddress, etc.) are left
 * untouched per the spec — adding the helper is the deliverable, not a sweep.
 */

import { z } from 'zod';
import type { Prisma } from '@prisma/client';

/** Shape of a single status-history audit entry (StoreOrder.statusHistory). */
export interface StatusHistoryEntry {
  status: string;
  changedAt: string; // ISO 8601
  changedBy: string;
  note: string | null;
}

/**
 * Append a validated status-history entry to the existing array, returning a
 * value safe to assign to `data.statusHistory` in a Prisma update.
 *
 * - Tolerates `current` being null/undefined/non-array (defensive — the column
 *   is `Json[] @default([])` but a legacy row could hold anything).
 * - Coerces `changedAt` to an ISO string if a Date/value is passed.
 * - Returns `Prisma.InputJsonValue` so it slots directly into the update payload
 *   without an `as` cast at the call site.
 */
export function appendStatusHistory(
  current: unknown,
  entry: Omit<StatusHistoryEntry, 'changedAt'> & { changedAt?: string | Date },
): Prisma.InputJsonValue[] {
  const existing: unknown[] = Array.isArray(current) ? current : [];
  const changedAt =
    entry.changedAt instanceof Date
      ? entry.changedAt.toISOString()
      : entry.changedAt ?? new Date().toISOString();
  const normalized: StatusHistoryEntry = {
    status: String(entry.status),
    changedAt,
    changedBy: String(entry.changedBy),
    note: entry.note ?? null,
  };
  // Cast is safe: Prisma.InputJsonValue accepts JSON-serialisable arrays.
  // We keep StatusHistoryEntry (plain JSON-safe object) so the column stays
  // queryable downstream.
  return [...existing, normalized] as unknown as Prisma.InputJsonValue[];
}

/** Zod schema for a single store-order line item as stored in StoreOrder.items. */
export const storeOrderItemSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().positive(),
  priceAtPurchase: z.number().nonnegative(),
});

export type StoreOrderItem = z.infer<typeof storeOrderItemSchema>;

/**
 * Validate + narrow the loose `Json` blob of a StoreOrder's items into a typed
 * array. Returns an empty array for null/missing/malformed input rather than
 * throwing — callers that need to fail loud should check the result length.
 */
export function validateStoreOrderItems(items: unknown): StoreOrderItem[] {
  if (!Array.isArray(items)) return [];
  const out: StoreOrderItem[] = [];
  for (const it of items) {
    const parsed = storeOrderItemSchema.safeParse(it);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}
