# apps\web\components\DonationForm.tsx

- DonationFormProps · interface · L23-L31 — interface DonationFormProps
- CreateOrderResponse · interface · L33-L40 — interface CreateOrderResponse
- VerifyResponse · interface · L42-L48 — interface VerifyResponse
- RazorpayInstance · type · L52-L55 — type RazorpayInstance = { open: () => void; on: (event: 'payment.failed', handler: (response: { error?: { description?: string } }) => void) => void; };
- RazorpayOptions · type · L57-L73 — type RazorpayOptions = { key: string; amount: number; currency: string; name: string; description: string; order_id: string; prefill: { name?: string; email?: string; contact?: string }; notes?: Record<string, string>; theme?: { color?: string }; handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string; }) => void | Promise<void>; modal?: { ondismiss?: () => void }; };
- RazorpayConstructor · type · L75-L75 — type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;
- loadRazorpay · function · L89-L109 — function loadRazorpay(): Promise<RazorpayConstructor | null>
- DonationForm · function · L113-L613 — function DonationForm({ causeId, causeName, causeKind = 'gaushala', defaultAmounts, className, planAmount, }: DonationFormProps)
- validate · function · L165-L203 — function validate(): boolean
- handleSubmit · function · L207-L334 — async function handleSubmit(e: React.FormEvent)
