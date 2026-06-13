# Follow-up Cadence — R-Q1-S-009 Gurukul / Vedic Pathshala

> Designed to be slower and more deferential than the gaushala cadence. Acharya schedules are dictated by sandhya, anushthana, chaturmasya, paksha-specific rituals, and festival cycles. Every touch documented here MUST be deferrable if the institution signals a ritual or seasonal block.

## Touch-point map

| Day | Channel | Action | Owner | Template ref | Escalation trigger |
|---|---|---|---|---|---|
| **D0** | Email | Send formal email (per sampradaya — see `R-Q1-S-009-outreach-templates.md` §"Formal email"). Confirm delivery via read-receipt where available. | Sales agent | `outreach-templates.md` §"Formal email (English)" or §"Formal email (Sanskrit-aware Hindi)" depending on institution preference | None at D0. |
| **D3** | Email | Polite nudge ONLY if no read-receipt and no bounce. Single short paragraph. Reference original email date. No new ask. | Sales agent | See template below §"D3 nudge" | If read-receipt confirms open but no reply, hold — do NOT double-nudge. |
| **D7** | Phone | Call the listed office number during 10:00–11:30 IST or 16:00–17:30 IST (avoiding sandhya windows 06:00–07:30 and 18:00–19:30). Use call script. If acharya office requests Hindi, default to it. | Sales agent | `outreach-templates.md` §"Call script" | If office indicates chaturmasya / anushthana, pause cadence and reset D0 for ~45 days post the indicated end-date. |
| **D14** | Email + (optional) WhatsApp | Second-touch email referencing earlier email + call attempt. Offer a written proposal preview. WhatsApp ONLY if the office explicitly opened that channel at D7. | Sales agent | See template below §"D14 touch" | If still no reply, founder reviews disqualifier checklist before D30. |
| **D30** | Founder personal email | Founder writes a 4-sentence note acknowledging the long pause, reiterating zero-pressure stance, asking only for a yes/no/later signal. Closes the loop respectfully. | Founder | See template below §"D30 founder close" | If no reply by D45, mark `status: dormant` and move to quarterly check-in (Q2). |

## Acharya schedule constraints (always honour)

- **Sandhya windows.** No calls 06:00–07:30 IST, 12:00–12:30 IST, 18:00–19:30 IST. Schedule outside these.
- **Anushthana.** If an institution is conducting a multi-day ritual (Chandi-Path, Rudra-Yaga, Vedic-Yajna), pause all outreach for the duration + 3 days recovery.
- **Chaturmasya** (~mid-July to mid-November per institution). Many sannyasi acharyas observe vrata; outreach paused completely. Reset D0 in late November.
- **Ekadashi / Purnima / Amavasya.** Avoid contact on these days unless the office has explicitly indicated availability.
- **Festival cycles.** No outreach during Navaratri, Janmashtami (Gaudiya), Shivaratri, Vyasa-Purnima (Guru-Purnima), or Vasanta-Panchami. These are institution-busy days.
- **Examination periods.** Many gurukulas hold pariksha around Vijaya Dashami and Vasanta Panchami. Defer non-essential touches.

## Templates

### D3 nudge (email)

```
Subject: Re: <original subject>

नमो गुरुभ्यः ।

Respected Acharya Ji / Office,

A brief follow-up to my note of <D0 date> — sharing again in case it did not
reach the right desk. No reply expected if the timing is inconvenient; I will
attempt a call at a respectful hour next week.

सादर प्रणाम ।
<sender>
```

### D14 touch (email)

```
Subject: <original subject> — follow-up

नमो गुरुभ्यः ।

Respected Acharya Ji / Office,

Following up on my earlier email of <D0 date> and the call attempt on <D7
date>. If the timing has been inconvenient on account of anushthana,
sandhya-vidhi, or festival cycle, please disregard — I will reach out at a
later date suggested by the office.

If a brief written proposal would be useful for institutional review, I can
prepare a one-page note covering the sponsor-a-student model, ledger
transparency, and parampara-purity commitment. No commitment is sought at
this stage.

सादर प्रणाम ।
<sender>
```

### D30 founder close (email)

```
Subject: A respectful close — Bhaktisetu enquiry

नमो गुरुभ्यः ।

Respected Acharya Ji,

I am <founder name>, founder of Bhaktisetu. Your office has received two
notes from our sales outreach since <D0 date>. The silence is entirely
respectable — I write only to close the loop, not to press.

If the institution would prefer that we not approach again, a single word in
reply will be honoured permanently. If you would prefer that we revisit in a
later quarter, please indicate the season.

The work the pathshala does is what we hope to support, on the institution's
own terms.

सादर प्रणाम ।
<founder name>
<founder email>
```

## Cadence guard-rails

- **Never automate beyond D7.** D14 and D30 touches MUST be manually composed and reviewed before sending. Automation here will read as disrespect.
- **Never WhatsApp-blast.** WhatsApp is only used if the office opened the channel during D7 call.
- **Never multi-thread.** Do not email both the registrar and the acharya simultaneously. Sequence: office → registrar → acharya (and only if office routes you upward).
- **Never share institution-specific outreach progress externally** — including in PR / agent reports — without the institution's written consent.
- **Track only at the institution level.** Personal-identifier tracking of individual acharyas / brahmacharis is prohibited.

## State tracking

Per-institution state file: `docs/agent-reports/sales/_R-Q1-S-009-state.json` (created on first cycle by the agent).

Fields per prospect:
- `last_touch_at` (ISO timestamp)
- `next_touch_due_at` (ISO timestamp, respecting acharya schedule constraints)
- `touch_log` (array of `{day, channel, outcome, notes}`)
- `paused_until` (ISO date, if anushthana / chaturmasya declared)
- `status` ∈ `{pending, in_dialogue, agreed, declined, dormant}`

This file is read by the orchestrator on each cycle and is the single source of truth for "is this prospect ready for the next touch?".
