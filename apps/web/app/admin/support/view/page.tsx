'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
 ArrowLeft,
 Send,
 Lock,
 Mail,
 Phone,
 Calendar,
 ShoppingBag,
 User as UserIcon,
 Shield,
 CheckCircle2,
 AlertCircle,
 Activity,
 Loader2,
} from 'lucide-react';
import {
 SAMPLE_ADMIN_TICKETS,
 ticketCategoryEmoji,
 ticketCategoryLabel,
 PRIORITIES,
 STATUSES,
 type Ticket,
 type TicketMessage,
 type TicketStatus,
 type TicketPriority,
} from '../../../../lib/support';
import {
 getTicketById,
 listSupportAgents,
 patchTicket,
 postMessage,
 type SupportAgent,
} from '../../../../lib/support-api';
import { useAuth } from '../../../../lib/auth-context';
import {
 StatusBadge,
 PriorityBadge,
 formatDateTime,
 formatDate,
 timeAgo,
} from '../../../../components/support/badges';
import { H1 } from '../../../../components/ui/heading-recipe';
import { buttonClass } from '../../../../components/ui/button-recipe';
import { userFacingMessage } from '../../../../lib/friendly-error';

/**
 * WHY THERE IS NO HARDCODED AGENT LIST HERE ANY MORE
 * --------------------------------------------------
 * This screen used to offer five invented display names — 'Priya S.',
 * 'Arjun K.', … — and send the chosen NAME as the assignee. The route parses
 * `assignedToId: z.string().uuid()` (support.ts, updateTicketSchema), so a name
 * failed that schema and EVERY assignment came back 400. Nobody was ever
 * assigned to anything.
 *
 * Options now come from GET /support/agents: real admin accounts (role
 * assignment ADMIN, or the ADMIN_EMAILS allow-list), id + display name only,
 * admin-gated. The option's value is the User id that goes on the wire; the
 * name is only ever the label.
 */

