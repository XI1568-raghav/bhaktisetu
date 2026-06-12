# CRON_AUTH_TOKEN — GH Secret + Render env (daily-cron unblock)

> **Roadmap item**: R-Q1-IT-002 (P1) · **Authored**: 2026-06-13

## Goal

Generate + provision CRON_AUTH_TOKEN to unblock daily-cron workflow. Currently exits 1 at precheck.

## Generation

```bash
openssl rand -hex 32 > cron-token.txt
# E.g., a3f1c... 64-char hex string
```

## Provision

### GitHub Actions secret

```bash
gh secret set CRON_AUTH_TOKEN < cron-token.txt -R owner/bhaktisetu
# Verify: gh secret list -R owner/bhaktisetu | grep CRON_AUTH_TOKEN
```

### Render env

Render Dashboard → bhaktisetu-api → Environment → Add:
- Key: `CRON_AUTH_TOKEN`
- Value: <paste hex from cron-token.txt>
- Sync to other env vars

Trigger deploy.

## Verify

```bash
# Test daily-cron workflow runs without precheck failure
gh workflow run daily-cron.yml -R owner/bhaktisetu
gh run watch
```

Expected: workflow exits 0 (was exiting 1 due to missing token).

## Security

- Token never committed to git
- Token deletable file `cron-token.txt` after provisioning
- Rotate annually (Q1 each year)

## Daily-cron coverage

Per `.github/workflows/daily-cron.yml`:
- Hits `https://api.darshya.online/api/v1/cron/run-daily` with `Authorization: Bearer ${CRON_AUTH_TOKEN}`
- Endpoint runs: consultation auto-expire / wallet recon / email digest / NPS survey trigger / cohort retention update

## Engineering tickets

- R-Q1-IT-002a: Generate + provision token
- R-Q1-IT-002b: Verify daily-cron green
- R-Q1-IT-002c: Document rotation schedule

## Closes

R-Q1-IT-002 — spec shipped.
