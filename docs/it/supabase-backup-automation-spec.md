# Supabase Backup Automation — Daily pg_dump to S3, 30d Retention

> **Roadmap item**: R-Q2-IT-003 (P2) · **Authored**: 2026-06-13

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

## S3 lifecycle

- Standard tier first 7 days
- Glacier 8-30 days
- Auto-delete day 31

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
