# apps\api\src\services\recurring.service.ts

- RecurringPlanKind · type · L18-L18 — type RecurringPlanKind = 'gau_seva' | 'wellness_batch' | 'temple_seva' | 'custom';
- ensureRecurringTable · function · L23-L46 — async function ensureRecurringTable(): Promise<void>
- RecurringPlan · interface · L48-L56 — interface RecurringPlan
- getRecurringPlan · function · L66-L68 — function getRecurringPlan(planId: string): RecurringPlan | null
- createRecurringSubscription · function · L71-L97 — async function createRecurringSubscription(opts: { userId: string; planId: string; gaushalaId?: string; templeId?: string; metadata?: Record<string, unknown>; })
- listMyRecurring · function · L100-L110 — async function listMyRecurring(userId: string)
