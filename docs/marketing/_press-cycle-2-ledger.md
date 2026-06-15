# Press cycle 2 — tracking ledger

> Append one row per pitch event. KPI `press_pitches_sent` (R-Q2-M-010) reads count of rows where `state: sent`.
> Founder maintains. Do NOT add rows from agent runs — must reflect actual sent emails.

## Ledger

| date | outlet | reporter | state | utm_content | follow_up_date | response | publish_date | notes |
|---|---|---|---|---|---|---|---|---|
| <YYYY-MM-DD> | Economic Times | <reporter> | drafted \| sent \| nudged \| briefed \| published \| no-response | et | | | | |
| <YYYY-MM-DD> | LiveMint | <reporter> | drafted \| sent \| nudged \| briefed \| published \| no-response | livemint | | | | |
| <YYYY-MM-DD> | Mint | <reporter> | drafted \| sent \| nudged \| briefed \| published \| no-response | mint | | | | |

## State definitions

- **drafted** — pitch text filled with founder data, not yet sent
- **sent** — first email landed in reporter inbox (counts toward KPI)
- **nudged** — one polite follow-up sent (does NOT double-count toward KPI)
- **briefed** — reporter agreed to 30-min phone briefing
- **published** — story live with attributable URL in notes column
- **no-response** — silent through W2 end, reserve reporter swapped in

## KPI rollup (read this when populating R-Q2-M-010 current value)

```
press_pitches_sent.current = count of rows where state IN ('sent', 'nudged', 'briefed', 'published', 'no-response')
target = 3
```

Nudged / briefed / published / no-response all imply `sent` happened — so they
all count toward the pitch-count KPI. Only `drafted` does NOT count.

## When to flip R-Q2-M-010 to shipped

- 3 rows with state >= sent → KPI target met
- Editorial outcomes (briefed / published) are bonus, not required for ship flag
- Founder edits roadmap frontmatter: `status: shipped`, `shipped_at: <date>`
