# apps\api\src\services\refund.service.ts

- RefundType · type · L28-L28 — type RefundType = 'full' | 'partial';
- ProcessRefundParams · interface · L30-L38 — interface ProcessRefundParams
- ProcessRefundResult · interface · L40-L50 — interface ProcessRefundResult
- RazorpayRefundResponse · interface · L52-L57 — interface RazorpayRefundResponse
- razorpayAuthHeader · function · L61-L66 — function razorpayAuthHeader(): string | null
- callRazorpayRefund · function · L68-L91 — async function callRazorpayRefund( paymentId: string, amountInPaise: number, notes: Record<string, string> ): Promise<RazorpayRefundResponse>
- refundSuccessEmail · function · L93-L118 — function refundSuccessEmail(params: { devoteeName: string; pujaName: string; templeName: string; bookingNumber: string; amount: string; refundId: string; refundType: RefundType; }): { subject: string; html: string; text: string }
- processRefund · function · L120-L284 — async function processRefund(params: ProcessRefundParams): Promise<ProcessRefundResult>
- processAutoRefunds · function · L295-L338 — async function processAutoRefunds(): Promise<{ processed: number; succeeded: number; failed: number; skipped?: boolean; reason?: string; }>
