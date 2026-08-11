# apps\web\lib\subscription-api.ts

- ProviderRole · type · L15-L21 — type ProviderRole = | 'priest' | 'astrologer' | 'wellness_instructor' | 'temple_manager' | 'store_owner' | 'gaushala_manager';
- SubscriptionStatus · type · L23-L28 — type SubscriptionStatus = | 'active' | 'cancelled' | 'past_due' | 'pending' | 'expired';
- SubscriptionPlan · interface · L30-L42 — interface SubscriptionPlan
- MarketplaceSubscription · interface · L44-L54 — interface MarketplaceSubscription
- SubscribeResponse · interface · L56-L63 — interface SubscribeResponse
- authHeaders · function · L65-L67 — function authHeaders(token: string | undefined): Record<string, string>
- asJson · function · L69-L82 — async function asJson<T>(res: Response): Promise<T>
- unwrapPlans · function · L84-L92 — function unwrapPlans(payload: unknown): SubscriptionPlan[]
- unwrapSub · function · L94-L109 — function unwrapSub(payload: unknown): MarketplaceSubscription | null
- listPlans · function · L111-L118 — async function listPlans(role?: ProviderRole | string): Promise<SubscriptionPlan[]>
- getMySubscription · function · L120-L130 — async function getMySubscription( token: string | undefined, ): Promise<MarketplaceSubscription | null>
- subscribeToPlan · function · L132-L142 — async function subscribeToPlan( token: string | undefined, planId: string, ): Promise<SubscribeResponse>
- cancelMySubscription · function · L144-L154 — async function cancelMySubscription( token: string | undefined, ): Promise<MarketplaceSubscription | null>
- listAllSubscriptions · function · L156-L172 — async function listAllSubscriptions( token: string | undefined, ): Promise<MarketplaceSubscription[]>
- Window · interface · L179-L181 — interface Window
- loadRazorpayScript · function · L186-L199 — function loadRazorpayScript(): Promise<boolean>
- OpenCheckoutOptions · interface · L201-L209 — interface OpenCheckoutOptions
- openRazorpayCheckout · function · L211-L231 — async function openRazorpayCheckout(opts: OpenCheckoutOptions): Promise<boolean>
