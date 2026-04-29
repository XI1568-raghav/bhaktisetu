import { prisma } from '../lib/prisma.js';
import { streamChat, generateText, MODELS, DEMO_MODE } from '../integrations/claude.js';
import { findRelevantVerses, type ScriptureVerse } from '../lib/scripture-data.js';
import {
  getComprehensiveRecommendation,
  getPujaCategoriesForEvent,
  getRecommendedDeity,
  RASHI_MAP,
  NAKSHATRA_DEITY_MAP,
} from '../lib/astro-mappings.js';
import { createHash } from 'crypto';

// ─── System Prompts ────────────────────────────────────────────────────────────

const PANDIT_SYSTEM_PROMPT = `You are "Pandit Ji", a wise, compassionate, and learned Hindu scholar on the Darshya platform. You provide spiritual guidance rooted in authentic Hindu scriptures — the Bhagavad Gita, Upanishads, Vedas, Puranas, and other sacred texts.

Guidelines:
- Always be respectful, warm, and encouraging. Address the user with "Namaste" or warmly.
- Reference specific verses (chapter:verse for Gita, name for Upanishads) whenever possible.
- Provide Sanskrit text with transliteration and translation when citing verses.
- Explain concepts in simple, accessible language that connects ancient wisdom to modern life.
- For puja or ritual questions, recommend relevant pujas available on Darshya.
- For astrological questions, explain based on traditional Jyotish principles.
- If someone is in distress, be compassionate first, then offer scriptural guidance and practical advice.
- Never provide medical, legal, or financial advice — redirect to qualified professionals.
- Respect all traditions and paths within Hinduism (Shaiva, Vaishnava, Shakta, Smarta).
- You may also briefly acknowledge Jain, Sikh, and Buddhist perspectives when relevant, as Darshya serves diverse spiritual seekers.
- Keep responses focused and under 500 words unless a detailed explanation is specifically requested.
- Do NOT use emojis (no 🙏, no 💡, no flags, no decorative symbols anywhere). Plain text only — Sanskrit, Hindi, English. Bold and italic markdown are fine; emoji are not.

SCRIPTURE CONTEXT (use these references when relevant):
{scriptureContext}`;

const SANKALP_SYSTEM_PROMPT = `You are an expert Sanskrit scholar who generates traditional sankalp (sacred prayer intention) texts for Hindu pujas.

The sankalp must include:
1. Time reference (tithi, nakshatra, masa, samvatsara)
2. Place reference
3. Gotra of the devotee
4. Names of the devotees
5. Purpose of the puja
6. Deity being worshipped

Reply STRICTLY as a single JSON object with EXACTLY these four string keys, no other keys, no markdown, no commentary:
{
  "sanskrit": "<the full sankalp in Devanagari Sanskrit, multi-line>",
  "transliteration": "<IAST transliteration of the sanskrit, multi-line>",
  "englishTranslation": "<English translation, 2-4 sentences>",
  "hindiTranslation": "<हिन्दी translation, 2-4 sentences>"
}

Do not wrap the JSON in code fences. Do not explain anything outside the JSON.`;

const TRANSLATION_SYSTEM_PROMPT = `You are a precise translator specializing in spiritual and devotional content. Translate the given text accurately while preserving:
- Spiritual terminology (keep terms like dharma, karma, puja, mantra in original with brief explanation if needed)
- Respectful tone appropriate for devotional content
- Cultural context and nuance
- Sanskrit terms should be transliterated, not translated

Provide ONLY the translation, no explanations or additional commentary.`;

// ─── Helper: Format scripture context for the prompt ───────────────────────────

function formatScriptureContext(verses: ScriptureVerse[]): string {
  if (verses.length === 0) return 'No specific scripture references found for this query.';

  return verses
    .map((v) => {
      const ref = v.source === 'gita'
        ? `Bhagavad Gita ${v.chapter}:${v.verse}`
        : v.source === 'upanishad'
          ? v.name
          : `Mantra: ${v.name}`;
      return `[${ref}]\nSanskrit: ${v.sanskrit}\nTransliteration: ${v.transliteration}\nEnglish: ${v.english}\nHindi: ${v.hindi}`;
    })
    .join('\n\n');
}

