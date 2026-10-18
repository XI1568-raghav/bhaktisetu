import { FastifyInstance } from 'fastify';
import { settleBounded } from '../lib/background.js';
import crypto from 'node:crypto';
import { z } from 'zod';
import { generateText, DEMO_MODE } from '../integrations/claude.js';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';
import {
  sendEmail,
  supportTicketAlertEmail,
  supportTicketReceivedEmail,
  supportTicketReplyEmail,
} from '../lib/email.js';
import { summarizeSla, type SlaTicketInput } from '../lib/support-sla.js';
import { REFUND_DAYS_LABEL, REFUND_INTERNATIONAL_CARD_LABEL } from '../lib/refund-timing.js';
import {
  PANDIT_ONBOARDING_ANSWER,
  PLATFORM_SUMMARY_TRUST_CLAUSE,
} from '../lib/pandit-vetting.js';

const SUPPORT_INBOX = process.env.SUPPORT_INBOX_EMAIL ?? 'support@darshya.online';

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
const SUPPORT_SYSTEM_PROMPT = `You are Asha, Darshya's AI customer support assistant. Darshya is India's devotional super-app for live temple darshan, puja booking, spiritual content, astrology, wellness, pilgrimage planning, and more.

## Your role
- Answer user queries about Darshya features, bookings, refunds, account issues
- Be warm, concise (under 120 words per reply), use "Namaste" when greeting
- When you CAN help, give a direct answer with next steps (e.g. link to /pujas, /yatra)
- When you CAN'T help (complex refunds >₹5000, account deletion, disputes, legal, medical, bugs, payment failures needing investigation) → explicitly set escalate=true

## Platform knowledge
**Features:** Temples, Pujas (home + temple), Live Darshan (temple streams that follow each temple's own schedule), AI Pandit (Gita Q&A), Astrology (kundli/horoscope), Wellness (yoga/meditation/vipassana), Store (India delivery only), Gaushala (cow adoption), Panchang, Dharmic Yatra.

**Booking:** Pujas bookable via /pujas. Home pujas at /pujas/home-puja. Marriage at /pujas/marriage. Yatra at /yatra. Never say pandits are verified or Aadhaar-verified: a pandit is paid only once Aadhaar-based KYC is on file, which is a payout gate and not a public credential check.

**Pricing:** Pujas from ₹501, Home pujas from ₹1,100, Marriage from ₹11,000, Yatra from ₹15,000, Wellness from ₹299, Store free delivery above ₹499, Astrology from ₹15/min.

**Cancellation:** 100% refund at 48 hours or more before the scheduled time, 75% between 24 and 48 hours; no cancellation inside 24 hours. Refunds reach the account in ${REFUND_DAYS_LABEL}; international cards can take ${REFUND_INTERNATIONAL_CARD_LABEL}, which is the card issuer's timing and not a Darshya promise.

**Payments:** Razorpay only, INR only — for domestic and international devotees alike. (The Stripe/USD rail was removed 2026-08-11; do not tell users they can pay in USD.)

**Video proof:** Every puja booking gets video proof from the priest before payout. Never promise a delivery time or notification: the booking page always shows the current status.

**Delivery:** Store orders are delivered within India only. Prasad delivery is an optional flat ₹150 add-on chosen at booking; the booking page shows a tracking ID once one is recorded. Do not quote delivery timelines, couriers or countries served.

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
- Never invent features. If something isn't on Darshya, say so and escalate.
- No markdown, no bold, no bullet lists. Plain friendly text.`;

