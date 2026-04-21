'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, X, Send, LifeBuoy, Sparkles } from 'lucide-react';
import { findAutoReply } from '../lib/support';

type ChatMessage = {
  id: string;
  author: 'agent' | 'user';
  body: string;
  createdAt: string;
};

const WELCOME: ChatMessage = {
  id: 'welcome',
  author: 'agent',
  body:
    "Namaste! I'm Asha from Poojly support. Ask me about puja bookings, refunds, darshan, or anything else. I typically reply in under a minute.",
  createdAt: new Date().toISOString(),
};

export function LiveChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Hide on admin pages
  const hidden =
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/astrologer-portal') ||
    pathname?.startsWith('/temple-portal') ||
    pathname?.startsWith('/store-admin') ||
    pathname?.startsWith('/wellness-portal');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing, open]);

  if (hidden) return null;

  const send = () => {
    const text = input.trim();
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

    // Simulate agent reply
    window.setTimeout(() => {
      const auto = findAutoReply(text);
      const reply =
        auto ??
        "Thanks for your message! I'll loop in the right team and get back within a few minutes. If it's urgent, you can also raise a ticket and we'll respond in under 4 hours.";
      const agentMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        author: 'agent',
        body: reply,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, agentMsg]);
      setTyping(false);
    }, 1400);
  };

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
    <div className="fixed bottom-5 right-5 z-[60] w-[360px] max-w-[calc(100vw-24px)] h-[500px] max-h-[calc(100vh-40px)] bg-white rounded-xl border border-surface-200 shadow-2xl shadow-surface-900/15 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-saffron-600 to-saffron-700 text-white px-4 py-3 flex items-center gap-3">
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
            A
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-saffron-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">Poojly Support</div>
          <div className="text-[11px] text-white/80 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-300" />
            Asha is online
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
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.author === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                m.author === 'user'
                  ? 'bg-saffron-600 text-white rounded-br-sm'
                  : 'bg-white border border-surface-200 text-surface-800 rounded-bl-sm'
              }`}
            >
              <div className="whitespace-pre-line">{m.body}</div>
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-white border border-surface-200 rounded-xl rounded-bl-sm px-3 py-2.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-saffron-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-saffron-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-saffron-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-[11px] text-surface-500 ml-1.5">Asha is typing...</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick suggestions */}
      {messages.length === 1 && (
        <div className="px-3 py-2 border-t border-surface-100 flex gap-1.5 flex-wrap bg-white">
          {['Book a puja', 'Refund status', 'Darshan buffering', 'Talk to human'].map((q) => (
            <button
              key={q}
              onClick={() => setInput(q)}
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
            placeholder="Type a message..."
            className="flex-1 resize-none px-3 py-2 text-sm border border-surface-200 rounded-lg focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none max-h-28"
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            className="shrink-0 w-9 h-9 rounded-lg bg-saffron-600 hover:bg-saffron-700 disabled:opacity-50 text-white flex items-center justify-center"
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-surface-500">
          <span>Powered by Poojly Support</span>
          <Link
            href="/support/ticket/new"
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-1 text-saffron-700 hover:text-saffron-800 font-medium"
          >
            <LifeBuoy className="w-3 h-3" /> Create ticket instead
          </Link>
        </div>
      </div>
    </div>
  );
}

export default LiveChatWidget;
