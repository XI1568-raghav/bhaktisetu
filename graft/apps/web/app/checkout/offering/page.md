# apps\web\app\checkout\offering\page.tsx

- RazorpayInstance · type · L28-L31 — type RazorpayInstance = { open: () => void; on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void; };
- RazorpayConstructor · type · L32-L32 — type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;
- RazorpayWindow · type · L33-L33 — type RazorpayWindow = typeof window & { Razorpay?: RazorpayConstructor };
- loadRazorpay · function · L35-L47 — loadRazorpay = (): Promise<RazorpayConstructor | undefined>
- OfferingSummary · interface · L51-L59 — interface OfferingSummary
- PriestSummary · interface · L61-L66 — interface PriestSummary
- PriestWithOfferings · interface · L68-L70 — interface PriestWithOfferings extends PriestSummary
- getTomorrow · function · L72-L76 — function getTomorrow(): string
- OfferingCheckoutInner · function · L87-L752 — function OfferingCheckoutInner()
- handlePayment · function · L211-L341 — handlePayment = async ()
- handleStripePayment · function · L351-L430 — handleStripePayment = async ()
- OfferingCheckoutPage · function · L754-L760 — function OfferingCheckoutPage()
