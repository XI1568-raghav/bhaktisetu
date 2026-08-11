# apps\web\lib\conversation-store.ts

- StoredMessage · interface · L7-L13 — interface StoredMessage
- StoredConversation · interface · L15-L21 — interface StoredConversation
- generateId · function · L30-L32 — function generateId(): string
- deriveTitle · function · L34-L38 — function deriveTitle(firstMessage: string): string
- getAllConversations · function · L42-L55 — function getAllConversations(): StoredConversation[]
- getConversation · function · L57-L60 — function getConversation(id: string): StoredConversation | null
- createConversation · function · L62-L75 — function createConversation(firstMessage: StoredMessage): StoredConversation
- addMessage · function · L77-L84 — function addMessage(conversationId: string, message: StoredMessage): void
- updateLastMessage · function · L86-L100 — function updateLastMessage( conversationId: string, messageId: string, updates: Partial<Pick<StoredMessage, 'content' | 'citations'>> ): void
- deleteConversation · function · L102-L105 — function deleteConversation(id: string): void
- saveAll · function · L107-L116 — function saveAll(conversations: StoredConversation[]): void
