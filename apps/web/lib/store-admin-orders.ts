// LC-16 (prod sweep 2026-08-12): on /store-admin/orders the status-tab counts
// were tallied over the WHOLE order list while the rows underneath came from a
// list filtered by both the search box and the active tab. Type a customer
// name and a tab could read "5" over two visible rows — the "a number that
// disagrees with the same number on the screen below it" class, on the screen
// a store owner uses to reconcile orders.
//
// The search predicate now has exactly one definition and both the rows and
// the counts run through it, so they cannot diverge again.

/** The shape both helpers need. Deliberately structural: the page owns Order. */
export interface SearchableOrder<S extends string = string> {
  orderNumber: string;
  customerName: string;
  status: S;
}

/**
 * Does this order match the free-text box?
 *
 * Empty/whitespace search matches everything. Case-insensitive substring over
 * the two fields the input's own placeholder advertises.
 */
export function matchesOrderSearch(order: SearchableOrder, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return (
    order.customerName.toLowerCase().includes(q) ||
    order.orderNumber.toLowerCase().includes(q)
  );
}

/** The rows to render: search AND the active status tab. */
export function filterOrders<T extends SearchableOrder>(
  orders: readonly T[],
  search: string,
  statusFilter: string,
): T[] {
  return orders.filter(
    (o) => matchesOrderSearch(o, search) && (statusFilter === 'all' || o.status === statusFilter),
  );
}

/**
 * Tab badge counts, over the SEARCHED list — never the raw list.
 *
 * `all` is the size of the searched list, and every other key counts the
 * searched orders in that status, so each badge is exactly the number of rows
 * clicking it will show.
 */
export function statusTabCounts<S extends string>(
  orders: readonly SearchableOrder<S>[],
  search: string,
  statuses: readonly S[],
): Record<string, number> {
  const searched = orders.filter((o) => matchesOrderSearch(o, search));
  const counts: Record<string, number> = { all: searched.length };
  for (const s of statuses) counts[s] = searched.filter((o) => o.status === s).length;
  return counts;
}
