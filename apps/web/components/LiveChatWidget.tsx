'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, X, Send, LifeBuoy, Sparkles, UserCircle, ArrowRight, Bot } from 'lucide-react';
import { findAutoReply } from '../lib/support';

type QuickAction = { label: string; href: string };

type ChatMessage = {
 id: string;
 author: 'agent' | 'user' | 'system';
 body: string;
 createdAt: string;
 actions?: QuickAction[];
 escalate?: boolean;
};

// Strip trailing slash and any trailing /api/v{n} so we can append the canonical path
// without double-prefixing (handles both NEXT_PUBLIC_API_URL=http://localhost:4000 and
// NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1).
const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const API_BASE = RAW_API_BASE.replace(/\/+$/, '').replace(/\/api\/v\d+$/, '');

const WELCOME: ChatMessage = {
 id: 'welcome',
 author: 'agent',
 body:
 "Namaste! I'm Asha, Darshya's AI support assistant. I can help with puja bookings, darshan, refunds, yatra planning, and more. If I can't handle something, I'll connect you with a human agent.",
 createdAt: new Date().toISOString(),
};

export function LiveChatWidget() {
 const pathname = usePathname();
 const router = useRouter();
 const [open, setOpen] = useState(false);
 const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
 const [input, setInput] = useState('');
 const [typing, setTyping] = useState(false);
 const [escalated, setEscalated] = useState(false);
 const scrollRef = useRef<HTMLDivElement>(null);

 // Hide on portal/admin pages — WhatsApp is the single support channel for providers
 const hidden =
 pathname?.startsWith('/admin') ||
 pathname?.startsWith('/astrologer-portal') ||
 pathname?.startsWith('/temple-portal') ||
 pathname?.startsWith('/store-admin') ||
 pathname?.startsWith('/wellness-portal') ||
 pathname?.startsWith('/gaushala-portal') ||
 pathname?.startsWith('/priest') ||
 pathname?.startsWith('/provider-kyc');

 useEffect(() => {
 if (scrollRef.current) {
 scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
 }
 }, [messages, typing, open]);

 if (hidden) return null;

 async function send(textOverride?: string) {
 const text = (textOverride ?? input).trim();
 if (!text) return;

 const userMsg: ChatMessage = {
 id: `u-${Date.now()}`,
 author: 'user',
 body: text,
 createdAt: new Date().toISOString(),
 };
 setMessages((prev) => [...prev, userMsg]);
 setInput('');
 setTyping(true);

 // Build chat history (last 10 messages, user/assistant only)
 const history = messages
 .filter((m) => m.author === 'user' || m.author === 'agent')
 .slice(-10)
 .map((m) => ({
 role: m.author === 'user' ? ('user' as const) : ('assistant' as const),
 content: m.body,
 }));

 const controller = new AbortController();
 const timeoutId = window.setTimeout(() => controller.abort(), 15000);

 try {
 const res = await fetch(`${API_BASE}/api/v1/support/chat`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ message: text, history }),
 signal: controller.signal,
 });
 window.clearTimeout(timeoutId);

 if (!res.ok) throw new Error('AI support unreachable');
 const data = await res.json();

 const agentMsg: ChatMessage = {
 id: `a-${Date.now()}`,
 author: 'agent',
 body: data.message,
 createdAt: new Date().toISOString(),
 actions: data.suggestedActions || [],
 escalate: data.escalate || false,
 };
 setMessages((prev) => [...prev, agentMsg]);

 if (data.escalate) {
 setEscalated(true);
 // Add a system message prompting escalation
 window.setTimeout(() => {
 setMessages((prev) => [
 ...prev,
 {
 id: `s-${Date.now()}`,
 author: 'system',
 body: "I'm escalating this to our human support team. Create a ticket below and we'll reply within 4 hours.",
 createdAt: new Date().toISOString(),
 },
 ]);
 }, 500);
 }
 } catch (err) {
 window.clearTimeout(timeoutId);
 // Network failure fallback — use local keyword matching
 console.warn('[Darshya Chat] API unreachable, using local fallback', err);
 const auto = findAutoReply(text);
 const lower = text.toLowerCase().trim();
 const isGreeting = ['hi', 'hii', 'hello', 'hey', 'namaste'].some(
 (g) => lower === g || lower.startsWith(g + ' ') || lower.startsWith(g + '!')
 );
 let fallbackBody: string;
 let actions: QuickAction[] = [];
 let shouldEscalate = false;
 if (isGreeting) {
 fallbackBody =
 'Namaste! I can help with puja bookings, live darshan, yatra planning, astrology, home pujas, wellness, and more. What would you like help with?';
 actions = [
 { label: 'Browse Pujas', href: '/pujas' },
 { label: 'Live Darshan', href: '/darshan' },
 { label: 'Plan a Yatra', href: '/yatra' },
 ];
 } else if (auto) {
 fallbackBody = auto;
 } else {
 fallbackBody =
 "I'm not sure I caught that. Try asking about puja booking, darshan, yatra, or refunds. Or say 'talk to human' to connect with an agent.";
 }

 setMessages((prev) => [
 ...prev,
 {
 id: `a-${Date.now()}`,
 author: 'agent',
 body: fallbackBody,
 createdAt: new Date().toISOString(),
 actions,
 escalate: shouldEscalate,
 },
 ]);
 if (shouldEscalate) setEscalated(true);
 } finally {
 setTyping(false);
 }
 }

 function handleEscalate() {
 // Save chat transcript to localStorage so /support/ticket/new can pre-fill
 const transcript = messages
 .filter((m) => m.author !== 'system')
 .map((m) => `[${m.author}] ${m.body}`)
 .join('\n');

 try {
 localStorage.setItem('poojly:support:chat-transcript', transcript);
 } catch {}

 setOpen(false);
 router.push('/support/ticket/new?from=chat');
 }

 if (!open) {
 return (
 <button
 onClick={() => setOpen(true)}
 aria-label="Open live chat"
 className="fixed bottom-5 right-5 z-[60] group"
 >
 <span className="relative flex items-center justify-center w-14 h-14 rounded-full bg-saffron-600 hover:bg-saffron-700 text-white shadow-lg shadow-saffron-600/30 transition-all hover:-translate-y-0.5">
 <MessageSquare className="w-6 h-6" />
 <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white animate-pulse" />
 </span>
 <span className="absolute right-16 top-1/2 -translate-y-1/2 bg-surface-900 text-white text-xs px-2.5 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
 Need help? Chat with us
 </span>
 </button>
 );
 }

 return (
 <div className="fixed bottom-5 right-5 z-[60] w-[360px] max-w-[calc(100vw-24px)] h-[540px] max-h-[calc(100vh-40px)] bg-white rounded-xl border border-surface-200 shadow-2xl shadow-surface-900/15 flex flex-col overflow-hidden">
 {/* Header */}
 <div className="bg-gradient-to-r from-saffron-600 to-saffron-700 text-white px-4 py-3 flex items-center gap-3">
 <div className="relative">
 <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
 <Bot className="w-5 h-5" />
 </div>
 <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-saffron-600" />
 </div>
 <div className="flex-1 min-w-0">
 <div className="font-semibold text-sm flex items-center gap-1.5">
 Asha · AI Support
 <span className="text-xs font-medium bg-white/20 px-1.5 py-0.5 rounded-full">AI</span>
 </div>
 <div className="text-xs text-white/80 flex items-center gap-1">
 <span className="w-1.5 h-1.5 rounded-full bg-green-300" />
 {escalated ? 'Escalated to human agent' : 'Usually replies instantly'}
 </div>
 </div>
 <button
 onClick={() => setOpen(false)}
 className="text-white/80 hover:text-white"
 aria-label="Close chat"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Messages */}
 <div
 ref={scrollRef}
 className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#faf7f0]"
 >
 {messages.map((m) => {
 if (m.author === 'system') {
 return (
 <div key={m.id} className="flex justify-center">
 <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-900 max-w-[90%] text-center flex items-center gap-1.5">
 <UserCircle className="w-3.5 h-3.5 shrink-0" />
 {m.body}
 </div>
 </div>
 );
 }

 return (
 <div key={m.id} className={`flex ${m.author === 'user' ? 'justify-end' : 'justify-start'}`}>
 <div className="max-w-[85%]">
 <div
 className={`px-3 py-2 rounded-xl text-sm ${
 m.author === 'user'
 ? 'bg-saffron-600 text-white rounded-br-sm'
 : 'bg-white border border-surface-200 text-surface-800 rounded-bl-sm'
 }`}
 >
 <div className="whitespace-pre-line">{m.body}</div>
 </div>
 {/* Suggested action chips */}
 {m.author === 'agent' && m.actions && m.actions.length > 0 && (
 <div className="mt-1.5 flex flex-wrap gap-1.5">
 {m.actions.map((a) => (
 <Link
 key={a.href}
 href={a.href}
 onClick={() => setOpen(false)}
 className="text-xs inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-saffron-50 border border-saffron-200 text-saffron-800 hover:bg-saffron-100"
 >
 {a.label} <ArrowRight className="w-2.5 h-2.5" />
 </Link>
 ))}
 </div>
 )}
 </div>
 </div>
 );
 })}
 {typing && (
 <div className="flex justify-start">
 <div className="bg-white border border-surface-200 rounded-xl rounded-bl-sm px-3 py-2.5 flex items-center gap-1">
 <span className="w-1.5 h-1.5 bg-saffron-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
 <span className="w-1.5 h-1.5 bg-saffron-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
 <span className="w-1.5 h-1.5 bg-saffron-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
 <span className="text-xs text-surface-500 ml-1.5">Asha is thinking...</span>
 </div>
 </div>
 )}
 </div>

 {/* Escalation CTA */}
 {escalated && (
 <div className="border-t border-amber-200 bg-amber-50 p-3">
 <button
 onClick={handleEscalate}
 className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-saffron-600 hover:bg-saffron-700 text-white text-sm font-medium rounded-lg"
 >
 <UserCircle className="w-4 h-4" />
 Talk to Human Agent
 </button>
 <p className="text-xs text-amber-800 mt-1.5 text-center">
 We&apos;ll save this conversation and a human agent will reply within 4 hours.
 </p>
 </div>
 )}

 {/* Quick suggestions (only show on first message) */}
 {messages.length === 1 && !typing && (
 <div className="px-3 py-2 border-t border-surface-100 flex gap-1.5 flex-wrap bg-white">
 {['Book a puja', 'Plan a yatra', 'Refund status', 'Talk to human'].map((q) => (
 <button
 key={q}
 onClick={() => send(q)}
 className="text-xs px-2.5 py-1 rounded-full border border-saffron-200 bg-saffron-50 text-saffron-800 hover:bg-saffron-100"
 >
 <Sparkles className="inline w-3 h-3 mr-1" />
 {q}
 </button>
 ))}
 </div>
 )}

 {/* Input */}
 <div className="border-t border-surface-200 bg-white p-3">
 <div className="flex items-end gap-2">
 <textarea
 value={input}
 onChange={(e) => setInput(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter' && !e.shiftKey) {
 e.preventDefault();
 send();
 }
 }}
 rows={1}
 placeholder="Ask anything about Darshya..."
 className="flex-1 resize-none px-3 py-2 text-sm border border-surface-200 rounded-lg focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none max-h-28"
 />
 <button
 onClick={() => send()}
 disabled={!input.trim() || typing}
 className="shrink-0 w-9 h-9 rounded-lg bg-saffron-600 hover:bg-saffron-700 disabled:opacity-50 text-white flex items-center justify-center"
 aria-label="Send"
 >
 <Send className="w-4 h-4" />
 </button>
 </div>
 <div className="mt-2 flex items-center justify-between text-xs text-surface-500">
 <span className="flex items-center gap-1">
 <Bot className="w-3 h-3" />
 Powered by Claude AI
 </span>
 <Link
 href="/support/ticket/new"
 onClick={() => setOpen(false)}
 className="inline-flex items-center gap-1 text-saffron-700 hover:text-saffron-800 font-medium"
 >
 <LifeBuoy className="w-3 h-3" /> Create ticket
 </Link>
 </div>
 </div>
 </div>
 );
}

export default LiveChatWidget;
