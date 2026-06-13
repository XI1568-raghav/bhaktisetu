# DPDP Grievance Handling — Detailed Operational Spec

> Per DPDP Act 2023 Section 4(b) + Section 13. Foundation for compliance + customer trust + Series A regulatory due diligence.

## Why this matters

- DPDP Act 2023 requires designated Grievance Officer + 30-day resolution
- Non-compliance = up to 4% of annual turnover penalty
- Customer trust requires visible compliance
- Series A DD checklist includes DPDP compliance documentation

## Grievance Officer designation (per existing spec)

- Name: Sunil Kumar
- Designation: Founder & CEO
- Email: grievance@bhaktisetu.com
- Phone: +91-XXXXX-XXXXX (direct WhatsApp)
- Postal: Bhaktisetu Foundation Registered Address
- Office hours: Mon-Fri 09:00-18:00 IST

## Grievance categories

### Tier 1 — Data Rights (high priority)
- Request to access own data (DSAR — Data Subject Access Request)
- Request to correct own data
- Request to delete own data (right to erasure)
- Request to export own data (data portability)
- Request to restrict processing
- Consent withdrawal

### Tier 2 — Processing Concerns (medium priority)
- Unauthorized data sharing (with 3rd party)
- Unsolicited marketing communications
- Inappropriate data collection
- Data accuracy disputes
- Cross-border data flow concerns

### Tier 3 — Operational Concerns (medium priority)
- Pandit network handling of customer data
- Vendor (Razorpay/Stripe/Resend) data concerns
- Customer support handling of personal info

### Tier 4 — Security Incidents (highest priority)
- Suspected data breach
- Unauthorized account access reported
- Phishing attempts using Bhaktisetu brand
- Lost/stolen device with active session

## SLA per tier

| Tier | Acknowledgment | Investigation | Resolution |
|---|---|---|---|
| Tier 4 (security) | <1 hour | <24 hours | <30 days (per DPDP) |
| Tier 1 (data rights) | <24 hours | <14 days | <30 days |
| Tier 2 (processing) | <48 hours | <21 days | <30 days |
| Tier 3 (operational) | <72 hours | <30 days | <30 days |

## Workflow per tier

### Tier 1 example: Customer requests data deletion

```
Day 0: Customer submits request via grievance@bhaktisetu.com OR /me/privacy/erase
↓
Day 0 (within 24hr): Founder acknowledges receipt via email
↓
Day 1-3: Founder verifies customer identity (security check)
↓
Day 3-7: Schedule erasure during 30-day cooldown
↓
Day 7-30: User can withdraw erasure request anytime
↓
Day 30+: Hard delete from production DB + anonymize related records
↓
Day 35: Confirmation email sent
↓
Day 35-90: Backup deletions per 90-day retention policy
↓
Day 90: Backup-level deletion complete
↓
Audit log entry permanent
```

### Tier 4 example: Suspected data breach

```
Hour 0: Customer/internal reports suspicious activity
↓
Hour 1: Founder acknowledges + isolates affected systems
↓
Hour 2-6: Forensic investigation begins
↓
Hour 6-12: Independent security firm engaged
↓
Hour 12-72: Data Protection Board India notification (legal requirement)
↓
Day 1-7: Affected customer individual notifications
↓
Day 7-30: Remediation + system hardening
↓
Day 30: Final report to Data Protection Board + affected customers
↓
Day 90: External pen-test + system validation
```

## DSAR endpoint implementation

Per existing R-Q2-L-003 spec:

```typescript
// apps/api/src/routes/me/privacy.ts
fastify.get('/me/privacy/export', { preHandler: [authenticateUser] }, async (req, reply) => {
  const userId = req.user.id
  
  // Generate JSON export
  const userData = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      bookings: true,
      consultations: true,
      wallet: true,
      subscriptions: true,
      referralInviter: true,
      referralInvitee: true,
      // ... all related data
    }
  })
  
  // Generate signed download URL valid 7 days
  const filename = `bhaktisetu-data-export-${userId}-${Date.now()}.json`
  const signedUrl = await s3.getSignedUrl('putObject', {
    Bucket: 'bhaktisetu-data-exports',
    Key: filename,
    Expires: 7 * 24 * 60 * 60 // 7 days
  })
  
  await s3.upload({ Bucket: 'bhaktisetu-data-exports', Key: filename, Body: JSON.stringify(userData) }).promise()
  
  // Log + email user
  await prisma.dsarLog.create({
    data: {
      userId, requestType: 'export', requestedAt: new Date(),
      fulfilledAt: new Date(), downloadUrl: signedUrl
    }
  })
  
  await sendEmail({
    to: userData.email,
    subject: 'Your Bhaktisetu data export is ready',
    body: `Download your data: ${signedUrl}\n\nValid for 7 days. Contact grievance@bhaktisetu.com with questions.`
  })
  
  return reply.send({ ok: true, downloadUrl: signedUrl })
})
```

## Founder operational discipline

- Founder personally reviews all Tier 1 + 4 grievances
- Daily 15-min morning DSAR queue review
- Weekly grievance log audit
- Quarterly grievance metrics published on /transparency
- Annual grievance handling external audit

## Grievance log schema

```prisma
model GrievanceLog {
  id              String   @id @default(cuid())
  userId          String?  @map("user_id") // Optional — non-customer grievances also accepted
  email           String   // Anonymous-friendly identification
  tier            GrievanceTier
  category        String
  description     String   @db.Text
  status          GrievanceStatus @default(pending)
  acknowledgedAt  DateTime? @map("acknowledged_at")
  investigationStartedAt DateTime? @map("investigation_started_at")
  resolvedAt      DateTime? @map("resolved_at")
  resolution      String?  @db.Text @map("resolution")
  createdAt       DateTime @default(now())
  
  @@index([status, createdAt])
  @@index([userId])
  @@map("grievance_logs")
}

enum GrievanceTier { tier_1 tier_2 tier_3 tier_4 }
enum GrievanceStatus { pending acknowledged investigating resolved escalated }
```

## Admin dashboard

`/admin/grievances`:

- Real-time grievance count by tier
- SLA compliance tracker
- Per-grievance investigation status
- Founder action items
- Escalation history (Tier 4 incidents)

## External reporting

- Quarterly report published at /transparency:
  - Total grievances received per category
  - Average resolution time per tier
  - Open vs resolved count
  - SLA compliance percentage
  - Major incidents (Tier 4) anonymized summary

## Founder accountability

- Personal review of every Tier 4 incident
- Direct WhatsApp + phone for customer escalations
- Quarterly external counsel review of grievance handling
- Annual DPDP compliance audit by tier-2 firm

## Cost

- Counsel review: ₹25K-50K Q3 + quarterly
- External audit: ₹50K-1L annually
- Insurance (cyber liability): ₹15K-50K/year
- Founder time: 30 min/day on grievance queue

## ROI

- Customer trust: visible compliance differentiates Bhaktisetu
- Regulatory compliance: avoid DPDP penalties (up to 4% turnover)
- Series A pitch: DPDP-ready story compelling for investors
- Brand reputation: zero major incidents = sustainable growth

## Engineering tickets

- Q3 W1: DSAR endpoint implementation (per R-Q2-L-003)
- Q3 W2: Grievance log schema + admin dashboard
- Q3 W3: Founder grievance review SOP
- Q3 W4: External compliance audit
- Q4: Annual DPDP audit external firm