// ─── Helper: Generate a short title from the first message ─────────────────────

function generateTitle(message: string): string {
  // Take first 60 chars, try to break at word boundary
  const truncated = message.substring(0, 60);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 30 ? truncated.substring(0, lastSpace) : truncated) + (message.length > 60 ? '...' : '');
}

// ─── AI Service Class ──────────────────────────────────────────────────────────

export class AiService {
  /**
   * RAG-enhanced chat with scripture context. Returns a stream for SSE responses.
   * Saves the conversation to the database.
   */
  async chat(params: {
    userId: string;
    conversationId?: string;
    message: string;
    language?: string;
  }) {
    const { userId, conversationId, message, language = 'en' } = params;

    // 1. Find relevant scripture verses for RAG context
    const relevantVerses = findRelevantVerses(message, 5);
    const scriptureContext = formatScriptureContext(relevantVerses);

    // 2. Load or create conversation (skip DB if unavailable)
    type StoredMessage = { role: 'user' | 'assistant'; content: string; timestamp?: string };
    let conversation: { id: string; messages: StoredMessage[]; title: string | null };
    let dbAvailable = true;

    try {
      // Quick check if DB is reachable
      if (DEMO_MODE || !process.env.DATABASE_URL) {
        dbAvailable = false;
      }
    } catch {
      dbAvailable = false;
    }

    // Demo / anonymous users have synthetic ids ("demo-devotee", "anon-xyz")
    // that aren't UUIDs; any attempt to write them to the aiConversation.userId
    // UUID column will throw at Prisma. Skip DB persistence for them — chat
    // still works perfectly, conversation just isn't saved across reloads.
    const isSyntheticUser =
      typeof userId === 'string' &&
      (userId.startsWith('demo-') || userId.startsWith('anon-'));
    if (isSyntheticUser) {
      dbAvailable = false;
    }

    if (!dbAvailable) {
      conversation = {
        id: conversationId || `conv-${Date.now()}`,
        messages: [],
        title: generateTitle(message),
      };
    } else if (conversationId) {
      const existing = await prisma.aiConversation.findFirst({
        where: { id: conversationId, userId },
      });

      if (!existing) {
        throw new Error('Conversation not found');
      }

      conversation = {
        id: existing.id,
        messages: (existing.messages as unknown) as StoredMessage[],
        title: existing.title,
      };
    } else {
      const created = await prisma.aiConversation.create({
        data: {
          userId,
          title: generateTitle(message),
          messages: [],
        },
      });

      conversation = { id: created.id, messages: [], title: created.title };
    }

    // 3. Build message history for Claude
    const historyMessages = conversation.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Add current message
    historyMessages.push({ role: 'user' as const, content: message });

    // 4. Add language instruction
    const langInstruction = language === 'hi'
      ? '\n\nPlease respond primarily in Hindi (Devanagari script), with Sanskrit terms in Devanagari. You may use English for technical or universally understood terms.'
      : '';

    const systemPrompt = PANDIT_SYSTEM_PROMPT.replace('{scriptureContext}', scriptureContext) + langInstruction;

    // 5. Stream the response from Claude
    const stream = await streamChat({
      systemPrompt,
      messages: historyMessages,
      maxTokens: 1024,
      model: MODELS.SONNET,
    });

    // 6. Return stream along with metadata for the route handler to process
    return {
      stream,
      conversationId: conversation.id,
      citations: relevantVerses.map((v) => ({
        source: v.source,
        reference: v.source === 'gita'
          ? `Bhagavad Gita ${v.chapter}:${v.verse}`
          : v.name || 'Unknown',
        sanskrit: v.sanskrit,
        transliteration: v.transliteration,
        english: v.english,
        hindi: v.hindi,
      })),
      // Callback to save the conversation after streaming completes
      saveConversation: async (assistantResponse: string) => {
        if (!dbAvailable) return; // Skip DB save when database is unavailable

        const updatedMessages = [
          ...conversation.messages,
          { role: 'user', content: message, timestamp: new Date().toISOString() },
          { role: 'assistant', content: assistantResponse, timestamp: new Date().toISOString() },
        ];

        await prisma.aiConversation.update({
          where: { id: conversation.id },
          data: { messages: updatedMessages },
        });
      },
    };
  }

