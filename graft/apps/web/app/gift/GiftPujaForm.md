# apps\web\app\gift\GiftPujaForm.tsx · [[client-side-auth-api-base-url-resolution]] [[feature-flagged-payment-with-backend-verification]] [[gift-a-puja-flow]]

- Status · type · L8-L8 — type Status = 'idle' | 'submitting' | 'success' | 'error';
- GiftConfig · type · L10-L14 — type GiftConfig = { paymentEnabled: boolean; whatsappEnabled: boolean; autoFlowReady: boolean; };
- CreateOrderResponse · type · L16-L26 — type CreateOrderResponse = { orderId: string; reference: string; amountUsd: number; amountInCents: number; currency: string; paymentIntentId: string; clientSecret: string | null; publishableKey: string; demo: boolean; };
- GiftPujaForm · function · L59-L343 — function GiftPujaForm()
- handleSubmit · function · L85-L166 — handleSubmit = async (e: React.FormEvent<HTMLFormElement>)
