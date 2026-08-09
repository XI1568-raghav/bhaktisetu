# apps\api\src\routes\antim-sanskar.ts

- PackageTier · type · L69-L69 — type PackageTier = (typeof PACKAGES)[number]['tier'];
- makeBookingNumber · function · L141-L146 — function makeBookingNumber(): string
- AntimSanskarBookingInput · type · L166-L166 — type AntimSanskarBookingInput = z.infer<typeof bookSchema>;
- familyEmailHtml · function · L170-L185 — function familyEmailHtml(params: { contactName: string; bookingNumber: string; packageName: string; priceInr: number; }): string
- ensureAntimSanskarTable · function · L187-L221 — async function ensureAntimSanskarTable(): Promise<void>
- antimSanskarRoutes · function · L223-L335 — async function antimSanskarRoutes(server: FastifyInstance)
