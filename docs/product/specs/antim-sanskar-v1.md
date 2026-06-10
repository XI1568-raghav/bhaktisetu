# Antim Sanskar — Product Specification v1

> Roadmap item: R-Q4-P-001. Unblocks engineering build R-Q4-E-001. Spec-only, no code in this PR. Status: DRAFT for founder + senior-pandit review.

## Mission

Family in grief. We serve, not sell. When a family books antim sanskar (Hindu last rites) on Bhaktisetu, a qualified pandit reaches the location within four hours, conducts the rites per the family's tradition, and an invoice goes out only after the service is rendered. Cost is not the first conversation. Dignity is. This product exists because death is non-negotiable, and dignifying logistics is the smallest service we can do for someone who has just lost a loved one.

## Non-goals

The following are explicit non-goals. Engineering MUST NOT implement them. Marketing MUST NOT request them.

- No upsells of any kind during the booking flow (no flowers, no urns, no premium packages)
- No cross-sell to puja bookings, astrology consultations, or store products within the flow OR within thirty (30) days of service completion
- No review or rating prompt within thirty (30) days post-service
- No photos of deceased, pyres, or grief imagery in any UI element
- No urgency banners, countdown timers, "limited slots", or scarcity language
- No discount codes, "introductory pricing", "early-bird", or any marketing language
- No A/B testing of grief copy without senior-pandit review
- No third-party analytics fired from this flow (no PostHog, no GTM, no Sentry breadcrumbs on grief screens; only server-side request logging for SLA enforcement)
- No referral mechanic, no "share with family" social buttons
- No retargeting pixel, no Meta or Google ads pixel anywhere in this flow

## Personas

**Persona 1 — Bereaved primary coordinator** (most common)
Age 35–55, son or daughter of deceased, in family home managing logistics. Phone in one hand, calling relatives with the other. Low cognitive bandwidth. Needs the simplest possible interface, large fonts, no decisions about price or tier. Will not read terms. Will not register an account. Wants a human voice within minutes of submitting the booking.

**Persona 2 — Extended family member coordinating from another city**
Age 28–60, niece or nephew or cousin abroad, NRI in US/UK/Australia, woke up to news. Cannot fly back in time. Wants to ensure pandit reaches the family. Will use desktop or laptop, likely uses email more than WhatsApp. Needs language toggle (Hindi primary on confirmation, English option). Needs visible reassurance the pandit has been dispatched.

**Persona 3 — Elderly spouse needing phone support**
Age 65+, surviving spouse, may not own a smartphone or use the web. A neighbour or relative may complete the form. The elderly spouse may insist on speaking to a human. Phone-support number must be visible on every screen of the flow, including confirmation. Ops team must be trained to handle the call gently.

## Booking flow — 4 steps

Single-page form with progressive disclosure. No multi-page wizard with progress bar (progress bars trivialise the moment). Each step's content appears below the previous on the same screen, scroll-only. Persistent "Call us" footer with phone number throughout.

### Step 1: Departed soul details

Fields:
- Name of departed
- Age (free text, "elderly" acceptable)
- Gender (Male / Female / Prefer not to say)
- Place where the soul departed (city + optional address)
- Approximate time of departure (date + time, "I don't know exactly" acceptable)

No required fields beyond name + gender. If "I don't know" selected for time, we use submission time minus six hours as planning baseline.

### Step 2: Service location and time

Fields:
- Service location (address line + city; map pin optional)
- Preferred time: radio toggles "As soon as possible (within 4 hours)" (default) / "Specific time" (date+time picker)
- Tradition / sampradaya: Sanatani / Arya Samaj / Vaishnav / Shaiva / Other / Family will guide pandit (default)
- Language preference for pandit: Hindi / Sanskrit + Hindi / Regional language (single dropdown, optional)

### Step 3: Family contact and one secondary contact

Fields:
- Primary contact: name + phone (required) + WhatsApp number (defaults to phone)
- Secondary contact: name + phone (required) — for fallback if primary unreachable
- Optional: email (any one of the two contacts)

No password creation. No account signup. The phone numbers alone identify the booking. A magic-link to view status is sent to the email (if provided) and as a SMS shortlink.

### Step 4: Confirm and assign

Single-screen summary of Steps 1–3. No price. No payment. No "Place order" button. The submit button reads "Request pandit". On submission:

> "We have received your request. Our team will reach you within 10 minutes. A pandit will be at the location within 4 hours."

