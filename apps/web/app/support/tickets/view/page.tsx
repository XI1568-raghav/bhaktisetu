'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
 ArrowLeft,
 Send,
 CheckCircle2,
 AlertCircle,
 Paperclip,
 Clock,
 User as UserIcon,
 Shield,
 Activity,
 Loader2,
} from 'lucide-react';
import {
 getUserTicket,
 ticketCategoryEmoji,
 ticketCategoryLabel,
 type Ticket,
 type TicketMessage,
} from '../../../../lib/support';
import {
 getTicketById,
 postMessage,
 resolveOwnTicket,
} from '../../../../lib/support-api';
import { useAuth } from '../../../../lib/auth-context';
import { buttonClass } from '../../../../components/ui/button-recipe';
import { H1 } from '../../../../components/ui/heading-recipe';
import {
 StatusBadge,
 PriorityBadge,
 formatDateTime,
 timeAgo,
} from '../../../../components/support/badges';
import { userFacingMessage } from '../../../../lib/friendly-error';

function TicketDetailInner() {
 const sp = useSearchParams();
 const id = sp.get('id') ?? '';
 const router = useRouter();
 const { session } = useAuth();
 const [ticket, setTicket] = useState<Ticket | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [reply, setReply] = useState('');
 const [sending, setSending] = useState(false);
 const [actionError, setActionError] = useState<string | null>(null);

 useEffect(() => {
 let cancelled = false;
 (async () => {
 try {
 const t = await getTicketById(session?.accessToken, id);
 if (!cancelled) setTicket(t);
 } catch (err) {
 if (!cancelled) {
 const fallback = getUserTicket(id);
 if (fallback) setTicket(fallback);
 setError(userFacingMessage(err, 'Failed to load ticket'));
 }
 } finally {
 if (!cancelled) setLoading(false);
 }
 })();
 return () => {
 cancelled = true;
 };
 }, [id, session?.accessToken]);

 const sendReply = async () => {
 if (!ticket || !reply.trim()) return;
 setSending(true);
 setActionError(null);
 try {
 // POST …/messages replies with the MESSAGE, not the ticket (support.ts:600).
 // This used to `setTicket(message)`, which blanked the conversation out.
 const created = await postMessage(
 session?.accessToken,
 ticket.id,
 { body: reply.trim() },
 { author: 'user', authorName: 'You' },
 );
 setTicket({ ...ticket, messages: [...ticket.messages, created] });
 setReply('');
 } catch (err) {
 setActionError(userFacingMessage(err, 'Could not send reply'));
 } finally {
 setSending(false);
 }
 };

 /**
  * The only ticket field this screen may change.
  *
  * This used to call `patchTicket` — PATCH /tickets/:id, which the route gates
  * on the ADMIN role and answers 403 "Admin role required" to everybody else,
  * including the devotee whose ticket it is. Every press of "Mark resolved"
  * showed a permission error on the user's own ticket. POST …/resolve is the
  * owner's own route: RESOLVED or CLOSED, on a ticket they opened, and nothing
  * else. "Reopen" and "Escalate" were removed rather than repointed — status
  * OPEN and priority are queue state the route does not let an owner touch, so
  * those two buttons could only ever have been 403s (see the resolved-ticket
  * note below for what a devotee does instead).
  */
 const markResolved = async () => {
 if (!ticket) return;
 setActionError(null);
 try {
 const updated = await resolveOwnTicket(session?.accessToken, ticket.id, 'resolved');
 setTicket(updated);
 } catch (err) {
 setActionError(userFacingMessage(err, 'Could not update ticket'));
 }
 };

 if (loading) {
 return (
 <div className="min-h-[100dvh] p-10 text-sm text-surface-500 bg-[#faf7f0] flex items-center gap-2">
 <Loader2 className="w-4 h-4 animate-spin" /> Loading ticket…
 </div>
 );
 }

 if (!ticket) {
 return (
 <div className="min-h-[100dvh] bg-[#faf7f0] py-16">
 <div className="max-w-2xl mx-auto px-6 bg-white rounded-xl border border-surface-200 p-10 text-center">
 <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
 <h2 className="font-semibold text-surface-900 mb-1">Ticket not found</h2>
 <p className="text-sm text-surface-500 mb-5">
 {error ?? "This ticket doesn't exist or you don't have access."}
 </p>
 <button
 onClick={() => router.push('/support/tickets')}
 className={buttonClass('primary', 'md')}
 >
 Back to my tickets
 </button>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-[100dvh] bg-[#faf7f0] py-10">
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
 {ticketCategoryEmoji(ticket.category)} {ticketCategoryLabel(ticket.category)}
 </span>
 </div>
 <h1 className={H1.portal}>{ticket.subject}</h1>
 <div className="flex items-center gap-2 mt-3 flex-wrap">
 <StatusBadge status={ticket.status} />
 <PriorityBadge priority={ticket.priority} />
 <span className="text-xs text-surface-500 inline-flex items-center gap-1">
 <Clock className="w-3.5 h-3.5" /> Opened {timeAgo(ticket.createdAt)}
 </span>
 </div>
 </div>
 <div className="flex items-center gap-2 flex-wrap">
 {ticket.status === 'resolved' || ticket.status === 'closed' ? (
 // Reopening is queue state: the owner route accepts RESOLVED and CLOSED
 // only. Replying is the real path back — every devotee reply alerts the
 // support inbox (support.ts emails SUPPORT_INBOX on a non-admin message),
 // so this says that instead of offering a button that would 403.
 <p className="prose-meta text-surface-500 max-w-[16rem] text-right">
 Marked {ticket.status === 'closed' ? 'closed' : 'resolved'}. Still need help?
 Reply below and our support team is alerted again.
 </p>
 ) : (
 <button
 onClick={markResolved}
 className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium"
 >
 <CheckCircle2 className="w-4 h-4" /> Mark resolved
 </button>
 )}
 </div>
 </div>
 </div>

 {actionError && (
 <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
 <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
 {actionError}
 </div>
 )}

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
 {/* Conversation */}
 <div className="lg:col-span-2 space-y-4">
 <div className="bg-white rounded-xl border border-surface-200 p-5">
 <h2 className="font-semibold text-surface-900 mb-4">Conversation</h2>
 <div className="space-y-4">
 {ticket.messages.filter((m) => !m.internal).map((m) => (
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
 className={buttonClass('primary', 'md')}
 >
 {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
 {sending ? 'Sending…' : 'Send reply'}
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

 {ticket.activity && ticket.activity.length > 0 && (
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
 <div className="text-xs text-surface-500">{formatDateTime(a.createdAt)}</div>
 </div>
 </li>
 ))}
 </ol>
 </div>
 )}

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
 href="tel:+919255109400"
 className="block text-sm text-saffron-700 hover:text-saffron-800 mb-1.5"
 >
 Call support →
 </a>
 <a
 href="mailto:support@darshya.online"
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
 <div className="text-xs text-surface-500 mt-1">{formatDateTime(message.createdAt)}</div>
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
 <div className={`text-xs text-surface-500 mt-1 ${isUser ? 'text-right' : ''}`}>
 {formatDateTime(message.createdAt)}
 </div>
 </div>
 </div>
 );
}

export default function TicketDetailPage() {
 return (
  <Suspense fallback={<div className="p-8 text-sm text-surface-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading ticket…</div>}>
   <TicketDetailInner />
  </Suspense>
 );
}
