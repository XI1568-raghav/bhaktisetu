# apps\api\src\routes\voice-pandit.ts

- redactPII · function · L61-L74 — function redactPII(text: string): string
- fetchWithTimeout · function · L76-L88 — async function fetchWithTimeout( url: string, init: RequestInit, timeoutMs = HTTP_TIMEOUT_MS, ): Promise<Response>
- whisperTranscribe · function · L90-L112 — async function whisperTranscribe( audio: Buffer, mimeType: string, language: 'en' | 'hi', ): Promise<string>
- llmReply · function · L114-L147 — async function llmReply( redactedTranscript: string, language: 'en' | 'hi', ): Promise<string>
- elevenlabsTTS · function · L149-L174 — async function elevenlabsTTS(text: string, language: 'en' | 'hi'): Promise<Buffer>
- dailyKey · function · L184-L187 — function dailyKey(req: { user?: { id?: string } | null; ip?: string }): string
- checkDailyCap · function · L189-L204 — function checkDailyCap(req: { user?: { id?: string } | null; ip?: string }): { ok: boolean; remaining: number; resetAt: number }
- voicePanditRoutes · function · L206-L329 — async function voicePanditRoutes(server: FastifyInstance)
