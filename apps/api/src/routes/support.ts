import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { generateText, DEMO_MODE } from '../integrations/claude.js';

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .max(20)
    .optional()
    .default([]),
});

// ─── Support AI System Prompt ──────────────────────────────────────────────────
const SUPPORT_SYSTEM_PROMPT = `You are Asha, Poojly's AI customer support assistant. Poojly is India's devotional super-app for live temple darshan, puja booking, spiritual content, astrology, wellness, pilgrimage planning, and more.

## Your role
- Answer user queries about Poojly features, bookings, refunds, account issues
- Be warm, concise (under 120 words per reply), use "Namaste" when greeting
- When you CAN help, give a direct answer with next steps (e.g. link to /pujas, /yatra)
- When you CAN'T help (complex refunds >₹5000, account deletion, disputes, legal, medical, bugs, payment failures needing investigation) → explicitly set escalate=true

## Platform knowledge
**Features:** Temples (200+), Pujas (home + temple), Live Darshan (HD streams), AI Pandit (Gita Q&A), Astrology (kundli/horoscope), Wellness (yoga/meditation/vipassana), Store, Gaushala (cow adoption), Panchang, Dharmic Yatra (Char Dham, 12 Jyotirlingas with verified companions).

**Booking:** Pujas bookable via /pujas. Home pujas at /pujas/home-puja. Marriage at /pujas/marriage. Yatra at /yatra. All pandits Aadhaar-verified.

**Pricing:** Pujas from ₹501, Home pujas from ₹1,100, Marriage from ₹11,000, Yatra from ₹15,000, Wellness from ₹299, Store free delivery above ₹499, Astrology from ₹15/min.

**Cancellation:** Free up to 24 hrs before scheduled time. Refunds in 3-5 business days.

**Payments:** Razorpay (domestic INR), Stripe (NRI/international USD). NRI users pay ~9-10x for pujas (supports temple priests).

**Video proof:** Every puja booking gets video proof from the priest before payout.

## Response format
Respond with ONLY valid JSON:
{
  "message": "your helpful reply (under 120 words)",
  "confidence": "high|medium|low",
  "escalate": false,
  "suggestedActions": [{"label": "Browse Pujas", "href": "/pujas"}]
}

## Escalation rules
Set escalate=true when:
- Refund > ₹5000 or refund was denied/delayed >10 days
- Account locked, suspicious activity, data deletion requests
- Payment succeeded but booking didn't appear after 1 hour
- Priest no-show or serious service complaint
- Legal, medical, financial advice requested
- User explicitly asks for "human", "agent", "real person", "supervisor"
- You're genuinely unsure — better to escalate than guess

Set escalate=false for routine questions with clear answers.

## Style
- 1-3 short sentences + 0-2 suggestedActions max
- Never invent features. If something isn't on Poojly, say so and escalate.
- No markdown, no bold, no bullet lists. Plain friendly text.`;

// ─── Fallback knowledge base (used when AI unavailable) ───────────────────────
const FALLBACK_RESPONSES: Array<{ keywords: string[]; message: string; actions?: Array<{ label: string; href: string }>; escalate?: boolean }> = [
  {
    keywords: ['book puja', 'book a puja', 'puja booking'],
    message: 'You can book any puja in 3 steps: pick a temple, choose the ritual, and pay. All pandits are Aadhaar-verified and you get video proof after completion.',
    actions: [{ label: 'Browse Pujas', href: '/pujas' }, { label: 'Home Puja', href: '/pujas/home-puja' }],
  },
  {
    keywords: ['home puja', 'pandit at home', 'home visit'],
    message: 'We offer Griha Pravesh, Satyanarayan, Ganesh, Lakshmi, Rudrabhishek and more. Pandits bring all samagri and arrive on time.',
    actions: [{ label: 'Book Home Puja', href: '/pujas/home-puja' }],
  },
  {
    keywords: ['marriage', 'wedding', 'vivah'],
    message: 'Wedding packages start at ₹11,000. Vedic, Arya Samaj, South Indian, Punjabi/Sikh blended ceremonies all supported.',
    actions: [{ label: 'Book Wedding', href: '/pujas/marriage' }],
  },
  {
    keywords: ['yatra', 'pilgrimage', 'char dham', 'jyotirlinga'],
    message: 'Our Dharmic Yatra covers 9 pilgrimages with 3 package tiers plus verified travel companions for elderly devotees.',
    actions: [{ label: 'Explore Yatra', href: '/yatra' }, { label: 'Travel Companion', href: '/yatra/companion' }],
  },
  {
    keywords: ['darshan', 'live stream', 'buffering'],
    message: 'HD darshan streams are available 24/7 from 200+ temples. For buffering, try switching to a lower quality in the player or check your connection.',
    actions: [{ label: 'Watch Live', href: '/darshan' }],
  },
  {
    keywords: ['astrology', 'kundli', 'horoscope'],
    message: 'Free kundli generation, daily horoscope for 12 rashis, or consult verified astrologers from ₹15/min.',
    actions: [{ label: 'Astrology', href: '/astrology' }],
  },
  {
    keywords: ['refund', 'cancel', 'cancellation'],
    message: 'Cancellation is free up to 24 hours before scheduled time. Refunds reach your account in 3-5 business days.',
    actions: [{ label: 'My Bookings', href: '/bookings' }],
    escalate: true,
  },
  {
    keywords: ['payment', 'failed', 'razorpay', 'card declined'],
    message: 'If payment was deducted but booking didn\'t appear, we\'ll investigate immediately. Please share your transaction ID.',
    escalate: true,
  },
  {
    keywords: ['human', 'agent', 'real person', 'supervisor', 'manager'],
    message: 'Sure! I\'m connecting you with a human support agent. They\'ll reply in under 4 hours.',
    escalate: true,
  },
  {
    keywords: ['wellness', 'yoga', 'meditation', 'vipassana'],
    message: 'Book certified instructors for Yoga, Meditation, or 10-day Vipassana retreats. Sessions start at ₹299.',
    actions: [{ label: 'Wellness', href: '/wellness' }],
  },
  {
    keywords: ['store', 'order', 'shipping'],
    message: 'Puja thalis, rudraksha, idols, incense delivered in 3-5 days. Free shipping above ₹499.',
    actions: [{ label: 'Store', href: '/store' }],
  },
  {
    keywords: ['gaushala', 'cow', 'adopt'],
    message: 'Adopt a cow from ₹51/day. Monthly photo updates, visit anytime. 12 cows across 3 verified gaushalas.',
    actions: [{ label: 'Gau Seva', href: '/gaushala' }],
  },
];

