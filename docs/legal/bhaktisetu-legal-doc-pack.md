# Bhaktisetu Legal Documentation Pack — 5 Core Docs

> Privacy Policy + Cookie Policy + ToS + Refund Policy + DPDP User Rights. Ready for counsel finalisation.

---

## DOC 1 — Privacy Policy (DPDP India + GDPR + CCPA aligned)

**Effective:** 2026-06-13

### 1. Who we are
Bhaktisetu Foundation, Section 8 non-profit registered in India (CIN: [CIN]), operating bhaktisetu.com + apps for India and NRI Hindu families.

### 2. What we collect
- **Account data**: email, phone, name, password (hashed)
- **Identity data**: PAN for 80G receipts, optional NRI tax ID
- **Transaction data**: booking history, payment method (tokenized, never stored)
- **Behavioral data**: page views, search queries, puja preferences (via PostHog)
- **Device data**: IP, browser, OS, device ID (for fraud prevention)
- **Communication data**: WhatsApp opt-in, email preferences

### 3. Why we collect (lawful basis)
- **Account**: explicit consent at signup
- **Transactions**: contractual necessity (puja delivery)
- **Analytics**: legitimate interest + opt-in via cookie banner
- **Communications**: explicit opt-in
- **Fraud prevention**: legitimate interest

### 4. Who we share with
- **Razorpay/Stripe**: payment processing
- **Resend**: email delivery
- **WhatsApp Cloud API**: WA delivery
- **Pandits**: assigned booking only (name + temple + time)
- **PostHog**: anonymised analytics

### 5. How long we retain
- Booking data: 7 years (tax compliance)
- Account data: until deletion request
- Analytics: 12 months (then aggregated)
- Communications: until opt-out

### 6. Your rights (DPDP + GDPR)
- Access your data: /me/privacy/export
- Correct your data: /me/privacy/correct
- Delete account: /me/privacy/erase (30-day cooldown)
- Withdraw consent: /me/privacy/consent
- Audit log: /me/privacy/log

### 7. Cross-border transfer
- Servers: Mumbai (primary) + Singapore (standby)
- NRI access: standard data flows for service delivery
- DPDP/GDPR aligned safeguards

### 8. Contact
- Email: privacy@bhaktisetu.com
- DPO: founder@bhaktisetu.com (Section 8 small org self-DPO)

---

## DOC 2 — Cookie Policy

### What are cookies?
Small files stored by your browser to remember preferences and improve experience.

### Cookies we use

**Essential (always on)**
- Session cookie (login state)
- CSRF token (security)
- Cookie preference (your choice)

**Analytics (opt-in via banner)**
- PostHog distinct_id (user identification for funnels)
- Google Search Console (verification)

**Marketing (opt-in via banner)**
- Google Ads pixel (NRI campaigns)
- Facebook Pixel (NRI re-targeting only)
- Referral cookie `ref` (30-day, per R-Q2-M-011)

### How to manage
- Cookie banner appears on first visit
- Re-prompt every 12 months
- Granular toggle per category
- Browser-level disable always honored

### Contact
cookies@bhaktisetu.com

---

## DOC 3 — Terms of Service

### 1. Acceptance
By using Bhaktisetu, you accept these terms.

### 2. Account
- One person, one account
- 18+ required (parental consent for minors via verified guardian)
- True information required (PAN must match if used for 80G)
- Account suspension for misuse (fraud, abuse of pandit network, etc.)

### 3. Pujas + Services
- Bhaktisetu connects devotees with verified pandits
- Pandits are independent contractors, not employees
- 24-hour video proof guarantee subject to honest pandit performance
- Quality issues escalated to founder mediation

### 4. Pricing + Payment
- Prices in INR (India) / USD/GBP/CAD/AUD (NRI)
- Payment processed via Razorpay (India) / Stripe (NRI)
- 80G receipts auto-issued for India tax (PAN required)
- NRI tax-deductibility varies by country (consult tax advisor)

