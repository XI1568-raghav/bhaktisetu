'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Send, Loader2, Sparkles } from 'lucide-react';
import AiChatMessage, { type Citation } from './AiChatMessage';
import { API_BASE_URL } from '../lib/api-config';
import { buttonClass } from '../components/ui/button-recipe';
import {
 getConversation,
 createConversation,
 addMessage,
 updateLastMessage,
 type StoredMessage,
} from '../lib/conversation-store';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
 id: string;
 role: 'user' | 'assistant';
 content: string;
 citations?: Citation[];
 timestamp: string;
}

interface AiChatProps {
 conversationId?: string | null;
 onConversationCreated?: (id: string) => void;
 onConversationUpdated?: () => void;
 language?: string;
 accessToken?: string | null;
}

// ─── Local Demo Responses (used when API is unreachable) ─────────────────────

interface DemoTopic {
 keywords: string[];
 response: string;
}

const LOCAL_DEMO_TOPICS: DemoTopic[] = [
 {
 keywords: ['marriage', 'vivah', 'shaadi', 'wedding', 'partner', 'love', 'relationship', 'marry'],
 response: `Marriage is one of the 16 sacred samskaras in Hindu tradition.

**Shloka from the Saptapadi:**
*"धर्मेच अर्थेच कामेच नातिचरामि"*
*"In dharma, artha, and kama, I shall not transgress."*

**Guidance:**
- **Worship Shiva-Parvati** together on Mondays for harmony
- **Chant the Katyayani Mantra** "ॐ कात्यायन्यै नमः" 108 times for those seeking a life partner
- **Perform Vivah Puja** at a Shiva temple for divine blessings
- The **Swayamvara Parvati Mantra** removes obstacles in marriage

**Bhagavad Gita (7.11):** *"धर्माविरुद्धो भूतेषु कामोऽस्मि"* — "I am the desire not contrary to dharma."

On Darshya, you can book a **Vivah Puja** or check **rashi compatibility** in the Astrology section.`,
 },
 {
 keywords: ['health', 'healing', 'disease', 'illness', 'sick', 'pain', 'medical'],
 response: `The body is the instrument of dharma: *"शरीरमाद्यं खलु धर्मसाधनम्"* — Kalidasa

**Mahamrityunjaya Mantra (most powerful healing mantra):**
*"ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम् |
उर्वारुकमिव बन्धनान् मृत्योर्मुक्षीय मामृतात् ||"*

**Recommended Practices:**
- Chant Mahamrityunjaya Mantra 108 times during Brahma Muhurta (4-6 AM)
- **Dhanvantari Puja** for invoking the divine physician
- Light a mustard oil diya before Lord Shiva on Mondays

*Note: Spiritual healing complements medical treatment. Always consult doctors.*

Book a **Mahamrityunjaya Japa** or **Dhanvantari Puja** on Darshya for healing blessings.`,
 },
 {
 keywords: ['career', 'job', 'success', 'business', 'work', 'promotion', 'interview', 'exam', 'education', 'study'],
 response: `*"विद्या ददाति विनयं विनयाद्याति पात्रताम्"*
*"Knowledge gives humility, from humility comes worthiness, from worthiness comes wealth."*

**Gayatri Mantra:** *"ॐ भूर्भुवः स्वः तत्सवितुर्वरेण्यं भर्गो देवस्य धीमहि धियो यो नः प्रचोदयात्"*

**Recommended Pujas:**
1. **Ganesha Puja** — Remover of obstacles, perform before new ventures
2. **Saraswati Puja** — For wisdom and knowledge
3. **Lakshmi Puja** — For financial prosperity (Fridays)
4. **Navagraha Puja** — To mitigate negative planetary influences

**Daily Practices:**
- Chant Gayatri Mantra 108 times at sunrise
- Light a diya at your workspace
- Place a Saraswati idol in the northeast corner of your room

Visit Darshya's **Pujas** section to book with priests.`,
 },
 {
 keywords: ['peace', 'shanti', 'mantra', 'calm', 'anxiety', 'stress', 'tension', 'worry', 'fear', 'meditation', 'dhyana'],
 response: `**Om Shanti Mantra:** *"ॐ शान्तिः शान्तिः शान्तिः"*
The threefold peace — from divine, environmental, and internal disturbances.

**Gayatri Mantra:** *"ॐ भूर्भुवः स्वः तत्सवितुर्वरेण्यं भर्गो देवस्य धीमहि धियो यो नः प्रचोदयात्"*
Illuminates the mind and brings clarity.

**Mahamrityunjaya Mantra:** *"ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम्"*
Removes fear and anxiety.

**Asatoma Sadgamaya:**
*"असतो मा सद्गमय | तमसो मा ज्योतिर्गमय | मृत्योर्मामृतं गमय"*
"Lead me from untruth to truth, from darkness to light."

**Practice tip:** Chant 108 times using a mala during Brahma Muhurta (4-6 AM).

Explore mantras in Darshya's **Content** section. Book a **Shanti Puja** for deep peace.`,
 },
 {
 keywords: ['dharma', 'duty', 'karma', 'purpose', 'righteousness', 'meaning'],
 response: `**Bhagavad Gita (2.47):**
*"कर्मण्येवाधिकारस्ते मा फलेषु कदाचन"*
*"You have the right to perform your duty, but not to the fruits of your actions."*

**Dharma encompasses:**
1. **Sanatana Dharma** — The eternal cosmic order: truth, non-violence, purity
2. **Svadharma** — Your unique purpose based on your nature
3. **Yuga Dharma** — Duties appropriate to time and context

**Bhagavad Gita (18.66):**
*"सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज"*
"Surrender unto Me alone."

**Mahabharata:** *"धारणाद्धर्ममित्याहुः धर्मो धारयते प्रजाः"*
"That which sustains and holds together is dharma."

Explore the **Content** section on Darshya for Gita teachings, Upanishads, and more.`,
 },
 {
 keywords: ['festival', 'diwali', 'navratri', 'holi', 'shivratri', 'ganesh', 'janmashtami'],
 response: `**Bhagavad Gita (4.7):**
*"यदा यदा हि धर्मस्य ग्लानिर्भवति भारत"*
*"Whenever there is a decline of dharma, I manifest Myself."*

**Major Festivals:**
- **Diwali** — Lakshmi-Ganesha Puja, lighting diyas
- **Navratri** — 9 nights of Durga worship
- **Maha Shivratri** — Night vigil, Om Namah Shivaya chanting
- **Ganesh Chaturthi** — Welcome Lord Ganesha, offer modak
- **Janmashtami** — Krishna's birthday, midnight celebration
- **Makar Sankranti** — Sun's northward journey, donate til-gur

*"सर्वे भवन्तु सुखिनः सर्वे सन्तु निरामयाः"*
*"May all beings be happy, may all be free from disease."*

Book **festival-specific pujas** on Darshya. Watch **Live Darshan** for special aartis.`,
 },
 {
 keywords: ['wealth', 'money', 'prosperity', 'lakshmi', 'dhan', 'financial', 'rich'],
 response: `**Lakshmi Mantra:** *"ॐ श्रीं महालक्ष्म्यै नमः"*
Chant 108 times on Fridays for prosperity.

**Sri Suktam:**
*"हिरण्यवर्णां हरिणीं सुवर्णरजतस्रजाम्"*

**Wealth Practices:**
1. **Lakshmi Puja** every Friday with lotus flowers and sweets
2. **Sri Suktam Homa** — Fire ritual for financial abundance
3. Keep **north direction** clean (Kubera's direction)
4. Place a **Shri Yantra** in your puja room
5. Donate 10% of income (Dashaamsha)
6. Never keep broken items or leaking taps

**Katha Upanishad:** *"श्रेयश्च प्रेयश्च मनुष्यमेतस्तौ"*
"Both the good and pleasant approach a person. The wise choose the good."

Book **Lakshmi Puja** or **Kubera Puja** on Darshya with priests.`,
 },
 {
 keywords: ['child', 'baby', 'son', 'daughter', 'pregnancy', 'fertility', 'santan'],
 response: `**Santana Gopala Mantra:**
*"ॐ श्रीं ह्रीं क्लीं ग्लौं देवकीसुत गोविन्द वासुदेव जगत्पते |
देहि मे तनयं कृष्ण त्वामहं शरणं गतः ||"*

**For Child Blessings:**
- **Santana Gopala Puja** — for the blessing of progeny
- **Pumsavana Homa** — for a healthy pregnancy
- **Garbaraksha Puja** — protection during pregnancy
- Worship **Lord Krishna as Bal Gopal**

**For Children's Education:**
- **Saraswati Puja** — for wisdom and academic success
- **Aksharabhyasam** — the traditional learning initiation

Book **Santana Gopala Puja** on Darshya with priests across India.`,
 },
 {
 keywords: ['grief', 'death', 'loss', 'passed away', 'departed', 'shradh', 'ancestors', 'pitru'],
 response: `**Bhagavad Gita (2.22):**
*"वासांसि जीर्णानि यथा विहाय नवानि गृह्णाति नरोऽपराणि"*
*"As a person puts on new garments, the soul accepts new bodies."*

**Bhagavad Gita (2.20):**
*"न जायते म्रियते वा कदाचित्"*
*"The soul is never born, nor does it ever die."*

**Practices for the Departed:**
- **Shraddha Ceremony** — annual remembrance
- **Pind Daan** at Gaya for ancestors' salvation
- **Narayan Bali Puja** — liberation of the departed soul
- Light a diya and offer water (tarpan) daily

*"ॐ शान्तिः शान्तिः शान्तिः"*

Book **Shraddha Puja** or **Pind Daan** on Darshya with priests.`,
 },
 {
 keywords: ['vastu', 'house', 'home', 'direction', 'flat', 'office', 'construction'],
 response: `**Vastu Shastra** — The ancient science of spatial harmony.

**Key Directions:**
- **North (Kubera)** — Wealth. Keep clean and open.
- **East (Surya)** — Health & growth. Ideal for main entrance.
- **Northeast (Ishaan)** — Puja room. Most sacred direction.
- **Southeast (Agni)** — Kitchen. Fire element.
- **Southwest** — Master bedroom. Stability.

**Quick Vastu Remedies:**
1. Place a **Vastu Pyramid** in the center
2. Keep **northeast** clutter-free and well-lit
3. Fix all **leaking taps** immediately
4. Avoid **mirrors** facing the bed
5. Place a **Tulsi plant** at the entrance

Book a **Vastu Shanti Puja** or **Griha Pravesh Puja** on Darshya.`,
 },
 {
 keywords: ['gemstone', 'gem', 'stone', 'ratna', 'neelam', 'ruby', 'pearl', 'emerald', 'diamond', 'sapphire'],
 response: `**Gemstones in Vedic Astrology:**

1. **Ruby (Manik)** — Sun — Leadership. Ring finger, Sunday.
2. **Pearl (Moti)** — Moon — Peace. Little finger, Monday.
3. **Red Coral (Moonga)** — Mars — Courage. Ring finger, Tuesday.
4. **Emerald (Panna)** — Mercury — Intelligence. Little finger, Wednesday.
5. **Yellow Sapphire (Pukhraj)** — Jupiter — Wisdom. Index finger, Thursday.
6. **Diamond (Heera)** — Venus — Love. Ring finger, Friday.
7. **Blue Sapphire (Neelam)** — Saturn — Career. Middle finger, Saturday.

**Important:** Never wear a gemstone without consulting your birth chart.

Get a **personalized gemstone recommendation** from Darshya's verified astrologers.`,
 },
];

