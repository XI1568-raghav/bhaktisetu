import { FastifyInstance } from 'fastify';
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
    // Trust/security questions — must appear before the "payment failed" entry
    // so a benign "Is payment secure?" doesn't get routed to escalation.
    keywords: ['payment secure', 'is it safe', 'safe to pay', 'payment safe', 'is payment secure', 'secure payment'],
    message: 'Yes — payments go through Razorpay (India) or Stripe (international), both PCI-DSS Level 1. We never store card details. All pandits are Aadhaar-verified.',
  },
  {
    keywords: ['payment failed', 'payment didn\'t', 'payment didnt', 'razorpay failed', 'card declined', 'money deducted'],
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
  {
    keywords: ['what is poojly', 'about poojly', 'who are you', 'what do you do'],
    message: "Darshya is India's devotional super-app — live darshan from 200+ temples, puja bookings with video proof, astrology, wellness, pilgrimages, and a store for religious items. All Aadhaar-verified priests, all secure payments.",
    actions: [
      { label: 'Browse Pujas', href: '/pujas' },
      { label: 'Live Darshan', href: '/darshan' },
    ],
  },
  {
    keywords: ['24/7', '24 7', 'always live', 'anytime darshan'],
    message: 'Most darshan streams run 4am–10pm IST as per temple timings. A few major temples stream 24/7. Each temple page shows its exact schedule.',
    actions: [{ label: 'Watch Live', href: '/darshan' }],
  },
  {
    keywords: ['how much', 'puja cost', 'pooja cost', 'price of puja', 'rate'],
    message: 'Pujas start at ₹501, home pujas from ₹1,100, marriage from ₹11,000, yatra from ₹15,000, wellness from ₹299, astrology from ₹15/min. NRI pricing in USD.',
    actions: [{ label: 'Browse Pujas', href: '/pujas' }],
  },
  {
    keywords: ['prasad arrive', 'prasad delivery', 'when prasad', 'prasad ship'],
    message: 'Prasad ships within 24 hours of puja completion. India: 3–5 days. NRI: 7–14 days depending on country. Tracking is emailed automatically.',
    actions: [{ label: 'My Bookings', href: '/bookings' }],
  },
  {
    keywords: ['cancel booking', 'cancel my', 'cancel puja', 'cancel yatra'],
    message: 'You can cancel any booking up to 24 hours before scheduled time for a full refund. Go to My Bookings, tap the booking, and choose Cancel.',
    actions: [{ label: 'My Bookings', href: '/bookings' }],
  },
  {
    keywords: ['language', 'hindi', 'tamil', 'telugu', 'marathi', 'bengali'],
    message: 'Darshya supports English, Hindi, Tamil, Telugu, Kannada, Marathi, and Bengali. Switch from the language selector in the footer.',
  },
  {
    keywords: ['nri', 'abroad', 'from usa', 'from uk', 'international user', 'outside india'],
    message: 'Absolutely. NRI devotees can book every puja, darshan, yatra and store item from 40+ countries. Pay in USD via Stripe. Prasad ships worldwide in 7–14 days.',
    actions: [
      { label: 'Browse Pujas', href: '/pujas' },
      { label: 'NRI Gifting', href: '/nri' },
    ],
  },
  {
    keywords: ['temple in', 'temples in', 'do you have temple'],
    message: 'We partner with 200+ temples across India — Kashi Vishwanath, Tirumala, Somnath, Vaishno Devi, Shirdi, Siddhivinayak and more. Browse the full list.',
    actions: [{ label: 'All Temples', href: '/temples' }],
  },
  {
    keywords: ['become pandit', 'become priest', 'pandit onboarding', 'priest register', 'join as priest', 'join as pandit'],
    message: 'We onboard verified priests and astrologers. Share your credentials at /priest-onboarding — typical verification takes 3–5 days (ID, training, test readings).',
    actions: [{ label: 'Priest Onboarding', href: '/priest-onboarding' }],
  },
  {
    keywords: ['video proof', 'proof of puja', 'how will i know'],
    message: 'Every puja booking gets HD video proof from the priest within 2–4 hours of completion. Saved in My Bookings forever. Priests are paid only after upload.',
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
        message: `I see you're asking about a refund of ₹${refundAmount.toLocaleString('en-IN')}. Because it's above ₹5,000, I'm connecting you with a human agent who'll resolve it within 4 hours. Please keep your transaction ID handy.`,
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
          "Of course — I'm connecting you with a human support agent. They'll reply within 4 hours. You can also create a ticket now and we'll pick it up immediately.",
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
    void (async () => {
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
    })();

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
      void (async () => {
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
      })();

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
}