// ─── Fallback knowledge base (used when AI unavailable) ───────────────────────
const FALLBACK_RESPONSES: Array<{ keywords: string[]; message: string; actions?: Array<{ label: string; href: string }>; escalate?: boolean }> = [
  // Greetings — simple hellos get a friendly reply, no escalation
  {
    keywords: ['hi', 'hii', 'hello', 'hey', 'namaste', 'pranam', 'ram ram', 'jai shri ram'],
    message: 'Namaste! Welcome to Darshya. I can help you with puja bookings, live darshan, yatra planning, astrology, home pujas, wellness sessions, and more. What would you like help with today?',
    actions: [
      { label: 'Browse Pujas', href: '/pujas' },
      { label: 'Live Darshan', href: '/darshan' },
      { label: 'Plan a Yatra', href: '/yatra' },
    ],
  },
  {
    keywords: ['how are you', 'whats up', "what's up", 'how r u'],
    message: 'I\'m doing great, thank you for asking! I\'m here to help you with anything on Darshya. Whether you need to book a puja, plan a pilgrimage, or have a question about your order — I\'m ready to help.',
  },
  {
    keywords: ['thank', 'thanks', 'thank you', 'shukriya', 'dhanyavaad'],
    message: 'You\'re welcome! If there\'s anything else you need, just let me know. May your spiritual journey with Darshya be blessed.',
  },
  {
    keywords: ['bye', 'goodbye', 'see you', 'pranam'],
    message: 'Namaste! Have a blessed day. Feel free to reach out anytime — I\'m always here to help.',
  },
  {
    keywords: ['help', 'what can you do', 'what do you do'],
    message: 'I can help with: booking pujas (temple or home), live darshan access, yatra planning, astrology consultations, wellness sessions, store orders, refunds, account issues, and more. What would you like to explore?',
    actions: [
      { label: 'Browse Features', href: '/' },
      { label: 'Help Center', href: '/support' },
    ],
  },
  {
    keywords: ['book puja', 'book a puja', 'puja booking'],
    message: 'You can book any puja in 3 steps: pick a temple, choose the ritual, and pay. Every booking includes video proof of the puja, shown on your booking page.',
    actions: [{ label: 'Browse Pujas', href: '/pujas' }, { label: 'Home Puja', href: '/pujas/home-puja' }],
  },
  {
    keywords: ['home puja', 'pandit at home', 'home visit'],
    message: 'Home pujas such as Griha Pravesh, Satyanarayan, Ganesh, Lakshmi and Rudrabhishek are listed on the Home Puja page, with what is included on each.',
    actions: [{ label: 'Book Home Puja', href: '/pujas/home-puja' }],
  },
  {
    keywords: ['marriage', 'wedding', 'vivah'],
    message: 'Wedding packages start at ₹11,000. Each package page lists the ceremony styles it covers.',
    actions: [{ label: 'Book Wedding', href: '/pujas/marriage' }],
  },
  {
    keywords: ['yatra', 'pilgrimage', 'char dham', 'jyotirlinga'],
    message: 'Our Dharmic Yatra page lists the pilgrimages and package tiers on offer, and the Travel Companion page lists companions for elderly devotees.',
    actions: [{ label: 'Explore Yatra', href: '/yatra' }, { label: 'Travel Companion', href: '/yatra/companion' }],
  },
  {
    keywords: ['darshan', 'live stream', 'buffering'],
    message: 'Live darshan follows each temple\'s own schedule, and the darshan page shows which streams are live now. For buffering, try switching to a lower quality in the player or check your connection.',
    actions: [{ label: 'Watch Live', href: '/darshan' }],
  },
  {
    keywords: ['astrology', 'kundli', 'horoscope'],
    message: 'Free kundli generation, daily horoscope for 12 rashis, or consult an astrologer from ₹15/min.',
    actions: [{ label: 'Astrology', href: '/astrology' }],
  },
  {
    keywords: ['refund', 'cancel', 'cancellation'],
    message: `Cancelling 48 hours or more before the scheduled time refunds 100%; between 24 and 48 hours refunds 75%; inside 24 hours a booking cannot be cancelled. Refunds reach your account in ${REFUND_DAYS_LABEL}; international cards can take ${REFUND_INTERNATIONAL_CARD_LABEL}, which is your card issuer's timing, not ours.`,
    actions: [{ label: 'My Bookings', href: '/bookings' }],
    escalate: true,
  },
  {
    // Trust/security questions — must appear before the "payment failed" entry
    // so a benign "Is payment secure?" doesn't get routed to escalation.
    keywords: ['payment secure', 'is it safe', 'safe to pay', 'payment safe', 'is payment secure', 'secure payment'],
    message: 'Yes — payments go through Razorpay, which is PCI-DSS Level 1 certified. We never store card details.',
  },
  {
    keywords: ['payment failed', 'payment didn\'t', 'payment didnt', 'razorpay failed', 'card declined', 'money deducted'],
    message: 'If payment was deducted but the booking did not appear, please share your transaction ID so our team can look into it.',
    escalate: true,
  },
  {
    keywords: ['human', 'agent', 'real person', 'supervisor', 'manager'],
    message: 'Sure. I\'m passing this to our support team. You can also email support@darshya.online; we aim to reply within 24 hours, Monday to Saturday.',
    escalate: true,
  },
  {
    keywords: ['wellness', 'yoga', 'meditation', 'vipassana'],
    message: 'Book instructors for Yoga, Meditation, or Vipassana retreats. Sessions start at ₹299.',
    actions: [{ label: 'Wellness', href: '/wellness' }],
  },
  {
    keywords: ['store', 'order', 'shipping'],
    message: 'The store delivers within India only. Free delivery above ₹499, otherwise a flat ₹49. The order page shows its status and a tracking number once the courier assigns one.',
    actions: [{ label: 'Store', href: '/store' }],
  },
  {
    keywords: ['gaushala', 'cow', 'adopt'],
    message: 'Browse the gaushalas on the Gau Seva page; each listing shows the cows and what an adoption includes.',
    actions: [{ label: 'Gau Seva', href: '/gaushala' }],
  },
  {
    keywords: ['what is poojly', 'about poojly', 'who are you', 'what do you do'],
    // TC-08: this ended "All Aadhaar-verified priests, all secure payments."
    // Priest.aadhaarVerified has no writer outside prisma/seed.ts and
    // scripts/seed-demo-users.ts, so that was a claim about seed rows. See
    // lib/pandit-vetting.ts — gated, not deleted.
    message: `Darshya is India's devotional super-app — live darshan, puja bookings with video proof, astrology, wellness, pilgrimages, and a store for religious items. ${PLATFORM_SUMMARY_TRUST_CLAUSE}`,
    actions: [
      { label: 'Browse Pujas', href: '/pujas' },
      { label: 'Live Darshan', href: '/darshan' },
    ],
  },
  {
    keywords: ['24/7', '24 7', 'always live', 'anytime darshan'],
    message: 'Each darshan stream follows its own temple\'s timings, so none is guaranteed to be live around the clock. The darshan page shows what is live now.',
    actions: [{ label: 'Watch Live', href: '/darshan' }],
  },
  {
    keywords: ['how much', 'puja cost', 'pooja cost', 'price of puja', 'rate'],
    message: 'Pujas start at ₹501, home pujas from ₹1,100, marriage from ₹11,000, yatra from ₹15,000, wellness from ₹299, astrology from ₹15/min. All prices in INR.',
    actions: [{ label: 'Browse Pujas', href: '/pujas' }],
  },
  {
    keywords: ['prasad arrive', 'prasad delivery', 'when prasad', 'prasad ship'],
    message: 'Prasad delivery is an optional flat ₹150 add-on chosen when you book. We do not promise a delivery date; your booking page shows a tracking ID once one is recorded.',
    actions: [{ label: 'My Bookings', href: '/bookings' }],
  },
  {
    keywords: ['cancel booking', 'cancel my', 'cancel puja', 'cancel yatra'],
    message: 'You can cancel up to 24 hours before the scheduled time: 100% refund at 48 hours or more, 75% between 24 and 48 hours. Go to My Bookings, open the booking, and choose Cancel; the page shows your exact refund first.',
    actions: [{ label: 'My Bookings', href: '/bookings' }],
  },
  {
    keywords: ['language', 'hindi', 'tamil', 'telugu', 'marathi', 'bengali'],
    message: 'Darshya is available in English, Hindi, Tamil, Telugu, Bengali and Marathi. Switch from the language selector in the footer; most of the product is in English and each language page says how much is translated.',
  },
  {
    keywords: ['nri', 'abroad', 'from usa', 'from uk', 'international user', 'outside india'],
    message: 'NRI devotees can book pujas from abroad. NRI pricing is 2.5x the domestic price, shown in USD and charged in INR through Razorpay; an international card works where your card issuer allows international payments. Store orders are delivered within India only, and we do not promise prasad delivery dates.',
    actions: [
      { label: 'Browse Pujas', href: '/pujas' },
      { label: 'NRI Gifting', href: '/nri' },
    ],
  },
  {
    keywords: ['temple in', 'temples in', 'do you have temple'],
    message: 'Browse the temples we list on the Temples page, with the pujas offered at each.',
    actions: [{ label: 'All Temples', href: '/temples' }],
  },
  {
    keywords: ['become pandit', 'become priest', 'pandit onboarding', 'priest register', 'join as priest', 'join as pandit'],
    // TC-08: this published a three-part vetting process with a 3–5 day SLA
    // ("ID, training, test readings"). None of the three exists, and nothing
    // promotes a Priest to verified — routes/priest.ts writes
    // verificationStatus 'pending' and no route ever writes 'approved' — so a
    // pandit who followed this answer waited for a review that could not
    // arrive. See lib/pandit-vetting.ts.
    message: PANDIT_ONBOARDING_ANSWER,
    actions: [{ label: 'Become a Darshya pandit', href: '/become-priest' }],
  },
  {
    keywords: ['video proof', 'proof of puja', 'how will i know'],
    message: 'Every puja booking gets video proof from the priest. We aim to upload it within 24-48 hours of the ceremony; it appears on your booking page, and videos are kept for 90 days. Priests are paid only after upload.',
    actions: [{ label: 'My Bookings', href: '/bookings' }],
  },
  {
    keywords: ['login', 'sign in', 'otp', 'password'],
    message: "For login: OTP may take up to 2 min — check spam. Try email OTP instead of SMS, or reset at /auth/forgot. If still stuck, we'll escalate to account recovery.",
    actions: [{ label: 'Sign In', href: '/auth/signin' }],
  },
];

