'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { Send, Video, Phone, ArrowLeft, Loader2, MessageSquare, Star } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import {
  API_BASE_URL,
  DATA_FETCH_TIMEOUT_MS,
  fetchWithTimeout,
} from '../lib/api-config';

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

/**
 * RES-08 (2026-08-12): the inbox polled on a flat 3s `setInterval` with no
 * in-flight guard, no timeout and no backoff. Held open with every request
 * accepted and never answered, /messages fired 12 API calls in 37 seconds
 * while the UI sat on "Loading inbox…" — each new poll issued with the
 * previous ones still pending and none of them ever aborted. Opening a thread
 * starts a SECOND 3s loop, so an active conversation is ~40 req/min per tab.
 * During a backend incident every open Messages tab therefore adds load to an
 * already failing API, and Chrome's 6-connections-per-host ceiling means the
 * tab eventually cannot issue any request at all. The client amplified the
 * outage and the user just saw a spinner.
 *
 * Three changes, applied to BOTH loops: (1) skip a tick while a request is
 * still out, (2) give every poll an AbortSignal so a stalled socket dies
 * instead of accumulating, (3) back off geometrically on repeated failures and
 * say "Reconnecting…" out loud, resetting on the first success.
 */
const POLL_TIMEOUT_MS = 10_000;
const POLL_BACKOFF_MAX_MS = 60_000;

/** 3s while healthy, then 6 / 12 / 24 / 48 / 60s while the API is failing. */
function nextPollDelay(failStreak: number): number {
  if (failStreak <= 0) return POLL_INTERVAL_MS;
  return Math.min(POLL_INTERVAL_MS * 2 ** failStreak, POLL_BACKOFF_MAX_MS);
}