function getLocalDemoResponse(message: string): string {
 const lower = message.toLowerCase();
 for (const topic of LOCAL_DEMO_TOPICS) {
 if (topic.keywords.some((kw) => lower.includes(kw))) {
 return topic.response;
 }
 }
 return `Namaste! Thank you for your question.

**Bhagavad Gita (4.7-8):**
*"यदा यदा हि धर्मस्य ग्लानिर्भवति भारत"*
"Whenever there is a decline of dharma, I manifest Myself."

This reminds us that divine guidance is always available to those who seek it sincerely.

**Guidance:**
- Turn to prayer and meditation for clarity
- Study the scriptures (Gita, Upanishads, Ramayana) for wisdom
- Consult with a learned pandit for personalized guidance
- Practice selfless service (seva) to purify the heart

*"श्रद्धावान् लभते ज्ञानम्"* — "One who has faith attains wisdom." (Gita 4.39)

Explore Darshya's **Content** section for mantras and spiritual articles, or **Book a Puja** with a priest.`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AiChat({
 conversationId,
 onConversationCreated,
 onConversationUpdated,
 language = 'en',
 accessToken,
}: AiChatProps) {
 const [messages, setMessages] = useState<Message[]>([]);
 const [input, setInput] = useState('');
 const [isStreaming, setIsStreaming] = useState(false);
 const [currentConvId, setCurrentConvId] = useState<string | null>(
 conversationId || null
 );
 const [usage, setUsage] = useState<{
 plan: 'free' | 'session' | 'monthly' | 'anonymous';
 used: number;
 limit: number | null;
 remaining: number | null;
 } | null>(null);
 const [paywallHit, setPaywallHit] = useState(false);
 const messagesScrollRef = useRef<HTMLDivElement>(null);
 const messagesEndRef = useRef<HTMLDivElement>(null);
 const inputRef = useRef<HTMLTextAreaElement>(null);

 // Auto-scroll only the inner messages container; never scroll the page.
 // Use scrollTop so Next.js's window scroll context isn't triggered when
 // the chat is mounted inside a scrollable parent.
 const scrollToBottom = useCallback((smooth = true) => {
 const el = messagesScrollRef.current;
 if (!el) return;
 el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
 }, []);

 useEffect(() => {
 scrollToBottom();
 }, [messages, scrollToBottom]);

 // Load existing conversation from localStorage when the parent switches
 // to a different conversation. Skip when conversationId matches the one
 // we just created locally mid-stream — otherwise the in-flight assistant
 // placeholder + streamed tokens get wiped before the first reply renders.
 useEffect(() => {
 if (conversationId && conversationId === currentConvId) return;
 if (conversationId) {
 const conv = getConversation(conversationId);
 if (conv) {
 const loaded: Message[] = conv.messages.map((m) => ({
 id: m.id,
 role: m.role,
 content: m.content,
 citations: m.citations,
 timestamp: m.timestamp,
 }));
 setMessages(loaded);
 setCurrentConvId(conversationId);
 } else {
 setMessages([]);
 setCurrentConvId(null);
 }
 } else {
 setMessages([]);
 setCurrentConvId(null);
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [conversationId]);

 // Focus input on mount
 useEffect(() => {
 inputRef.current?.focus();
 }, []);

 // ─── Usage indicator ──────────────────────────────────────────────────────
 // Pulls remaining-message state from the API so we can show
 // "3 of 5 free messages this month" / "Subscribed (unlimited)".
 // Only runs for authenticated users — anonymous demo doesn't have a quota.

 const refreshUsage = useCallback(async () => {
 if (!accessToken) {
 setUsage(null);
 return;
 }
 try {
 const res = await fetch(`${API_BASE_URL}/ai/usage`, {
 headers: { Authorization: `Bearer ${accessToken}` },
 });
 if (!res.ok) {
 setUsage(null);
 return;
 }
 const data = await res.json();
 setUsage(data);
 } catch {
 setUsage(null);
 }
 }, [accessToken]);

 useEffect(() => {
 refreshUsage();
 }, [refreshUsage]);

 // ─── Send Message ─────────────────────────────────────────────────────────

 async function handleSend(overrideText?: string) {
 const trimmed = (overrideText || input).trim();
 if (!trimmed || isStreaming) return;

 const now = new Date();
 const timeStr = now.toLocaleTimeString([], {
 hour: '2-digit',
 minute: '2-digit',
 });

 // Create user message
 const userMsg: Message = {
 id: `user-${Date.now()}`,
 role: 'user',
 content: trimmed,
 timestamp: timeStr,
 };

 setMessages((prev) => [...prev, userMsg]);
 setInput('');
 setIsStreaming(true);

 // Persist user message to localStorage
 const storedUserMsg: StoredMessage = {
 id: userMsg.id,
 role: 'user',
 content: trimmed,
 timestamp: timeStr,
 };

 let convId = currentConvId;

 if (!convId) {
 // First message in a new conversation — create it
 const newConv = createConversation(storedUserMsg);
 convId = newConv.id;
 setCurrentConvId(convId);
 onConversationCreated?.(convId);
 } else {
 addMessage(convId, storedUserMsg);
 onConversationUpdated?.();
 }

 // Create placeholder for assistant response
 const assistantMsgId = `assistant-${Date.now()}`;
 const assistantMsg: Message = {
 id: assistantMsgId,
 role: 'assistant',
 content: '',
 timestamp: new Date().toLocaleTimeString([], {
 hour: '2-digit',
 minute: '2-digit',
 }),
 };
 setMessages((prev) => [...prev, assistantMsg]);

 try {
 const res = await fetch(`${API_BASE_URL}/ai/chat`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
 },
 body: JSON.stringify({
 message: trimmed,
 conversationId: convId,
 language,
 }),
 });

 if (res.status === 402) {
 // Paywall — quota exhausted. Replace the placeholder with an
 // upgrade prompt and bail out of the stream loop.
 const data = await res.json().catch(() => ({}));
 const upgradeContent =
 data.message ||
 'You have reached your free message limit. Upgrade to continue.';
 setMessages((prev) =>
 prev.map((m) =>
 m.id === assistantMsgId ? { ...m, content: upgradeContent } : m
 )
 );
 setPaywallHit(true);
 setIsStreaming(false);
 return;
 }

 if (!res.ok) {
 throw new Error(`HTTP ${res.status}`);
 }

 // Parse SSE stream
 const reader = res.body?.getReader();
 if (!reader) throw new Error('No response body');

 const decoder = new TextDecoder();
 let buffer = '';
 let fullContent = '';
 let citations: Citation[] = [];

 while (true) {
 const { done, value } = await reader.read();
 if (done) break;

 buffer += decoder.decode(value, { stream: true });
 const lines = buffer.split('\n');
 buffer = lines.pop() || '';

 for (const line of lines) {
 if (!line.startsWith('data: ')) continue;
 const jsonStr = line.substring(6).trim();
 if (!jsonStr) continue;

 try {
 const event = JSON.parse(jsonStr);

 if (event.type === 'text') {
 fullContent += event.content;
 setMessages((prev) =>
 prev.map((m) =>
 m.id === assistantMsgId
 ? { ...m, content: fullContent }
 : m
 )
 );
 } else if (event.type === 'metadata') {
 citations = event.citations || [];
 } else if (event.type === 'done') {
 const finalContent = event.fullContent || fullContent;
 setMessages((prev) =>
 prev.map((m) =>
 m.id === assistantMsgId
 ? { ...m, content: finalContent, citations }
 : m
 )
 );
 // Persist assistant message to localStorage
 if (convId) {
 const storedAssistantMsg: StoredMessage = {
 id: assistantMsgId,
 role: 'assistant',
 content: finalContent,
 citations: citations.length > 0 ? citations : undefined,
 timestamp: assistantMsg.timestamp,
 };
 addMessage(convId, storedAssistantMsg);
 onConversationUpdated?.();
 }
 } else if (event.type === 'error') {
 const errorContent =
 'I apologize, but I encountered an issue. Please try asking your question again.';
 setMessages((prev) =>
 prev.map((m) =>
 m.id === assistantMsgId
 ? { ...m, content: errorContent }
 : m
 )
 );
 if (convId) {
 const storedErrMsg: StoredMessage = {
 id: assistantMsgId,
 role: 'assistant',
 content: errorContent,
 timestamp: assistantMsg.timestamp,
 };
 addMessage(convId, storedErrMsg);
 onConversationUpdated?.();
 }
 }
 } catch {
 // Skip malformed JSON
 }
 }
 }

 // If stream ended without a 'done' event, persist what we have
 if (fullContent && convId) {
 const existingConv = getConversation(convId);
 const alreadySaved = existingConv?.messages.some((m) => m.id === assistantMsgId);
 if (!alreadySaved) {
 const storedAssistantMsg: StoredMessage = {
 id: assistantMsgId,
 role: 'assistant',
 content: fullContent,
 citations: citations.length > 0 ? citations : undefined,
 timestamp: assistantMsg.timestamp,
 };
 addMessage(convId, storedAssistantMsg);
 onConversationUpdated?.();
 }
 }
 } catch {
 // Network error or auth failure — use LOCAL demo responses
 const demoContent = getLocalDemoResponse(trimmed);

 // Simulate typing effect for local demo
 const words = demoContent.split(' ');
 let accumulated = '';
 for (let i = 0; i < words.length; i++) {
 accumulated += (i === 0 ? '' : ' ') + words[i];
 const snapshot = accumulated;
 setMessages((prev) =>
 prev.map((m) =>
 m.id === assistantMsgId ? { ...m, content: snapshot } : m
 )
 );
 // Small delay for typing effect
 await new Promise((resolve) => setTimeout(resolve, 12));
 }

 // Persist to localStorage
 if (convId) {
 const storedDemoMsg: StoredMessage = {
 id: assistantMsgId,
 role: 'assistant',
 content: demoContent,
 timestamp: assistantMsg.timestamp,
 };
 addMessage(convId, storedDemoMsg);
 onConversationUpdated?.();
 }
 } finally {
 setIsStreaming(false);
 inputRef.current?.focus();
 // Refresh quota counter so the indicator stays in sync after each turn.
 refreshUsage();
 }
 }

 // Handle Enter key (send on Enter, new line on Shift+Enter)
 function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
 if (e.key === 'Enter' && !e.shiftKey) {
 e.preventDefault();
 handleSend();
 }
 }

 // Auto-resize textarea
 function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
 setInput(e.target.value);
 e.target.style.height = 'auto';
 e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
 }

 // ─── Usage banner ────────────────────────────────────────────────────────
 // Compact strip above the messages with current plan + remaining count.
 // Promotes the upgrade page when the user has 2 or fewer free messages
 // left, or when the paywall just fired.

 const showUpgradeNudge =
 paywallHit ||
 (usage?.plan === 'free' && (usage.remaining ?? 0) <= 2) ||
 (usage?.plan === 'session' && (usage.remaining ?? 0) <= 5);

 const usageLabel = usage
 ? usage.plan === 'monthly'
 ? 'Subscribed — unlimited messages'
 : usage.plan === 'session'
 ? `Session pass — ${usage.remaining} of ${usage.limit} messages left`
 : usage.plan === 'free'
 ? `${usage.used} of ${usage.limit} free messages used this month`
 : null
 : null;

 return (
 <div className="flex flex-col h-full min-h-0">
 {/* Usage indicator */}
 {usageLabel && (
 <div
 className="px-4 py-2 flex items-center justify-between gap-3 text-xs"
 style={{
 background: showUpgradeNudge ? 'rgba(194,65,12,0.06)' : 'transparent',
 borderBottom: '1px solid var(--color-border, #e8dcc8)',
 color: 'var(--color-text, #3d2e1f)',
 }}
 >
 <span className="flex items-center gap-1.5 truncate">
 <Sparkles className="w-3.5 h-3.5 text-saffron-600 shrink-0" />
 {usageLabel}
 </span>
 {showUpgradeNudge && (
 <Link
 href="/upgrade"
 className={buttonClass('primary', 'md', 'shrink-0')}
 >
 Upgrade
 </Link>
 )}
 </div>
 )}

 {/* Messages area */}
 <div ref={messagesScrollRef} className="flex-1 overflow-y-auto px-4 py-6 overscroll-contain min-h-0">
 {messages.length === 0 ? (
 <EmptyState onQuestionClick={(q) => handleSend(q)} />
 ) : (
 <>
 {messages.map((msg, idx) => (
 <AiChatMessage
 key={msg.id}
 role={msg.role}
 content={msg.content}
 citations={msg.citations}
 timestamp={msg.timestamp}
 isStreaming={
 isStreaming &&
 msg.role === 'assistant' &&
 idx === messages.length - 1
 }
 />
 ))}
 <div ref={messagesEndRef} />
 </>
 )}
 </div>

 {/* Input area */}
 <div
 className="p-4"
 style={{
 background: 'var(--color-surface, #fff9f0)',
 borderTop: '1px solid var(--color-border, #e8dcc8)',
 }}
 >
 <div className="max-w-3xl mx-auto flex items-end gap-3">
 <div className="flex-1 relative">
 <textarea
 ref={inputRef}
 value={input}
 onChange={handleInputChange}
 onKeyDown={handleKeyDown}
 placeholder="Ask Pandit Ji a question..."
 rows={1}
 disabled={isStreaming}
 className="w-full resize-none rounded-xl border px-4 py-3 pr-12 text-sm placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-saffron-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
 style={{
 maxHeight: '120px',
 borderColor: 'var(--color-border, #e8dcc8)',
 color: 'var(--color-text, #3d2e1f)',
 background: '#fff',
 }}
 />
 </div>
 <button
 onClick={() => handleSend()}
 disabled={!input.trim() || isStreaming}
 className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
 style={{ background: 'var(--color-primary, #c2410c)' }}
 title="Send message"
 >
 {isStreaming ? (
 <Loader2 className="w-5 h-5 animate-spin" />
 ) : (
 <Send className="w-5 h-5" />
 )}
 </button>
 </div>
 <p className="text-center text-xs text-surface-400 mt-2">
 Pandit Ji provides spiritual guidance based on Hindu scriptures. For
 medical, legal, or financial advice, please consult qualified
 professionals.
 </p>
 </div>
 </div>
 );
}