function AdminTicketDetailInner() {
 const sp = useSearchParams();
 const id = sp.get('id') ?? '';
 const { session } = useAuth();
 const [ticket, setTicket] = useState<Ticket | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [actionError, setActionError] = useState<string | null>(null);
 const [reply, setReply] = useState('');
 const [note, setNote] = useState('');
 const [sendingReply, setSendingReply] = useState(false);
 const [savingNote, setSavingNote] = useState(false);
 const [agents, setAgents] = useState<SupportAgent[]>([]);
 const [agentsError, setAgentsError] = useState<string | null>(null);

 useEffect(() => {
 let cancelled = false;
 (async () => {
 try {
 const t = await getTicketById(session?.accessToken, id);
 if (!cancelled) setTicket(t);
 } catch (err) {
 if (!cancelled) {
 const fallback = SAMPLE_ADMIN_TICKETS.find((t) => t.id === id);
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

 // The assignee picker's options. Admin-only endpoint; a failure leaves the
 // list empty and says so rather than falling back to invented names — an
 // option that cannot be assigned is what this screen is being fixed for.
 useEffect(() => {
 let cancelled = false;
 (async () => {
 try {
 const list = await listSupportAgents(session?.accessToken);
 if (!cancelled) setAgents(list);
 } catch (err) {
 if (!cancelled) {
 setAgentsError(userFacingMessage(err, 'Could not load support agents'));
 }
 }
 })();
 return () => {
 cancelled = true;
 };
 }, [session?.accessToken]);

 const sendReply = async () => {
 if (!ticket || !reply.trim()) return;
 setSendingReply(true);
 setActionError(null);
 try {
 // POST …/messages replies with the MESSAGE, not the ticket (support.ts:600).
 // This used to `setTicket(message)`, which blanked the conversation out.
 const created = await postMessage(
 session?.accessToken,
 ticket.id,
 { body: reply.trim() },
 { author: 'agent', authorName: 'Darshya Support' },
 );
 setTicket({ ...ticket, messages: [...ticket.messages, created] });
 setReply('');
 } catch (err) {
 setActionError(userFacingMessage(err, 'Could not send reply'));
 } finally {
 setSendingReply(false);
 }
 };

 const addNote = async () => {
 if (!ticket || !note.trim()) return;
 setSavingNote(true);
 setActionError(null);
 try {
 // `internal` is translated to the route's `isInternal` in support-api.ts —
 // it used to go out under the wrong key, so `z.object` stripped it and the
 // private note was stored as a reply the devotee could read.
 const created = await postMessage(
 session?.accessToken,
 ticket.id,
 { body: note.trim(), internal: true },
 { author: 'agent', authorName: 'Darshya Support' },
 );
 setTicket({ ...ticket, messages: [...ticket.messages, created] });
 setNote('');
 } catch (err) {
 setActionError(userFacingMessage(err, 'Could not save note'));
 } finally {
 setSavingNote(false);
 }
 };

 const changeStatus = async (status: TicketStatus) => {
 if (!ticket) return;
 setActionError(null);
 try {
 const updated = await patchTicket(session?.accessToken, ticket.id, { status });
 setTicket(updated);
 } catch (err) {
 setActionError(userFacingMessage(err, 'Could not update status'));
 }
 };

 const changePriority = async (priority: TicketPriority) => {
 if (!ticket) return;
 setActionError(null);
 try {
 const updated = await patchTicket(session?.accessToken, ticket.id, { priority });
 setTicket(updated);
 } catch (err) {
 setActionError(userFacingMessage(err, 'Could not update priority'));
 }
 };

 /**
  * `agentId` is a User id from GET /support/agents, never a display name —
  * `assignedToId` parses `z.string().uuid()`, so a name is a 400 and that is
  * exactly what this screen used to send. Empty string = the "Unassigned"
  * option, which goes out as an explicit null.
  */
 const assignAgent = async (agentId: string) => {
 if (!ticket) return;
 setActionError(null);
 try {
 const updated = await patchTicket(session?.accessToken, ticket.id, {
 assignedTo: agentId || null,
 });
 setTicket(updated);
 } catch (err) {
 setActionError(userFacingMessage(err, 'Could not assign agent'));
 }
 };

 if (loading) {
 return (
 <div className="flex items-center gap-2 text-sm text-surface-500 p-8">
 <Loader2 className="w-4 h-4 animate-spin" /> Loading ticket…
 </div>
 );
 }

 if (!ticket) {
 return (
 <div className="max-w-xl mx-auto bg-white rounded-xl border border-surface-200 p-10 text-center">
 <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
 <h2 className="font-semibold text-surface-900 mb-1">Ticket not found</h2>
 <p className="text-sm text-surface-500 mb-3">{error}</p>
 <Link href="/admin/support" className="text-sm text-saffron-700 hover:text-saffron-800">
 Back to all tickets
 </Link>
 </div>
 );
 }

 return (
 <div>
 <Link
 href="/admin/support"
 className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800 mb-5"
 >
 <ArrowLeft className="w-4 h-4" /> All tickets
 </Link>

 {/* Header */}
 <div className="bg-white rounded-xl border border-surface-200 p-5 mb-5">
 <div className="flex items-start justify-between gap-4 flex-wrap">
 <div className="min-w-0">
 <div className="flex items-center gap-2 mb-1 flex-wrap">
 <span className="font-mono text-xs text-saffron-700">{ticket.id}</span>
 <span className="text-surface-300">·</span>
 <span className="text-xs text-surface-500">
 {ticketCategoryEmoji(ticket.category)} {ticketCategoryLabel(ticket.category)}
 </span>
 </div>
 <h1 className={`${H1.portal} break-words`}>
 {ticket.subject}
 </h1>
 <div className="flex items-center gap-2 mt-3 flex-wrap">
 <StatusBadge status={ticket.status} />
 <PriorityBadge priority={ticket.priority} />
 <span className="text-xs text-surface-500">
 Created {formatDate(ticket.createdAt)}
 </span>
 </div>
 </div>

 <div className="flex flex-wrap gap-2">
 <select
 value={ticket.status}
 onChange={(e) => changeStatus(e.target.value as TicketStatus)}
 className="px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white"
 >
 {STATUSES.map((s) => (
 <option key={s.id} value={s.id}>
 Status: {s.label}
 </option>
 ))}
 </select>
 <select
 value={ticket.priority}
 onChange={(e) => changePriority(e.target.value as TicketPriority)}
 className="px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white"
 >
 {PRIORITIES.map((p) => (
 <option key={p.id} value={p.id}>
 Priority: {p.label}
 </option>
 ))}
 </select>
 <select
 value={ticket.assignedTo ?? ''}
 onChange={(e) => assignAgent(e.target.value)}
 title={agentsError ?? undefined}
 className="px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white"
 >
 <option value="">{agentsError ? 'Agents unavailable' : 'Unassigned'}</option>
 {/* The stored assignee may be an account the list no longer offers (role
 removed, blocked). Showing the id keeps the select honest instead of
 silently rendering the ticket as unassigned. */}
 {ticket.assignedTo && !agents.some((a) => a.id === ticket.assignedTo) && (
 <option value={ticket.assignedTo}>Assigned: {ticket.assignedTo.slice(0, 8)}…</option>
 )}
 {agents.map((a) => (
 <option key={a.id} value={a.id}>
 {a.name}
 </option>
 ))}
 </select>
 <button
 onClick={() => changeStatus('resolved')}
 className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium"
 >
 <CheckCircle2 className="w-4 h-4" /> Resolve
 </button>
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
 {/* Left: conversation */}
 <div className="lg:col-span-2 space-y-5">
 <div className="bg-white rounded-xl border border-surface-200 p-5">
 <h2 className="font-semibold text-surface-900 mb-4">Conversation</h2>
 <div className="space-y-4">
 {ticket.messages.map((m) => (
 <MessageBubble key={m.id} message={m} />
 ))}
 </div>
 </div>

 {/* Public reply */}
 <div className="bg-white rounded-xl border border-surface-200 p-5">
 <h3 className="font-semibold text-surface-900 mb-2 flex items-center gap-2">
 <Send className="w-4 h-4 text-saffron-600" />
 Reply to user
 </h3>
 <p className="text-xs text-surface-500 mb-3">
 The user will receive this over email and see it in their ticket.
 </p>
 <textarea
 value={reply}
 onChange={(e) => setReply(e.target.value)}
 rows={4}
 placeholder="Type your public response..."
 className="w-full px-3 py-2.5 rounded-lg border border-surface-200 focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none text-sm resize-y"
 />
 <div className="flex justify-end mt-2">
 <button
 onClick={sendReply}
 disabled={sendingReply || !reply.trim()}
 className={buttonClass('primary', 'md')}
 >
 {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
 {sendingReply ? 'Sending…' : 'Send reply'}
 </button>
 </div>
 </div>

 {/* Internal note */}
 <div className="bg-amber-50/60 rounded-xl border border-amber-200/60 p-5">
 <h3 className="font-semibold text-surface-900 mb-2 flex items-center gap-2">
 <Lock className="w-4 h-4 text-amber-700" />
 Internal note (admin only)
 </h3>
 <p className="text-xs text-surface-500 mb-3">
 Not visible to the user. Useful for context and handoffs.
 </p>
 <textarea
 value={note}
 onChange={(e) => setNote(e.target.value)}
 rows={3}
 placeholder="Context for teammates..."
 className="w-full px-3 py-2.5 rounded-lg border border-amber-200 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-sm resize-y"
 />
 <div className="flex justify-end mt-2">
 <button
 onClick={addNote}
 disabled={savingNote || !note.trim()}
 className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-semibold"
 >
 {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
 {savingNote ? 'Saving…' : 'Save internal note'}
 </button>
 </div>
 </div>
 </div>

 {/* Right: sidebar */}
 <div className="space-y-4">
 {/* User */}
 <div className="bg-white rounded-xl border border-surface-200 p-5">
 <h3 className="text-xs uppercase tracking-wider text-surface-500 font-semibold mb-3 flex items-center gap-1.5">
 <UserIcon className="w-3.5 h-3.5" /> User
 </h3>
 <div className="space-y-2 text-sm">
 <div className="font-semibold text-surface-900">{ticket.userName}</div>
 <div className="flex items-center gap-2 text-surface-600">
 <Mail className="w-3.5 h-3.5 text-surface-400" />
 {ticket.userEmail}
 </div>
 {ticket.userPhone && (
 <div className="flex items-center gap-2 text-surface-600">
 <Phone className="w-3.5 h-3.5 text-surface-400" />
 {ticket.userPhone}
 </div>
 )}
 {ticket.userJoinedAt && (
 <div className="flex items-center gap-2 text-surface-600">
 <Calendar className="w-3.5 h-3.5 text-surface-400" />
 Joined {formatDate(ticket.userJoinedAt)}
 </div>
 )}
 {ticket.userTotalOrders !== undefined && (
 <div className="flex items-center gap-2 text-surface-600">
 <ShoppingBag className="w-3.5 h-3.5 text-surface-400" />
 {ticket.userTotalOrders} total orders
 </div>
 )}
 </div>
 </div>

 {/* Linked order */}
 {ticket.orderId && (
 <div className="bg-white rounded-xl border border-surface-200 p-5">
 <h3 className="text-xs uppercase tracking-wider text-surface-500 font-semibold mb-2">
 Linked order
 </h3>
 <div className="font-mono text-sm text-saffron-700">{ticket.orderId}</div>
 </div>
 )}

 {/* Activity */}
 {ticket.activity && ticket.activity.length > 0 && (
 <div className="bg-white rounded-xl border border-surface-200 p-5">
 <h3 className="text-xs uppercase tracking-wider text-surface-500 font-semibold mb-3 flex items-center gap-1.5">
 <Activity className="w-3.5 h-3.5" /> Activity log
 </h3>
 <ol className="space-y-3 max-h-80 overflow-y-auto">
 {ticket.activity.map((a) => (
 <li key={a.id} className="flex gap-3">
 <span className="w-2 h-2 rounded-full bg-saffron-400 mt-1.5 shrink-0" />
 <div className="min-w-0">
 <div className="text-sm text-surface-800">{a.text}</div>
 <div className="text-xs text-surface-500">
 {formatDateTime(a.createdAt)} · {timeAgo(a.createdAt)}
 </div>
 </div>
 </li>
 ))}
 </ol>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}

export default function AdminTicketDetailPage() {
 return (
 <Suspense fallback={<div className="flex items-center gap-2 text-sm text-surface-500 p-8"><Loader2 className="w-4 h-4 animate-spin" /> Loading ticket…</div>}>
 <AdminTicketDetailInner />
 </Suspense>
 );
}

function MessageBubble({ message }: { message: TicketMessage }) {
 if (message.internal) {
 return (
 <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
 <Lock className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 mb-1">
 {message.authorName}
 <span className="px-1.5 py-0.5 text-xs rounded bg-amber-200/60">INTERNAL</span>
 </div>
 <div className="text-sm text-surface-800 whitespace-pre-line">{message.body}</div>
 <div className="text-xs text-surface-500 mt-1">{formatDateTime(message.createdAt)}</div>
 </div>
 </div>
 );
 }

 const isUser = message.author === 'user';
 const isSystem = message.author === 'system';

 if (isSystem) {
 return (
 <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-50 border border-surface-200">
 <Shield className="w-4 h-4 text-surface-500 mt-0.5 shrink-0" />
 <div>
 <div className="text-xs font-semibold text-surface-700 mb-1">{message.authorName}</div>
 <div className="text-sm text-surface-700">{message.body}</div>
 <div className="text-xs text-surface-500 mt-1">{formatDateTime(message.createdAt)}</div>
 </div>
 </div>
 );
 }

 return (
 <div className={`flex gap-3 ${isUser ? '' : 'flex-row-reverse'}`}>
 <div
 className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
 isUser ? 'bg-surface-100 text-surface-600' : 'bg-saffron-100 text-saffron-700'
 }`}
 >
 <UserIcon className="w-4 h-4" />
 </div>
 <div className={`flex-1 max-w-[85%] ${isUser ? '' : 'flex flex-col items-end'}`}>
 <div
 className={`inline-block p-3.5 rounded-xl ${
 isUser
 ? 'bg-surface-50 border border-surface-200 text-surface-800'
 : 'bg-saffron-600 text-white'
 }`}
 >
 <div className={`text-xs font-semibold mb-1 ${isUser ? 'text-surface-500' : 'text-white/80'}`}>
 {message.authorName}
 </div>
 <div className="text-sm whitespace-pre-line">{message.body}</div>
 </div>
 <div className={`text-xs text-surface-500 mt-1 ${isUser ? '' : 'text-right'}`}>
 {formatDateTime(message.createdAt)}
 </div>
 </div>
 </div>
 );
}
