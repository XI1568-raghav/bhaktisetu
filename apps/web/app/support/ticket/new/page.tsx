'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
 ArrowLeft,
 Paperclip,
 Send,
 AlertCircle,
 Ticket as TicketIcon,
 Loader2,
} from 'lucide-react';
import {
 SUPPORT_CATEGORIES,
 PRIORITIES,
 formatTicketId,
 addUserTicket,
 type TicketCategory,
 type TicketPriority,
 type Ticket,
} from '../../../../lib/support';
import { createTicket, newTicketSchema } from '../../../../lib/support-api';
import { useAuth } from '../../../../lib/auth-context';
import { buttonClass } from '../../../../components/ui/button-recipe';
import { H1 } from '../../../../components/ui/heading-recipe';
import { userFacingMessage } from '../../../../lib/friendly-error';

export default function NewTicketPage() {
 const router = useRouter();
 const { session } = useAuth();
 const [category, setCategory] = useState<TicketCategory>('puja');
 const [priority, setPriority] = useState<TicketPriority>('medium');
 const [subject, setSubject] = useState('');
 const [description, setDescription] = useState('');
 const [orderId, setOrderId] = useState('');
 const [attachmentName, setAttachmentName] = useState<string | null>(null);
 const [submitting, setSubmitting] = useState(false);
 const [error, setError] = useState<string | null>(null);

 // Pre-fill from chat transcript if user escalated from LiveChatWidget
 useEffect(() => {
 if (typeof window === 'undefined') return;
 const params = new URLSearchParams(window.location.search);
 if (params.get('from') === 'chat') {
 const transcript = localStorage.getItem('poojly:support:chat-transcript');
 if (transcript) {
 setSubject('Escalated from AI chat — needs human support');
 setDescription(
 `I was chatting with Asha (AI support) and my issue needs a human agent.\n\n--- Chat transcript ---\n${transcript}\n---`
 );
 setPriority('high');
 localStorage.removeItem('poojly:support:chat-transcript');
 }
 }
 }, []);

 const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
 const f = e.target.files?.[0];
 if (f) setAttachmentName(f.name);
 };

 const submit = async (e: React.FormEvent) => {
 e.preventDefault();
 setError(null);

 const payload = {
 subject: subject.trim(),
 body: description.trim(),
 category,
 priority,
 orderId: orderId.trim() || undefined,
 attachmentName: attachmentName ?? undefined,
 };
 const parsed = newTicketSchema.safeParse(payload);
 if (!parsed.success) {
 const first = parsed.error.issues[0];
 setError(first?.message ?? 'Please check the form fields.');
 return;
 }

 setSubmitting(true);
 try {
 const created = await createTicket(session?.accessToken, parsed.data);
 router.push(`/support/tickets/view?id=${created.id}`);
 } catch (err) {
 // Network/offline fallback: persist locally so the user doesn't lose work.
 const id = formatTicketId();
 const now = new Date().toISOString();
 const ticket: Ticket = {
 id,
 subject: parsed.data.subject,
 category: parsed.data.category,
 priority: parsed.data.priority,
 status: 'open',
 createdAt: now,
 updatedAt: now,
 orderId: parsed.data.orderId,
 attachmentName: parsed.data.attachmentName,
 userName: 'You',
 userEmail: 'you@darshya.online',
 messages: [
 {
 id: `m-${Date.now()}`,
 author: 'user',
 authorName: 'You',
 body: parsed.data.body,
 createdAt: now,
 },
 {
 id: `m-${Date.now() + 1}`,
 author: 'system',
 authorName: 'Darshya Support',
 body: 'Saved offline. Will sync when you are back online.',
 createdAt: now,
 },
 ],
 activity: [
 { id: `act-${Date.now()}`, type: 'created', text: 'Ticket created (offline)', createdAt: now },
 ],
 };
 addUserTicket(ticket);
 setError(
 (userFacingMessage(err, 'Could not reach server')) +
 ' — saved locally.',
 );
 setSubmitting(false);
 setTimeout(() => router.push(`/support/tickets/view?id=${id}`), 600);
 }
 };

 return (
 <div className="bg-[#faf7f0] min-h-[100dvh] py-10">
 <div className="max-w-3xl mx-auto px-6">
 <Link
 href="/support"
 className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800 mb-6"
 >
 <ArrowLeft className="w-4 h-4" /> Back to support
 </Link>

 <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
 <div className="p-6 border-b border-surface-100 flex items-center gap-3">
 <div className="w-10 h-10 rounded-lg bg-saffron-100 flex items-center justify-center">
 <TicketIcon className="w-5 h-5 text-saffron-700" />
 </div>
 <div>
 <h1 className={H1.portal}>Open a new ticket</h1>
 <p className="text-xs text-surface-500 mt-0.5">
 First response in 4 hours (urgent tickets prioritized).
 </p>
 </div>
 </div>

 <form onSubmit={submit} className="p-6 space-y-5">
 {/* Category */}
 <div>
 <label className="block text-sm font-medium text-surface-800 mb-1.5">Category</label>
 <select
 value={category}
 onChange={(e) => setCategory(e.target.value as TicketCategory)}
 className="w-full px-3 py-2.5 rounded-lg border border-surface-200 bg-white focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none text-sm"
 >
 {SUPPORT_CATEGORIES.map((c) => (
 <option key={c.id} value={c.id}>
 {c.emoji} {c.name} — {c.description}
 </option>
 ))}
 </select>
 </div>

 {/* Priority */}
 <div>
 <label className="block text-sm font-medium text-surface-800 mb-1.5">Priority</label>
 <div className="grid grid-cols-4 gap-2">
 {PRIORITIES.map((p) => (
 <button
 type="button"
 key={p.id}
 onClick={() => setPriority(p.id)}
 className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
 priority === p.id
 ? 'bg-saffron-600 text-white border-saffron-600'
 : 'bg-white text-surface-700 border-surface-200 hover:border-saffron-400'
 }`}
 >
 {p.label}
 </button>
 ))}
 </div>
 </div>

 {/* Subject */}
 <div>
 <label className="block text-sm font-medium text-surface-800 mb-1.5">
 Subject <span className="text-red-600">*</span>
 </label>
 <input
 type="text"
 value={subject}
 onChange={(e) => setSubject(e.target.value)}
 placeholder="Short summary of your issue (5-200 characters)"
 className="w-full px-3 py-2.5 rounded-lg border border-surface-200 bg-white focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none text-sm"
 required
 minLength={5}
 maxLength={200}
 />
 </div>

 {/* Description */}
 <div>
 <label className="block text-sm font-medium text-surface-800 mb-1.5">
 Description <span className="text-red-600">*</span>
 </label>
 <textarea
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 rows={6}
 placeholder="Describe what happened, when, and any steps you've tried (20+ characters)."
 className="w-full px-3 py-2.5 rounded-lg border border-surface-200 bg-white focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none text-sm resize-y"
 required
 minLength={20}
 maxLength={5000}
 />
 </div>

 {/* Order ID */}
 <div>
 <label className="block text-sm font-medium text-surface-800 mb-1.5">
 Order / Booking ID <span className="text-surface-400 font-normal">(optional)</span>
 </label>
 <input
 type="text"
 value={orderId}
 onChange={(e) => setOrderId(e.target.value)}
 placeholder="e.g. BS-20260418-A91B2"
 className="w-full px-3 py-2.5 rounded-lg border border-surface-200 bg-white focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none text-sm font-mono"
 />
 </div>

 {/* Attachment */}
 <div>
 <label className="block text-sm font-medium text-surface-800 mb-1.5">
 Attach screenshot <span className="text-surface-400 font-normal">(optional)</span>
 </label>
 <label className="flex items-center justify-center gap-2 w-full px-3 py-6 rounded-lg border-2 border-dashed border-surface-300 hover:border-saffron-400 hover:bg-saffron-50/40 transition-colors cursor-pointer">
 <Paperclip className="w-4 h-4 text-surface-500" />
 <span className="text-sm text-surface-600">
 {attachmentName ?? 'Click to upload (PNG, JPG, PDF up to 5MB)'}
 </span>
 <input type="file" className="hidden" onChange={handleFile} accept="image/*,.pdf" />
 </label>
 </div>

 {error && (
 <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
 <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
 {error}
 </div>
 )}

 <div className="flex items-center justify-end gap-3 pt-2">
 <Link
 href="/support"
 className="px-4 py-2.5 rounded-lg text-sm font-medium text-surface-700 hover:bg-surface-100 transition-colors"
 >
 Cancel
 </Link>
 <button
 type="submit"
 disabled={submitting}
 className={buttonClass('primary', 'md')}
 >
 {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
 {submitting ? 'Submitting...' : 'Submit ticket'}
 </button>
 </div>
 </form>
 </div>
 </div>
 </div>
 );
}
