# apps\web\app\astrology\chat\page.tsx

- ChatSource · type · L24-L24 — type ChatSource = 'llm-grounded' | 'llm' | 'fallback-keyword' | 'fallback-default';
- ChatMessage · interface · L26-L32 — interface ChatMessage
- BirthDetails · interface · L34-L39 — interface BirthDetails
- getFallbackResponse · function · L137-L149 — function getFallbackResponse(message: string): string
- AstrologerChatPage · function · L153-L610 — function AstrologerChatPage()
- handleBirthSubmit · function · L180-L205 — function handleBirthSubmit(e: React.FormEvent)
- handleSkipBirth · function · L207-L229 — function handleSkipBirth()
- handleSend · function · L231-L301 — async function handleSend()
- handleKeyDown · function · L303-L308 — function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>)
- handleInputChange · function · L310-L314 — function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>)
- renderInline · function · L616-L638 — function renderInline(raw: string, keyPrefix: string): React.ReactNode[]
- formatMarkdown · function · L640-L673 — function formatMarkdown(text: string): React.JSX.Element
