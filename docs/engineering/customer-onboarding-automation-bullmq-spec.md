# Customer Onboarding Automation — BullMQ Implementation Spec

> Wire R-Q3-CS-002 onboarding email sequence (Day 0/1/7/30) to actual BullMQ infrastructure (per R-Q2-E-012).

## Architecture

```
User signup
  ↓
trigger event: 'user.created'
  ↓
Queue jobs to BullMQ:
  - Day 0: immediate welcome (delay: 0)
  - Day 1: first-booking nudge (delay: 24h)
  - Day 7: engagement check-in (delay: 7d)
  - Day 30: long-term founder note (delay: 30d)
  ↓
Worker processes job at scheduled time
  ↓
Render email template from React Email
  ↓
Send via Resend API
  ↓
Log delivery in audit table
  ↓
Update user funnel state in PostHog
```

## BullMQ Queue Setup

```typescript
// apps/api/src/queues/onboarding-email.queue.ts
import { Queue, Worker } from 'bullmq'
import { Redis } from 'ioredis'

const redis = new Redis(process.env.UPSTASH_REDIS_URL!, {
  maxRetriesPerRequest: null
})

export const onboardingEmailQueue = new Queue('onboarding-email', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 86400 }, // 24hr retention for completed
    removeOnFail: false // keep failed for debugging
  }
})

// Trigger on user signup
export async function scheduleOnboardingFlow(userId: string) {
  await onboardingEmailQueue.addBulk([
    { name: 'day0_welcome', data: { userId, day: 0 } },
    { name: 'day1_first_booking', data: { userId, day: 1 }, opts: { delay: 24 * 60 * 60 * 1000 } },
    { name: 'day7_engagement', data: { userId, day: 7 }, opts: { delay: 7 * 24 * 60 * 60 * 1000 } },
    { name: 'day30_long_term', data: { userId, day: 30 }, opts: { delay: 30 * 24 * 60 * 60 * 1000 } }
  ])
}
```

## Worker Implementation

```typescript
// apps/api/src/workers/onboarding-email.worker.ts
import { Worker } from 'bullmq'
import { redis } from '../lib/redis'
import { sendOnboardingEmail } from '../services/email.service'
import { logEmailDelivery } from '../services/audit.service'

const worker = new Worker('onboarding-email', async (job) => {
  const { userId, day } = job.data
  
  // Pre-checks (skip conditions)
  const user = await getUserById(userId)
  if (!user) {
    throw new Error(`User ${userId} not found — skip onboarding`)
  }
  
  if (user.unsubscribedAt) {
    return { skipped: true, reason: 'user_unsubscribed' }
  }
  
  // Day 1 skip: user already booked within 24hr
  if (day === 1) {
    const recentBooking = await getRecentBookingByUser(userId, 24 * 60 * 60 * 1000)
    if (recentBooking) {
      return { skipped: true, reason: 'already_booked' }
    }
  }
  
  // Day 7 skip: user booked 2+ times
  if (day === 7) {
    const totalBookings = await getBookingCountByUser(userId)
    if (totalBookings >= 2) {
      return { skipped: true, reason: 'already_engaged' }
    }
  }
  
  // Day 30 skip: user unsubscribed
  if (day === 30 && user.unsubscribedAt) {
    return { skipped: true, reason: 'unsubscribed_before_day_30' }
  }
  
  // Render + send
  const result = await sendOnboardingEmail({
    userId,
    template: `day${day}_${day === 0 ? 'welcome' : day === 1 ? 'first_booking' : day === 7 ? 'engagement' : 'long_term'}`,
    tokens: {
      first_name: user.firstName,
      user_referral_code: user.referralCode,
      user_signup_date: user.createdAt,
    }
  })
  
  await logEmailDelivery({
    userId,
    template: result.template,
    messageId: result.messageId,
    deliveryStatus: result.status,
    sentAt: new Date()
  })
  
  return { sent: true, day, messageId: result.messageId }
}, {
  connection: redis,
  concurrency: 10 // 10 parallel email sends
})

worker.on('completed', (job) => {
  console.log(`Onboarding email ${job.name} completed: ${job.returnvalue}`)
})

worker.on('failed', (job, err) => {
  console.error(`Onboarding email ${job?.name} failed:`, err)
  // Sentry capture per R-Q1-IT-003
})
```

## Email Template (React Email)

