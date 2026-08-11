# apps\api\scripts\ops\cs005-resend-stale-leads.ts

- LeadRow · interface · L26-L36 — interface LeadRow
- SendCandidate · interface · L38-L41 — interface SendCandidate
- PlanResult · interface · L43-L49 — interface PlanResult
- skipReason · function · L62-L79 — function skipReason(lead: LeadRow, now: Date = new Date()): string | null
- templateForLead · function · L84-L87 — function templateForLead(lead: LeadRow): SendCandidate['templateKey'] | null
- buildPlan · function · L94-L133 — function buildPlan( leads: LeadRow[], opts: { now?: Date; perDayCap?: number; limit?: number } = {}, ): PlanResult
- RenderedTemplate · interface · L135-L139 — interface RenderedTemplate
- renderTemplate · function · L147-L261 — function renderTemplate(candidate: SendCandidate): RenderedTemplate
- SendResult · interface · L263-L268 — interface SendResult
- SendBatchOptions · interface · L270-L275 — interface SendBatchOptions
- sendBatch · function · L281-L315 — async function sendBatch( candidates: SendCandidate[], opts: SendBatchOptions, ): Promise<SendResult[]>
- parseCliArgs · function · L317-L322 — function parseCliArgs(argv: string[]): { dryRun: boolean; limit: number }
- checkDomainVerifiedGate · function · L328-L333 — function checkDomainVerifiedGate(env: NodeJS.ProcessEnv): string | null
- main · function · L335-L408 — async function main(): Promise<void>