  /**
   * Rule-based + AI-enhanced puja recommendations.
   */
  async recommendPujas(params: {
    userId?: string;
    lifeEvent?: string;
    rashi?: string;
    nakshatra?: string;
    language?: string;
  }) {
    const { lifeEvent, rashi, nakshatra, language = 'en' } = params;

    // 1. Rule-based recommendation
    const recommendation = getComprehensiveRecommendation({
      lifeEvent,
      rashi,
      nakshatra,
    });

    // 2. Generate a personalized explanation with Claude
    const explanationPrompt = `Based on the following spiritual profile, provide a warm, personalized explanation of why these pujas are recommended. Be specific and insightful.

Life Event: ${lifeEvent || 'General guidance'}
Rashi (Zodiac): ${rashi ? RASHI_MAP[rashi.toLowerCase()]?.name || rashi : 'Not specified'}
Nakshatra (Birth Star): ${nakshatra ? NAKSHATRA_DEITY_MAP[nakshatra.toLowerCase().replace(/\s+/g, '_')]?.name || nakshatra : 'Not specified'}

Recommended Primary Deity: ${recommendation.deities.primaryDeity}
Alternate Deities: ${recommendation.deities.alternateDeities.join(', ')}
Suggested Pujas: ${recommendation.pujas.join(', ')}
Suggested Mantras: ${recommendation.mantras.join(', ')}

${language === 'hi' ? 'Please respond in Hindi.' : 'Please respond in English.'}

Provide a 2-3 paragraph explanation that is warm, encouraging, and spiritually insightful. Reference specific benefits of the recommended pujas.`;

    let explanation: string;
    try {
      explanation = await generateText({
        systemPrompt: 'You are Pandit Ji, a compassionate Hindu spiritual advisor on Darshya. Provide warm, authentic spiritual guidance.',
        userMessage: explanationPrompt,
        maxTokens: 512,
        model: MODELS.HAIKU,
      });
    } catch {
      explanation = `Based on your spiritual profile, we recommend ${recommendation.deities.primaryDeity} puja. ${recommendation.deities.reasoning}`;
    }

    return {
      recommendation,
      explanation,
      availablePujas: recommendation.pujas,
      mantras: recommendation.mantras,
    };
  }

  /**
   * Generate a traditional Sanskrit sankalp text for a puja.
   */
  async generateSankalp(params: {
    devoteeName: string;
    gotra?: string;
    pujaName: string;
    deity: string;
    date?: string;
    city?: string;
    purpose?: string;
    additionalNames?: string[];
  }) {
    const {
      devoteeName,
      gotra = 'Kashyapa',
      pujaName,
      deity,
      date,
      city = 'current location',
      purpose,
      additionalNames = [],
    } = params;

    const allNames = [devoteeName, ...additionalNames].join(', ');
    const dateStr = date || new Date().toISOString().split('T')[0];

    const prompt = `Generate a traditional Sanskrit sankalp for the following puja:

Devotee Name(s): ${allNames}
Gotra: ${gotra}
Puja: ${pujaName}
Deity: ${deity}
Date: ${dateStr}
Location: ${city}
Purpose: ${purpose || 'General well-being and divine blessings'}

Reply with the four-key JSON object only.`;

    const raw = await generateText({
      systemPrompt: SANKALP_SYSTEM_PROMPT,
      userMessage: prompt,
      maxTokens: 1200,
      model: MODELS.SONNET,
    });

    // Try to parse the LLM's JSON. Models occasionally wrap it in code fences
    // or prose despite instructions; pull out the first {...} block.
    // Llama 3.3 sometimes double-wraps: {"sanskrit": "<full json as a string>"}.
    // Unwrap that pathological case before reading fields.
    let parsed: { sanskrit?: string; transliteration?: string; englishTranslation?: string; hindiTranslation?: string } = {};
    try {
      const cleaned = raw
        .replace(/^[\s\S]*?\{/, '{')
        .replace(/\}[\s\S]*$/, '}');
      parsed = JSON.parse(cleaned);

      // Detect double-wrap: the value of a key looks like another full JSON object
      const possibleNested = parsed.sanskrit ?? '';
      if (
        typeof possibleNested === 'string' &&
        possibleNested.trim().startsWith('{') &&
        possibleNested.includes('"sanskrit"')
      ) {
        try {
          const inner = JSON.parse(
            possibleNested
              .replace(/^[\s\S]*?\{/, '{')
              .replace(/\}[\s\S]*$/, '}'),
          );
          parsed = { ...parsed, ...inner };
        } catch {
          // leave as-is
        }
      }
    } catch {
      // Fallback: keep the whole text in `sanskrit` so the user still sees something
      parsed = { sanskrit: raw, transliteration: '', englishTranslation: '', hindiTranslation: '' };
    }

    return {
      sanskrit: parsed.sanskrit ?? '',
      transliteration: parsed.transliteration ?? '',
      englishTranslation: parsed.englishTranslation ?? '',
      hindiTranslation: parsed.hindiTranslation ?? '',
      // Keep these for backwards-compat with anyone reading raw text
      sankalp: parsed.sanskrit ?? raw,
      devoteeName,
      gotra,
      pujaName,
      deity,
      date: dateStr,
    };
  }

