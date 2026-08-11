# apps\api\src\middlewares\cron-auth.ts

- constantTimeEq · function · L26-L33 — function constantTimeEq(a: string, b: string): boolean
- readEnvToken · function · L35-L38 — function readEnvToken(): string
- logMisconfigured · function · L40-L44 — function logMisconfigured(): void
- requireCronBearer · function · L46-L64 — async function requireCronBearer( request: FastifyRequest, reply: FastifyReply, ): Promise<void>
- requireCronSecretHeader · function · L74-L89 — async function requireCronSecretHeader( request: FastifyRequest, reply: FastifyReply, ): Promise<void>