```typescript
// apps/api/src/email-templates/day0-welcome.tsx
import { Html, Container, Heading, Text, Link, Button } from '@react-email/components'

interface Day0WelcomeProps {
  firstName: string
  userReferralCode: string
}

export function Day0Welcome({ firstName, userReferralCode }: Day0WelcomeProps) {
  return (
    <Html>
      <Container style={containerStyle}>
        <Heading style={headingStyle}>Welcome to Bhaktisetu, {firstName}</Heading>
        <Text>Namaste,</Text>
        <Text>You've joined 5,000+ devotee families using verified pandit pujas + live darshan from India temples globally.</Text>
        <Heading as="h2">Three quick things to do in your first 24 hours:</Heading>
        <Text>1. Browse our verified pandits — <Link href="https://bhaktisetu.com/pandits">bhaktisetu.com/pandits</Link></Text>
        <Text>2. Watch live darshan — <Link href="https://bhaktisetu.com/today">bhaktisetu.com/today</Link></Text>
        <Text>3. Set your notification preferences — <Link href="https://bhaktisetu.com/profile/notifications">bhaktisetu.com/profile/notifications</Link></Text>
        <Text>Your referral code: <strong>{userReferralCode}</strong></Text>
        <Text>🙏</Text>
        <Text>Sunil Kumar, Founder</Text>
      </Container>
    </Html>
  )
}
```

## Resend Integration

```typescript
// apps/api/src/services/email.service.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function sendOnboardingEmail({ userId, template, tokens }: SendOnboardingEmailParams) {
  const user = await getUserById(userId)
  const emailHtml = render(<OnboardingTemplate template={template} tokens={tokens} />)
  
  const { data, error } = await resend.emails.send({
    from: 'Bhaktisetu <hello@bhaktisetu.com>',
    to: user.email,
    subject: getSubjectForTemplate(template, tokens),
    html: emailHtml,
    headers: {
      'X-Bhaktisetu-Template': template,
      'X-Bhaktisetu-User-Id': userId
    }
  })
  
  if (error) {
    throw new Error(`Resend email failed: ${error.message}`)
  }
  
  return { sent: true, messageId: data!.id, template }
}
```

## Audit Schema

```prisma
model OnboardingEmailLog {
  id              String   @id @default(cuid())
  userId          String   @map("user_id")
  template        String
  messageId       String?  @map("message_id")
  deliveryStatus  EmailStatus @map("delivery_status")
  sentAt          DateTime @map("sent_at")
  openedAt        DateTime? @map("opened_at")
  clickedAt       DateTime? @map("clicked_at")
  unsubscribedAt  DateTime? @map("unsubscribed_at")
  errorMessage    String?  @map("error_message")
  user            User @relation(fields: [userId], references: [id])
  @@index([userId, template])
  @@index([sentAt])
  @@map("onboarding_email_logs")
}

enum EmailStatus { queued sent delivered opened clicked bounced complained unsubscribed failed }
```

## Resend Webhook Handler

```typescript
// apps/api/src/routes/webhooks/resend.ts
fastify.post('/webhooks/resend', async (req, reply) => {
  const event = req.body as ResendEvent
  
  if (event.type === 'email.opened') {
    await prisma.onboardingEmailLog.update({
      where: { messageId: event.data.messageId },
      data: { openedAt: new Date(), deliveryStatus: 'opened' }
    })
  }
  
  if (event.type === 'email.clicked') {
    await prisma.onboardingEmailLog.update({
      where: { messageId: event.data.messageId },
      data: { clickedAt: new Date(), deliveryStatus: 'clicked' }
    })
  }
  
  return reply.send({ ok: true })
})
```

## Monitoring

- Daily dashboard: open rate per template, conversion per day
- Sentry alerts: failed job rate >5% sustained 1hr
- Weekly review: which day shows highest unsubscribe? Optimize content.

## Engineering tickets

- R-Q3-CS-002a: BullMQ setup + Redis (per R-Q2-E-012)
- R-Q3-CS-002b: 4 React Email templates
- R-Q3-CS-002c: Onboarding worker implementation
- R-Q3-CS-002d: Audit logging + Resend webhook
- R-Q3-CS-002e: Founder dashboard for onboarding funnel

## Implementation timeline

- Week 1: BullMQ + Redis setup
- Week 2: 4 React Email templates + Resend wire
- Week 3: Worker + audit logging
- Week 4: Pilot test w/ 50 users
- Week 5: Full rollout

## Cost estimate

- Resend: ~5K emails/month at scale = within free tier ($0/mo)
- Upstash Redis: 10K commands/day = $0/mo free tier
- Engineer time: 2 weeks part-time
- Total cost to ship: ₹0 incremental ops cost
