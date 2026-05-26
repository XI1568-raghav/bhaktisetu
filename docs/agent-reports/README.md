# Agent reports

Auto-generated artifacts from the Darshya agent fleet.

- **Daily**: `seo-audit`, `content-draft`, `lead-gen`, `growth-metrics`, `social-queue`, `onboarding-drip`, `pr-outreach`
- **Weekly**: `investor-pipeline`
- **6-hourly**: `health-smoke`

Source: `scripts/agents/*.mjs` · Schedule: `.github/workflows/agents-*.yml` · View live at `/admin/agents`.

Run manually:
```bash
node scripts/agents/run-all.mjs                  # all
node scripts/agents/run-all.mjs seo-audit lead-gen  # subset
```

Trigger from CI: Actions → Agent fleet (daily/weekly/health) → Run workflow.
