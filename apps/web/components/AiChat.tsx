'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import AiChatMessage, { type Citation } from './AiChatMessage';
import { API_BASE_URL } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp: string;
}

interface AiChatProps {
  conversationId?: string | null;
  onNewConversation?: (id: string) => void;
  language?: string;
  accessToken?: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AiChat({
  conversationId,
  onNewConversation,
  language = 'en',
  accessToken,
}: AiChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentConvId, setCurrentConvId] = useState<string | null>(
    conversationId || null
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load existing conversation
  useEffect(() => {
    if (conversationId && accessToken) {
      loadConversation(conversationId);
    } else if (!conversationId) {
      setMessages([]);
      setCurrentConvId(null);
    }
  }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadConversation(id: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/ai/conversations/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.ok) {
        const data = await res.json();
        const loadedMessages: Message[] = (data.conversation.messages || []).map(
          (m: any, idx: number) => ({
            id: `loaded-${idx}`,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp || '',
          })
        );
        setMessages(loadedMessages);
        setCurrentConvId(id);
      }
    } catch {
      // Failed to load — start fresh
    }
  }

  // ─── Send Message ─────────────────────────────────────────────────────────

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    // Add user message
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);

    // Create placeholder for assistant response
    const assistantMsgId = `assistant-${Date.now()}`;
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          message: trimmed,
          conversationId: currentConvId,
          language,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      // Parse SSE stream
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let citations: Citation[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.substring(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);

            if (event.type === 'metadata') {
              // Store conversation ID and citations
              if (event.conversationId && !currentConvId) {
                setCurrentConvId(event.conversationId);
                onNewConversation?.(event.conversationId);
              }
              citations = event.citations || [];
            } else if (event.type === 'text') {
              fullContent += event.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: fullContent }
                    : m
                )
              );
            } else if (event.type === 'done') {
              // Update with final content and citations
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: event.fullContent || fullContent, citations }
                    : m
                )
              );
            } else if (event.type === 'error') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content:
                          'I apologize, but I encountered an issue. Please try asking your question again.',
                      }
                    : m
                )
              );
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (error) {
      // Update assistant message with error
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content:
                  'Namaste! I am unable to connect right now. Please check your connection and try again. In the meantime, you can explore our scripture library and content section for spiritual guidance.',
              }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }

  // Handle Enter key (send on Enter, new line on Shift+Enter)
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Auto-resize textarea
  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    // Reset height to auto, then set to scrollHeight
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <EmptyState onQuestionClick={(q) => { setInput(q); inputRef.current?.focus(); }} />
        ) : (
          <>
            {messages.map((msg, idx) => (
              <AiChatMessage
                key={msg.id}
                role={msg.role}
                content={msg.content}
                citations={msg.citations}
                timestamp={msg.timestamp}
                isStreaming={
                  isStreaming &&
                  msg.role === 'assistant' &&
                  idx === messages.length - 1
                }
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-surface-200 bg-white p-4">
        <div className="max-w-3xl mx-auto flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask Pandit Ji a question..."
              rows={1}
              disabled={isStreaming}
              className="w-full resize-none rounded-xl border border-surface-300 px-4 py-3 pr-12 text-sm text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-saffron-400 focus:border-saffron-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-saffron-600 text-white hover:bg-saffron-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            title="Send message"
          >
            {isStreaming ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-center text-xs text-surface-400 mt-2">
          Pandit Ji provides spiritual guidance based on Hindu scriptures. For
          medical, legal, or financial advice, please consult qualified
          professionals.
        </p>
      </div>
    </div>
  );
}

// ─── Empty State with Suggested Questions ─────────────────────────────────────

function EmptyState({
  onQuestionClick,
}: {
  onQuestionClick: (question: string) => void;
}) {
  const suggestions = [
    {
      text: 'What does the Gita say about duty?',
      emoji: '\uD83D\uDCD6',
    },
    {
      text: 'Which mantra for peace of mind?',
      emoji: '\uD83E\uDDD8',
    },
    {
      text: 'Explain the concept of dharma',
      emoji: '\u2638\uFE0F',
    },
    {
      text: 'What puja should I do for career success?',
      emoji: '\uD83D\uDD25',
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      {/* Om symbol */}
      <div className="w-20 h-20 gradient-saffron rounded-full flex items-center justify-center mb-6 shadow-lg animate-float">
        <span className="text-4xl text-white font-bold font-devanagari font-[family-name:var(--font-noto-devanagari)]">
          {'\u0950'}
        </span>
      </div>

      <h2 className="text-2xl font-bold text-surface-800 mb-2">
        Ask a Pandit
      </h2>
      <p className="text-surface-500 mb-8 max-w-md">
        Get spiritual guidance rooted in Hindu scriptures. Ask about the Bhagavad
        Gita, mantras, pujas, dharma, or any spiritual question.
      </p>

      {/* Suggested questions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
        {suggestions.map((s) => (
          <button
            key={s.text}
            onClick={() => onQuestionClick(s.text)}
            className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-surface-200 hover:border-saffron-300 hover:bg-saffron-50 text-left text-sm text-surface-700 transition-all shadow-sm hover:shadow"
          >
            <span className="text-lg shrink-0">{s.emoji}</span>
            <span>{s.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
