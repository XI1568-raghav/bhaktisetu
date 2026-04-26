'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
 ChevronLeft,
 Send,
 Loader2,
 Sparkles,
 Star,
 Sun,
 Moon,
 Calendar,
 Clock,
 MapPin,
 User,
 MessageCircle,
} from 'lucide-react';
import { API_BASE_URL } from '../../../lib/api-config';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
 id: string;
 role: 'user' | 'assistant';
 content: string;
 timestamp: string;
}

interface BirthDetails {
 name: string;
 date: string;
 time: string;
 place: string;
}

// ─── Fallback Responses ─────────────────────────────────────────────────────

const FALLBACK_RESPONSES: Record<string, string> = {
 marriage: `Based on Vedic astrology principles, marriage timing is primarily determined by:

**Key Indicators:**
- **7th house** and its lord determine the nature and timing of marriage
- **Venus** (Shukra) is the primary karaka (significator) for marriage
- **Jupiter** transit over the 7th house or 7th lord often triggers marriage
- **Vimshottari Dasha** of 7th lord, Venus, or planets in the 7th house

**General Guidance:**
- Venus Mahadasha or Antardasha is highly favorable for marriage
- Jupiter's transit (Guru Gochar) through the 2nd, 7th, or 11th house from Moon sign activates marriage yoga
- The Navamsa chart (D-9) should be analyzed for marriage compatibility

**Remedies for Marriage Delay:**
- Worship Lord Shiva and Parvati together on Mondays
- Chant the Katyayani Mantra: "ॐ कात्यायन्यै नमः" 108 times
- Perform Vivah Puja at a Shiva temple
- Donate items related to Venus (white clothes, sweets) on Fridays

For a precise prediction, I would need your birth details (date, time, and place of birth). Please share them for a more detailed analysis.`,

 career: `According to Vedic astrology, career success is influenced by several planetary factors:

**Key Houses for Career:**
- **10th house** (Karma Bhava) — represents profession and public standing
- **6th house** — daily work, service, and competition
- **2nd house** — wealth accumulation through work
- **11th house** — gains and income

**Important Planets:**
- **Saturn** (Shani) — the karaka for career and hard work
- **Sun** (Surya) — authority, government positions, leadership
- **Mercury** (Budh) — communication, business, trade
- **Jupiter** (Guru) — wisdom, teaching, advisory roles

**Current Planetary Influences:**
- Saturn transit through your 10th house brings hard work with eventual rewards
- Jupiter's blessings on the 10th lord can bring promotions and recognition

**Career Remedies:**
- Chant the Gayatri Mantra at sunrise for clarity
- Worship Lord Ganesha before starting new ventures
- Donate dark-colored items on Saturdays for Saturn's blessings
- Wear a blue sapphire (Neelam) only after proper chart analysis

Share your birth details for a personalized career reading.`,

 health: `Vedic astrology views health through the lens of planetary positions and their influence on the body:

**Health Houses in Astrology:**
- **1st house (Lagna)** — overall vitality and constitution
- **6th house** — diseases and immunity
- **8th house** — chronic conditions and longevity
- **12th house** — hospitalization and hidden ailments

**Planet-Body Correlations (Vedic):**
- **Sun** — heart, bones, eyesight, vitality
- **Moon** — mind, blood, lungs, emotional health
- **Mars** — blood pressure, surgery, accidents, muscles
- **Mercury** — nervous system, skin, respiratory
- **Jupiter** — liver, fat, diabetes, growth
- **Venus** — kidneys, reproductive system, beauty
- **Saturn** — joints, teeth, chronic diseases, aging

**General Health Remedies:**
- Chant Mahamrityunjaya Mantra for protection: "ॐ त्र्यम्बकं यजामहे..."
- Perform Navagraha Shanti Puja to balance planetary energies
- Follow Ayurvedic routine (Dinacharya) aligned with your birth chart
- Donate medicines or food to the needy on Saturdays

Note: Astrology complements medical advice but does not replace it. Always consult a doctor for health concerns.`,

 default: `Namaste! Thank you for your question.

As your AI astrologer based in Vedic Jyotish traditions, I can help you understand various aspects of your life through the cosmic lens.

**Here is some general guidance based on Vedic astrology:**

The ancient science of Jyotish teaches us that the planets (Grahas) are not the cause of our experiences, but rather indicators of our karmic patterns. By understanding these patterns, we can make better decisions and apply appropriate remedies.

**Key Principles of Vedic Astrology:**
1. **Karma and Free Will** — Planets show tendencies, not fixed outcomes. Your actions (karma) can modify planetary effects.
2. **Remedies (Upaya)** — Mantras, gemstones, donations, and pujas can mitigate negative planetary influences.
3. **Timing (Muhurta)** — Choosing auspicious times for important actions greatly improves outcomes.

**For a more specific reading, I would suggest:**
- Share your birth details (date, time, place) for a personalized analysis
- Ask about specific areas: career, marriage, health, finance, education
- Inquire about current planetary transits affecting your life

I am here to guide you with the wisdom of the ancient Rishis. What would you like to explore?`,
};

