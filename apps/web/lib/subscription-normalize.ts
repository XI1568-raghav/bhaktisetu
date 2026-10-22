export interface MySubscription {
  id: string;
  plan: string;
  role: string;
  startDate: string;
  endDate: string;
  amount: number;
  status: string;
}

/**
 * QA 2026-10-22 (devotee, "Subscriptions shows Something went wrong"): the page
 * trusted the response shape and then dereferenced it during render. Anything
 * that was not exactly `{ subscription: { ...every field } | null }` - a list
 * under another key, a row missing `endDate`, a number where the plan is a
 * string - reached `.plan` / `.endDate` / `.amount` in the JSX, and a throw
 * during render has no catch: the whole route fell to the app-level "Something
 * went wrong" screen. Reduce whatever came back to a complete row or to null
 * (the real empty state) before it reaches state.
 */
export function normalizeSubscription(data: unknown): MySubscription | null {
  if (!data || typeof data !== 'object') return null;
  const body = data as { subscription?: unknown; subscriptions?: unknown };
  const raw = Array.isArray(body.subscriptions)
    ? (body.subscriptions.find(
        (r) => r && typeof r === 'object' && (r as { status?: unknown }).status === 'ACTIVE',
      ) ?? body.subscriptions[0])
    : body.subscription;
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.plan !== 'string' || r.plan === '') return null;
  const amount = Number(r.amount);
  return {
    id: String(r.id ?? ''),
    plan: r.plan,
    role: typeof r.role === 'string' ? r.role : '',
    startDate: typeof r.startDate === 'string' ? r.startDate : '',
    endDate: typeof r.endDate === 'string' ? r.endDate : '',
    amount: Number.isFinite(amount) ? amount : 0,
    status: typeof r.status === 'string' ? r.status : 'UNKNOWN',
  };
}

