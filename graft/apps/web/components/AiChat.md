# apps\web\components\AiChat.tsx

- Message · interface · L18-L24 — interface Message
- AiChatProps · interface · L26-L32 — interface AiChatProps
- DemoTopic · interface · L36-L39 — interface DemoTopic
- getLocalDemoResponse · function · L252-L276 — function getLocalDemoResponse(message: string): string
- AiChat · function · L280-L748 — function AiChat({ conversationId, onConversationCreated, onConversationUpdated, language = 'en', accessToken, }: AiChatProps)
- handleSend · function · L382-L609 — async function handleSend(overrideText?: string)
- handleKeyDown · function · L612-L617 — function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>)
- handleInputChange · function · L620-L624 — function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>)
- EmptyState · function · L752-L841 — function EmptyState({ onQuestionClick, }: { onQuestionClick: (question: string) => void; })
