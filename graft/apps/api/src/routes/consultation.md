# apps\api\src\routes\consultation.ts

- ensureConsultationTables · function · L37-L67 — async function ensureConsultationTables()
- ConsultationRow · type · L69-L86 — type ConsultationRow = { id: string; reference: string; user_id: string; astrologer_id: string; astrologer_name: string; minutes: number; per_minute_rate_inr: string; amount_inr: string; currency: string; scheduled_at: Date | null; razorpay_order_id: string | null; razorpay_payment_id: string | null; room_name: string | null; status: string; created_at: Date; paid_at: Date | null; };
- nextConsultRef · function · L88-L92 — function nextConsultRef(): string
- consultationRoutes · function · L129-L821 — async function consultationRoutes(server: FastifyInstance)
