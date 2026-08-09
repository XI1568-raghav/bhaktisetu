# apps\api\src\routes\outreach-webhook.ts

- IntentLabel · type · L48-L48 — type IntentLabel = 'INTERESTED' | 'NEEDS_INFO' | 'UNSUBSCRIBE' | 'SPAM' | 'OUT_OF_OFFICE';
- fromToString · function · L81-L85 — function fromToString(from: z.infer<typeof fromSchema> | undefined): string | undefined
- fromToEmail · function · L87-L94 — function fromToEmail(from: z.infer<typeof fromSchema> | undefined): string | null
- extractLeadIdFromHeaders · function · L96-L108 — function extractLeadIdFromHeaders( headers: Array<{ name: string; value: string }> | undefined, text: string, html: string, ): string | null
- aiAutoReply · function · L110-L126 — async function aiAutoReply(lead: { id: string; name: string; email: string | null; city: string | null; role: string; }, replyText: string): Promise<string>
- aiNeedsInfoReply · function · L128-L160 — async function aiNeedsInfoReply(lead: { id: string; name: string; email: string | null; city: string | null; role: string; }, replyText: string): Promise<string>
- classifyIntent · function · L167-L190 — async function classifyIntent(replyText: string): Promise<IntentLabel | null>
- heuristicIntent · function · L192-L197 — function heuristicIntent(replyText: string): IntentLabel
- notifyAdminsOfInterestedReply · function · L199-L228 — async function notifyAdminsOfInterestedReply( lead: { id: string; name: string; email: string | null; city: string | null; role: string }, replyText: string, fromEmail: string | null, ): Promise<void>
- unsubscribeHtml · function · L231-L236 — function unsubscribeHtml(): string
- handleInbound · function · L245-L415 — async function handleInbound(body: unknown): Promise<{ ok: boolean; action: string; intent?: IntentLabel; reason?: string; }>
- outreachWebhookRoutes · function · L417-L565 — async function outreachWebhookRoutes(server: FastifyInstance)
- verifySvix · function · L423-L459 — verifySvix = ( request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply, ): boolean
- inboundHandler · function · L461-L474 — inboundHandler = async ( request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply, )
- handleUnsubscribe · function · L541-L561 — handleUnsubscribe = async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply)
- outreachAdminRoutes · function · L569-L591 — async function outreachAdminRoutes(server: FastifyInstance)
