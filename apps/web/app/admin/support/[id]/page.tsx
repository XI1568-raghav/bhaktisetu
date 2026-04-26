'use client';
export const runtime = 'edge';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
} from 'lucide-react';
import {
 SAMPLE_ADMIN_TICKETS,
 CATEGORY_MAP,
 PRIORITIES,
 STATUSES,
 type TicketMessage,
 type TicketActivity,
 type TicketStatus,
 type TicketPriority,
} from '../../../../lib/support';
import {
 StatusBadge,
 PriorityBadge,
 formatDateTime,
 formatDate,
 timeAgo,
} from '../../../../components/support/badges';

export default function AdminTicketDetailPage() {
 const params = useParams<{ id: string }>();
 const baseTicket = useMemo(
 () => SAMPLE_ADMIN_TICKETS.find((t) => t.id === params.id),
 [params.id],
 );

 const [messages, setMessages] = useState<TicketMessage[]>(baseTicket?.messages ?? []);
 const [activity, setActivity] = useState<TicketActivity[]>(baseTicket?.activity ?? []);
 const [status, setStatus] = useState<TicketStatus>(baseTicket?.status ?? 'open');
 const [priority, setPriority] = useState<TicketPriority>(baseTicket?.priority ?? 'medium');
 const [assignedTo, setAssignedTo] = useState<string>(baseTicket?.assignedTo ?? '');
 const [reply, setReply] = useState('');
 const [note, setNote] = useState('');

 if (!baseTicket) {
 return (
 <div className="max-w-xl mx-auto bg-white rounded-xl border border-surface-200 p-10 text-center">
 <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
 <h2 className="font-semibold text-surface-900 mb-1">Ticket not found</h2>
 <Link
 href="/admin/support"
 className="text-sm text-saffron-700 hover:text-saffron-800"
 >
 Back to all tickets
 </Link>
 </div>
 );
 }

 const cat = CATEGORY_MAP[baseTicket.category];

 const sendReply = () => {
 if (!reply.trim()) return;
 const now = new Date().toISOString();
 const msg: TicketMessage = {
 id: `m-${Date.now()}`,
 author: 'agent',
 authorName: assignedTo || 'Admin',
 body: reply.trim(),
 createdAt: now,
 };
 setMessages((prev) => [...prev, msg]);
 setActivity((prev) => [
 ...prev,
 { id: `act-${Date.now()}`, type: 'note', text: 'Agent replied to user', createdAt: now },
 ]);
 setReply('');
 };

 const addNote = () => {
 if (!note.trim()) return;
 const now = new Date().toISOString();
 const msg: TicketMessage = {
 id: `m-${Date.now()}`,
 author: 'agent',
 authorName: assignedTo || 'Admin',
 body: note.trim(),
 createdAt: now,
 internal: true,
 };
 setMessages((prev) => [...prev, msg]);
 setActivity((prev) => [
 ...prev,
 { id: `act-${Date.now()}`, type: 'note', text: 'Internal note added', createdAt: now },
 ]);
 setNote('');
 };

 const changeStatus = (next: TicketStatus) => {
 setStatus(next);
 setActivity((prev) => [
 ...prev,
 {
 id: `act-${Date.now()}`,
 type: 'status_change',
 text: `Status → ${STATUSES.find((s) => s.id === next)?.label}`,
 createdAt: new Date().toISOString(),
 },
 ]);
 };

 const changePriority = (next: TicketPriority) => {
 setPriority(next);
 setActivity((prev) => [
 ...prev,
 {
 id: `act-${Date.now()}`,
 type: 'priority_change',
 text: `Priority → ${PRIORITIES.find((p) => p.id === next)?.label}`,
 createdAt: new Date().toISOString(),
 },
 ]);
 };

 const assignAgent = (name: string) => {
 setAssignedTo(name);
 setActivity((prev) => [
 ...prev,
 {
 id: `act-${Date.now()}`,
 type: 'assignment',
 text: `Assigned to ${name}`,
 createdAt: new Date().toISOString(),
 },
 ]);
 };

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
 <span className="font-mono text-xs text-saffron-700">{baseTicket.id}</span>
 <span className="text-surface-300">·</span>
 <span className="text-xs text-surface-500">
 {cat.emoji} {cat.name}
 </span>
 </div>
 <h1 className="text-xl font-semibold text-surface-900 break-words">
 {baseTicket.subject}
 </h1>
 <div className="flex items-center gap-2 mt-3 flex-wrap">
 <StatusBadge status={status} />
 <PriorityBadge priority={priority} />
 <span className="text-xs text-surface-500">
 Created {formatDate(baseTicket.createdAt)}
 </span>
 </div>
 </div>

 <div className="flex flex-wrap gap-2">
 <select
 value={status}
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
 value={priority}
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
 value={assignedTo}
 onChange={(e) => assignAgent(e.target.value)}
 className="px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white"
 >
 <option value="">Unassigned</option>
 {['Priya S.', 'Arjun K.', 'Neha R.', 'Rahul M.', 'Kavita B.'].map((n) => (
 <option key={n} value={n}>
 {n}
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

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
 {/* Left: conversation */}
 <div className="lg:col-span-2 space-y-5">
 <div className="bg-white rounded-xl border border-surface-200 p-5">
 <h2 className="font-semibold text-surface-900 mb-4">Conversation</h2>
 <div className="space-y-4">
 {messages.map((m) => (
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
 disabled={!reply.trim()}
 className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-saffron-600 hover:bg-saffron-700 disabled:opacity-50 text-white text-sm font-semibold"
 >
 <Send className="w-4 h-4" /> Send reply
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
 disabled={!note.trim()}
 className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-semibold"
 >
 <Lock className="w-4 h-4" /> Save internal note
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
 <div className="font-semibold text-surface-900">{baseTicket.userName}</div>
 <div className="flex items-center gap-2 text-surface-600">
 <Mail className="w-3.5 h-3.5 text-surface-400" />
 {baseTicket.userEmail}
 </div>
 {baseTicket.userPhone && (
 <div className="flex items-center gap-2 text-surface-600">
 <Phone className="w-3.5 h-3.5 text-surface-400" />
 {baseTicket.userPhone}
 </div>
 )}
 {baseTicket.userJoinedAt && (
 <div className="flex items-center gap-2 text-surface-600">
 <Calendar className="w-3.5 h-3.5 text-surface-400" />
 Joined {formatDate(baseTicket.userJoinedAt)}
 </div>
 )}
 {baseTicket.userTotalOrders !== undefined && (
 <div className="flex items-center gap-2 text-surface-600">
 <ShoppingBag className="w-3.5 h-3.5 text-surface-400" />
 {baseTicket.userTotalOrders} total orders
 </div>
 )}
 </div>
 </div>

 {/* Linked order */}
 {baseTicket.orderId && (
 <div className="bg-white rounded-xl border border-surface-200 p-5">
 <h3 className="text-xs uppercase tracking-wider text-surface-500 font-semibold mb-2">
 Linked order
 </h3>
 <div className="font-mono text-sm text-saffron-700">{baseTicket.orderId}</div>
 </div>
 )}

 {/* Activity */}
 <div className="bg-white rounded-xl border border-surface-200 p-5">
 <h3 className="text-xs uppercase tracking-wider text-surface-500 font-semibold mb-3 flex items-center gap-1.5">
 <Activity className="w-3.5 h-3.5" /> Activity log
 </h3>
 <ol className="space-y-3 max-h-80 overflow-y-auto">
 {activity.map((a) => (
 <li key={a.id} className="flex gap-3">
 <span className="w-2 h-2 rounded-full bg-saffron-400 mt-1.5 shrink-0" />
 <div className="min-w-0">
 <div className="text-sm text-surface-800">{a.text}</div>
 <div className="text-[11px] text-surface-500">
 {formatDateTime(a.createdAt)} · {timeAgo(a.createdAt)}
 </div>
 </div>
 </li>
 ))}
 </ol>
 </div>
 </div>
 </div>
 </div>
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
 <span className="px-1.5 py-0.5 text-[10px] rounded bg-amber-200/60">INTERNAL</span>
 </div>
 <div className="text-sm text-surface-800 whitespace-pre-line">{message.body}</div>
 <div className="text-[11px] text-surface-500 mt-1">{formatDateTime(message.createdAt)}</div>
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
 <div className="text-[11px] text-surface-500 mt-1">{formatDateTime(message.createdAt)}</div>
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
 <div className={`text-[11px] text-surface-500 mt-1 ${isUser ? '' : 'text-right'}`}>
 {formatDateTime(message.createdAt)}
 </div>
 </div>
 </div>
 );
}
