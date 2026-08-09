# apps\api\src\routes\gurukul-applications.ts

- isSyntheticUserId · function · L6-L8 — function isSyntheticUserId(id: string): boolean
- dbDisabled · function · L9-L9 — function dbDisabled(): boolean
- serializeApp · function · L31-L53 — function serializeApp(a: { id: string; programId: string; applicantUserId: string; applicantType: string; studentName: string; studentAgeYears: number; studentEmail: string | null; guardianName: string | null; guardianRelation: string | null; guardianPhone: string | null; guardianAadhaarLast4: string | null; consentSigned: boolean; consentSignedAt: Date | null; statement: string; status: string; forwardedAt: Date | null; decisionAt: Date | null; decisionNote: string | null; createdAt: Date; updatedAt: Date; })
- gurukulApplicationsRoutes · function · L55-L106 — async function gurukulApplicationsRoutes(server: FastifyInstance)
