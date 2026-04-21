'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  Paperclip,
  Clock,
  User as UserIcon,
  Shield,
  Activity,
} from 'lucide-react';
import {
  getUserTicket,
  updateUserTicket,
  generateAgentReply,
  CATEGORY_MAP,
  type Ticket,
  type TicketMessage,
} from '../../../../lib/support';
import {
  StatusBadge,
  PriorityBadge,
  formatDateTime,
  timeAgo,
} from '../../../../components/support/badges';

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const t = getUserTicket(params.id);
    if (t) {
      // If the ticket only has the user message and system auto-response, simulate an agent reply.
      if (t.messages.length === 2 && t.messages[1]?.author === 'system') {
        const now = new Date().toISOString();
        const agentMessage: TicketMessage = {
          id: `m-${Date.now()}`,
          author: 'agent',
          authorName: 'Priya S.',
          body: generateAgentReply(t.category, t.subject),
          createdAt: now,
        };
        const updated = updateUserTicket(t.id, (curr) => ({
          ...curr,
          status: 'in_progress',
          updatedAt: now,
          messages: [...curr.messages, agentMessage],
          activity: [
            ...curr.activity,
            {
              id: `act-${Date.now()}`,
              type: 'status_change',
              text: 'Status: Open → In Progress',
              createdAt: now,
            },
            {
              id: `act-${Date.now() + 1}`,
              type: 'assignment',
              text: 'Assigned to Priya S.',
              createdAt: now,
            },
          ],
        }));
        setTicket(updated ?? t);
      } else {
        setTicket(t);
      }
    }
    setLoaded(true);
  }, [params.id]);

  const sendReply = () => {
    if (!ticket || !reply.trim()) return;
    setSending(true);
    const now = new Date().toISOString();
    const msg: TicketMessage = {
      id: `m-${Date.now()}`,
      author: 'user',
      authorName: 'You',
      body: reply.trim(),
      createdAt: now,
    };
    const updated = updateUserTicket(ticket.id, (curr) => ({
      ...curr,
      status: curr.status === 'resolved' ? 'in_progress' : curr.status,
      updatedAt: now,
      messages: [...curr.messages, msg],
      activity: [
        ...curr.activity,
        { id: `act-${Date.now()}`, type: 'note', text: 'User replied', createdAt: now },
      ],
    }));
    setTicket(updated);
    setReply('');
    setSending(false);
  };

  const changeStatus = (status: Ticket['status'], label: string) => {
    if (!ticket) return;
    const now = new Date().toISOString();
    const updated = updateUserTicket(ticket.id, (curr) => ({
      ...curr,
      status,
      updatedAt: now,
      activity: [
        ...curr.activity,
        { id: `act-${Date.now()}`, type: 'status_change', text: label, createdAt: now },
      ],
    }));
    setTicket(updated);
  };

  if (!loaded) {
    return <div className="min-h-screen p-10 text-sm text-surface-500 bg-[#faf7f0]">Loading...</div>;
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-[#faf7f0] py-16">
        <div className="max-w-2xl mx-auto px-6 bg-white rounded-xl border border-surface-200 p-10 text-center">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h2 className="font-semibold text-surface-900 mb-1">Ticket not found</h2>
          <p className="text-sm text-surface-500 mb-5">
            This ticket doesn&apos;t exist in your browser storage. It may have been created on another device.
          </p>
          <button
            onClick={() => router.push('/support/tickets')}
            className="px-4 py-2 rounded-lg bg-saffron-600 text-white text-sm font-semibold hover:bg-saffron-700"
          >
            Back to my tickets
          </button>
        </div>
      </div>
    );
  }

  const cat = CATEGORY_MAP[ticket.category];

  return (
    <div className="min-h-screen bg-[#faf7f0] py-10">
      <div className="max-w-6xl mx-auto px-6">
        <Link
          href="/support/tickets"
          className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800 mb-5"
        >
          <ArrowLeft className="w-4 h-4" /> All tickets
        </Link>

        {/* Header */}
        <div className="bg-white rounded-xl border border-surface-200 p-5 mb-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs text-saffron-700">{ticket.id}</span>
                <span className="text-surface-300">·</span>
                <span className="text-xs text-surface-500">
                  {cat.emoji} {cat.name}
                </span>
              </div>
              <h1 className="text-xl font-semibold text-surface-900">{ticket.subject}</h1>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
                <span className="text-xs text-surface-500 inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Opened {timeAgo(ticket.createdAt)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {ticket.status === 'resolved' ? (
                <button
                  onClick={() => changeStatus('open', 'Ticket reopened')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-surface-200 text-sm font-medium text-surface-700 hover:bg-surface-50"
                >
                  <RotateCcw className="w-4 h-4" /> Reopen
                </button>
              ) : (
                <button
                  onClick={() => changeStatus('resolved', 'Marked as resolved by user')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium"
                >
                  <CheckCircle2 className="w-4 h-4" /> Mark resolved
                </button>
              )}
              <button
                onClick={() => {
                  const now = new Date().toISOString();
                  const updated = updateUserTicket(ticket.id, (t) => ({
                    ...t,
                    priority: 'urgent',
                    updatedAt: now,
                    activity: [
                      ...t.activity,
                      {
                        id: `act-${Date.now()}`,
                        type: 'priority_change',
                        text: 'Escalated by user → Urgent',
                        createdAt: now,
                      },
                    ],
                  }));
                  if (updated) setTicket(updated);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-surface-200 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                <AlertCircle className="w-4 h-4" /> Escalate
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Conversation */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-surface-200 p-5">
              <h2 className="font-semibold text-surface-900 mb-4">Conversation</h2>
              <div className="space-y-4">
                {ticket.messages.map((m) => (
                  <MessageBubble key={m.id} message={m} />
                ))}
              </div>

              {/* Reply */}
              <div className="mt-6 pt-5 border-t border-surface-100">
                <label className="block text-sm font-medium text-surface-800 mb-2">Your reply</label>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  placeholder="Type your response..."
                  className="w-full px-3 py-2.5 rounded-lg border border-surface-200 focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none text-sm resize-y"
                />
                <div className="flex items-center justify-between mt-2">
                  <button className="text-xs text-surface-500 hover:text-surface-700 inline-flex items-center gap-1">
                    <Paperclip className="w-3.5 h-3.5" /> Attach
                  </button>
                  <button
                    onClick={sendReply}
                    disabled={sending || !reply.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-saffron-600 hover:bg-saffron-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                  >
                    <Send className="w-4 h-4" /> Send reply
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {ticket.orderId && (
              <div className="bg-white rounded-xl border border-surface-200 p-4">
                <h3 className="text-xs uppercase tracking-wider text-surface-500 font-semibold mb-2">
                  Linked order
                </h3>
                <div className="font-mono text-sm text-saffron-700">{ticket.orderId}</div>
                <a href="#" className="text-xs text-saffron-700 hover:text-saffron-800 mt-1 inline-block">
                  View order →
                </a>
              </div>
            )}

            {ticket.attachmentName && (
              <div className="bg-white rounded-xl border border-surface-200 p-4">
                <h3 className="text-xs uppercase tracking-wider text-surface-500 font-semibold mb-2">
                  Attachments
                </h3>
                <div className="flex items-center gap-2 text-sm text-surface-700">
                  <Paperclip className="w-4 h-4 text-surface-400" />
                  {ticket.attachmentName}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-surface-200 p-4">
              <h3 className="text-xs uppercase tracking-wider text-surface-500 font-semibold mb-3 inline-flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Activity
              </h3>
              <ol className="space-y-3">
                {ticket.activity.map((a) => (
                  <li key={a.id} className="flex gap-3">
                    <span className="w-2 h-2 rounded-full bg-saffron-400 mt-1.5 shrink-0" />
                    <div>
                      <div className="text-sm text-surface-800">{a.text}</div>
                      <div className="text-[11px] text-surface-500">{formatDateTime(a.createdAt)}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="bg-white rounded-xl border border-surface-200 p-4">
              <h3 className="text-xs uppercase tracking-wider text-surface-500 font-semibold mb-3">
                Need more help?
              </h3>
              <Link
                href="/support/faq"
                className="block text-sm text-saffron-700 hover:text-saffron-800 mb-1.5"
              >
                Browse FAQ →
              </Link>
              <a
                href="tel:+918069009000"
                className="block text-sm text-saffron-700 hover:text-saffron-800 mb-1.5"
              >
                Call support →
              </a>
              <a
                href="mailto:support@poojly.com"
                className="block text-sm text-saffron-700 hover:text-saffron-800"
              >
                Email us →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: TicketMessage }) {
  const isUser = message.author === 'user';
  const isSystem = message.author === 'system';

  if (isSystem) {
    return (
      <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50/60 border border-amber-200/60">
        <Shield className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
        <div>
          <div className="text-xs font-semibold text-amber-800 mb-1">{message.authorName}</div>
          <div className="text-sm text-surface-700">{message.body}</div>
          <div className="text-[11px] text-surface-500 mt-1">{formatDateTime(message.createdAt)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
          isUser ? 'bg-saffron-100 text-saffron-700' : 'bg-blue-100 text-blue-700'
        }`}
      >
        <UserIcon className="w-4 h-4" />
      </div>
      <div className={`flex-1 max-w-[85%] ${isUser ? 'items-end' : ''}`}>
        <div
          className={`inline-block p-3.5 rounded-xl ${
            isUser ? 'bg-saffron-600 text-white' : 'bg-surface-50 border border-surface-200 text-surface-800'
          }`}
        >
          <div className={`text-xs font-semibold mb-1 ${isUser ? 'text-white/80' : 'text-surface-500'}`}>
            {message.authorName}
          </div>
          <div className="text-sm whitespace-pre-line">{message.body}</div>
        </div>
        <div className={`text-[11px] text-surface-500 mt-1 ${isUser ? 'text-right' : ''}`}>
          {formatDateTime(message.createdAt)}
        </div>
      </div>
    </div>
  );
}
