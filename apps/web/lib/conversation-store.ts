'use client';

import { type Citation } from '../components/AiChatMessage';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoredMessage {
 id: string;
 role: 'user' | 'assistant';
 content: string;
 citations?: Citation[];
 timestamp: string;
}

export interface StoredConversation {
 id: string;
 title: string;
 messages: StoredMessage[];
 createdAt: string;
 updatedAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'poojly_conversations';
const MAX_TITLE_LENGTH = 60;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
 return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function deriveTitle(firstMessage: string): string {
 const cleaned = firstMessage.replace(/\s+/g, ' ').trim();
 if (cleaned.length <= MAX_TITLE_LENGTH) return cleaned;
 return cleaned.slice(0, MAX_TITLE_LENGTH - 3) + '...';
}

// ─── Store Operations ─────────────────────────────────────────────────────────

export function getAllConversations(): StoredConversation[] {
 if (typeof window === 'undefined') return [];
 try {
 const raw = localStorage.getItem(STORAGE_KEY);
 if (!raw) return [];
 const parsed = JSON.parse(raw) as StoredConversation[];
 // Sort by updatedAt descending (most recent first)
 return parsed.sort(
 (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
 );
 } catch {
 return [];
 }
}

export function getConversation(id: string): StoredConversation | null {
 const all = getAllConversations();
 return all.find((c) => c.id === id) ?? null;
}

export function createConversation(firstMessage: StoredMessage): StoredConversation {
 const now = new Date().toISOString();
 const conv: StoredConversation = {
 id: generateId(),
 title: deriveTitle(firstMessage.content),
 messages: [firstMessage],
 createdAt: now,
 updatedAt: now,
 };
 const all = getAllConversations();
 all.unshift(conv);
 saveAll(all);
 return conv;
}

export function addMessage(conversationId: string, message: StoredMessage): void {
 const all = getAllConversations();
 const conv = all.find((c) => c.id === conversationId);
 if (!conv) return;
 conv.messages.push(message);
 conv.updatedAt = new Date().toISOString();
 saveAll(all);
}

export function updateLastMessage(
 conversationId: string,
 messageId: string,
 updates: Partial<Pick<StoredMessage, 'content' | 'citations'>>
): void {
 const all = getAllConversations();
 const conv = all.find((c) => c.id === conversationId);
 if (!conv) return;
 const msg = conv.messages.find((m) => m.id === messageId);
 if (!msg) return;
 if (updates.content !== undefined) msg.content = updates.content;
 if (updates.citations !== undefined) msg.citations = updates.citations;
 conv.updatedAt = new Date().toISOString();
 saveAll(all);
}

export function deleteConversation(id: string): void {
 const all = getAllConversations().filter((c) => c.id !== id);
 saveAll(all);
}

function saveAll(conversations: StoredConversation[]): void {
 if (typeof window === 'undefined') return;
 try {
 localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
 } catch {
 // Storage full — drop oldest conversations
 const trimmed = conversations.slice(0, Math.max(conversations.length - 10, 5));
 localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
 }
}
