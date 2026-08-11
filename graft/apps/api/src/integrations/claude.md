# apps\api\src\integrations\claude.ts

- DemoTopic · interface · L36-L39 — interface DemoTopic
- getDemoResponse · function · L579-L606 — function getDemoResponse(message: string): string
- StreamEvent · type · L613-L615 — type StreamEvent = | { type: 'content_block_delta'; delta: { type: 'text_delta'; text: string } } | { type: 'message_stop'; delta: undefined };
- makeWordStream · function · L617-L628 — function makeWordStream(text: string): AsyncIterable<StreamEvent>
- [Symbol.asyncIterator] · method · L619-L626 — async *[Symbol.asyncIterator]()
- groqStreamToEvents · function · L630-L666 — async function* groqStreamToEvents(res: Response): AsyncIterable<StreamEvent>
- streamChat · function · L670-L715 — async function streamChat(params: { systemPrompt: string; messages: { role: 'user' | 'assistant'; content: string }[]; maxTokens?: number; model?: string; })
- generateText · function · L719-L765 — async function generateText(params: { systemPrompt: string; userMessage: string; maxTokens?: number; model?: string; }): Promise<string>