function findFallback(message: string) {
  const lower = message.toLowerCase();
  for (const entry of FALLBACK_RESPONSES) {
    if (entry.keywords.some((k) => lower.includes(k))) {
      return entry;
    }
  }
  return null;
}

export async function supportRoutes(server: FastifyInstance) {
  /**
   * POST /chat — AI-powered support chat
   * Uses Claude to answer queries, escalates to human when needed.
   */
  server.post('/chat', async (request, reply) => {
    const parsed = chatSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'ValidationError',
        message: parsed.error.errors[0]?.message || 'Invalid request body',
      });
    }

    const { message, history } = parsed.data;

    // Fallback to keyword matching if AI unavailable
    if (DEMO_MODE) {
      const fallback = findFallback(message);
      if (fallback) {
        return reply.send({
          message: fallback.message,
          confidence: 'medium',
          escalate: fallback.escalate || false,
          suggestedActions: fallback.actions || [],
          source: 'keyword',
        });
      }
      return reply.send({
        message: "I'd like to help you more accurately — let me connect you with a human support agent who can dig into this.",
        confidence: 'low',
        escalate: true,
        suggestedActions: [{ label: 'Create Support Ticket', href: '/support/ticket/new' }],
        source: 'keyword',
      });
    }

    // AI-powered response via Claude
    try {
      const historyText = history
        .map((h) => `${h.role === 'user' ? 'User' : 'Asha'}: ${h.content}`)
        .join('\n');

      const prompt = historyText
        ? `Previous conversation:\n${historyText}\n\nUser: ${message}\n\nRespond with ONLY valid JSON per the system prompt format.`
        : `User: ${message}\n\nRespond with ONLY valid JSON per the system prompt format.`;

      const aiText = await generateText({
        system: SUPPORT_SYSTEM_PROMPT,
        prompt,
        maxTokens: 400,
      });

      // Extract JSON from response
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('AI response not JSON');

      const parsed = JSON.parse(jsonMatch[0]);
      return reply.send({
        message: parsed.message || aiText,
        confidence: parsed.confidence || 'medium',
        escalate: parsed.escalate ?? false,
        suggestedActions: Array.isArray(parsed.suggestedActions) ? parsed.suggestedActions : [],
        source: 'ai',
      });
    } catch (err: any) {
      request.log.warn({ err: err?.message }, 'Support AI failed — using fallback');
      const fallback = findFallback(message);
      if (fallback) {
        return reply.send({
          message: fallback.message,
          confidence: 'medium',
          escalate: fallback.escalate || false,
          suggestedActions: fallback.actions || [],
          source: 'keyword',
        });
      }
      return reply.send({
        message: "I want to make sure you get the right answer — let me connect you with a human agent.",
        confidence: 'low',
        escalate: true,
        suggestedActions: [{ label: 'Create Support Ticket', href: '/support/ticket/new' }],
        source: 'fallback',
      });
    }
  });
}
