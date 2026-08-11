# apps\api\src\routes\leads-self-onboard.ts

- SelfOnboardBody · type · L69-L69 — type SelfOnboardBody = z.infer<typeof bodySchema>;
- roleLabel · function · L71-L84 — function roleLabel(role: SelfOnboardBody['role']): string
- roleSourceKey · function · L86-L88 — function roleSourceKey(role: SelfOnboardBody['role']): string
- welcomeEmailHtml · function · L90-L99 — function welcomeEmailHtml(params: { fullName: string; roleLabel: string }): string
- adminNotifyHtml · function · L101-L119 — function adminNotifyHtml(params: { lead: SelfOnboardBody; leadId: string; roleLabel: string }): string
- leadsSelfOnboardRoutes · function · L121-L209 — async function leadsSelfOnboardRoutes(server: FastifyInstance)
