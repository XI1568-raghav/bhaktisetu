# Multilingual CS Macros — Deploy Runbook (R-Q2-CS-003)

Audience: founder + CS lead. This runbook covers the **founder action** required to ship
40 multilingual CS macros to Wati (WhatsApp), Freshdesk, and Zoho Desk.

## TL;DR

1. Pull this branch + run `node scripts/cs/render-macros.mjs` to regenerate outputs.
2. **Get one native speaker per language** to review the `ta`/`te`/`bn`/`mr` strings in
   `docs/agent-reports/cs/macros/multilingual-macros-v1.yaml`. They MUST sign off before
   any regional template is pasted into Wati. English + Hindi are production-grade and
   can ship without further review.
3. Paste rendered outputs into Wati / Freshdesk / Zoho per the per-tool sections below.
4. Submit Wati templates to Meta for approval (24–48h per template).
5. Wire `macro_id_used` column on the CS ticket table so the SQL in
   `sql/cs/multilingual-macro-impact.sql` can measure impact.

## Why this is founder-action

The KPI (p50 first-response < 15min for regional langs) lifts only after:
(a) native speakers approve regional translations and
(b) Meta approves the WhatsApp templates.

Both are outside this repo. The agent ships the artifact + tooling. The founder ships the
templates.

## Files in this package

```
docs/agent-reports/cs/macros/
├── multilingual-macros-v1.yaml       Source of truth (240 strings)
├── DEPLOY-RUNBOOK.md                 This file
└── rendered/                         Build artifacts (gitignored except manifest.json)
    ├── manifest.json                 Inventory + unicode-block warnings
    ├── whatsapp/{lang}/{intent}.txt  240 Wati-paste-ready files
    ├── freshdesk/macros.json         Freshdesk bulk-import format
    └── zoho/macros.csv               Zoho Desk macro import CSV

scripts/cs/
├── build-macros-yaml.mjs             Regenerates the YAML
├── render-macros.mjs                 YAML → rendered/* (idempotent, wipes and rebuilds)
└── __tests__/render-macros.test.mjs  19 tests: schema, var consistency, unicode, format

sql/cs/
└── multilingual-macro-impact.sql     4 queries for warehouse impact tracking
```

## Native-speaker review checklist (BLOCKING — do not paste regional templates before this)

For each of `ta`, `te`, `bn`, `mr`:

- [ ] Native speaker (>10 years in the language, preferably from the target customer
      region) reviews all 40 strings in `multilingual-macros-v1.yaml`.
- [ ] Honorific is correct for support context:
  - Tamil — `தாங்கள்` (NOT `நீ`)
  - Telugu — `మీరు` (NOT `నువ్వు`)
  - Bengali — `আপনি` (NOT `তুমি`)
  - Marathi — `आपण` (NOT `तू`)
- [ ] Brand name "Bhaktisetu" stays in Latin script — do not transliterate.
- [ ] Currency symbol stays as `₹` — do not localise to `Rs.` or any script.
- [ ] Variable placeholders `{user_name}`, `{order_id}`, etc remain literally in braces
      — the render script depends on this exact format.
- [ ] Reviewer signs the row in the table below (date + initials).

| Lang | Reviewer | Date | Notes |
|------|----------|------|-------|
| ta   |          |      |       |
| te   |          |      |       |
| bn   |          |      |       |
| mr   |          |      |       |

After review, edit `multilingual-macros-v1.yaml` directly with the corrected strings, then
re-run `node scripts/cs/render-macros.mjs` to refresh `rendered/`. Commit the YAML changes.

## Wati (WhatsApp) deploy flow

1. Log in to Wati template console: https://app.wati.io/templates
2. For each of the 40 intents × 6 languages (start with the 8 highest-volume intents):
   - Click **Create Template**.
   - Name: `bhaktisetu_<intent>_<lang>` (lowercase, underscores).
   - Category: `UTILITY` for transactional (M001-M010, M029-M034); `MARKETING` should be
     avoided — these are support messages, not promotions.
   - Language: pick the matching ISO code from the dropdown.
   - Body: paste the contents of `rendered/whatsapp/{lang}/{intent}.txt`, dropping the
     two `#` header lines. The body uses `{{1}}`, `{{2}}`, … placeholders that Wati
     accepts natively.
   - Sample values: use realistic placeholders (e.g. `{{1}}=Asha`, `{{2}}=499`,
     `{{3}}=BS-20260614-12345`). Meta reviewers reject templates with no samples.
3. Submit for Meta approval. Expect **24–48 hours**. Track approval status in Wati console.
4. Once approved, the template appears in the agent reply UI under macro picker.