ETA placeholder appears (`Pandit assignment in progress — typically within 30 minutes`). Status updates auto-refresh every 60 seconds. Once pandit is assigned, ETA shows pandit name + photo (head-and-shoulders, neutral pose, not posed-with-deity) + approximate arrival time.

## Pandit dispatch SLA

**Headline SLA**: pandit physically at service location within four (4) hours of booking submission. Measured from `bookings.created_at` to first geofence ping near `service_location` in `pandit_locations` table.

**Dispatch queue prioritization**:
- FIFO strictly. No surge pricing. No "VIP queue". If a family from Mumbai books and a family from Pune books five minutes later, both get dispatched in receipt order regardless of any other factor.
- Religious-holiday exception: during Pitru Paksha or other recognised high-volume periods, queue is extended but FIFO is preserved within each city.

**Pandit notification flow**:
1. Ops system identifies pandit(s) within 25 km of service location, available, with last-rites certification, ranked by (a) distance ascending (b) past-12-month rating descending (c) past-7-day fatigue ascending.
2. Top-ranked pandit receives, in parallel: SMS, WhatsApp message with booking details + 4-hour SLA, and an outbound voice call to their primary number.
3. Pandit must acknowledge by responding "YES" to WhatsApp OR pressing 1 on the voice call within ten (10) minutes.
4. If no acknowledgement in 10 minutes, system auto-dispatches to next-ranked pandit and notifies ops.
5. If three pandits in succession fail to acknowledge, ops human picks up the phone and calls each of them; simultaneously begins 50km-radius fallback search.

**Geo-radius**:
- Primary: 25 km of service location, 4-hour SLA disclosed.
- Fallback: 50 km, 6-hour SLA disclosed to family with apology message in the WhatsApp group chat (see next section).
- No service: if no pandit within 50 km can be confirmed within 30 minutes of booking, ops manually calls family to explain and offers a partner-network referral (see open questions).

**Escalation matrix**:
- T+10 min, no pandit ack: re-dispatch to next-ranked
- T+30 min, no ack from any: ops human takes over
- T+60 min, no pandit confirmed: ops calls family
- T+4 hr, pandit not on-site (per geofence): ops escalates, family proactively informed, fee waiver applied

**SLA breach consequence**: family pays zero. The dignity promise is unconditional.

## Family coordination chat

A WhatsApp group is created on booking confirmation, named `Bhaktisetu — Antim Sanskar for [departed name]`. Members:
- Primary contact (added by phone number)
- Secondary contact (added by phone number)
- Assigned pandit (added when dispatch completes)
- Bhaktisetu ops bot (sends automated milestones)
- One Bhaktisetu ops human (silent monitor unless escalation)

Implementation: existing WhatsApp Business Cloud API integration (verify path before R-Q4-E-001 build; if absent, use `apps/api/src/lib/whatsapp.ts` or create). The chat is the canonical coordination channel — not in-app chat, not email. Reason: family already has WhatsApp open during grief; we go to them.

Bot capabilities:
- Posts pandit-ETA updates as they refresh
- Posts a samagri checklist tailored to selected tradition + service location, with "fetch from temple" / "fetch from market" annotations
- Pins location pin if family has not yet shared
- Pushes ops broadcast messages (e.g. delay notice, weather advisory)
- Does NOT post promotional content, NEVER suggests other Bhaktisetu services, NEVER sends post-service surveys before the 30-day window expires
- Pandit and family can converse freely; bot is silent unless explicitly triggered

After service completion, the group remains active for 7 days for follow-up coordination (e.g. asthi visarjan), then is archived (read-only) for 90 days, then auto-deleted per DPDPA storage-limitation principle.

## Payment model

**Headline rule**: zero payment upfront. No card capture. No tokenization. No "₹0 hold". Family must not see a payment screen during booking.

**Post-service invoicing**:
- T+0 (pandit completes service, marks `status = completed` from their app): grace clock starts
- T+24 hours: invoice generated and sent via WhatsApp message in the family group chat AND via email (if provided)
- Invoice contents: service performed, pandit name, dakshina amount (see tiers below), Bhaktisetu coordination fee (15% of dakshina, capped at ₹1,500), UPI link, "Pay when you're ready" footer
- T+7 days: gentle reminder via WhatsApp from ops human (not bot), polite tone, no urgency
- T+30 days: second reminder, offer to discuss any concerns
- T+60 days: write-off; account marked `bad_debt = true`; no further contact