// ─── Empty State with Suggested Questions ─────────────────────────────────────

function EmptyState({
 onQuestionClick,
}: {
 onQuestionClick: (question: string) => void;
}) {
 const suggestions = [
 {
 text: 'What does the Gita say about duty?',
 emoji: '',
 },
 {
 text: 'Which mantra for peace of mind?',
 emoji: '',
 },
 {
 text: 'Explain the concept of dharma',
 emoji: '️',
 },
 {
 text: 'What puja should I do for career success?',
 emoji: '',
 },
 {
 text: 'How to deal with grief and loss?',
 emoji: '️',
 },
 {
 text: 'Marriage guidance from scriptures',
 emoji: '',
 },
 {
 text: 'Daily worship routine at home',
 emoji: '',
 },
 {
 text: 'Which gemstone should I wear?',
 emoji: '',
 },
 ];

 return (
 <div className="flex flex-col items-center justify-center h-full text-center px-4">
 {/* Om symbol */}
 <div className="w-20 h-20 gradient-saffron rounded-full flex items-center justify-center mb-6 shadow-lg animate-float">
 <span className="text-4xl text-white font-bold font-devanagari font-[family-name:var(--font-noto-devanagari)]">
 {'ॐ'}
 </span>
 </div>

 <h2 className="text-2xl font-bold text-surface-800 mb-2">
 Ask a Pandit
 </h2>
 <p className="text-surface-500 mb-8 max-w-md">
 Get spiritual guidance rooted in Hindu scriptures. Ask about the Bhagavad
 Gita, mantras, pujas, dharma, or any spiritual question.
 </p>

 {/* Suggested questions */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
 {suggestions.map((s) => (
 <button
 key={s.text}
 onClick={() => onQuestionClick(s.text)}
 className="flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm transition-all shadow-sm"
 style={{
 background: '#fff',
 border: '1px solid var(--color-border, #e8dcc8)',
 color: 'var(--color-text, #3d2e1f)',
 }}
 onMouseEnter={(e) => {
 e.currentTarget.style.borderColor = 'var(--color-primary, #c2410c)';
 e.currentTarget.style.background = 'var(--color-bg, #fffbf5)';
 e.currentTarget.style.transform = 'translateY(-2px)';
 e.currentTarget.style.boxShadow = '0 4px 12px rgba(194,65,12,0.1)';
 }}
 onMouseLeave={(e) => {
 e.currentTarget.style.borderColor = 'var(--color-border, #e8dcc8)';
 e.currentTarget.style.background = '#fff';
 e.currentTarget.style.transform = 'translateY(0)';
 e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
 }}
 >
 <span className="text-lg shrink-0">{s.emoji}</span>
 <span>{s.text}</span>
 </button>
 ))}
 </div>
 </div>
 );
}