export function Inbox({ role = 'auto' }: { role?: 'devotee' | 'provider' | 'auto' }) {
  const { session } = useAuth();
  const token = session?.accessToken;
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // P2 #220 (2026-08-03): track consecutive auth failures and STOP polling on
  // a 401 (bad/expired token) instead of hammering the API every 3s forever.
  const authFailCount = useRef(0);
  // RES-08: a poll already on the wire. Without this a 3s tick fires straight
  // over a request that has not come back.
  const inFlight = useRef(false);
  const failStreak = useRef(0);
  const [reconnecting, setReconnecting] = useState(false);

  const fetchConvs = useCallback(async (): Promise<boolean> => {
    if (!token) return false;
    if (inFlight.current) return true;
    inFlight.current = true;
    try {
      const res = await fetchWithTimeout(
        `${API_BASE_URL}/conversations?role=${role}`,
        { headers: { Authorization: `Bearer ${token}` } },
        POLL_TIMEOUT_MS,
      );
      if (res.status === 401 || res.status === 403) {
        authFailCount.current += 1;
        return false; // signal: stop polling
      }
      if (!res.ok) {
        // Transient — keep polling, but SLOWER each time, and say so.
        failStreak.current += 1;
        setReconnecting(true);
        return true;
      }
      authFailCount.current = 0;
      failStreak.current = 0;
      setReconnecting(false);
      const data = await res.json();
      setConversations(data.conversations ?? []);
      return true;
    } catch {
      // A timeout or a dead network is the same class of failure as a 5xx for
      // scheduling purposes. Previously there was no catch at all here, so a
      // network error escaped as an unhandled rejection.
      failStreak.current += 1;
      setReconnecting(true);
      return true;
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [token, role]);

  useEffect(() => {
    authFailCount.current = 0;
    failStreak.current = 0;
    // Phase D P1 #1: visibility-pause — poll only when tab visible.
    // P2 #220: also stop after repeated auth failures (bad token) — no point
    // polling an endpoint that will never authorize this session.
    // RES-08: a self-scheduling timeout rather than setInterval, because the
    // gap between polls now depends on how the last one went.
    let stopped = false;
    let paused = document.visibilityState !== 'visible';
    let timer: ReturnType<typeof setTimeout> | null = null;

    const clear = (): void => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };
    const schedule = (): void => {
      clear();
      if (stopped || paused || authFailCount.current >= 3) return;
      timer = setTimeout(() => {
        void run();
      }, nextPollDelay(failStreak.current));
    };
    const run = async (): Promise<void> => {
      timer = null;
      if (stopped || paused || authFailCount.current >= 3) return;
      await fetchConvs();
      schedule();
    };

    // First load fires regardless of tab visibility, as it always did.
    void fetchConvs().then(() => {
      if (!stopped) schedule();
    });

    const onVisibility = (): void => {
      if (document.visibilityState === 'visible' && authFailCount.current < 3) {
        if (paused) {
          paused = false;
          void run();
        }
      } else {
        paused = true;
        clear();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', onVisibility);
      clear();
    };
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
          {/* RES-08: during an incident the list simply stopped updating and
              said nothing. Name the state instead of letting the user read a
              stale list as a live one. */}
          {reconnecting && (
            <p role="status" className="mt-1 flex items-center gap-1.5 text-xs text-amber-700">
              <Loader2 className="w-3 h-3 animate-spin" />
              Reconnecting&hellip;
            </p>
          )}
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
                        <span className="bg-saffron-600 text-white text-xs font-bold rounded-full px-1.5 min-w-5 h-5 flex items-center justify-center">
                          {c.unread}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-surface-500 truncate mt-0.5">
                      {c.lastMessage?.kind === 'system' && '· '}
                      {c.lastMessage?.kind === 'call_link' && '📞 '}
                      {c.lastMessage?.body ?? 'No messages yet'}
                    </p>
                    <p className="text-xs text-surface-400 mt-0.5">
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
            side={conversations.find((c) => c.id === activeId)?.side ?? 'devotee'}
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
  side: 'devotee' | 'provider';
}

interface ExistingRating { stars: number; body: string | null }

function Thread({ conversationId, token, onBack, onMessagesChanged, counterpartyName, side }: ThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [activeCall, setActiveCall] = useState<{ jitsiUrl: string; callId: string } | null>(null);
  const [rating, setRating] = useState<ExistingRating | null>(null);
  const [ratingLoaded, setRatingLoaded] = useState(false);
  const sinceRef = useRef<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  // RES-08: the thread poll is the SECOND 3s interval on this screen.
  const msgInFlight = useRef(false);
  const msgFailStreak = useRef(0);
  // RES-10: send() had no else and no catch, so a 500 left the draft in the
  // box, rendered nothing, re-enabled the button, and never delivered the
  // message. A devotee asking about tomorrow's puja pressed Send twice and the
  // conversation died silently at the worst possible moment.
  const [sendFailed, setSendFailed] = useState(false);
  const [callFailed, setCallFailed] = useState(false);

  // Load any existing rating once per conversation switch. We only need
  // to know whether one exists (to suppress the prompt) and what the
  // stars/body were (so the devotee sees their prior submission rather
  // than a blank form).
  useEffect(() => {
    setRating(null);
    setRatingLoaded(false);
    fetch(`${API_BASE_URL}/ratings/${conversationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : { rating: null }))
      .then((d) => {
        if (d?.rating) setRating({ stars: d.rating.stars, body: d.rating.body });
      })
      .catch(() => undefined)
      .finally(() => setRatingLoaded(true));
  }, [conversationId, token]);

  const callEnded = messages.some(
    (m) => m.kind === 'system' && /Call ended/i.test(m.body),
  );

  const fetchMessages = useCallback(async (reset = false) => {
    const url = `${API_BASE_URL}/conversations/${conversationId}/messages${
      sinceRef.current && !reset ? `?since=${encodeURIComponent(sinceRef.current)}` : ''
    }`;
    if (msgInFlight.current) return;
    msgInFlight.current = true;
    let res: Response;
    try {
      res = await fetchWithTimeout(
        url,
        { headers: { Authorization: `Bearer ${token}` } },
        POLL_TIMEOUT_MS,
      );
    } catch {
      msgFailStreak.current += 1;
      msgInFlight.current = false;
      return;
    }
    msgInFlight.current = false;
    if (!res.ok) {
      msgFailStreak.current += 1;
      return;
    }
    msgFailStreak.current = 0;
    const data = await res.json();
    sinceRef.current = data.serverTime;
    if (reset) {
      setMessages(data.messages);
    } else if (data.messages.length > 0) {
      // Dedupe by id. Two overlapping fetches (manual after-send + scheduled
      // 3s poll) can return the same row twice if they fire in the same tick
      // before either updates sinceRef — without dedupe the message appears
      // twice in the thread.
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const fresh = data.messages.filter((m: Message) => !seen.has(m.id));
        return fresh.length === 0 ? prev : [...prev, ...fresh];
      });
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

    // Phase D P1 #1: visibility-pause for active thread polling.
    // RES-08: same self-scheduling + backoff treatment as the conversation
    // list — this was the other 3s interval, and an open thread meant BOTH
    // were running against a failing API at once.
    let stopped = false;
    let paused = document.visibilityState !== 'visible';
    let timer: ReturnType<typeof setTimeout> | null = null;

    const clear = (): void => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };
    const schedule = (): void => {
      clear();
      if (stopped || paused) return;
      timer = setTimeout(() => {
        void run();
      }, nextPollDelay(msgFailStreak.current));
    };
    const run = async (): Promise<void> => {
      timer = null;
      if (stopped || paused) return;
      await fetchMessages(false);
      schedule();
    };

    schedule();

    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') {
        if (paused) {
          paused = false;
          void run();
        }
      } else {
        paused = true;
        clear();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', onVisibility);
      clear();
    };
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
    setSendFailed(false);
    try {
      const res = await fetchWithTimeout(
        `${API_BASE_URL}/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ body }),
        },
        DATA_FETCH_TIMEOUT_MS,
      );
      if (res.ok) {
        setDraft('');
        await fetchMessages(false);
        onMessagesChanged();
      } else {
        // RES-10: there used to be no else. The draft stayed, the button
        // re-enabled, nothing rendered, and the message was never delivered.
        setSendFailed(true);
      }
    } catch {
      // …and no catch either, so a network failure became an unhandled
      // promise rejection because send() is called straight from onClick.
      setSendFailed(true);
    } finally {
      setSending(false);
    }
  };

  const startCall = async () => {
    setCallFailed(false);
    try {
      const res = await fetchWithTimeout(
        `${API_BASE_URL}/conversations/${conversationId}/start-call`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
        DATA_FETCH_TIMEOUT_MS,
      );
      if (!res.ok) {
        // RES-10: this was a bare `return` — pressing the call button during
        // an outage did literally nothing visible.
        setCallFailed(true);
        return;
      }
      const data = await res.json();
      setActiveCall({ jitsiUrl: data.jitsiUrl, callId: data.callId });
      void fetchMessages(false);
      onMessagesChanged();
    } catch {
      setCallFailed(true);
    }
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
          <p className="text-xs text-surface-400">Online</p>
        </div>
        <button
          onClick={() => void startCall()}
          aria-label="Start video call"
          className="p-2 text-saffron-600 hover:bg-saffron-50 rounded-lg transition-colors"
        >
          <Video className="w-5 h-5" />
        </button>
        <button
          onClick={() => void startCall()}
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
                <span className="text-xs text-surface-500 bg-surface-100 px-3 py-1 rounded-full inline-block max-w-md">
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
                <p className={`text-xs mt-1 ${m.mine ? 'text-saffron-100' : 'text-surface-400'}`}>
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

      {/* Rating prompt — devotee only, after a call has ended */}
      {side === 'devotee' && callEnded && ratingLoaded && (
        <RatingBar
          existing={rating}
          counterpartyName={counterpartyName}
          onSubmit={async (stars, body) => {
            const res = await fetch(`${API_BASE_URL}/ratings`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ conversationId, stars, body: body || undefined }),
            });
            if (res.ok) setRating({ stars, body: body || null });
          }}
        />
      )}

      {/* RES-10: a failed call attempt used to be a bare `return`. */}
      {callFailed && (
        <div role="alert" className="px-4 py-2 bg-red-50 border-t border-red-100 text-xs text-red-700">
          Could not start the call. Check your connection and try again.
        </div>
      )}

      {/* Composer */}
      <div className="border-t border-surface-100 px-3 py-2 flex flex-col gap-1 bg-white">
        {sendFailed && (
          <button
            type="button"
            role="alert"
            onClick={() => void send()}
            className="self-start text-xs font-medium text-red-700 hover:underline"
          >
            Not sent — tap to retry
          </button>
        )}
        <div className="flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 resize-none bg-surface-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-300 max-h-32"
        />
        <button
          onClick={() => void send()}
          disabled={sending || !draft.trim()}
          className="bg-saffron-600 text-white p-2.5 rounded-xl hover:bg-saffron-700 disabled:opacity-40 transition-colors"
          aria-label="Send"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
        </div>
      </div>
    </>
  );
}

