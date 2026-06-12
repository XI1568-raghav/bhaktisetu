# Personalized Outreach v2 — Per-Temple Custom Email Body

> **Roadmap item**: R-Q1-M-014 (P0) · **Authored**: 2026-06-12 · **Replaces**: boilerplate outreach v1 · **Owner**: founder + future CS hire
>
> **Goal**: replace the boilerplate outreach template with a tokenized per-temple custom body that references SPECIFIC observable details about each recipient. Reply-rate target: 2x boilerplate baseline (typically 4% → 8%+).

## Why personalization > boilerplate

Empirical signal from `docs/agent-reports/2026-06-12-warm-network-reachout-prep.md` math: warm-network reply rate 35-40% vs cold boilerplate 3-5%. The delta = personalization signal that says "I actually researched you".

Personalization signals worth 5-8 minutes per recipient:
- **Specific temple observation**: "Your Banashankari Devi Friday darshan crowd indicates..."
- **Their cited milestone**: "Your 50K-cow Pathmeda gausala census"
- **Their recent press / video / event**: "Your YouTube series on Vedic Vivah ceremonies"
- **Mutual reference**: "{warm-intro person} mentioned you specifically"

NOT personalization (just dressed-up boilerplate):
- "Dear {Name}" alone
- "Your great work in {city}"
- "Your beautiful temple"

## v2 template structure

### Replaces v1 boilerplate (from previous outreach attempts)

```
[v1 boilerplate — what was sent before, reply rate ~4%]:

Subject: Bhaktisetu Foundation — partnership opportunity

Pranam,

We're a Section 8 non-profit running a devotional platform. We'd like
to partner with your temple. 60-80% commission. Video proof mandatory.

Reply if interested.
```

```
[v2 personalized — to be sent in CS-005 + future outreach, target 8%+ reply]:

Subject: {temple/role}-specific subject hook

Pranam {Name} ji,

{Observation sentence — what I noticed about their work / temple / role}.

{Specific value-prop tied to that observation}.

Indicative pilot terms (concrete to their context):
- {Customised payout split}
- {Customised onboarding ask}
- {Customised tech requirement}

15-min call this week?
Calendly: {founder Calendly URL}

Bhaktisetu Foundation: active 80G + CSR-1.

Pranam,
{Founder name}
{phone} · {email}
```

## v2 token taxonomy (per role)

### TEMPLE recipient — required research per lead

```
{tokens}:
{Name} — primary trustee / TP name (from temple website OR Karnataka Endowment Dept registry)
{temple_name} — exact temple name (verify spelling)
{city} — city (sanity check sampradaya cluster)
{recent_event} — one of: weekly darshan crowd / festival event / publication / sermon series
{sampradaya} — Smarta / Vaishnav / Madhva / etc — never call wrong
{cited_observation} — 1-sentence specific to that temple's reputation

Example filled:

Pranam Madhu Pandit ji,

Your ISKCON Hare Krishna Hill Bengaluru — Akshaya Patra integration is
one of the cleanest devotional + service-org partnerships in India. We
referenced it specifically when designing Bhaktisetu's Foundation +
non-profit structure.

Indicative pilot terms for Bhaktisetu × ISKCON HKH:
- 80% of devotee payment to HKH (Foundation retains 15%, Razorpay 5%)
- Video proof from your priest within 72h of puja
- Co-branded landing page for HKH pujas on Bhaktisetu
- No upfront fee, 90-day pilot

15-min call this week?
Calendly: {founder Calendly URL}

[rest of footer]
```

### PANDIT recipient

```
{tokens}:
{Name} — pandit ji's name
{sampradaya} — Vedic / KP / Lal Kitab / Naadi / etc.
{years_experience} — published in marketplace profile OR known from network
{specialty} — type of puja they're known for
{language_fluency} — Hindi/Sanskrit/Tamil/Telugu/Marathi/Bengali

Example filled:

Namaste Pandit Ramesh Iyer ji,

Aap Smarta sampradaya ke 18-year veteran hain — 142 weddings on
Bhaktisetu pilot pandit-list mein already aapka naam recommend hua
hai. Tamil + Sanskrit fluency NRI users ke liye sabse high-demand
skill set hai humare paas.

[rest of pitch]
```

### GAUSHALA manager recipient

```
{tokens}:
{Name} — manager / trustee name
{gaushala_name} — exact gaushala name
{cow_count} — verified census from Animal Husbandry Dept
{state} — state context for 80G angle

Example filled:

Pranam Mahatma ji,

Pathmeda Gausewa Samiti ke 50,000+ cow census — India ka largest. Jo
infrastructure aapne build kiya hai, NRI donors specifically search
karte hain "largest authentic Indian gaushala" — yeh hum data mein
dekhte hain.

[rest of pitch]
```