### Wati variable mapping
| Source placeholder | Wati slot |
|---|---|
| `{user_name}` | `{{1}}` |
| `{amount}` (or 2nd-declared var) | `{{2}}` |
| `{order_id}` (or 3rd) | `{{3}}` |
| (in declaration order) | `{{N}}` |

The render script writes the exact mapping at the top of each `.txt` file. If a variable
appears multiple times in the body, Wati uses the **same** `{{N}}` everywhere.

## Freshdesk deploy flow

1. Log in to Freshdesk admin: `https://<your-subdomain>.freshdesk.com/admin/macros`
2. Click **Import Macros** (gear icon → Import).
3. Upload `rendered/freshdesk/macros.json`. Freshdesk will create 40 macros, each with
   six language variants under `actions[]`.
4. After import, edit the visibility per macro if needed (`visibility: 1` defaults to all
   agents; `2` = specific groups; `3` = self only).
5. The agent UI surfaces macros via the "Apply Macro" dropdown on any ticket.

### Freshdesk variable mapping
Source `{user_name}` is rewritten to Freshdesk's `{{ticket.user_name}}` notation in the
JSON. Add custom ticket fields named `user_name`, `amount`, `order_id`, etc, OR change
the rewrite map in `renderForFreshdesk` (in `scripts/cs/render-macros.mjs`) to match your
field names (e.g. `{{ticket.requester.name}}`).

## Zoho Desk deploy flow

1. Log in to Zoho Desk admin: Setup → Customisation → Macros.
2. Click **Import** → upload `rendered/zoho/macros.csv`.
3. Zoho creates one macro per row (240 rows = 40 intents × 6 languages).
4. After import, group by `language` and assign each language group to the matching
   support queue.

## Wiring `macro_id_used` for impact tracking

The SQL in `sql/cs/multilingual-macro-impact.sql` assumes a `macro_id_used` column on
`cs_tickets`. Tools log differently:

- **Wati** — log via webhook on `template_message_sent`. Extract template name, derive
  `macro_id` from the `bhaktisetu_<intent>_<lang>` naming convention.
- **Freshdesk** — use the "Macro Applied" audit log API (`/api/v2/tickets/{id}/activities`)
  to extract macro name on every agent reply. Map name → `macro_id`.
- **Zoho** — use the "Audit Log" API and filter for action `MACRO_APPLIED`.

Run baseline before rollout:

```bash
psql "$WAREHOUSE_URL" -f sql/cs/multilingual-macro-impact.sql \
  > docs/agent-reports/cs/macros/baseline-p50.json
```

Re-run at T+14d and T+28d, compare to baseline. Target: p50 first-response for
Tamil/Telugu/Bengali/Marathi drops from ~4h to under 15min.

## Rollback

If a template causes customer confusion (wrong honorific, bad grammar, etc):

1. **Wati** — delete the template from the console (Meta will keep the historical name
   reserved for 30 days, so re-create with `_v2` suffix).
2. **Freshdesk** — disable the macro (Settings → Macros → toggle off) rather than delete
   so agent history is preserved.
3. **Zoho** — same: deactivate rather than delete.
4. Revert the `macro_id_used` column on offending tickets so the SQL CSAT delta does not
   pollute future runs.
5. Fix the YAML, re-run `render-macros.mjs`, push a new commit.

## Open questions for the founder

- Which 4 native-speaker reviewers? (Suggest: temple priest contacts in Chennai, Hyderabad,
  Kolkata, Pune from existing onboarding pipeline.)
- Which CS tool is the source of truth — Wati, Freshdesk, or Zoho? (Determines which one
  gets fully wired first.)
- Is the warehouse table `cs_tickets` already provisioned? If not, blocker on data team.

## Cost

- Wati template approval: free (Meta does the review).
- Native-speaker review: ~2 hours per language × 4 languages = 8 hours founder/contractor.
- Engineering effort to wire `macro_id_used` logging: ~6 hours one-time per tool.

## Status

- [x] YAML schema validated (19/19 vitest green)
- [x] 240 strings present (en + hi production-grade; ta/te/bn/mr flagged for review)
- [x] Render script produces Wati + Freshdesk + Zoho outputs (242 files)
- [x] Manifest with unicode-block warnings
- [ ] Native-speaker review (founder action — BLOCKING for regional deploy)
- [ ] Meta template approval (founder action — 24-48h after Wati submission)
- [ ] Warehouse `macro_id_used` column wired (data team)
- [ ] Baseline p50 captured (`baseline-p50.json` in this folder)
