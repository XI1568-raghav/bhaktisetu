# apps\api\src\services\subscription.service.ts

- PlanDefinition · interface · L9-L25 — interface PlanDefinition
- SubscriptionResult · interface · L27-L36 — interface SubscriptionResult
- SubscriptionService · class · L249-L722 — class SubscriptionService
- getPlans · method · L250-L253 — getPlans(role?: string): PlanDefinition[]
- subscribe · method · L255-L333 — async subscribe(userId: string, planId: string, role: string): Promise<SubscriptionResult>
- getMySubscription · method · L335-L357 — async getMySubscription(userId: string): Promise<SubscriptionResult | null>
- createRazorpaySubscription · method · L365-L454 — async createRazorpaySubscription(args: { userId: string; planId: string; role: string; }): Promise<{ subscriptionId: string; shortUrl: string | null; status: string; skipped?: boolean; reason?: string; }>
- createStripeAnnualSubscription · method · L463-L557 — async createStripeAnnualSubscription(args: { userId: string; planId: string; }): Promise<{ sessionId: string; url: string | null; status: string; skipped?: boolean; reason?: string; }>
- isPremium · method · L563-L578 — async isPremium(userId: string): Promise<boolean>
- cancelRazorpaySubscription · method · L580-L622 — async cancelRazorpaySubscription(userId: string): Promise<{ cancelled: boolean; message: string }>
- handleSubscriptionEvent · method · L624-L694 — async handleSubscriptionEvent(event: string, payload: unknown): Promise<{ handled: boolean; reason?: string }>
- cancel · method · L696-L721 — async cancel(userId: string): Promise<{ message: string; cancelled: boolean }>
- mapToRazorpayPlanId · function · L728-L741 — function mapToRazorpayPlanId(darshyaPlanId: string): string
- extractRazorpaySubscriptionFromEvent · function · L743-L749 — function extractRazorpaySubscriptionFromEvent(payload: unknown): { id: string; status?: string } | null
- safeSendEmail · function · L751-L759 — async function safeSendEmail(args: { userId: string; subject: string; html: string }): Promise<void>
- findUpcomingExpirations · function · L761-L778 — async function findUpcomingExpirations(daysAhead: number): Promise<Array<{ userId: string; endDate: Date; email: string | null }>>
