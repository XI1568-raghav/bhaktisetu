# R-Q1-E-011 — FCM Server Key Wire (Founder Handoff)

> **Roadmap**: `docs/roadmap/items/Q1/engineering/011-wire-fcm-server-key-env-or-noop-already-in-place.md`
> **KPI**: `fcm_push_live=1` (manual — confirmed by founder device receiving a test push)
> **Status**: in_progress — code path env-or-noop ready, awaits founder paste U5
> **Authored**: 2026-06-15

## Why this exists

The KPI requires founder action (paste FCM service-account creds in Render env + verify
a test push arrives on the founder's mobile device). Cannot agent-claim shipped until
both happen. This handoff documents:

1. What is already in place (so founder does not redo it).
2. The exact founder steps remaining.
3. The smoke-test script to run after step 2 to flip KPI green.

## What is already in place

| Layer | File | Status |
|---|---|---|
| FCM HTTP v1 client | `apps/api/src/lib/fcm.ts` | ✓ env-or-noop singleton, RS256 JWT, token caching |
| `sendFcm(token, payload)` | same | ✓ returns `{ok, skipped, expired, error}` |
| `sendFcmMulticast(tokens[], payload)` | same | ✓ serial fan-out, expired-token classification |
| Smoke-test script | `apps/api/scripts/smoke-fcm-push.mjs` | ✓ NEW (this commit) — env-or-noop, dispatches 1 test push |
| Mobile devotee token surface | `apps/mobile/app/_layout.tsx` | ✓ Expo push token registered (founder grabs from debug log) |

## Founder steps remaining (U5)

### Step 1 — Generate FCM service-account JSON

1. Firebase console → **Project settings** → **Service accounts** tab
2. Click **Generate new private key** → confirms download of a `*.json` file
3. Keep this file local — never commit to git, never paste in chat

### Step 2 — Paste creds in Render env

Open Render dashboard → `darshya-api` service → **Environment** tab → add three vars
from the JSON keys:

| Render env var | JSON field |
|---|---|
| `FCM_PROJECT_ID` | `project_id` |
| `FCM_CLIENT_EMAIL` | `client_email` |
| `FCM_PRIVATE_KEY` | `private_key` (full PEM, literal `\n` allowed — `apps/api/src/lib/fcm.ts` L22 normalises) |

Save → Render auto-redeploys (~2 min). `apps/api/src/lib/fcm.ts` flips `enabled=true`
on boot.

### Step 3 — Grab founder device token

1. Open mobile devotee app on founder's phone
2. In Expo dev menu (shake device): copy the Expo push token from the log
   (`apps/mobile/app/_layout.tsx` registers + prints it)
3. Token shape: `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]` OR raw FCM token if
   bare-FCM path is used

### Step 4 — Run smoke test from local shell

```bash
FCM_TARGET_TOKEN="<token from step 3>" \
FCM_PROJECT_ID="<from step 2>" \
FCM_CLIENT_EMAIL="<from step 2>" \
FCM_PRIVATE_KEY="<from step 2, full PEM>" \
node apps/api/scripts/smoke-fcm-push.mjs
```

Expected output:

```
[smoke-fcm-push] project=darshya-prod target=ExpoP…xxxx
[smoke-fcm-push] OAuth token acquired.
[smoke-fcm-push] OK 200 — push dispatched.
  Response: {"name":"projects/darshya-prod/messages/…"}
  Verify on device: notification should arrive within ~5s.
```

If the device receives the notification → KPI green.

### Step 5 — Flip KPI + roadmap status

After device confirm:

1. Edit `docs/roadmap/items/Q1/engineering/011-wire-fcm-server-key-env-or-noop-already-in-place.md`
   - `status: in_progress` → `status: shipped`
   - `shipped_at: null` → `shipped_at: <ISO timestamp>`
   - `kpi.current: 0` → `kpi.current: 1`
2. Wire push trigger on `booking.created` event (sub-task — separate batch).

## Failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| `SKIPPED — FCM env vars not set` | Render env not saved or smoke run from shell without re-export | Re-export vars in current shell, re-run |
| `FAILED 404` + `UNREGISTERED` | Device token stale (re-installed app, etc) | Re-grab token from device, retry |
| `Token exchange failed 401` | Wrong `FCM_CLIENT_EMAIL` / `FCM_PRIVATE_KEY` mismatch | Re-paste from JSON; check newline normalisation |
| `FAILED 403` | Service account lacks `Firebase Cloud Messaging API` permission | Firebase console → IAM → grant role |

## Cost & security

- Free tier: FCM has no per-message cost
- Service-account JSON contains a private key — store in Render env only, never git
- Smoke script masks the device token in logs (`tok…last4` shape)

## Closes

R-Q1-E-011 status flips on founder Step 5 — code + script shipped this batch.