**Pricing tiers** (founder must confirm or revise before R-Q4-E-001):
- Tier 1 — Standard: ₹5,100 dakshina (priest-recommended customary amount) + ₹765 Bhaktisetu fee = `[TBD-founder]`
- Tier 2 — Extended (3-day kriya): ₹11,000 + ₹1,500 fee = `[TBD-founder]`
- Tier 3 — Full 13-day antyeshti: ₹21,000 + ₹1,500 fee = `[TBD-founder]`

Tier selected automatically by service type chosen in Step 2 ("As soon as possible" defaults to Tier 1; family informed via WhatsApp post-service which tier was rendered, can request adjustment).

**Refund/dispute path**:
- Family disputes the service quality: refer to refund-policy-v2-FINAL.md Clause 3.3 video-proof investigation (adapted: pandit attestation + family interview instead of video). Bhaktisetu may waive the coordination fee at its discretion as a goodwill gesture.
- Pandit no-show despite SLA met (geofenced inside the 4hr window but family disputes presence): waive everything, conduct internal investigation, treat as ops failure.

**Bad-debt acceptance**:
Target ≤ 5% non-payment rate. Above 5%, ops investigates per-pandit and per-region patterns. Bad debt is treated as the cost of dignity, not a problem to engineer away. We do not enable any of: auto-deduction from saved payment methods, third-party collections, account lock, blacklisting, social-pressure messaging.

## Grief-sensitive copy review checklist

Every piece of copy in the antim sanskar flow MUST pass these checks before merge. Senior pandit (named in Open Questions) signs off on the full inventory before first publish, and on any change thereafter.

- [ ] No exclamation marks anywhere in the flow, in any language
- [ ] No "Congratulations" — replaced with "Confirmed" or "Received"
- [ ] No "Success" or "Successful" as standalone — replaced with "Done" or context-specific phrasing
- [ ] No "Awesome", "Great", "Perfect", "Excellent" — replaced with neutral acknowledgements
- [ ] No countdown timers or "X minutes remaining" pressure language; ETA shown as plain time only
- [ ] No "limited slots", "only N left", "spaces filling fast", or any scarcity framing
- [ ] No emoji anywhere in the flow except a single 🪔 (diya) on the final confirmation screen
- [ ] All call-to-action buttons use verbs of service ("Request pandit", "Send details", "Continue"), never "Book now", "Get started", or commercial verbs
- [ ] Hindi and English bilingual throughout; Hindi (Devanagari) is primary on confirmation, summary, and WhatsApp messages; English shown as secondary or via language toggle
- [ ] No images of deceased people, pyres, cremation grounds, or grief-coded imagery; only line-art of diyas, lotus, or temple silhouettes in muted saffron
- [ ] Vocabulary blocklist: "deal", "offer", "save (money)", "discount", "premium", "VIP", "exclusive", "elite"; quality assurance grep enforced in CI
- [ ] Every confirmation message reviewed by named senior pandit before first publish; any post-publish copy change re-triggers the review
- [ ] Tone test: every copy block read aloud by a Bhaktisetu team member who has lost a parent in the last 24 months; their veto is binding
- [ ] Legal disclaimer about partner cremation grounds included in confirmation email/SMS, written in plain language, not legalese
- [ ] Phone-support number visible on every screen including confirmation; not buried in footer

## Data model sketch

Feeds R-Q4-E-001 engineering. Names are suggestive, ORM choice deferred to engineering. SQL form for clarity:

