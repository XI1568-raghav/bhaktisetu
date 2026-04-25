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

export default function NewTicketPage() {
  const router = useRouter();
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!subject.trim() || !description.trim()) {
      setError('Subject and description are required.');
      return;
    }
    setSubmitting(true);

    const id = formatTicketId();
    const now = new Date().toISOString();
    const ticket: Ticket = {
      id,
      subject: subject.trim(),
      category,
      priority,
      status: 'open',
      createdAt: now,
      updatedAt: now,
      orderId: orderId.trim() || undefined,
      attachmentName: attachmentName || undefined,
      userName: 'You',
      userEmail: 'you@darshya.online',
      messages: [
        {
          id: `m-${Date.now()}`,
          author: 'user',
          authorName: 'You',
          body: description.trim(),
          createdAt: now,
        },
        {
          id: `m-${Date.now() + 1}`,
          author: 'system',
          authorName: 'Darshya Support',
          body: 'Thanks! Expected first response: 4 hours. Ticket assigned to support team.',
          createdAt: now,
        },
      ],
      activity: [
        { id: `act-${Date.now()}`, type: 'created', text: 'Ticket created by user', createdAt: now },
        { id: `act-${Date.now() + 1}`, type: 'assignment', text: 'Auto-assigned to support queue', createdAt: now },
      ],
    };

    addUserTicket(ticket);
    setTimeout(() => router.push(`/support/tickets/${id}`), 300);
  };

  return (
    <div className="bg-[#faf7f0] min-h-screen py-10">
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
              <h1 className="text-xl font-semibold text-surface-900">Open a new ticket</h1>
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
                placeholder="Short summary of your issue"
                className="w-full px-3 py-2.5 rounded-lg border border-surface-200 bg-white focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none text-sm"
                required
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
                placeholder="Describe what happened, when, and any steps you've tried."
                className="w-full px-3 py-2.5 rounded-lg border border-surface-200 bg-white focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none text-sm resize-y"
                required
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
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-saffron-600 hover:bg-saffron-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Submitting...' : 'Submit ticket'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