function getFallbackResponse(message: string): string {
 const lower = message.toLowerCase();
 if (lower.includes('marriage') || lower.includes('vivah') || lower.includes('shaadi') || lower.includes('partner') || lower.includes('love') || lower.includes('relationship')) {
 return FALLBACK_RESPONSES.marriage!;
 }
 if (lower.includes('career') || lower.includes('job') || lower.includes('business') || lower.includes('work') || lower.includes('profession') || lower.includes('money') || lower.includes('finance')) {
 return FALLBACK_RESPONSES.career!;
 }
 if (lower.includes('health') || lower.includes('disease') || lower.includes('illness') || lower.includes('body') || lower.includes('medical')) {
 return FALLBACK_RESPONSES.health!;
 }
 return FALLBACK_RESPONSES.default!;
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function AstrologerChatPage() {
 const [birthDetails, setBirthDetails] = useState<BirthDetails>({
 name: '',
 date: '',
 time: '',
 place: '',
 });
 const [birthDetailsSubmitted, setBirthDetailsSubmitted] = useState(false);
 const [messages, setMessages] = useState<ChatMessage[]>([]);
 const [input, setInput] = useState('');
 const [isStreaming, setIsStreaming] = useState(false);
 const messagesEndRef = useRef<HTMLDivElement>(null);
 const inputRef = useRef<HTMLTextAreaElement>(null);

 // Scroll the messages container only — never the page. Use scrollTop on
 // the parent so Next.js's window scroll isn't triggered.
 const messagesScrollRef = useRef<HTMLDivElement>(null);
 const scrollToBottom = useCallback((smooth = true) => {
 const el = messagesScrollRef.current;
 if (!el) return;
 el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
 }, []);

 useEffect(() => {
 scrollToBottom();
 }, [messages, scrollToBottom]);

 function handleBirthSubmit(e: React.FormEvent) {
 e.preventDefault();
 setBirthDetailsSubmitted(true);

 // Add initial greeting from AI
 const greeting: ChatMessage = {
 id: 'greeting',
 role: 'assistant',
 content: `Namaste ${birthDetails.name || 'there'}!

I am your AI Vedic Astrologer. ${birthDetails.date ? `Based on your birth details (${birthDetails.date}, ${birthDetails.time}, ${birthDetails.place}), I can provide personalized astrological insights.` : 'I can provide general astrological guidance based on Vedic Jyotish principles.'}

**You can ask me about:**
- Marriage and relationships
- Career and financial prospects
- Health and wellness
- Current planetary transits and their effects
- Remedies for planetary doshas
- Auspicious timings (Muhurta)
- Gemstone recommendations

What would you like to know?`,
 timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
 };
 setMessages([greeting]);
 }

 function handleSkipBirth() {
 setBirthDetailsSubmitted(true);
 const greeting: ChatMessage = {
 id: 'greeting',
 role: 'assistant',
 content: `Namaste!

I am your AI Vedic Astrologer. I can provide general astrological guidance based on Vedic Jyotish principles.

For more accurate and personalized readings, you can share your birth details anytime during our conversation.

**Ask me about:**
- Marriage, career, health predictions
- Planetary remedies and mantras
- Gemstone recommendations
- Auspicious timings
- Dosha analysis and remedies

How may I guide you today?`,
 timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
 };
 setMessages([greeting]);
 }

 async function handleSend() {
 const trimmed = input.trim();
 if (!trimmed || isStreaming) return;

 const userMsg: ChatMessage = {
 id: `user-${Date.now()}`,
 role: 'user',
 content: trimmed,
 timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
 };
 setMessages(prev => [...prev, userMsg]);
 setInput('');
 setIsStreaming(true);

 const assistantMsgId = `assistant-${Date.now()}`;
 const assistantMsg: ChatMessage = {
 id: assistantMsgId,
 role: 'assistant',
 content: '',
 timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
 };
 setMessages(prev => [...prev, assistantMsg]);

 try {
 const res = await fetch(`${API_BASE_URL}/astrology/ask`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 message: trimmed,
 birthDetails: birthDetails.date ? birthDetails : undefined,
 }),
 });

 if (!res.ok) throw new Error(`HTTP ${res.status}`);

 const data = await res.json();
 const responseText = data.response || data.message || getFallbackResponse(trimmed);

 // Simulate typing effect
 let displayedText = '';
 const words = responseText.split(' ');
 for (let i = 0; i < words.length; i++) {
 displayedText += (i === 0 ? '' : ' ') + words[i];
 const currentText = displayedText;
 setMessages(prev =>
 prev.map(m => m.id === assistantMsgId ? { ...m, content: currentText } : m)
 );
 // Small delay between words for typing effect
 await new Promise(resolve => setTimeout(resolve, 15));
 }
 } catch {
 // Use fallback response when API is unavailable
 const fallback = getFallbackResponse(trimmed);
 let displayedText = '';
 const words = fallback.split(' ');
 for (let i = 0; i < words.length; i++) {
 displayedText += (i === 0 ? '' : ' ') + words[i];
 const currentText = displayedText;
 setMessages(prev =>
 prev.map(m => m.id === assistantMsgId ? { ...m, content: currentText } : m)
 );
 await new Promise(resolve => setTimeout(resolve, 15));
 }
 } finally {
 setIsStreaming(false);
 inputRef.current?.focus();
 }
 }

 function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
 if (e.key === 'Enter' && !e.shiftKey) {
 e.preventDefault();
 handleSend();
 }
 }

 function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
 setInput(e.target.value);
 e.target.style.height = 'auto';
 e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
 }

 // ─── Birth Details Form ─────────────────────────────────────────────────

 if (!birthDetailsSubmitted) {
 return (
 <div className="min-h-screen">
 <section className="bg-[#ede9e3]">
 <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 pt-6 pb-8">
 <Link
 href="/astrology"
 className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800 transition-colors mb-6"
 >
 <ChevronLeft className="w-4 h-4" />
 Back to Astrology
 </Link>
 <div className="text-center pb-4">
 <div className="inline-flex items-center gap-2 bg-saffron-100 border border-saffron-200 rounded-full px-4 py-1.5 mb-4">
 <Sparkles className="w-3.5 h-3.5 text-saffron-600" />
 <span className="text-xs font-bold text-saffron-700 uppercase tracking-wider">Free AI Consultation</span>
 </div>
 <h1 className="text-3xl md:text-4xl font-bold text-surface-800 mb-3">
 AI Vedic Astrologer
 </h1>
 <p className="text-surface-500 max-w-xl mx-auto">
 Get instant astrological guidance based on Vedic Jyotish principles.
 Share your birth details for personalized readings.
 </p>
 </div>
 </div>
 </section>

 <div className="max-w-lg mx-auto px-6 py-10">
 <form onSubmit={handleBirthSubmit} className="bg-white rounded-xl border border-surface-200/80 shadow-lg p-8">
 <div className="flex items-center gap-3 mb-6">
 <div className="w-11 h-11 bg-saffron-600/15 rounded-xl flex items-center justify-center">
 <Star className="w-5 h-5 text-saffron-600" />
 </div>
 <div>
 <h2 className="text-lg font-bold text-surface-800">Birth Details</h2>
 <p className="text-xs text-surface-500">Optional but recommended for accuracy</p>
 </div>
 </div>

 <div className="space-y-4">
 <div>
 <label className="block text-sm font-semibold text-surface-700 mb-1.5">
 <User className="w-4 h-4 inline mr-1.5 text-saffron-400" />
 Your Name
 </label>
 <input
 type="text"
 value={birthDetails.name}
 onChange={(e) => setBirthDetails({ ...birthDetails, name: e.target.value })}
 placeholder="Enter your name"
 className="w-full px-4 py-3 border border-surface-200 rounded-xl text-sm text-surface-800 placeholder:text-surface-400 focus:ring-2 focus:ring-saffron-500/30 focus:border-saffron-500 outline-none"
 />
 </div>
 <div>
 <label className="block text-sm font-semibold text-surface-700 mb-1.5">
 <Calendar className="w-4 h-4 inline mr-1.5 text-saffron-400" />
 Date of Birth
 </label>
 <input
 type="date"
 value={birthDetails.date}
 onChange={(e) => setBirthDetails({ ...birthDetails, date: e.target.value })}
 className="w-full px-4 py-3 border border-surface-200 rounded-xl text-sm text-surface-800 focus:ring-2 focus:ring-saffron-500/30 focus:border-saffron-500 outline-none"
 />
 </div>
 <div>
 <label className="block text-sm font-semibold text-surface-700 mb-1.5">
 <Clock className="w-4 h-4 inline mr-1.5 text-saffron-400" />
 Time of Birth
 </label>
 <input
 type="time"
 value={birthDetails.time}
 onChange={(e) => setBirthDetails({ ...birthDetails, time: e.target.value })}
 className="w-full px-4 py-3 border border-surface-200 rounded-xl text-sm text-surface-800 focus:ring-2 focus:ring-saffron-500/30 focus:border-saffron-500 outline-none"
 />
 </div>
 <div>
 <label className="block text-sm font-semibold text-surface-700 mb-1.5">
 <MapPin className="w-4 h-4 inline mr-1.5 text-saffron-400" />
 Place of Birth
 </label>
 <input
 type="text"
 value={birthDetails.place}
 onChange={(e) => setBirthDetails({ ...birthDetails, place: e.target.value })}
 placeholder="e.g., New Delhi, Mumbai"
 className="w-full px-4 py-3 border border-surface-200 rounded-xl text-sm text-surface-800 placeholder:text-surface-400 focus:ring-2 focus:ring-saffron-500/30 focus:border-saffron-500 outline-none"
 />
 </div>
 </div>

 <div className="mt-6 space-y-3">
 <button
 type="submit"
 className="w-full py-3.5 bg-saffron-600 text-white font-medium text-sm rounded-lg hover:bg-saffron-700 transition-all shadow-md flex items-center justify-center gap-2"
 >
 <MessageCircle className="w-4 h-4" />
 Start Consultation
 </button>
 <button
 type="button"
 onClick={handleSkipBirth}
 className="w-full py-3 text-sm text-surface-500 hover:text-saffron-600 font-medium transition-colors"
 >
 Skip &mdash; Ask without birth details
 </button>
 </div>
 </form>

 {/* Sample Questions */}
 <div className="mt-8">
 <p className="text-xs text-surface-400 text-center mb-4 uppercase tracking-wider font-semibold">Popular Questions</p>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {[
 { text: 'When will I get married?', emoji: '' },
 { text: 'Career change prospects?', emoji: '' },
 { text: 'Remedies for Manglik Dosha', emoji: '' },
 { text: 'Best gemstone for me?', emoji: '' },
 ].map(q => (
 <button
 key={q.text}
 onClick={() => {
 handleSkipBirth();
 setTimeout(() => {
 setInput(q.text);
 inputRef.current?.focus();
 }, 100);
 }}
 className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-surface-200 hover:border-saffron-300 hover:bg-saffron-50 text-left text-sm text-surface-700 transition-all"
 >
 <span className="text-lg">{q.emoji}</span>
 <span>{q.text}</span>
 </button>
 ))}
 </div>
 </div>
 </div>
 </div>
 );
 }

 // ─── Chat Interface ───────────────────────────────────────────────────────
 // Height: 100dvh minus the global 56px nav bar so the chat fills the
 // viewport without creating a second outer scrollbar. Inner messages div
 // is the only scroll context.

 return (
 <div className="flex flex-col" style={{ height: 'calc(100dvh - 56px)' }}>
 {/* Header */}
 <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-surface-200 shadow-sm shrink-0">
 <div className="flex items-center gap-3">
 <Link
 href="/astrology"
 className="p-1.5 text-surface-500 hover:text-saffron-600 hover:bg-saffron-50 rounded-lg transition-colors"
 >
 <ChevronLeft className="w-5 h-5" />
 </Link>
 <div className="flex items-center gap-2">
 <div className="w-9 h-9 bg-saffron-600 rounded-full flex items-center justify-center shadow-sm">
 <Star className="w-5 h-5 text-white" />
 </div>
 <div>
 <h1 className="text-base font-semibold text-surface-800">AI Astrologer</h1>
 <p className="text-[10px] text-surface-400">Vedic Jyotish guidance</p>
 </div>
 </div>
 </div>
 {birthDetails.name && (
 <div className="hidden sm:flex items-center gap-2 text-xs text-surface-400 bg-surface-50 px-3 py-1.5 rounded-lg">
 <User className="w-3 h-3" />
 {birthDetails.name}
 {birthDetails.date && (
 <>
 <span className="text-surface-300">|</span>
 {birthDetails.date}
 </>
 )}
 </div>
 )}
 </header>

 {/* Messages */}
 <div ref={messagesScrollRef} className="flex-1 overflow-y-auto px-4 py-6 bg-surface-50 overscroll-contain">
 <div className="max-w-3xl mx-auto space-y-4">
 {messages.map(msg => (
 <div
 key={msg.id}
 className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
 >
 <div className={`max-w-[85%] ${
 msg.role === 'user'
 ? 'bg-saffron-600 text-white rounded-2xl rounded-br-md px-4 py-3'
 : 'bg-white border border-surface-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm'
 }`}>
 {msg.role === 'assistant' && (
 <div className="flex items-center gap-1.5 mb-2">
 <Star className="w-3.5 h-3.5 text-saffron-500" />
 <span className="text-[10px] font-semibold text-saffron-600 uppercase tracking-wider">AI Astrologer</span>
 </div>
 )}
 <div className={`text-sm leading-relaxed whitespace-pre-wrap ${
 msg.role === 'user' ? 'text-white' : 'text-surface-700'
 }`}>
 {formatMarkdown(msg.content)}
 </div>
 <p className={`text-[10px] mt-2 ${
 msg.role === 'user' ? 'text-white/60' : 'text-surface-400'
 }`}>
 {msg.timestamp}
 </p>
 </div>
 </div>
 ))}
 {isStreaming && messages.length > 0 && messages[messages.length - 1]?.content === '' && (
 <div className="flex justify-start">
 <div className="bg-white border border-surface-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 bg-saffron-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
 <div className="w-2 h-2 bg-saffron-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
 <div className="w-2 h-2 bg-saffron-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
 </div>
 </div>
 </div>
 )}
 <div ref={messagesEndRef} />
 </div>
 </div>

 {/* Input */}
 <div className="border-t border-surface-200 bg-white p-4 shrink-0">
 <div className="max-w-3xl mx-auto flex items-end gap-3">
 <div className="flex-1">
 <textarea
 ref={inputRef}
 value={input}
 onChange={handleInputChange}
 onKeyDown={handleKeyDown}
 placeholder="Ask about marriage, career, health, remedies..."
 rows={1}
 disabled={isStreaming}
 className="w-full resize-none rounded-xl border border-surface-300 px-4 py-3 text-sm text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-saffron-400 focus:border-saffron-400 disabled:opacity-50 transition-colors [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
 style={{ maxHeight: '120px' }}
 />
 </div>
 <button
 onClick={handleSend}
 disabled={!input.trim() || isStreaming}
 className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-saffron-600 text-white hover:bg-saffron-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
 >
 {isStreaming ? (
 <Loader2 className="w-5 h-5 animate-spin" />
 ) : (
 <Send className="w-5 h-5" />
 )}
 </button>
 </div>
 <p className="text-center text-[10px] text-surface-400 mt-2">
 AI Astrologer provides guidance based on Vedic Jyotish principles. For life decisions, consult a qualified astrologer.
 </p>
 </div>
 </div>
 );
}

// ─── Simple Markdown Formatter ──────────────────────────────────────────────

function formatMarkdown(text: string): React.JSX.Element {
 if (!text) return <></>;

 const lines = text.split('\n');
 const elements: React.JSX.Element[] = [];

 for (let i = 0; i < lines.length; i++) {
 let line = lines[i]!;

 // Bold
 line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
 // Italic
 line = line.replace(/\*(.+?)\*/g, '<em>$1</em>');

 if (line.startsWith('- ') || line.startsWith('• ')) {
 elements.push(
 <div key={i} className="flex gap-2 ml-2">
 <span className="text-saffron-500 shrink-0 mt-0.5">&#8226;</span>
 <span dangerouslySetInnerHTML={{ __html: line.slice(2) }} />
 </div>
 );
 } else if (line.match(/^\d+\.\s/)) {
 elements.push(
 <div key={i} className="ml-2" dangerouslySetInnerHTML={{ __html: line }} />
 );
 } else if (line.trim() === '') {
 elements.push(<div key={i} className="h-2" />);
 } else {
 elements.push(
 <span key={i} dangerouslySetInnerHTML={{ __html: line + (i < lines.length - 1 ? '<br/>' : '') }} />
 );
 }
 }

 return <>{elements}</>;
}