```sql
CREATE TABLE antim_sanskar_bookings (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref              TEXT UNIQUE NOT NULL,            -- AS-YYYYMMDD-XXXXX
  deceased_name            TEXT NOT NULL,
  deceased_age             TEXT,                            -- free text, "elderly" allowed
  deceased_gender          TEXT,                            -- 'M' | 'F' | 'X'
  death_time               TIMESTAMP WITH TIME ZONE,        -- nullable; null = "I don't know"
  death_place              TEXT,
  service_location_address TEXT NOT NULL,
  service_location_city    TEXT NOT NULL,
  service_location_geo     GEOMETRY(Point, 4326),           -- PostGIS, nullable
  service_time_preferred   TIMESTAMP WITH TIME ZONE,        -- nullable; null = "ASAP"
  tradition                TEXT,                            -- 'sanatani' | 'arya_samaj' | etc | NULL = pandit guides
  language_preference      TEXT,                            -- 'hi' | 'sa_hi' | 'regional' | NULL
  primary_contact_name     TEXT NOT NULL,
  primary_contact_phone    TEXT NOT NULL,                   -- E.164
  primary_contact_whatsapp TEXT NOT NULL,                   -- defaults to phone
  secondary_contact_name   TEXT NOT NULL,
  secondary_contact_phone  TEXT NOT NULL,
  email                    TEXT,                            -- optional
  assigned_pandit_id       UUID REFERENCES pandits(id),     -- nullable until dispatch
  pandit_assigned_at       TIMESTAMP WITH TIME ZONE,
  pandit_arrived_at        TIMESTAMP WITH TIME ZONE,        -- from geofence
  service_completed_at     TIMESTAMP WITH TIME ZONE,
  status                   TEXT NOT NULL DEFAULT 'pending_dispatch',
                                                            -- 'pending_dispatch' | 'pandit_assigned'
                                                            -- | 'pandit_en_route' | 'pandit_arrived'
                                                            -- | 'service_in_progress' | 'completed'
                                                            -- | 'cancelled' | 'no_service_available'
  sla_deadline             TIMESTAMP WITH TIME ZONE NOT NULL, -- created_at + 4hr (or +6hr fallback)
  sla_breach_logged        BOOLEAN DEFAULT FALSE,
  pricing_tier             TEXT,                            -- 'standard' | 'extended' | 'full_13_day'
  invoice_status           TEXT DEFAULT 'not_yet_due',
                                                            -- 'not_yet_due' | 'sent' | 'reminded_t7'
                                                            -- | 'reminded_t30' | 'paid' | 'bad_debt'
  invoice_amount_inr       INTEGER,                         -- in paise, populated on completion
  invoice_paid_at          TIMESTAMP WITH TIME ZONE,
  whatsapp_group_id        TEXT,                            -- WhatsApp Business API group ref
  created_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_as_status_sla ON antim_sanskar_bookings (status, sla_deadline);
CREATE INDEX idx_as_assigned_pandit ON antim_sanskar_bookings (assigned_pandit_id) WHERE status NOT IN ('completed','cancelled');
CREATE INDEX idx_as_invoice_followup ON antim_sanskar_bookings (invoice_status, service_completed_at) WHERE invoice_status IN ('sent','reminded_t7','reminded_t30');

CREATE TABLE antim_sanskar_dispatch_attempts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id               UUID NOT NULL REFERENCES antim_sanskar_bookings(id) ON DELETE CASCADE,
  pandit_id                UUID NOT NULL REFERENCES pandits(id),
  attempted_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ack_received_at          TIMESTAMP WITH TIME ZONE,
  ack_channel              TEXT,                            -- 'whatsapp' | 'voice' | 'sms'
  outcome                  TEXT NOT NULL DEFAULT 'pending'  -- 'pending' | 'accepted' | 'timed_out' | 'rejected'
);
```

Pricing tier remains TBD pending founder; engineer codes the enum but leaves amounts as a config constant.

## Wireframes

Five ASCII wireframes follow. Each is illustrative; visual designer to translate to Figma honouring the dignity constraints stated above.

### Wireframe 1 — Step 1 (Departed soul details)

```
+--------------------------------------------------------------+
| 🪔  Bhaktisetu — Antim Sanskar                              |
| Phone support: +91-XXXX-XXXXXX  ----------------- हिंदी / EN |
+--------------------------------------------------------------+
|                                                              |
|  आपके परिवार में हुई हानि के लिए हमें खेद है।                |
|  कृपया कुछ विवरण साझा करें — हमारी टीम 10 मिनट में             |
|  आपसे संपर्क करेगी।                                            |
|                                                              |
|  We are sorry for your loss. Please share a few details      |
|  and our team will reach you within 10 minutes.              |
|                                                              |
|  ┌─────────────────────────────────────────────────────────┐ |
|  │ नाम / Name of departed                                   │ |
|  │ [ ____________________________________ ]                 │ |
|  │                                                         │ |
|  │ उम्र / Age (or "elderly")                                │ |
|  │ [ ____________________ ]                                 │ |
|  │                                                         │ |
|  │ लिंग / Gender   ( ) पुरुष/Male  ( ) महिला/Female         │ |
|  │                ( ) Prefer not to say                    │ |
|  │                                                         │ |
|  │ कहाँ / Where they departed (city)                        │ |
|  │ [ ____________________________________ ]                 │ |
|  │                                                         │ |
|  │ समय / When (approximate)                                 │ |
|  │ [ Date ▼ ] [ Time ▼ ]    [ ] I don't know exactly       │ |
|  └─────────────────────────────────────────────────────────┘ |
|                                                              |
|                                              [ Continue ▼ ]  |
+--------------------------------------------------------------+
| Need to talk? Call +91-XXXX-XXXXXX. We are here.            |
+--------------------------------------------------------------+
```

