# apps\web\components\StripeClientSecretCheckout.tsx

- getStripePromise · function · L28-L32 — function getStripePromise(): Promise<Stripe | null> | null
- Props · type · L34-L39 — type Props = { clientSecret: string; bookingNumber: string; returnUrl: string; onMailtoFallback: (bk: string) => void; };
- StripeClientSecretCheckout · function · L41-L88 — function StripeClientSecretCheckout(props: Props)
- CheckoutForm · function · L90-L149 — function CheckoutForm({ bookingNumber, returnUrl }: { bookingNumber: string; returnUrl: string })
- handleSubmit · function · L101-L119 — handleSubmit = async (e: React.FormEvent)
