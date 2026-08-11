# apps\api\src\routes\yatra-inquiry.ts

- refId · function · L80-L84 — function refId(): string
- ensureYatraBookingsTable · function · L86-L115 — async function ensureYatraBookingsTable()
- YatraBookingRow · type · L117-L136 — type YatraBookingRow = { id: string; reference: string; yatra_slug: string; yatra_title: string; package_tier: string; start_date: string; travelers_count: number; amount_inr: string; currency: string; buyer_name: string; buyer_email: string; buyer_phone: string | null; buyer_country: string | null; razorpay_order_id: string | null; razorpay_payment_id: string | null; status: string; created_at: Date; paid_at: Date | null; };
- esc · function · L138-L142 — function esc(s: string | number): string
- adminHtml · function · L144-L164 — function adminHtml(refId: string, b: z.infer<typeof inquirySchema>): string
- yatraInquiryRoutes · function · L168-L357 — async function yatraInquiryRoutes(server: FastifyInstance)
