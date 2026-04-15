import Anthropic from '@anthropic-ai/sdk';

const DEMO_MODE = !process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'demo-key';

const anthropic = DEMO_MODE
  ? (null as unknown as Anthropic)
  : new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const MODELS = {
  SONNET: 'claude-sonnet-4-20250514',
  HAIKU: 'claude-haiku-4-5-20251001',
} as const;

// ─── Demo-mode static responses ────────────────────────────────────────────────

const DEMO_RESPONSES: Record<string, string> = {
  duty: `According to the Bhagavad Gita, duty (Dharma) is one of the most central teachings. In Chapter 2, Verse 47, Lord Krishna tells Arjuna:

**"कर्मण्येवाधिकारस्ते मा फलेषु कदाचन"**
*"You have the right to perform your duty, but you are not entitled to the fruits of your actions."*

This verse teaches us that we should focus on doing our best work without being attached to the outcome. When we act selflessly, guided by our dharma, we find inner peace and fulfillment.

**Key teachings on duty from the Gita:**
- Chapter 3, Verse 8: Perform your prescribed duty, for action is better than inaction.
- Chapter 18, Verse 47: It is better to perform one's own dharma imperfectly than another's dharma perfectly.
- Chapter 2, Verse 31: Considering your dharma as a Kshatriya, you should not waver.

The Gita teaches that every person has a unique role (svadharma) and fulfilling it with dedication and detachment is the path to spiritual growth.`,

  peace: `For peace of mind, the ancient scriptures recommend several powerful mantras:

**1. Om Shanti Mantra (Most Popular)**
*"ॐ शान्तिः शान्तिः शान्तिः"*
"Om Shantih Shantih Shantih" — The threefold peace invocation addressing disturbances from the divine, the environment, and the self.

**2. Gayatri Mantra**
*"ॐ भूर्भुवः स्वः तत्सवितुर्वरेण्यं भर्गो देवस्य धीमहि धियो यो नः प्रचोदयात्"*
This mantra illuminates the mind and brings clarity and peace.

**3. Mahamrityunjaya Mantra**
*"ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम्"*
This powerful Shiva mantra removes fear and anxiety, bringing deep peace.

**Regular practice tip:** Chant any of these mantras 108 times using a mala (prayer beads) during Brahma Muhurta (4:00-6:00 AM) for maximum benefit.`,

  dharma: `**Dharma** is one of the most profound concepts in Hindu philosophy. It encompasses:

**1. Universal Dharma (Sanatana Dharma)**
The eternal cosmic order that sustains the universe — truthfulness, non-violence, purity, self-control, and compassion.

**2. Personal Dharma (Svadharma)**
Your unique purpose based on your nature (svabhava), stage of life (ashrama), and responsibilities.

**3. Contextual Dharma (Yuga Dharma)**
Duties appropriate to the time and circumstance.

The Bhagavad Gita (Chapter 18, Verse 66) ultimately transcends all categories:
*"सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज"*
"Abandon all varieties of dharma and surrender unto Me alone."

The Mahabharata defines dharma beautifully:
*"धारणाद्धर्ममित्याहुः धर्मो धारयते प्रजाः"*
"That which sustains and holds together is dharma."

In practice, dharma means doing what is right, fulfilling your responsibilities, and living with integrity and compassion toward all beings.`,

  career: `For career success, Hindu tradition recommends several pujas and practices:

**Recommended Pujas:**
1. **Ganesha Puja** — Lord Ganesha is the remover of obstacles. Perform this before starting any new venture or facing challenges at work.

2. **Saraswati Puja** — For wisdom, knowledge, and skill enhancement. Especially beneficial for those in education, creative fields, or seeking promotions.

3. **Lakshmi Puja** — For financial prosperity and business growth. Best performed on Fridays or during Diwali.

4. **Navagraha Puja** — To mitigate negative planetary influences affecting your career. Recommended if you're going through a difficult planetary period (dasha).

5. **Vishnu Sahasranama** — Chanting the 1000 names of Lord Vishnu brings stability, protection, and sustained success.

**Daily Practices:**
- Chant the **Gayatri Mantra** 108 times at sunrise for clarity of mind
- Light a diya (lamp) at your workplace or home office
- Offer prayers to your Ishta Devta (chosen deity) before starting work

Visit our Pujas section to book any of these with verified priests at renowned temples across India.`,
};

function getDemoResponse(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('duty') || lower.includes('karma') || lower.includes('karm')) {
    return DEMO_RESPONSES.duty!;
  }
  if (lower.includes('peace') || lower.includes('shanti') || lower.includes('mantra') || lower.includes('calm') || lower.includes('anxiety')) {
    return DEMO_RESPONSES.peace!;
  }
  if (lower.includes('dharma') || lower.includes('righteousness') || lower.includes('purpose')) {
    return DEMO_RESPONSES.dharma!;
  }
  if (lower.includes('career') || lower.includes('job') || lower.includes('success') || lower.includes('business') || lower.includes('puja')) {
    return DEMO_RESPONSES.career!;
  }

  // Default spiritual response
  return `Namaste! Thank you for your question about "${message.substring(0, 60)}..."

The Bhagavad Gita teaches us in Chapter 4, Verse 7-8:
*"यदा यदा हि धर्मस्य ग्लानिर्भवति भारत"*
"Whenever there is a decline of dharma and rise of adharma, I manifest Myself."

This reminds us that divine guidance is always available to those who seek it sincerely.

**Some guidance based on your question:**
- Turn to prayer and meditation for clarity
- Study the scriptures (Gita, Upanishads, Ramayana) for wisdom
- Consult with a learned pandit or guru for personalized guidance
- Practice selfless service (seva) to purify the heart

You can explore our **Content** section for mantras, aartis, and spiritual articles, or **Book a Puja** with a verified priest for specific spiritual needs.

*"श्रद्धावान् लभते ज्ञानम्"* — "One who has faith attains wisdom." (Gita 4.39)`;
}

// ─── Streaming Chat ────────────────────────────────────────────────────────────

export async function streamChat(params: {
  systemPrompt: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  maxTokens?: number;
  model?: string;
}) {
  const { systemPrompt, messages, maxTokens = 1024, model = MODELS.SONNET } = params;

  if (DEMO_MODE) {
    // Return a mock async iterator for demo mode
    const lastUserMsg = messages.filter((m) => m.role === 'user').pop();
    const response = getDemoResponse(lastUserMsg?.content || '');
    return {
      async *[Symbol.asyncIterator]() {
        // Simulate streaming by yielding word chunks
        const words = response.split(' ');
        for (let i = 0; i < words.length; i++) {
          const chunk = (i === 0 ? '' : ' ') + words[i];
          yield {
            type: 'content_block_delta' as const,
            delta: { type: 'text_delta' as const, text: chunk },
          };
          // Small delay simulated in the route handler, not here
        }
        yield {
          type: 'message_stop' as const,
          delta: undefined,
        };
      },
    };
  }

  // Real Anthropic streaming
  const stream = anthropic.messages.stream({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  return stream;
}

// ─── Single-shot Text Generation ───────────────────────────────────────────────

export async function generateText(params: {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  model?: string;
}): Promise<string> {
  const { systemPrompt, userMessage, maxTokens = 1024, model = MODELS.HAIKU } = params;

  if (DEMO_MODE) {
    return getDemoResponse(userMessage);
  }

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  // Extract text from the response
  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock && textBlock.type === 'text' ? textBlock.text : '';
}

export { DEMO_MODE };
