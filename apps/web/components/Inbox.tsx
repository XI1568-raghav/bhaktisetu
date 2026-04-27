'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { Send, Video, Phone, ArrowLeft, Loader2, MessageSquare } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { API_BASE_URL } from '../lib/api-config';

/**
 * Shared inbox surface used by:
 *   - /messages (devotee)
 *   - /priest/messages
 *   - /astrologer-portal/messages
 *   - /wellness-portal/messages
 *   - /temple-portal/messages
 *   - /gaushala-portal/messages
 *   - /store-admin/messages
 *
 * Same component, role flag tells the API which side to filter from. Polls
 * messages every 3s while a thread is open. Video call uses the existing
 * /consultation/[room] page which embeds Jitsi.
 */

interface Counterparty {
  id: string;
  fullName: string;
  avatarUrl: string | null;
}

interface ConversationSummary {
  id: string;
  kind: string;
  side: 'devotee' | 'provider';
  counterparty: Counterparty;
  linkedBookingId: string | null;
  subject: string | null;
  unread: number;
  lastMessage: { body: string; kind: string; createdAt: string } | null;
  lastMessageAt: string;
}

interface Message {
  id: string;
  senderId: string;
  sender: { fullName: string; avatarUrl: string | null };
  mine: boolean;
  kind: 'text' | 'system' | 'call_link';
  body: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

const POLL_INTERVAL_MS = 3000;

export function Inbox({ role = 'auto' }: { role?: 'devotee' | 'provider' | 'auto' }) {
  const { session } = useAuth();
  const token = session?.accessToken;
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConvs = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/conversations?role=${role}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations ?? []);
    } finally {
      setLoading(false);
    }
  }, [token, role]);

  useEffect(() => {
    fetchConvs();
    const i = setInterval(fetchConvs, POLL_INTERVAL_MS);
    return () => clearInterval(i);
  }, [fetchConvs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-saffron-500" />
        <span className="ml-3 text-surface-500">Loading inbox...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 h-[calc(100dvh-180px)] min-h-[500px]">
      {/* Conversation list */}
      <div className={`bg-white rounded-xl border border-surface-100 overflow-hidden flex flex-col ${activeId ? 'hidden md:flex' : ''}`}>
        <div className="px-4 py-3 border-b border-surface-100">
          <h2 className="font-semibold text-surface-800 text-sm">Messages</h2>
          <p className="text-xs text-surface-400">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-10 h-10 text-surface-300 mx-auto mb-3" />
              <p className="text-sm text-surface-500">No conversations yet.</p>
              <p className="text-xs text-surface-400 mt-1">
                {role === 'provider'
                  ? 'When devotees book your services, threads will appear here.'
                  : 'Book a puja or consultation to start a conversation.'}
              </p>
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`w-full text-left px-4 py-3 border-b border-surface-50 hover:bg-saffron-50/40 transition-colors ${
                  activeId === c.id ? 'bg-saffron-50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-saffron-100 rounded-full flex items-center justify-center text-saffron-700 text-sm font-bold flex-shrink-0">
                    {c.counterparty.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-surface-800 truncate">{c.counterparty.fullName}</p>
                      {c.unread > 0 && (
                        <span className="bg-saffron-600 text-white text-[10px] font-bold rounded-full px-1.5 min-w-5 h-5 flex items-center justify-center">
                          {c.unread}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-surface-500 truncate mt-0.5">
                      {c.lastMessage?.kind === 'system' && '· '}
                      {c.lastMessage?.kind === 'call_link' && '📞 '}
                      {c.lastMessage?.body ?? 'No messages yet'}
                    </p>
                    <p className="text-[10px] text-surface-400 mt-0.5">
                      {new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {c.kind.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Active thread */}
      <div className={`bg-white rounded-xl border border-surface-100 overflow-hidden flex flex-col ${!activeId ? 'hidden md:flex' : ''}`}>
        {activeId ? (
          <Thread
            key={activeId}
            conversationId={activeId}
            token={token!}
            onBack={() => setActiveId(null)}
            onMessagesChanged={fetchConvs}
            counterpartyName={conversations.find((c) => c.id === activeId)?.counterparty.fullName ?? ''}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-surface-400 text-sm">
            Select a conversation to view messages
          </div>
        )}
      </div>
    </div>
  );
}

interface ThreadProps {
  conversationId: string;
  token: string;
  onBack: () => void;
  onMessagesChanged: () => void;
  counterpartyName: string;
}

function Thread({ conversationId, token, onBack, onMessagesChanged, counterpartyName }: ThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [activeCall, setActiveCall] = useState<{ jitsiUrl: string; callId: string } | null>(null);
  const sinceRef = useRef<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async (reset = false) => {
    const url = `${API_BASE_URL}/conversations/${conversationId}/messages${
      sinceRef.current && !reset ? `?since=${encodeURIComponent(sinceRef.current)}` : ''
    }`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const data = await res.json();
    sinceRef.current = data.serverTime;
    if (reset) {
      setMessages(data.messages);
    } else if (data.messages.length > 0) {
      setMessages((prev) => [...prev, ...data.messages]);
    }
  }, [conversationId, token]);

  // Initial load + 3s poll
  useEffect(() => {
    sinceRef.current = null;
    fetchMessages(true);
    // mark read
    fetch(`${API_BASE_URL}/conversations/${conversationId}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => undefined);

    const i = setInterval(() => fetchMessages(false), POLL_INTERVAL_MS);
    return () => clearInterval(i);
  }, [conversationId, fetchMessages, token]);

  // Autoscroll
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        setDraft('');
        await fetchMessages(false);
        onMessagesChanged();
      }
    } finally {
      setSending(false);
    }
  };

  const startCall = async () => {
    const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/start-call`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    setActiveCall({ jitsiUrl: data.jitsiUrl, callId: data.callId });
    fetchMessages(false);
    onMessagesChanged();
  };

  return (
    <>
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-100 flex items-center gap-3">
        <button onClick={onBack} className="md:hidden p-1 text-surface-500 hover:text-surface-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 bg-saffron-100 rounded-full flex items-center justify-center text-saffron-700 text-sm font-bold">
          {counterpartyName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-surface-800 truncate">{counterpartyName}</p>
          <p className="text-[11px] text-surface-400">Online</p>
        </div>
        <button
          onClick={startCall}
          aria-label="Start video call"
          className="p-2 text-saffron-600 hover:bg-saffron-50 rounded-lg transition-colors"
        >
          <Video className="w-5 h-5" />
        </button>
        <button
          onClick={startCall}
          aria-label="Start voice call"
          className="p-2 text-saffron-600 hover:bg-saffron-50 rounded-lg transition-colors"
        >
          <Phone className="w-5 h-5" />
        </button>
      </div>

      {/* Active call banner */}
      {activeCall && (
        <div className="px-4 py-2 bg-saffron-50 border-b border-saffron-100 flex items-center gap-3">
          <Video className="w-4 h-4 text-saffron-600" />
          <span className="text-xs text-saffron-700 flex-1">Call in progress</span>
          <Link
            href={`/consultation/${encodeURIComponent(activeCall.jitsiUrl.split('/').pop() ?? '')}`}
            target="_blank"
            className="text-xs font-medium text-saffron-700 hover:underline"
          >
            Open call →
          </Link>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-surface-50/50">
        {messages.map((m) => {
          if (m.kind === 'system') {
            return (
              <div key={m.id} className="text-center">
                <span className="text-[11px] text-surface-500 bg-surface-100 px-3 py-1 rounded-full inline-block max-w-md">
                  {m.body}
                </span>
              </div>
            );
          }
          if (m.kind === 'call_link') {
            const meta = (m.metadata ?? {}) as { jitsiUrl?: string; roomName?: string };
            return (
              <div key={m.id} className="text-center">
                <div className="inline-block bg-white rounded-xl border border-saffron-200 px-4 py-3 max-w-sm">
                  <div className="flex items-center gap-2 text-saffron-700 mb-1">
                    <Video className="w-4 h-4" />
                    <span className="text-xs font-medium">Video call</span>
                  </div>
                  <p className="text-xs text-surface-600 mb-2">{m.body}</p>
                  {meta.roomName && (
                    <Link
                      href={`/consultation/${encodeURIComponent(meta.roomName)}?provider=${encodeURIComponent(counterpartyName)}`}
                      target="_blank"
                      className="text-xs font-semibold text-saffron-700 hover:underline"
                    >
                      Join call →
                    </Link>
                  )}
                </div>
              </div>
            );
          }
          return (
            <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  m.mine
                    ? 'bg-saffron-600 text-white rounded-br-md'
                    : 'bg-white border border-surface-100 text-surface-800 rounded-bl-md'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`text-[10px] mt-1 ${m.mine ? 'text-saffron-100' : 'text-surface-400'}`}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <div className="text-center py-12 text-surface-400 text-sm">No messages yet — say namaste!</div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-surface-100 px-3 py-2 flex items-end gap-2 bg-white">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 resize-none bg-surface-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-300 max-h-32"
        />
        <button
          onClick={send}
          disabled={sending || !draft.trim()}
          className="bg-saffron-600 text-white p-2.5 rounded-xl hover:bg-saffron-700 disabled:opacity-40 transition-colors"
          aria-label="Send"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </>
  );
}