### Wireframe 2 — Step 2 (Service location and time)

```
+--------------------------------------------------------------+
| 🪔  Bhaktisetu — Antim Sanskar                              |
| Phone support: +91-XXXX-XXXXXX  ----------------- हिंदी / EN |
+--------------------------------------------------------------+
|                                                              |
|  सेवा कहाँ और कब / Where and when                            |
|                                                              |
|  ┌─────────────────────────────────────────────────────────┐ |
|  │ सेवा स्थल / Service location                              │ |
|  │ [ Address line 1 _____________________________ ]         │ |
|  │ [ City __________________ ]                              │ |
|  │ [ + Drop a map pin (optional) ]                          │ |
|  │                                                         │ |
|  │ समय / Time                                               │ |
|  │ (●) यथाशीघ्र / As soon as possible (within 4 hours)      │ |
|  │ ( ) निर्धारित समय / Specific time                          │ |
|  │     [ Date ▼ ]  [ Time ▼ ]                              │ |
|  │                                                         │ |
|  │ परंपरा / Tradition                                       │ |
|  │ [ Sanatani  ▼ ]                                          │ |
|  │   options: Sanatani / Arya Samaj / Vaishnav / Shaiva    │ |
|  │            / Other / Family will guide pandit (default) │ |
|  │                                                         │ |
|  │ भाषा / Language preference for pandit (optional)         │ |
|  │ [ Hindi  ▼ ]                                             │ |
|  └─────────────────────────────────────────────────────────┘ |
|                                                              |
|                            [ ◀ Back ]    [ Continue ▼ ]     |
+--------------------------------------------------------------+
```

### Wireframe 3 — Step 3 (Family contact)

```
+--------------------------------------------------------------+
| 🪔  Bhaktisetu — Antim Sanskar                              |
+--------------------------------------------------------------+
|                                                              |
|  परिवार से संपर्क / Family contact                            |
|  हम आपसे फोन और WhatsApp पर समन्वय करेंगे।                    |
|                                                              |
|  ┌─────────────────────────────────────────────────────────┐ |
|  │ प्राथमिक संपर्क / Primary contact                          │ |
|  │ Name:      [ ____________________________ ]              │ |
|  │ Phone:     [ +91 _________________ ]                     │ |
|  │ WhatsApp:  [ same as phone        ]  (uncheck to change) │ |
|  │                                                         │ |
|  │ द्वितीयक संपर्क / Secondary contact (in case primary       │ |
|  │ is unreachable)                                          │ |
|  │ Name:      [ ____________________________ ]              │ |
|  │ Phone:     [ +91 _________________ ]                     │ |
|  │                                                         │ |
|  │ Email (optional, for status link):                       │ |
|  │ [ ____________________________________ ]                 │ |
|  └─────────────────────────────────────────────────────────┘ |
|                                                              |
|  No account or password is created.                          |
|                                                              |
|                            [ ◀ Back ]    [ Continue ▼ ]     |
+--------------------------------------------------------------+
```

### Wireframe 4 — Step 4 (Confirm + assigned)

```
+--------------------------------------------------------------+
| 🪔  Bhaktisetu — Antim Sanskar                              |
+--------------------------------------------------------------+
|                                                              |
|  पुष्टि / Please confirm                                      |
|                                                              |
|  Departed:      [ name ]                                     |
|  Service at:    [ city, time ]                               |
|  Tradition:     [ tradition ]                                |
|  Primary:       [ name, phone ]                              |
|  Secondary:     [ name, phone ]                              |
|                                                              |
|                                                              |
|                       [ Request pandit ]                     |
|                                                              |
|                                                              |
|  No payment is required now. After the service is            |
|  completed, our team will share the dakshina and             |
|  coordination details with you on WhatsApp.                  |
|                                                              |
+--------------------------------------------------------------+

(on submit, screen replaces with:)

+--------------------------------------------------------------+
| 🪔  आपकी विनम्र प्रार्थना हम तक पहुँच गई है।                    |
|                                                              |
| Your request has reached us.                                 |
|                                                              |
| Our team will reach you within 10 minutes on                 |
| +91-XXXXX-XXXXX. A pandit will be at the location            |
| within 4 hours.                                              |
|                                                              |
| Reference: AS-20260611-2K8R5                                 |
|                                                              |
| A WhatsApp group will be created with you, the assigned      |
| pandit, and our coordinator shortly.                         |
|                                                              |
|                                                              |
+--------------------------------------------------------------+
```

