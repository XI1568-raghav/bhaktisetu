# R-Q1-M-010 — Render env paste-once (after Meta approval)

> Paste these env vars to Render (`bhaktisetu-api` service) **only after Meta returns "Verified" on the WABA + ≥1 template approved**. Until then the WhatsApp service runs in skipped mode and no real messages are sent.

## Where to paste

Render dashboard → `bhaktisetu-api` service → Environment → Add Environment Variable. After all four are added, click "Save Changes", then start the deploy yourself: Render → **Manual Deploy** on the API, or `gh workflow run render-diag.yml -f mode=deploy -f sid=srv-d7mc2n8sfn5c73dfce0g`. `render.yaml` carries `autoDeploy: false` (`:28`), so do not assume the save alone puts the new values into a running container — confirm a fresh deploy reached `live` before testing. Same procedure as `docs/runbooks/secret-rotation.md` step 5.

## The four values

| Env var | Source | Sensitivity |
|---|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | Meta WhatsApp Manager → API Setup → click your number → "Phone number ID" | PUBLIC-ish (long numeric string) |
| `WHATSAPP_ACCESS_TOKEN` | Meta WhatsApp Manager → API Setup → System User token (generate a permanent token, NOT 24h temporary) | **SECRET — never commit, never log** |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Meta WhatsApp Manager → API Setup → WhatsApp Business Account ID at top | PUBLIC-ish |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Founder generates locally: `openssl rand -hex 32`. Paste same value to Meta webhook config + Render env. | **SECRET — never commit** |

## Verify after paste

The `whatsapp.ts` client auto-flips `enabled=true` when both `WHATSAPP_PHONE_NUMBER_ID` + `WHATSAPP_ACCESS_TOKEN` are present. No code change needed.

Confirm via:

```bash
curl -s https://api.darshya.online/health/whatsapp | jq
```

Expected: `{"enabled": true}`.

Then run the test-send from `docs/marketing/R-Q1-M-010-verification-tracker.md` to confirm Meta accepts the token.

## Rate-limit guardrail

Service is hard-capped at 50 messages/sec (Meta tier-1 limit). The broadcast functions sleep 1000ms between batches. Free tier = 1000 conversations/mo — do NOT remove the rate limit even after Meta upgrades the cap; we want to stay within the free-tier budget per `docs/free-tier-budgets.md`.

## Webhook setup (Meta side)

After env paste, configure webhook in WhatsApp Manager → Configuration:

- Callback URL: `https://api.darshya.online/webhooks/whatsapp`
- Verify token: same `WHATSAPP_WEBHOOK_VERIFY_TOKEN` value
- Subscribed fields: `messages`, `message_template_status_update`, `account_alerts`

If `/webhooks/whatsapp` route is not yet shipped, engineering must add it before the webhook can verify. See `apps/api/src/routes/` — pattern matches existing webhook routes.

## Rotation

Rotate `WHATSAPP_ACCESS_TOKEN` every 90 days. System User tokens in Meta can be regenerated without breaking the webhook; just paste the new value to Render and redeploy.

## Closes

R-Q1-M-010 env paste-once doc.