### ASTROLOGER recipient

```
{tokens}:
{Name} — astrologer name
{paradigm} — Vedic / KP / Lal Kitab / Naadi
{platform_presence} — YouTube channel / AstroSage rating / Instagram followers / etc.
{recent_content} — specific recent video / post / publication

Example filled:

Namaste {Name},

Your YouTube series on "Lal Kitab remedies for career stagnation" is
the most rigorous Lal Kitab content in English I've found across
India astrologer creator-base. Bhaktisetu specifically needs Lal
Kitab depth for our Punjab + Delhi NRI users.

[rest of pitch]
```

## Research workflow (founder side, per lead)

Per lead, founder spends 5-8 minutes on:

```markdown
- [ ] Open lead's temple/pandit/gaushala/astrologer website OR LinkedIn
- [ ] Find 1 specific recent activity (festival event / publication / video / event)
- [ ] Cross-reference w/ Bhaktisetu's relevant feature (sankalp / puja booking / video proof / 80G receipt)
- [ ] Fill 5-7 tokens in template (no token left blank — if can't find, skip this lead)
- [ ] Read aloud — does it sound like a human wrote it OR like template-mail-merge?
- [ ] If sounds template-y → spend 2 more min on personalization
- [ ] Send
```

50 leads × 7 min = 6 hours. Worth it: at 8% reply rate vs 4% baseline = 4 extra qualified replies → 1-2 extra signings.

## v2 implementation roadmap

### v2.0 (this cycle) — TEMPLATE TEXT shipped

This doc IS the v2 spec. Founder uses templates for all outreach starting next week.

### v2.1 (next cycle) — TEMPLATE STORAGE shipped

Move templates to `apps/api/src/lib/outreach-templates/v2/` as TypeScript template strings:

```typescript
// apps/api/src/lib/outreach-templates/v2/temple.ts
export const TEMPLE_V2 = ({
  Name, temple_name, city, recent_event, sampradaya, cited_observation
}: TempleTokens) => `
Pranam ${Name} ji,

${cited_observation}.

[...]
`;
```

### v2.2 (next-next cycle) — AUTO-FILL via LLM shipped

For high-volume cycles, optionally generate per-lead tokens via LLM:
- Pull lead row + scrape temple website (cheerio)
- LLM prompt: "Given this temple's public info, generate 1 specific observation + recent event"
- Insert into v2 template
- Human review BEFORE send (no full auto-send)

Defer LLM auto-fill to v2.2 because:
- Risk of hallucinated facts ("Pathmeda has 75K cows" when actually 50K) damages credibility
- Human review still required (zero AI-trust in religious context)
- ~30 sec/lead saved isn't worth fabrication risk

## A/B test plan

Run for 4 weeks post-v2 launch:

| Group | Template | Lead count | Tracked KPI |
|---|---|---|---|
| Control | v1 boilerplate (legacy) | 50 | Reply rate, qualified-meeting rate |
| Treatment | v2 personalized | 50 | Same |

Hypothesis: v2 reply rate ≥ 2x v1 (>8% vs 4%).

If hypothesis confirmed → full sunset of v1 templates. If not → debug personalization signals (founder review which token combinations correlate w/ replies).

## Founder action

```markdown
- [ ] Review 4 per-role templates above (TEMPLE / PANDIT / GAUSHALA / ASTROLOGER)
- [ ] Strike any token combo that sounds template-y to founder ear
- [ ] Use v2 templates for ALL outreach from next week (CS-005 re-sends + all new outreach)
- [ ] Log A/B test in data/sales/outreach-ab-test-2026-06.csv (group + template + sent + replied + outcome)
- [ ] Week 4: aggregate results + decide v2.1 storage migration
```

## Out of scope

- TypeScript template storage migration (v2.1, separate cycle)
- LLM auto-fill (v2.2, separate cycle)
- Per-language v2 templates (Hindi / Tamil / Telugu — cross-ref existing macros-v1-{hi,ta,te}.md)
- Per-channel v2 (WhatsApp / LinkedIn DM / SMS — defer)
- Auto-research pipeline (cheerio temple website scrape) — manual founder research v1

## Closes

R-Q1-M-014 — v2 spec + 4 per-role templates shipped. Status flips to shipped after founder runs first 50 leads w/ v2 + A/B test logged.
