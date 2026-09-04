# Supabase Backup Automation — Daily pg_dump to S3, 30d Retention

> **Roadmap item**: R-Q2-IT-003 (P2) · **Authored**: 2026-06-13

> **Status note — 2026-09-02 (`OPS-10` / `OPS-03`).** Everything below is a **proposal**
> and is left intact as one; it has never been built as written. What actually exists,
> read out of this repository on 2026-09-02, is different in three ways that matter:
>
> 1. **The workflow is `.github/workflows/db-backup.yml`, not `supabase-backup.yml`,**
>    and it runs at 19:00 UTC, not 03:00.
> 2. **The destination is Supabase Storage — the same Supabase project the database
>    lives in.** That is a second copy, not a backup: one account suspension takes
>    both. `db-backup.yml` now *fails* a run whose only destination is the same
>    project (`OPS-03`). An **optional** offsite mirror is supported via the
>    `BACKUP_S3_*` secrets (S3-compatible, e.g. Cloudflare R2) and those secrets are
>    **currently unset**. A separate weekly `pg_dump` → Cloudflare R2 exists at
>    `apps/api/scripts/backup.mjs`, also env-gated and currently a no-op.
> 3. **There is no Glacier tier and no AWS S3 bucket.** `s3://bhaktisetu-backups` does
>    not exist. Glacier appears nowhere in this system outside this proposal — the
>    "Standard 7 days / Glacier 8-30 / delete day 31" lifecycle below has never been
>    configured anywhere. Do not cite it as a retention control.
>
> Before this spec is worth reviving, note `OPS-02`: every scheduled run of the real
> backup workflow produced zero bytes and reported green for months, because the
> secrets were never set. A backup nobody has restored is a hypothesis. The restore
> drill is documented in `db-backup.yml` and `docs/backup-restore-runbook.md`.

## Goal

Q2 daily pg_dump from Supabase → S3 archive. 30d rolling retention. DR + audit insurance.

## Architecture

```
GH Actions cron daily 03:00 UTC
  → pg_dump --schema=public --no-owner $SUPABASE_DIRECT_URL > dump-$DATE.sql
  → gzip → upload to s3://bhaktisetu-backups/$DATE.sql.gz
  → AWS S3 lifecycle: delete after 30 days
```

## GH Actions workflow

```yaml
# .github/workflows/supabase-backup.yml
on:
  schedule: [{ cron: '0 3 * * *' }]
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          sudo apt install -y postgresql-client awscli
          pg_dump $SUPABASE_DIRECT_URL --no-owner > dump.sql
          gzip dump.sql
          aws s3 cp dump.sql.gz s3://bhaktisetu-backups/$(date +%Y-%m-%d).sql.gz
        env:
          SUPABASE_DIRECT_URL: ${{ secrets.SUPABASE_DIRECT_URL }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_BACKUP_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_BACKUP_SECRET }}
```

## S3 lifecycle (proposed; never configured)

- Standard tier first 7 days
- Glacier 8-30 days
- Auto-delete day 31

*None of the above exists. There is no AWS S3 bucket and no Glacier tier in this
system — see the status note at the top. Retained as the original proposal.*

## Verify

- Weekly cron: download latest backup + try import in test Supabase project
- Alert if verification fails

## Engineering tickets

- R-Q2-IT-003a: AWS S3 bucket + IAM
- R-Q2-IT-003b: GH Actions backup cron
- R-Q2-IT-003c: Weekly verify cron
- R-Q2-IT-003d: Restore runbook

## Q2 success

- 30 daily backups available rolling
- Weekly verify green
- DR target: <4hr restore from backup

## Closes

R-Q2-IT-003 — spec shipped.
