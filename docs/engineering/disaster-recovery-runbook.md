# Disaster Recovery Runbook

> Operational playbook for catastrophic infrastructure events. Foundation for Series-A reliability story + insurance compliance.

## Recovery Time Objectives (RTO) + Recovery Point Objectives (RPO)

| Service | RTO target | RPO target |
|---|---|---|
| api.darshya.online | 4 hours | 15 minutes |
| darshya.online (web) | 1 hour | N/A (static) |
| Database (Supabase) | 4 hours | 1 hour |
| Video proof storage | 24 hours | 1 hour |
| Email + WhatsApp | 6 hours | N/A (eventual) |
| Customer support | 8 hours | N/A |

## Disaster scenarios + response

### Scenario 1: Render API region complete outage

**Trigger**: Render Mumbai region down >5 minutes
**Detection**: UptimeRobot alert + Sentry error spike
**Response**:
1. Verify outage via Render status page (status.render.com)
2. Manual failover via Cloudflare DNS to Singapore standby (per multi-region spec)
3. Singapore instance becomes primary
4. Communicate to customers via Twitter + status page
5. Monitor for Mumbai recovery
6. Restore Mumbai → standby when stable 30 min

**Recovery time**: 4 hours (manual coordination)
**Data loss**: Up to 1 hour (last DB replication)

### Scenario 2: Supabase database complete failure

**Trigger**: Supabase Mumbai PostgreSQL unreachable
**Detection**: API health endpoint returns 500
**Response**:
1. Verify with Supabase support (status.supabase.com)
2. If Supabase outage: wait for restoration
3. Activate Singapore read-replica as primary (manual)
4. Apply pending writes from logs (last 1hr backed up)
5. Customer notification via Twitter + email
6. Restore Mumbai primary when stable

**Recovery time**: 4-6 hours
**Data loss**: Up to 1 hour writes

### Scenario 3: Cloudflare Pages global outage

**Trigger**: darshya.online unreachable globally
**Detection**: UptimeRobot + global Twitter complaints
**Response**:
1. Verify via Cloudflare status page
2. Activate backup hosting (Vercel / Netlify) if available
3. DNS update to backup hosting (24-72hr propagation)
4. Customer notification

**Recovery time**: 1-2 hours
**Data loss**: None (static content)

### Scenario 4: Payment processor (Razorpay) outage

**Trigger**: New bookings stop generating Razorpay sessions
**Detection**: Booking funnel analytics + customer complaints
**Response**:
1. Verify with Razorpay (status.razorpay.com)
2. Activate Stripe alternative (manual flag)
3. Existing bookings unaffected (already processed)
4. New bookings via Stripe only
5. Restore Razorpay when available

**Recovery time**: 2-4 hours
**Revenue impact**: ~₹50K-100K depending on duration

### Scenario 5: Major data breach (security incident)

**Trigger**: Unauthorized access to customer DB detected
**Detection**: Sentry alerts + security audit + customer complaints
**Response**:
1. Immediate: Isolate affected database
2. Reset all customer passwords + invalidate sessions
3. Engage independent security firm for forensic audit
4. Report to Data Protection Board India within 72 hours (DPDP requirement)
5. Notify affected customers individually
6. Hire crisis PR firm if affecting >1000 customers
7. Insurance claim filed (per insurance portfolio spec)

**Recovery time**: 30 days (full incident response)
**Reputation impact**: Could be significant; mitigation: transparent communication

### Scenario 6: Founder unavailability (illness/accident)

**Trigger**: Founder unable to respond for >24 hours
**Detection**: Co-founder dependency check
**Response**:
1. Advisory board emergency meeting (1 advisor designated as crisis contact)
2. CS contractor activated for operational continuity
3. Engineer-contractor activated for technical issues
4. Investor + customer communication: "Founder personal emergency, operations continue"
5. Designated successor (TBD post Series A)

**Recovery time**: Variable
**Mitigation**: Founder personal life insurance + advisor protocols + documented handover

### Scenario 7: Catastrophic data center loss (Mumbai region disappears)

**Trigger**: Render Mumbai region permanently unavailable
**Detection**: Render announcement + extended outage
**Response**:
1. Switch entirely to Singapore region (immediate)
2. Restore from Supabase backup to new primary
3. Reconfigure DNS + monitoring + agents
4. Customer notification (24-72 hour migration window)

**Recovery time**: 24-72 hours
**Data loss**: Potentially 1-24 hours depending on backup status

## Backup strategy

### Automated daily backups (per R-Q2-IT-003 spec)

```bash
# GH Actions cron 03:00 UTC daily
pg_dump $SUPABASE_DIRECT_URL --no-owner > dump-$DATE.sql
gzip dump-$DATE.sql
aws s3 cp dump-$DATE.sql.gz s3://bhaktisetu-backups/$DATE.sql.gz
```

### Retention

- Standard tier first 7 days
- Glacier 8-30 days
- Glacier Deep Archive 30-180 days
- Auto-delete after 180 days

### Verify weekly

- Download latest backup
- Import to test Supabase project
- Verify row counts match
- Alert if verification fails

## Communication templates

### Status page (status.bhaktisetu.com — Q4 launch)

- Real-time service status
- Incident timeline
- Founder-level updates

### Customer email (per crisis)

```
Subject: ⚠️ Bhaktisetu Service Status Update

Namaste,

[Specific scenario] occurred on [date/time]. Our team is working to restore full service.

Current status:
- [What's down]
- [What's still working]
- [Estimated resolution]

For urgent matters:
- WhatsApp +91-XXXXX-XXXXX
- Email founder@bhaktisetu.com

We will provide hourly updates here + status.bhaktisetu.com.

Apologies for any inconvenience.

🙏
Sunil Kumar
Founder, Bhaktisetu Foundation
```

### Twitter
```
⚠️ Bhaktisetu update: [Specific incident]

Current status: [What's down + working]
ETA: [Time]
Updates: status.bhaktisetu.com
Direct contact: +91-XXXXX-XXXXX

We'll update hourly. Apologies for inconvenience. 🙏
```

## Founder responsibilities

- Test DR runbook quarterly (planned downtime scenario)
- Verify backup integrity weekly
- Maintain status.bhaktisetu.com (Q4 launch)
- Annual DR drill with full team
- Insurance coverage review annually

## Counsel involvement

- DPDP incident notification protocols documented
- Insurance claim filing process documented
- Customer communication legal review
- Pre-incident PR firm relationship (Q1 2027)

## Engineering tickets

- Q4 W1: Status page setup (status.bhaktisetu.com)
- Q4 W2: Backup verification automation
- Q4 W3: Singapore standby setup
- Q4 W4: First DR drill (planned downtime)
- Q1 2027: Quarterly DR drill cadence established
- Annual: External DR audit by tier-2 firm

## Insurance + contingency

- Cyber liability insurance (per portfolio spec)
- E&O insurance for service interruption
- D&O insurance for founder personal liability
- Business interruption insurance considered Year 2

## Customer compensation matrix

| Outage type | Compensation |
|---|---|
| <2hr | None (within SLA) |
| 2-6hr | ₹100 wallet credit per affected customer |
| 6-24hr | ₹500 wallet credit + apology email |
| >24hr | Full refund of any bookings during outage + ₹500 credit |
| Data breach affecting customer | Full refund + 1 year free Bhakti Pro + apology + remediation |

## Founder mental health (post-crisis)

- Allocate 2 days recovery after any Tier 1 crisis
- Process incident with advisory board within 7 days
- Document lessons learned + share with team
- Avoid blame culture; focus on system improvement
