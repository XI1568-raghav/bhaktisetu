# apps\api\src\services\apollo.service.ts

- ApolloPersonQuery · interface · L19-L25 — interface ApolloPersonQuery
- ApolloPerson · interface · L27-L33 — interface ApolloPerson
- buildName · function · L60-L66 — function buildName(p: z.infer<typeof ApolloPersonRaw>): string | null
- buildLocation · function · L68-L73 — function buildLocation(p: z.infer<typeof ApolloPersonRaw>): string | null
- isUsableEmail · function · L75-L83 — function isUsableEmail(email: string | null | undefined): email is string
- searchPeople · function · L90-L163 — async function searchPeople( query: ApolloPersonQuery, ): Promise<ApolloPerson[]>
