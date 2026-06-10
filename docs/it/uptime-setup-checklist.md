# UptimeRobot Setup Checklist — Founder Action (~10min one-time)

Goal: 4 active monitors paging founder via SMS+email when darshya.online or api.darshya.online go down. Free tier, $0 cost.

Runbook (escalation policy, alert response, monitor IDs to fill back): [uptime-monitors.md](./uptime-monitors.md).

## Pre-flight (1min)

- [ ] You have access to your founder email inbox
- [ ] You have your phone w/ SMS reachable
- [ ] You can edit this repo (paste IDs at end)

## Step 1 — Sign up (2min)

1. Open https://uptimerobot.com
2. Click **Register for FREE**
3. Use founder email (the inbox you check most). Password: generate via 1Password / random.
4. Verify email → click link in inbox.

## Step 2 — Add SMS contact (2min)

1. Dashboard → **My Settings** → **Alert Contacts** → **Add Alert Contact**
2. Type: **SMS**
3. Country code + phone number
4. UptimeRobot sends 6-digit code via SMS → paste back → confirm

Free tier: 5 SMS/month. Sufficient if uptime > 99.5%.

## Step 3 — Add 4 monitors (5min)

For each monitor below: dashboard → **+ Add New Monitor** → fill the fields exactly:

### Monitor 1 — api-health

- Monitor Type: **HTTPS**
- Friendly Name: `api-health`
- URL: `https://api.darshya.online/health`
- Monitoring Interval: **5 minutes**
- Alert Contacts: email (always) + SMS (after 3 failures)

### Monitor 2 — www-root

- Monitor Type: **HTTPS**
- Friendly Name: `www-root`
- URL: `https://darshya.online`
- Monitoring Interval: **5 minutes**
- Alert Contacts: email + SMS after 3 fails

### Monitor 3 — www-pujas

- Monitor Type: **HTTPS**
- Friendly Name: `www-pujas`
- URL: `https://darshya.online/pujas`
- Monitoring Interval: **5 minutes**
- Alert Contacts: email + SMS after 3 fails

### Monitor 4 — api-health-keyword

- Monitor Type: **Keyword**
- Friendly Name: `api-health-keyword`
- URL: `https://api.darshya.online/health`
- Keyword Type: **Exists**
- Keyword Value: `ok`
- Monitoring Interval: **5 minutes**
- Alert Contacts: email + SMS after 3 fails

> Why both #1 (HTTPS) and #4 (Keyword) on `/health`? HTTPS catches connection/TLS/5xx failures. Keyword catches "API returns 200 but body is broken" (e.g. health check accidentally returns `{"status":"degraded"}` after a deploy — HTTPS wouldn't catch that).

## Step 4 — Configure escalation (1min)

For each monitor → **Edit** → **Alert Contacts To Notify**:

- Email: notify after **1 failure**
- SMS: notify after **3 failures** (avoids 5min flake → SMS storm)

Save.

## Step 5 — Create public status page (1min)

1. Dashboard → **Status Pages** → **Add New Status Page**
2. Page Name: `darshya.online status`
3. Add all 4 monitors
4. Custom domain (optional): skip for now (free tier limitation)
5. Make public
6. Copy the status page URL — looks like `https://stats.uptimerobot.com/<RANDOM_ID>`

## Step 6 — Paste IDs back into repo (2min)

After all 4 monitors exist, find their IDs in dashboard URL (e.g. `https://uptimerobot.com/dashboard.php?monitor=798765432`).

Edit [uptime-monitors.md](./uptime-monitors.md):

1. Replace 4 instances of `<PASTE_AFTER_SETUP>` in the monitor table with the actual monitor IDs.
2. Replace the public status page URL placeholder with your URL from Step 5.

Edit [../operational-context.md](../operational-context.md):

1. Find the UptimeRobot section (or add one under the Monitoring header).
2. Paste public status page URL.

Edit [../roadmap/_manual-kpis.yml](../roadmap/_manual-kpis.yml):

1. Find `uptime_monitors_active` in the values map.
2. Set value to `4`.
3. Bump `last_updated` to today's date.

Commit:

```bash
git add docs/it/uptime-monitors.md docs/operational-context.md docs/roadmap/_manual-kpis.yml
git commit -m "docs(it): UptimeRobot live — 4 monitors + status page + KPI bumped [skip ci]"
git push
```

## Step 7 — Smoke test (1min)

1. Visit your status page URL → all 4 monitors should show green.
2. Briefly point `api-health-keyword` at a fake URL (https://api.darshya.online/health-fake) → save → wait 6min → expect email alert.
3. Restore real URL → wait for "RESOLVED" email.

Done. Founder phone now pages you when darshya.online breaks.

## Troubleshooting

| Symptom | Fix |
|---|---|
| SMS verification code never arrives | Try again, then check carrier doesn't block UptimeRobot short codes |
| Monitor flaps green↔red every 5min | Render free-tier cold start; either bump UptimeRobot interval to 10min OR upgrade Render to paid |
| Status page shows "Maintenance" | You set Maintenance Window by accident — clear under monitor settings |
| Keyword monitor passes when body is wrong | Keyword field case-sensitive; verify exact string match w/ `curl -s https://api.darshya.online/health` |

Closes: Q-C20260610T1617-IT-001
