# apps\web\components\LiveChatWidget.tsx

- QuickAction · type · L9-L9 — type QuickAction = { label: string; href: string };
- ChatMessage · type · L11-L18 — type ChatMessage = { id: string; author: 'agent' | 'user' | 'system'; body: string; createdAt: string; actions?: QuickAction[]; escalate?: boolean; };
- LiveChatWidget · function · L34-L365 — function LiveChatWidget()
- send · function · L63-L168 — async function send(textOverride?: string)
- handleEscalate · function · L170-L183 — function handleEscalate()