### 5. Cancellation + Refund
- See dedicated Refund Policy (Doc 4)
- Cancellation rights vary by timing (24hr+ before puja = full refund)

### 6. Conduct
- No harassment of pandits
- No fake bookings or referral abuse
- No use of Bhaktisetu for unlawful purposes
- Account termination for material violations

### 7. Liability limits
- Bhaktisetu provides connection between devotee and pandit
- Not liable for force majeure, natural disasters, pandit illness, etc.
- Maximum liability per incident: ₹50,000 (insurance backed)

### 8. Intellectual property
- Bhaktisetu owns platform IP (code, branding, content)
- Pandits retain their video proof copyright
- User content (testimonials, reviews) licensed to Bhaktisetu for marketing

### 9. Dispute resolution
- 60-day good-faith mediation via founder
- Indian arbitration (Bengaluru) if mediation fails
- Indian law governs

### 10. Changes
- 30-day email notice for material changes
- Continued use after notice = acceptance
- Reject by closing account (no penalty)

---

## DOC 4 — Refund Policy

### Refund eligibility (per R-Q1-L-002)

| Situation | Refund | Timing |
|---|---|---|
| Pandit no-show (verified) | 100% | Auto, 5-7 days |
| Video proof missing >7 days | 100% | Auto |
| User cancels >24hr before | 100% | Auto |
| User cancels 12-24hr before | 50% | Founder review |
| User cancels <12hr | 0% | Discretion |
| Tech failure (Bhaktisetu) | 100% + ₹500 credit | Auto |
| Booking confusion (bug) | 100% + re-book | Auto |

### Refund process
1. Submit request via /support/refund-request
2. CS team reviews within 24 hours
3. Decision communicated in writing
4. Refund to original payment method
5. Timeline: 5-7 business days for completion

### Force majeure exclusions
- Natural disasters
- Government restrictions
- Internet/power outages affecting temple
- COVID-style emergencies (full refund or reschedule)

---

## DOC 5 — DPDP User Rights API Documentation

### Endpoints (per R-Q2-L-003 spec)

#### `GET /api/v1/me/privacy/export`
- Returns JSON dump of all user data
- Format: JSON-LD with categories: profile / bookings / consultations / wallet / consent_history
- Delivery: signed download link valid 7 days
- Frequency limit: 1 request per 30 days

#### `PATCH /api/v1/me/privacy/correct`
- Body: fields to update (name, address, etc.)
- Returns: updated profile + diff log

#### `DELETE /api/v1/me/privacy/erase`
- Starts 30-day cooldown
- During cooldown: account suspended, withdrawal possible
- After 30 days: hard delete, anonymisation of related records

#### `POST /api/v1/me/privacy/erasure/withdraw`
- Cancels pending erasure during cooldown
- Account restored

#### `GET /api/v1/me/privacy/consent`
- Returns current consent state per category

#### `PATCH /api/v1/me/privacy/consent`
- Update consent toggles (analytics, marketing, etc.)
- Effect: immediate (next page load reflects)

#### `GET /api/v1/me/privacy/log`
- Audit log of all consent changes
- Last 365 days, paginated

### Admin operations

#### `GET /api/v1/admin/dsar/pending`
- ADMIN-only
- Lists all pending DSAR (Data Subject Access Request) tickets
- Sorted by SLA breach risk
- Founder reviews daily

### Compliance metrics
- Target: 100% DSAR processed within 30 days (legal requirement)
- Target: 95% DSAR processed within 7 days (excellence)
- Target: 0 missed deadlines (legal exposure)

---

## Implementation gaps (founder + counsel)

1. Counsel review of all 5 docs (₹50K-₹1L Q1)
2. Cookie banner UI implementation (CMP code)
3. DSAR endpoint implementation per R-Q2-L-003 spec
4. Admin DSAR dashboard
5. Quarterly compliance audit
6. Annual DPDP training for any new contractors

## Lifecycle

- Annual review (every Jan 1)
- Update upon material business change
- 30-day notice to users for material changes
- Public changelog: bhaktisetu.com/legal/changelog
