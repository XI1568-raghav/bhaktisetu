# apps\api\src\lib\support-sla.ts

- SlaTimezoneCode · type · L32-L32 — type SlaTimezoneCode = (typeof SLA_TIMEZONES)[number]['code'];
- SlaTicketInput · interface · L34-L37 — interface SlaTicketInput
- SlaBucketResult · interface · L39-L48 — interface SlaBucketResult
- SlaSummary · interface · L50-L55 — interface SlaSummary
- bucketByOwningTimezone · function · L67-L73 — function bucketByOwningTimezone(createdAt: Date): SlaTimezoneCode
- hourInTz · function · L80-L91 — function hourInTz(d: Date, tz: string): number
- classifyTicket · function · L99-L110 — function classifyTicket( ticket: SlaTicketInput, now: Date = new Date(), ): 'met' | 'breached' | 'pending'
- summarizeSla · function · L117-L168 — function summarizeSla( tickets: SlaTicketInput[], now: Date = new Date(), ): SlaSummary
- pct · function · L170-L173 — function pct(met: number, denom: number): number