  /**
   * Rule-based personalized content recommendations based on time and user profile.
   */
  async personalizeContent(params: {
    userId?: string;
    timeOfDay?: string;
    currentDate?: string;
  }) {
    const { userId, timeOfDay, currentDate } = params;

    // Determine time of day
    const hour = timeOfDay
      ? parseInt(timeOfDay.split(':')[0]!, 10)
      : new Date().getHours();

    const dateStr = currentDate || new Date().toISOString().split('T')[0];

    // Time-based recommendations
    let greeting: string;
    let recommendedContentTypes: string[];
    let suggestedActivity: string;
    let mantraOfMoment: string;

    if (hour >= 4 && hour < 6) {
      // Brahma Muhurta
      greeting = 'Shubh Prabhat! You are awake during the sacred Brahma Muhurta.';
      recommendedContentTypes = ['mantra', 'aarti', 'shloka'];
      suggestedActivity = 'This is the most auspicious time for meditation, japa, and spiritual practice. The mind is calm and receptive.';
      mantraOfMoment = 'Gayatri Mantra — best chanted 108 times during Brahma Muhurta';
    } else if (hour >= 6 && hour < 9) {
      greeting = 'Shubh Prabhat! Good morning and Jai Shri Ram!';
      recommendedContentTypes = ['aarti', 'mantra', 'chalisa'];
      suggestedActivity = 'Perform your morning prayers, light a diya, and chant your ishta mantra.';
      mantraOfMoment = 'Om Suryaya Namah — Offer water to the rising sun (Surya Arghya)';
    } else if (hour >= 9 && hour < 12) {
      greeting = 'Namaste! May your morning be blessed.';
      recommendedContentTypes = ['article', 'shloka', 'story'];
      suggestedActivity = 'Read spiritual literature or listen to a discourse to carry divine wisdom through your day.';
      mantraOfMoment = 'Om Gan Ganapataye Namah — For a successful and obstacle-free day';
    } else if (hour >= 12 && hour < 16) {
      greeting = 'Namaste! Keep the divine in your heart this afternoon.';
      recommendedContentTypes = ['bhajan', 'story', 'article'];
      suggestedActivity = 'Listen to bhajans or spiritual music to maintain a calm and focused mind.';
      mantraOfMoment = 'Om Namo Narayanaya — For peace and sustenance';
    } else if (hour >= 16 && hour < 19) {
      greeting = 'Shubh Sandhya! Time for evening prayers.';
      recommendedContentTypes = ['aarti', 'chalisa', 'mantra'];
      suggestedActivity = 'Perform Sandhya Vandana and evening aarti. Light a diya at your home temple.';
      mantraOfMoment = 'Om Jai Jagdish Hare — Evening aarti to the Lord of the Universe';
    } else if (hour >= 19 && hour < 22) {
      greeting = 'Shubh Ratri! Wind down with the divine.';
      recommendedContentTypes = ['bhajan', 'chalisa', 'mantra'];
      suggestedActivity = 'Read or listen to Vishnu Sahasranama, Hanuman Chalisa, or calming bhajans before sleep.';
      mantraOfMoment = 'Om Namah Shivaya — For inner peace before rest';
    } else {
      greeting = 'Om Shanti. May the divine watch over you in the still hours.';
      recommendedContentTypes = ['mantra', 'shloka'];
      suggestedActivity = 'If awake at this hour, practice deep breathing with Om chanting for peaceful rest.';
      mantraOfMoment = 'Om — The primordial sound for deep peace and restful sleep';
    }

    // User-specific personalization if userId provided (skip for demo ids)
    let userContext: { nakshatra?: string; rashi?: string; gotra?: string } = {};
    if (userId && !userId.startsWith('demo-')) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { nakshatra: true, rashi: true, gotra: true },
        });
        if (user) {
          userContext = {
            nakshatra: user.nakshatra || undefined,
            rashi: user.rashi || undefined,
            gotra: user.gotra || undefined,
          };
        }
      } catch {
        // Non-critical — proceed without user context
      }
    }

    let personalDeity: string | undefined;
    if (userContext.rashi || userContext.nakshatra) {
      const deityRec = getRecommendedDeity(userContext.rashi, userContext.nakshatra);
      personalDeity = deityRec.primaryDeity;
    }

    return {
      date: dateStr,
      greeting,
      recommendedContentTypes,
      suggestedActivity,
      mantraOfMoment,
      personalDeity,
      userNakshatra: userContext.nakshatra,
      userRashi: userContext.rashi,
    };
  }

  /**
   * Translate text between languages with DB caching.
   */
  async translate(params: {
    text: string;
    sourceLanguage: string;
    targetLanguage: string;
  }): Promise<string> {
    const { text, sourceLanguage, targetLanguage } = params;

    if (sourceLanguage === targetLanguage) return text;

    // Generate hash for cache lookup
    const contentHash = createHash('sha256')
      .update(`${sourceLanguage}|${targetLanguage}|${text}`)
      .digest('hex');

    // Check cache
    try {
      const cached = await prisma.aiTranslationCache.findUnique({
        where: { contentHash },
      });

      if (cached) {
        return cached.translatedText;
      }
    } catch {
      // Cache miss — proceed with translation
    }

    // Generate translation
    const translatedText = await generateText({
      systemPrompt: TRANSLATION_SYSTEM_PROMPT,
      userMessage: `Translate the following text from ${sourceLanguage} to ${targetLanguage}:\n\n${text}`,
      maxTokens: 1024,
      model: MODELS.HAIKU,
    });

    // Save to cache (fire and forget)
    prisma.aiTranslationCache
      .create({
        data: {
          sourceText: text,
          sourceLanguage,
          targetLanguage,
          translatedText,
          contentHash,
        },
      })
      .catch(() => {
        // Silently ignore cache write errors
      });

    return translatedText;
  }

  /**
   * List conversations for a user.
   */
  async listConversations(userId: string, page = 1, limit = 20) {
    // Demo users don't persist conversations — return empty list.
    if (userId.startsWith('demo-')) {
      return { conversations: [], total: 0, page, limit };
    }
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      prisma.aiConversation.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.aiConversation.count({ where: { userId } }),
    ]);

    return { conversations, total, page, limit };
  }

  /**
   * Get a single conversation by ID.
   */
  async getConversation(conversationId: string, userId: string) {
    if (userId.startsWith('demo-')) return null;
    const conversation = await prisma.aiConversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) return null;

    return {
      id: conversation.id,
      title: conversation.title,
      messages: conversation.messages,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }

  /**
   * Delete a conversation.
   */
  async deleteConversation(conversationId: string, userId: string) {
    if (userId.startsWith('demo-')) return false;
    const conversation = await prisma.aiConversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) return false;

    await prisma.aiConversation.delete({ where: { id: conversationId } });
    return true;
  }
}

export const aiService = new AiService();