### Wireframe 5 — Family WhatsApp group

```
WhatsApp — group chat
─────────────────────────────────────────────────────────
  Bhaktisetu — Antim Sanskar for [departed name]
  (4 participants)

  Bhaktisetu (bot)                              10:14 AM
  ────────────────────────────────────────────────────
  नमस्ते। आपकी विनम्र प्रार्थना मिल गई है।
  Pandit assignment will be confirmed within
  30 minutes. Reference AS-20260611-2K8R5.

  Bhaktisetu (bot)                              10:38 AM
  ────────────────────────────────────────────────────
  Pandit Shri Ramesh ji confirmed.
  ETA: 12:30 PM (within SLA).
  📞 Pandit ji: +91-XXXX-XXXXXX

  Bhaktisetu (bot)                              10:39 AM
  ────────────────────────────────────────────────────
  Samagri checklist (Sanatani tradition):
   • ghee, cotton wicks, sandalwood
   • tulsi leaves, gangajal
   • white cloth (4 m), fresh flowers
  Items marked "fetch from temple" — pandit ji will bring.
  Other items — please arrange or let us know.

  Pandit Shri Ramesh ji                         11:55 AM
  ────────────────────────────────────────────────────
  मैं रास्ते में हूँ, 30 मिनट में पहुँच जाऊँगा।

  Family member (primary contact)               11:56 AM
  ────────────────────────────────────────────────────
  धन्यवाद पंडित जी।

─────────────────────────────────────────────────────────
[type a message]                                   [send]
```

## Success criteria

From roadmap item (verbatim):
- Populate during first sub-agent emission cycle

Operational criteria added by this spec:
- Pandit on-site within four (4) hours of booking: ≥ 95% of bookings
- Family CSAT measured by a single SMS three (3) months post-service (single 1–5 scale + open text): ≥ 4.5 / 5 average
- Zero upsell complaints in the 30 days post-service window: target 100%
- Bad-debt rate (invoices outstanding 60+ days): ≤ 5% of completed services
- WhatsApp group created within 5 minutes of booking submission: 100%
- Pandit acknowledgement within 10 minutes of first dispatch attempt: ≥ 80%
- First-attempt dispatch success (no re-routing to second pandit): ≥ 70%

## Open questions

1. **Pricing tiers**: founder must confirm or revise the ₹5,100 / ₹11,000 / ₹21,000 figures, and the 15% / ₹1,500-capped coordination fee. Engineering blocks on this for invoice generation.
2. **Pandit network capacity**: do we have last-rites-certified pandits in our top-10 launch cities? If not, which cities go live in v1 and which wait for v2?
3. **Cremation ground partnerships**: are we operating only as a pandit-dispatch service, or are we also coordinating with cremation grounds (electric crematorium, traditional ghats)? If the latter, legal exposure under municipal cremation regulations and possible Hindu Religious & Charitable Endowments Act registration in some states. Counsel to advise.
4. **Senior pandit reviewer**: founder must name the senior pandit who signs off on the grief-copy checklist and on every subsequent copy change. Recommend a Foundation advisor with at least 20 years' antyeshti experience.
5. **Bad-debt tolerance**: confirm 5% is acceptable to the Foundation board, and what triggers escalation review (e.g. consecutive month above 7%).
6. **WhatsApp Business API entitlement**: do we have a `MESSAGE_TEMPLATE` approved for the post-service invoice message and reminders? Approval can take 5–10 business days.
7. **Language coverage**: Hindi and English are baseline. Should we add Marathi, Tamil, Telugu, Bengali in v1 or v2? Each adds translation + senior-pandit review effort.
8. **Asthi visarjan as a separate v1.1 feature**: should the 7-day post-service group window also offer to book the asthi visarjan trip (e.g. Hardwar, Prayagraj)? If yes, this contradicts the no-upsell rule unless framed as a "continue the rites" extension within the same booking, not a new SKU.
9. **Out-of-network fallback**: if no Bhaktisetu pandit available within 50 km within 30 minutes, do we partner with a directory (e.g. local Brahmin samajs) and refer, or do we hold the family and try harder? Recommendation: refer and call ops human; founder to confirm.
10. **Data retention beyond 90 days**: deceased details fall under DPDPA Section 11 (personal data of deceased — special handling). Counsel to confirm retention timeline; default proposed 90 days post-service then anonymise.

## Closes
Q-C-20260610T1623-R-Q4-P-001
