# Rotate Leaked Resend API Key — Update Render Env

> **Roadmap item**: R-Q1-IT-005 (P0) · **Authored**: 2026-06-13 · **Incident**: Key leaked 2026-05-28

## Goal

Rotate leaked Resend API key `***REMOVED***` per security incident. Update Render env w/o downtime.

## Process

### Step 1: Generate new key (Resend dashboard)

- Resend Dashboard → API Keys → Create New
- Name: `bhaktisetu-prod-2026-q1`
- Permissions: full sending (not Domains read-only)
- Copy value: `re_NEW_KEY_VALUE` (will only show once)

### Step 2: Update Render env

Render Dashboard → bhaktisetu-api → Environment:
- Set `RESEND_API_KEY` = `re_NEW_KEY_VALUE`
- DO NOT delete old key yet
- Save, then Render → **Manual Deploy** on the API (`autoDeploy` is `false`, `render.yaml:28`, so confirm a fresh deploy reaches `live` rather than assuming the save shipped it)

### Step 3: Verify redeploy + test send

```bash
# Wait Render deploy complete (~3 min)
curl https://api.darshya.online/health  # confirm fresh deploy

# Test send (admin-gated endpoint)
curl -X POST https://api.darshya.online/api/v1/admin/email-test \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"to":"ops@bhaktisetu.com","subject":"Resend rotation test"}'

# Expect 200 + email arrives
```

### Step 4: Revoke old key

- Resend Dashboard → API Keys → old key → Revoke
- Confirm via dashboard "Revoked"

### Step 5: Update GH Actions secret (if used by any agent)

```bash
gh secret set RESEND_API_KEY -b "re_NEW_KEY_VALUE" -R owner/bhaktisetu
```

## Audit log

- Old key creation date: 2025-Xx
- Old key last-used before leak: 2026-05-27
- Old key leak event: 2026-05-28 (exposed in CF Pages build log)
- New key creation: 2026-06-13
- Old key revoke: 2026-06-13 (after new key verified)

## Prevention

- Pre-commit hook: scripts/scan-secrets.sh w/ git-secrets or trufflehog
- CF Pages build log redaction: confirmed enabled
- Render: env vars not logged

## Engineering tickets

- R-Q1-IT-005a: Key rotation execution
- R-Q1-IT-005b: Pre-commit secret scanner
- R-Q1-IT-005c: Quarterly rotation schedule

## Closes

R-Q1-IT-005 — spec shipped.