interface RatingBarProps {
  existing: ExistingRating | null;
  counterpartyName: string;
  onSubmit: (stars: number, body: string) => Promise<void>;
}

function RatingBar({ existing, counterpartyName, onSubmit }: RatingBarProps) {
  const [stars, setStars] = useState(existing?.stars ?? 0);
  const [body, setBody] = useState(existing?.body ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  if (existing && collapsed) return null;

  return (
    <div className="border-t border-saffron-100 bg-saffron-50/60 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-saffron-800">
          {existing ? 'Your rating' : `Rate your service with ${counterpartyName}`}
        </p>
        {existing && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="text-xs text-saffron-700 hover:underline"
          >
            Hide
          </button>
        )}
      </div>
      <div className="flex items-center gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setStars(n)}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
            className="p-0.5"
          >
            <Star
              className={`w-5 h-5 ${n <= stars ? 'fill-saffron-500 text-saffron-500' : 'text-saffron-300'}`}
            />
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Optional: a few words about the service"
        rows={1}
        maxLength={1000}
        className="w-full resize-none bg-white border border-saffron-100 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-saffron-300"
      />
      <div className="flex justify-end mt-2">
        <button
          type="button"
          disabled={stars === 0 || submitting}
          onClick={async () => {
            setSubmitting(true);
            try { await onSubmit(stars, body); } finally { setSubmitting(false); }
          }}
          className="bg-saffron-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-saffron-700 disabled:opacity-40 transition-colors"
        >
          {submitting ? 'Saving...' : existing ? 'Update rating' : 'Submit rating'}
        </button>
      </div>
    </div>
  );
}
