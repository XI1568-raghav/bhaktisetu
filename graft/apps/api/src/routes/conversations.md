# apps\api\src\routes\conversations.ts

- Side · type · L23-L23 — type Side = 'devotee' | 'provider';
- sideFor · function · L25-L29 — function sideFor(conv: { devoteeId: string; providerId: string }, userId: string): Side | null
- sendRateOk · function · L50-L61 — function sendRateOk(userId: string, convId: string): boolean
- devoteeHasPaidRelationship · function · L73-L101 — async function devoteeHasPaidRelationship( kind: string, devoteeId: string, providerId: string, ): Promise<boolean>
- conversationRoutes · function · L103-L469 — async function conversationRoutes(server: FastifyInstance)