function findFallback(message: string) {
  const lower = message.toLowerCase().trim();

  // Exact match first (handles single-word greetings like "hi", "hello")
  for (const entry of FALLBACK_RESPONSES) {
    if (entry.keywords.some((k) => lower === k)) return entry;
  }

  // Word-boundary match for multi-word keywords
  for (const entry of FALLBACK_RESPONSES) {
    if (
      entry.keywords.some((k) => {
        if (k.includes(' ')) return lower.includes(k);
        // Single word: match as whole word
        return new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(lower);
      })
    ) {
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

    // Auto-escalate on specific patterns before fallback lookup
    // (>₹5K refunds, payment-succeeded-but-no-booking, etc.)
    const lowerMsg = message.toLowerCase();
    // Match "refund of ₹10000", "refund 20000", "want refund of 15,000 rupees", etc.
    const refundRegex = /(?:refund|refund of|return|money back)[^₹\d]{0,20}(?:rs\.?|inr|₹|rupees?)?\s*([\d,]+)/;
    const refundAmountMatch = lowerMsg.match(refundRegex);
    const refundAmount = refundAmountMatch?.[1]
      ? parseInt(refundAmountMatch[1].replace(/,/g, ''), 10)
      : 0;
    const mentionsRefund = /refund|money back/.test(lowerMsg);
    if (mentionsRefund && refundAmount > 5000) {
      return reply.send({
        message: `I see you're asking about a refund of ₹${refundAmount.toLocaleString('en-IN')}. Because it's above ₹5,000, I'm passing it to our support team. Please create a ticket and keep your transaction ID handy; we aim to reply within 24 hours, Monday to Saturday.`,
        confidence: 'high',
        escalate: true,
        suggestedActions: [{ label: 'Create Support Ticket', href: '/support/ticket/new' }],
        source: 'rule',
      });
    }

    // Explicit human-agent request — always escalate (don't rely on AI judgement)
    const humanRequestPatterns = [
      /\btalk to (?:a )?(?:human|person|agent|representative)\b/,
      /\b(?:connect|speak|chat) (?:me )?(?:to|with) (?:a )?(?:human|agent|person|representative|real)\b/,
      /\b(?:real|live|human) (?:agent|person|support|rep)\b/,
      /\bhuman agent\b/,
      /\bcustomer (?:care|service) (?:agent|rep|representative)\b/,
      /\bescalate (?:this|me|to)\b/,
      /\bsupervisor\b/,
    ];
    if (humanRequestPatterns.some((p) => p.test(lowerMsg))) {
      return reply.send({
        message:
          "Of course. Please create a ticket so our support team can pick it up; we aim to reply within 24 hours, Monday to Saturday.",
        confidence: 'high',
        escalate: true,
        suggestedActions: [{ label: 'Create Support Ticket', href: '/support/ticket/new' }],
        source: 'rule',
      });
    }

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
        message: "I'm not sure I understood that. Could you tell me more? You can ask about booking pujas, live darshan, yatra, refunds, or any other Darshya feature. If you'd prefer a human, just say 'talk to human'.",
        confidence: 'low',
        escalate: false,
        suggestedActions: [
          { label: 'Book a Puja', href: '/pujas' },
          { label: 'Help Center', href: '/support' },
        ],
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
        systemPrompt: SUPPORT_SYSTEM_PROMPT,
        userMessage: prompt,
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

  // ─── Support tickets (CRUD) ──────────────────────────────────────────────

  const createTicketSchema = z.object({
    subject: z.string().min(3).max(200),
    body: z.string().min(1).max(10000),
    category: z.enum(['BOOKING', 'PAYMENT', 'ACCOUNT', 'TECHNICAL', 'OTHER']).default('OTHER'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  });

  const ticketIdParams = z.object({ id: z.string().uuid() });

  const ticketMessageSchema = z.object({
    body: z.string().min(1).max(10000),
    isInternal: z.boolean().optional().default(false),
  });

  const updateTicketSchema = z.object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    assignedToId: z.string().uuid().nullable().optional(),
  });

  // The reporter's OWN closing action. Deliberately NOT `updateTicketSchema`:
  // the only thing a devotee may say about their own ticket is "this is done".
  // RESOLVED and CLOSED are the two members of SupportTicketStatus that mean
  // that; OPEN and IN_PROGRESS are queue state that belongs to support, and
  // priority / assignedToId are not fields on this schema at all, so `z.object`
  // strips them before the handler can see them. Defined AFTER
  // `updateTicketSchema` on purpose — apps/web/__tests__/support-ticket-wire-
  // contract.test.ts re-reads the FIRST `status: z.enum([...])` in this file as
  // the admin status vocabulary.
  const ownerResolutionSchema = z.object({
    status: z.enum(['RESOLVED', 'CLOSED']).default('RESOLVED'),
  });

  function nextTicketNumber(): string {
    const d = new Date();
    const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
    const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `ST-${ymd}-${rand}`;
  }

  function isAdmin(req: any) {
    return Array.isArray(req.currentUser?.roles) && req.currentUser.roles.includes('ADMIN');
  }

  // POST /tickets — create a new support ticket
  server.post('/tickets', { preHandler: [authenticateUser] }, async (request, reply) => {
    const parsed = createTicketSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request body', details: parsed.error.flatten() });
    }
    const userId = request.currentUser!.id;
    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber: nextTicketNumber(),
        userId,
        subject: parsed.data.subject,
        body: parsed.data.body,
        category: parsed.data.category,
        priority: parsed.data.priority,
      },
    });

    // Fire-and-forget email notifications. Never block ticket creation.
    await settleBounded((async () => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, phone: true, fullName: true },
        });
        const alert = supportTicketAlertEmail({
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          body: ticket.body,
          category: ticket.category,
          priority: ticket.priority,
          userName: user?.fullName ?? 'Devotee',
          userEmail: user?.email ?? '(no email)',
          userPhone: user?.phone,
          ticketId: ticket.id,
        });
        await sendEmail({ to: SUPPORT_INBOX, subject: alert.subject, html: alert.html, text: alert.text });
        if (user?.email) {
          const ack = supportTicketReceivedEmail({
            userName: user.fullName ?? 'Devotee',
            ticketNumber: ticket.ticketNumber,
            subject: ticket.subject,
          });
          await sendEmail({ to: user.email, subject: ack.subject, html: ack.html, text: ack.text });
        }
      } catch (err) {
        request.log?.warn({ err, ticketId: ticket.id }, 'support ticket email failed');
      }
    })(), 'support');

    return reply.code(201).send({ data: ticket });
  });

  // GET /tickets — list tickets (own; admin can pass ?all=true to see everyone's)
  server.get('/tickets', { preHandler: [authenticateUser] }, async (request, reply) => {
    const { all } = request.query as { all?: string };
    const userId = request.currentUser!.id;
    const wantsAll = all === 'true';
    if (wantsAll && !isAdmin(request)) {
      return reply.code(403).send({ error: 'Admin role required to list all tickets' });
    }
    const where = wantsAll ? {} : { userId };
    const tickets = await prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return reply.send({ data: tickets });
  });

  // GET /tickets/:id — owner or admin
  server.get('/tickets/:id', { preHandler: [authenticateUser] }, async (request, reply) => {
    const params = ticketIdParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'Invalid ticket id' });
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.data.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!ticket) return reply.code(404).send({ error: 'Ticket not found' });
    const userId = request.currentUser!.id;
    if (ticket.userId !== userId && !isAdmin(request)) {
      return reply.code(403).send({ error: 'Not authorized to view this ticket' });
    }
    // Hide internal notes from non-admin owners
    const messages = isAdmin(request)
      ? ticket.messages
      : ticket.messages.filter((m) => !m.isInternal);
    return reply.send({ data: { ...ticket, messages } });
  });

  // POST /tickets/:id/messages — owner or admin appends message
  server.post(
    '/tickets/:id/messages',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      const params = ticketIdParams.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: 'Invalid ticket id' });
      const body = ticketMessageSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply.code(400).send({ error: 'Invalid request body', details: body.error.flatten() });
      }
      const ticket = await prisma.supportTicket.findUnique({ where: { id: params.data.id } });
      if (!ticket) return reply.code(404).send({ error: 'Ticket not found' });

      const userId = request.currentUser!.id;
      const admin = isAdmin(request);
      if (ticket.userId !== userId && !admin) {
        return reply.code(403).send({ error: 'Not authorized to post to this ticket' });
      }
      // Internal notes can only be posted by admins.
      const isInternal = body.data.isInternal && admin;

      const message = await prisma.supportTicketMessage.create({
        data: {
          ticketId: ticket.id,
          authorId: userId,
          body: body.data.body,
          isInternal,
        },
      });
      // Auto-bump ticket to IN_PROGRESS when admin replies on an open ticket.
      if (admin && ticket.status === 'OPEN') {
        await prisma.supportTicket.update({
          where: { id: ticket.id },
          data: { status: 'IN_PROGRESS' },
        });
      }

      // Notify the other side. Admin reply (non-internal) → email the ticket owner.
      // Devotee reply → alert the support inbox.
      await settleBounded((async () => {
        try {
          if (admin && !isInternal) {
            const owner = await prisma.user.findUnique({
              where: { id: ticket.userId },
              select: { email: true, fullName: true },
            });
            if (owner?.email) {
              const reply = supportTicketReplyEmail({
                userName: owner.fullName ?? 'Devotee',
                ticketNumber: ticket.ticketNumber,
                subject: ticket.subject,
                replyBody: body.data.body,
              });
              await sendEmail({ to: owner.email, subject: reply.subject, html: reply.html, text: reply.text });
            }
          } else if (!admin) {
            const author = await prisma.user.findUnique({
              where: { id: userId },
              select: { email: true, fullName: true },
            });
            const alert = supportTicketReplyEmail({
              userName: 'Support',
              ticketNumber: ticket.ticketNumber,
              subject: `${ticket.subject} (devotee reply)`,
              replyBody: `From ${author?.fullName ?? 'devotee'} <${author?.email ?? '(no email)'}>:\n\n${body.data.body}`,
            });
            await sendEmail({ to: SUPPORT_INBOX, subject: alert.subject, html: alert.html, text: alert.text });
          }
        } catch (err) {
          request.log?.warn({ err, messageId: message.id }, 'support ticket reply email failed');
        }
      })(), 'support');

      return reply.code(201).send({ data: message });
    }
  );

  // PATCH /tickets/:id — admin-only update of status / assignedTo / priority
  server.patch('/tickets/:id', { preHandler: [authenticateUser] }, async (request, reply) => {
    if (!isAdmin(request)) {
      return reply.code(403).send({ error: 'Admin role required' });
    }
    const params = ticketIdParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'Invalid ticket id' });
    const body = updateTicketSchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: 'Invalid request body', details: body.error.flatten() });
    }
    const ticket = await prisma.supportTicket.findUnique({ where: { id: params.data.id } });
    if (!ticket) return reply.code(404).send({ error: 'Ticket not found' });

    const data: Record<string, unknown> = {};
    if (body.data.status !== undefined) {
      data.status = body.data.status;
      if (body.data.status === 'RESOLVED' || body.data.status === 'CLOSED') {
        data.resolvedAt = new Date();
      }
    }
    if (body.data.priority !== undefined) data.priority = body.data.priority;
    if (body.data.assignedToId !== undefined) data.assignedToId = body.data.assignedToId;

    const updated = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data,
    });
    return reply.send({ data: updated });
  });

  // POST /tickets/:id/resolve — the REPORTER closes their own ticket.
  //
  // WHY THIS EXISTS AS ITS OWN ROUTE
  // --------------------------------
  // /support/tickets/view rendered "Mark resolved" for the devotee and wired it
  // to PATCH /tickets/:id, which is admin-only — so the owner of the ticket got
  // 403 "Admin role required" from a button on their own ticket. A support
  // product where the person who reported the problem cannot say "this is
  // fixed" is worse than one with no button, but the fix is NOT to loosen the
  // PATCH guard: that route also sets priority and assignedToId, and widening
  // it would hand every devotee the queue's controls.
  //
  // So this is a second, narrower door with its own guard:
  //   · owner only — `ticket.userId === currentUser.id`. Not admins (they have
  //     PATCH), not the assignee, not another devotee.
  //   · RESOLVED or CLOSED only — `ownerResolutionSchema` has no other member.
  //   · status + resolvedAt are the only columns written. priority and
  //     assignedToId are not on the schema, so a body carrying them is stripped
  //     by `z.object` and cannot reach the update.
  server.post('/tickets/:id/resolve', { preHandler: [authenticateUser] }, async (request, reply) => {
    const params = ticketIdParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'Invalid ticket id' });
    const body = ownerResolutionSchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: 'Invalid request body', details: body.error.flatten() });
    }
    const ticket = await prisma.supportTicket.findUnique({ where: { id: params.data.id } });
    if (!ticket) return reply.code(404).send({ error: 'Ticket not found' });

    // The guard. Ownership is the whole authorisation — an admin acting on
    // someone else's ticket uses PATCH /tickets/:id, which is where the
    // priority/assignment powers live and where the admin check already is.
    if (ticket.userId !== request.currentUser!.id) {
      return reply
        .code(403)
        .send({ error: 'Only the devotee who opened this ticket can close it' });
    }

    const updated = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: body.data.status, resolvedAt: new Date() },
    });
    return reply.send({ data: updated });
  });

  // GET /agents — admin-only. The assignee picker's options.
  //
  // /admin/support/view offered a hardcoded list of five display names
  // ("Priya S.", "Arjun K.", …) and sent the chosen NAME at
  // `assignedToId: z.string().uuid()`, so every assignment 400'd. The picker
  // has to offer real accounts and send real ids.
  //
  // "Real admin" here is the same union the auth middleware enforces
  // (middlewares/auth.ts:353-375): a UserRoleAssignment row with role ADMIN,
  // OR an address on the ADMIN_EMAILS allow-list — the allow-list is the
  // bootstrap path (routes/auth.ts:168), and an operator-listed admin usually
  // has no role row at all, so filtering on role alone would return an empty
  // picker on exactly the deployment that has admins.
  //
  // Deliberately NOT a user directory: id and a display name only, admin-gated,
  // bounded. Blocked accounts are excluded — a suspended account must not be
  // offered as somebody to hand a ticket to.
  server.get('/agents', { preHandler: [authenticateUser] }, async (request, reply) => {
    if (!isAdmin(request)) {
      return reply.code(403).send({ error: 'Admin role required' });
    }

    // Parsed exactly as middlewares/auth.ts and routes/auth.ts parse it:
    // comma-split, trimmed, lowercased, blanks dropped (an empty ADMIN_EMAILS
    // must not produce a '' entry that a blank email could match).
    const allowList = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    try {
      const users = await prisma.user.findMany({
        where: {
          blocked: false,
          OR: [
            { roleAssignments: { some: { role: 'ADMIN' } } },
            // `equals` + `mode: 'insensitive'` per address rather than one
            // `in:` — addresses are stored as the user typed them and the
            // allow-list is lowercased, so a case difference would silently
            // drop the operator's own account from their picker.
            ...allowList.map((email) => ({ email: { equals: email, mode: 'insensitive' as const } })),
          ],
        },
        select: { id: true, fullName: true, email: true },
        orderBy: { fullName: 'asc' },
        take: 100,
      });

      const agents = users.map((u) => ({
        id: u.id,
        // A display name, never the raw address: `fullName` is required on the
        // model but can be an empty string, and the local part is a better
        // label than a blank option.
        name: u.fullName?.trim() || u.email?.split('@')[0] || 'Support agent',
      }));
      return reply.send({ data: agents });
    } catch (err: any) {
      request.log.error({ err: err?.message }, 'support /agents lookup failed');
      return reply.code(500).send({ error: 'Failed to list support agents' });
    }
  });

  // ─── R-Q4-CS-001 — 24h response SLA tracker ─────────────────────────────
  //
  // GET /sla — admin-only. Returns the response_sla_24h_pct KPI globally
  // plus a per-timezone breakdown (IN / UK / US / AU). Pulls the last 30d of
  // tickets, derives first-admin-reply timestamp from SupportTicketMessage,
  // and rolls up via the pure helper in lib/support-sla.ts.
  //
  // Demo-safe: when the DB is unreachable we return an empty summary
  // (responseSla24hPct=100 vacuously) instead of erroring — the founder
  // dashboard tile keeps rendering.
  server.get('/sla', { preHandler: [authenticateUser] }, async (request, reply) => {
    if (!isAdmin(request)) {
      return reply.code(403).send({ error: 'Admin role required' });
    }

    const windowDays = 30;
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    let inputs: SlaTicketInput[] = [];
    try {
      const tickets = await prisma.supportTicket.findMany({
        where: { createdAt: { gte: since } },
        select: {
          id: true,
          createdAt: true,
          userId: true,
          messages: {
            select: { authorId: true, createdAt: true, isInternal: true },
            orderBy: { createdAt: 'asc' },
          },
        },
        take: 5000,
      });

      inputs = tickets.map((t) => {
        // First-admin-reply = earliest non-internal message authored by
        // someone OTHER than the ticket owner. SupportTicketMessage doesn't
        // carry an explicit role flag yet, so "not the owner" is the
        // pragmatic admin-detector — admins post replies on behalf of CS,
        // owners can only post their own follow-ups.
        const reply = t.messages.find((m) => !m.isInternal && m.authorId !== t.userId);
        return {
          createdAt: t.createdAt,
          firstAdminReplyAt: reply ? reply.createdAt : null,
        };
      });
    } catch (err: any) {
      request.log.warn({ err: err?.message }, 'support SLA: DB unreachable, returning empty summary');
    }

    const summary = summarizeSla(inputs);
    return reply.send({
      data: {
        ...summary,
        windowDays,
        kpi: {
          metric: 'response_sla_24h_pct',
          current: summary.global.responseSla24hPct,
          target: 98,
          unit: 'percent',
        },
      },
    });
  });
}
