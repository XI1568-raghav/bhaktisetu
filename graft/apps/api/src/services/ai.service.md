# apps\api\src\services\ai.service.ts

- formatScriptureContext · function · L64-L77 — function formatScriptureContext(verses: ScriptureVerse[]): string
- generateTitle · function · L81-L86 — function generateTitle(message: string): string
- AiService · class · L90-L588 — class AiService
- chat · method · L95-L218 — async chat(params: { userId: string; conversationId?: string; message: string; language?: string; })
- StoredMessage · type · L108-L108 — type StoredMessage = { role: 'user' | 'assistant'; content: string; timestamp?: string };
- recommendPujas · method · L223-L273 — async recommendPujas(params: { userId?: string; lifeEvent?: string; rashi?: string; nakshatra?: string; language?: string; })
- generateSankalp · method · L278-L368 — async generateSankalp(params: { devoteeName: string; gotra?: string; pujaName: string; deity: string; date?: string; city?: string; purpose?: string; additionalNames?: string[]; })
- personalizeContent · method · L373-L467 — async personalizeContent(params: { userId?: string; timeOfDay?: string; currentDate?: string; })
- translate · method · L472-L523 — async translate(params: { text: string; sourceLanguage: string; targetLanguage: string; }): Promise<string>
- listConversations · method · L528-L552 — async listConversations(userId: string, page = 1, limit = 20)
- getConversation · method · L557-L572 — async getConversation(conversationId: string, userId: string)
- deleteConversation · method · L577-L587 — async deleteConversation(conversationId: string, userId: string)
