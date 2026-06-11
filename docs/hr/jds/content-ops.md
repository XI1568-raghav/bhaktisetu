# Content Operations — Contractor (Part-Time)

## About Bhaktisetu

Bhaktisetu is India's devotional super-app (`darshya.online`) — live darshan, video-proof puja booking, gaushala seva, gurukul admissions, devotional commerce. We are building the verified-temple catalog one entry at a time, in multiple Indic languages, with religious accuracy. Solo-founder, $0 budget.

## Role Snapshot

- **Type**: Contractor, part-time (NOT full-time employment)
- **Location**: India remote
- **Hours**: ~20 hours/week
- **Compensation**: ₹20,000 / month
- **Reports to**: Founder
- **Start**: Rolling, fired when pending-temple queue > 500 or content-moderation queue > 15h/week (see `docs/hr/jds/README.md` sequencing)

## Responsibilities

- Verify + enter temple records: name, presiding deity, full postal address, GPS coordinates, darshan timings, festival calendar overlay, 3–6 representative photos, official website / contact, history blurb (3 paragraphs minimum).
- Moderate temple + content submissions per the content guidelines (you will help author v1).
- Tag every temple by tradition (Vaishnav / Shaiva / Shakta / Smarta / Jain / Sikh / regional folk), sampradaya, geographic cluster (Char Dham, Jyotirlinga, Shakti Peetha, Pancha Bhoota etc).
- Cross-check temple claims against ASI (Archaeological Survey of India) lists, state-government religious-endowment registers, established devotee community references (NOT random web claims).
- Reject submissions that fail religious-accuracy checks; document the rejection reason for the submitter.
- Coordinate with priest-onboarding queue: when a priest profile lands, link to their primary temple within 24h.
- Write devotee-facing temple descriptions in English PLUS one Indic language (your native), preserving correct Devanagari / regional script transliteration.

## Success Metrics

### 30 days

- 100 temples verified + entered to spec
- Moderation SOP doc shipped to `docs/content/moderation-sop.md` (you author, founder reviews)
- Content guidelines v0.1 drafted (taxonomy, photo standards, religious-accuracy rules)

### 60 days

- 500 temples in catalog
- Content guidelines v1 published + linked from admin dashboard
- Average 12–15 temple entries per working day sustained

### 90 days

- 1000+ temples in catalog
- < 24h moderation queue SLA (any new submission decisioned within 24h)
- Zero religious-accuracy complaints from devotee community on entered records
- Tagging coverage ≥ 95% (every temple has tradition + sampradaya + cluster tags)

## You Are

- Reading + writing proficient in English PLUS at least one of: Sanskrit / Hindi / Tamil / Telugu / Bengali / Kannada / Malayalam / Marathi / Gujarati
- Working knowledge of Sanatana Dharma traditions — you know the difference between Vaishnav and Shaiva, can name the four Char Dhams, recognise common deity iconography in photos
- Comfortable with admin dashboards, Google Sheets fallback, basic image-cropping tools (Squoosh / Photopea)
- Detail-obsessed — typos in a deity's name are not acceptable
- Independent and unsupervised for half-day shifts

## Bonus

- Religious-studies / Indology / Sanskrit academic background (BHU, Sampurnanand, Tirupati Univ, Somaiya — see `docs/company/06-talent.md` §3 line 34)
- Prior content-moderation experience at a UGC platform
- Photography or photo-editing skills for hero-image curation

## Compensation Band

- **Base**: ₹20,000 / month
- **Performance bonus**: ₹2,000/month if temple-entry rate ≥ 15/day sustained over 90 days
- **Equity**: None (contractor; equity reserved for founding team only)
- **Review cadence**: every 3 months. Contract is 6-month renewable.
- **No PF, gratuity, paid leave** — contractor terms only.

## Application Process

1. Email `founder@darshya.online` (founder to confirm — see `docs/hr/jds/README.md`) with subject **"Content Ops — [Your Full Name]"**
2. **Attach 1 file**: a sample temple entry for a temple of your choice, with:
   - Full name (English + native script)
   - Presiding deity
   - Postal address
   - Brief history (3 paragraphs in English + 3 paragraphs in your native Indic language)
   - 3 cited sources (ASI / state register / scholarly book — not random Wikipedia or blog posts)
3. Response SLA from us: 5 business days
4. Process:
   - Stage 1 — async sample evaluation (48h)
   - Stage 2 — 30-min video interview, primarily in English with a section in your native language
   - Stage 3 — 2-week paid trial at pro-rated rate (₹10,000); we evaluate quality + speed
   - Stage 4 — contract signed if mutual fit

## References

- Source role: `docs/company/06-talent.md` §3 line 34 (Priest verification reviewer + Internshala sourcing rate range)
- AI-augmented moderation context: `docs/company/06-talent.md` §4 line 43 (Claude reads credentials, you review summaries)
- Existing temple data model: `apps/api/prisma/schema.prisma` model `Temple` (line 240) and `TempleProfile` (line 879)

---

Closes: Q-C-20260610T1623-R-Q1-H-002 (2/3)
