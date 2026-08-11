# apps\api\src\routes\gift-puja.ts

- refId · function · L56-L60 — function refId(): string
- escape · function · L62-L66 — function escape(s: string): string
- inquiryHtml · function · L68-L85 — function inquiryHtml(referenceId: string, b: z.infer<typeof inquirySchema>): string
- ensureGiftPujaTables · function · L87-L118 — async function ensureGiftPujaTables()
- GiftPujaOrderRow · type · L120-L138 — type GiftPujaOrderRow = { id: string; reference: string; buyer_email: string; buyer_name: string | null; recipient_name: string; recipient_whatsapp: string; recipient_city: string | null; puja: string | null; amount_usd: string; currency: string; stripe_payment_intent_id: string | null; stripe_client_secret: string | null; status: string; wa_message_id: string | null; wa_status: string | null; created_at: Date; paid_at: Date | null; };
- giftPujaRoutes · function · L140-L370 — async function giftPujaRoutes(server: FastifyInstance)
