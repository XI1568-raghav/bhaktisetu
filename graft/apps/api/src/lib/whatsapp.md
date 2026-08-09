# apps\api\src\lib\whatsapp.ts

- SendResult · interface · L23-L28 — interface SendResult
- normalisePhone · function · L36-L41 — function normalisePhone(input: string): string
- callGraph · function · L43-L65 — async function callGraph(payload: Record<string, unknown>): Promise<SendResult>
- sendWhatsappTemplate · function · L72-L95 — async function sendWhatsappTemplate(params: { to: string; template: string; languageCode?: string; variables?: string[]; }): Promise<SendResult>
- sendWhatsappText · function · L102-L112 — async function sendWhatsappText(params: { to: string; text: string; }): Promise<SendResult>
