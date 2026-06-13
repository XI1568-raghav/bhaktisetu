# Waitlist Signup CTA — Above-Fold Home + Email Confirm Flow

> **Roadmap item**: R-Q1-P-008 (P0) · **Authored**: 2026-06-13

## Goal

Q1 ship above-fold waitlist signup CTA on home page + email confirm flow. Capture pre-launch interest from organic traffic. Targets 500+ waitlist signups Q1.

## UI

### Above-fold component
- Email input field (full-width on mobile, compact on desktop)
- CTA button: "Join 500+ Hindus on the waitlist"
- Microcopy: "Get early access + ₹100 first-puja credit on launch"
- Positioned: between hero + IntentTrio (line ~140 in page.tsx)

### Confirm flow
1. User enters email + clicks CTA → POST /api/v1/waitlist
2. API creates row + sends Resend email w/ confirmation link
3. User clicks confirmation link → token verified → row marked confirmed
4. Thanks page: "You're on the waitlist! We'll notify you on launch."

## API endpoint

```typescript
// apps/api/src/routes/waitlist.ts
fastify.post('/waitlist', async (req, reply) => {
  const { email, source } = z.object({
    email: z.string().email(),
    source: z.string().default('home-hero'),
  }).parse(req.body)
  
  // Rate limit: 5/IP/hour
  await rateLimit.check(req.ip, 5, 3600)
  
  // Idempotent: upsert on email
  const existing = await prisma.waitlistEntry.findUnique({ where: { email } })
  if (existing && existing.confirmedAt) {
    return reply.send({ already_confirmed: true })
  }
  
  const token = crypto.randomUUID()
  await prisma.waitlistEntry.upsert({
    where: { email },
    create: { email, source, token, ip: req.ip },
    update: { token, source }, // re-send if pending
  })
  
  await sendEmail({
    to: email,
    subject: 'Confirm your Bhaktisetu waitlist signup',
    html: confirmEmailHtml(token),
  })
  
  return reply.send({ ok: true, message: 'Check your email to confirm.' })
})

fastify.get('/waitlist/confirm/:token', async (req, reply) => {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { token: req.params.token }
  })
  if (!entry) return reply.status(404).send({ error: 'Invalid token' })
  
  await prisma.waitlistEntry.update({
    where: { id: entry.id },
    data: { confirmedAt: new Date() }
  })
  return reply.redirect('/waitlist/welcome')
})
```

## Schema

```prisma
model WaitlistEntry {
  id          String   @id @default(cuid())
  email       String   @unique
  source      String   // home-hero / nri / refer-anon / etc
  token       String   @unique
  ip          String?
  createdAt   DateTime @default(now())
  confirmedAt DateTime?
  @@map("waitlist_entries")
}
```

## Engineering tickets

- R-Q1-P-008a: Above-fold WaitlistCTA component
- R-Q1-P-008b: API endpoint + Prisma migration
- R-Q1-P-008c: Confirmation email template
- R-Q1-P-008d: /waitlist/welcome thank-you page
- R-Q1-P-008e: Admin /admin/waitlist dashboard

## Q1 success metric

- 500+ waitlist signups
- 70%+ email confirm rate
- 20%+ confirm-to-first-booking conversion post-launch

## Closes

R-Q1-P-008 — spec shipped.
