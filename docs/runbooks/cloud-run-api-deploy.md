# Runbook: API on Google Cloud Run (free tier, scale to zero)

Owner-run. Nothing here has been deployed. The code side is ready (see "What the code does differently"). Render stays the live host until you cut DNS over.

Free allowance (check cloud.google.com/run/pricing, it changes): about 2M requests, 180,000 vCPU-seconds and 360,000 GiB-seconds per month, in `us-central1`/`us-east1`/`us-west1`, request-based billing. Stay inside it: min instances 0, max 2, 1 vCPU, 512 MiB, request-based CPU.

## 0. Know the trade-offs first

- Cold start of a few seconds on the first request after idle (Prisma + Fastify). Migrations never run at boot. Some route modules still run small idempotent `CREATE TABLE IF NOT EXISTS` checks while registering, which adds DB round-trips to every cold start (verified locally 2026-10-17: boots and answers `/health` on `PORT=8080`; the Docker image itself was not built, the sandbox daemon was down).
- Timers do not run while scaled to zero. Scheduled work is driven by Cloud Scheduler calling `POST /api/v1/cron/tick` (section 7). Until the scheduler job exists, no outreach, digests, refunds sweep, email-outbox retries or offer rebroadcasts happen.
- CPU is throttled the moment a response is sent. The code now awaits (bounded, 4s) receipts, audit rows and notifications before replying. Anything slower is retried by the tick.
- `us-central1` to a Supabase database in another region adds latency per query. Keep DB and Cloud Run close if you can (Supabase `us-east-1`/`us-west` pairs well). Check your Supabase region.

## 1. Project, billing, budget alert

1. console.cloud.google.com -> new project `darshya-api` (note the ID, below `PROJECT_ID`).
2. Billing: link a billing account (a card is required even for the free tier).
3. Billing -> Budgets & alerts -> Create budget: amount `$1`, alert thresholds 50%, 90%, 100%, email to you. A budget only alerts, it does not cap spend; the real cap is `--max-instances=2`.

## 2. Tools and APIs

```bash
gcloud auth login
gcloud config set project PROJECT_ID
gcloud config set run/region us-central1
gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
  cloudbuild.googleapis.com cloudscheduler.googleapis.com secretmanager.googleapis.com
gcloud artifacts repositories create darshya --repository-format=docker --location=us-central1
# keep Artifact Registry inside its 0.5 GB free storage: delete all but the 2 newest images
gcloud artifacts repositories set-cleanup-policies darshya --location=us-central1 \
  --policy=<(echo '[{"name":"keep-2","action":{"type":"Keep"},"mostRecentVersions":{"keepCount":2}},{"name":"del","action":{"type":"Delete"},"condition":{"tagState":"any"}}]') 
```

## 3. Secrets

Free tier of Secret Manager covers 6 active secret versions. Put only the high-value ones there, the rest as plain env vars (section 4).

```bash
for s in DATABASE_URL JWT_SECRET CRON_AUTH_TOKEN RAZORPAY_KEY_SECRET RAZORPAY_WEBHOOK_SECRET SUPABASE_SERVICE_ROLE_KEY; do
  printf "Value for $s: "; read -rs v; echo
  printf %s "$v" | gcloud secrets create $s --data-file=-
done
# generate the cron token once: openssl rand -base64 36
PROJECT_NUMBER=$(gcloud projects describe PROJECT_ID --format='value(projectNumber)')
for s in DATABASE_URL JWT_SECRET CRON_AUTH_TOKEN RAZORPAY_KEY_SECRET RAZORPAY_WEBHOOK_SECRET SUPABASE_SERVICE_ROLE_KEY; do
  gcloud secrets add-iam-policy-binding $s \
    --member=serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com \
    --role=roles/secretmanager.secretAccessor
done
```

`DATABASE_URL`: use the Supabase pooled (port 6543, pgbouncer) string with `?pgbouncer=true&connection_limit=3`. Cloud Run can run 2 instances, so keep the pool small. `DIRECT_URL` is for migrations from your workstation only; do not set it on Cloud Run.

## 4. Build and deploy

From the repo root (nothing else is needed on disk):

```bash
IMAGE=us-central1-docker.pkg.dev/PROJECT_ID/darshya/api:$(git rev-parse --short HEAD)
gcloud builds submit --config ops/cloudrun/cloudbuild.yaml --substitutions=_IMAGE=$IMAGE .

gcloud run deploy darshya-api \
  --image=$IMAGE --region=us-central1 --platform=managed \
  --allow-unauthenticated \
  --min-instances=0 --max-instances=2 --concurrency=40 \
  --cpu=1 --memory=512Mi --timeout=900 \
  --cpu-throttling --no-cpu-boost \
  --set-env-vars=NODE_ENV=production,DISABLE_INPROCESS_JOBS=true,CORS_ORIGIN=https://darshya.online\\,https://www.darshya.online,SUPABASE_URL=https://YOUR.supabase.co \
  --set-secrets=DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest,CRON_AUTH_TOKEN=CRON_AUTH_TOKEN:latest,RAZORPAY_KEY_SECRET=RAZORPAY_KEY_SECRET:latest,RAZORPAY_WEBHOOK_SECRET=RAZORPAY_WEBHOOK_SECRET:latest,SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest
```

Add the remaining variables from `docs/env-vars.md` the same way (`RAZORPAY_KEY_ID`, `RESEND_API_KEY`, `SENTRY_DSN`, `ADMIN_EMAILS`, `R2_*`, `WHATSAPP_*`, `VAPID_*`, `SUPABASE_ANON_KEY`, `MAGIC_LINK_SECRET`), using `gcloud run services update darshya-api --update-env-vars=K=V`. Copy the values from the Render dashboard. Do NOT set `RUN_MIGRATIONS_ON_BOOT`.

Do not skip `scripts/ops/prod-like-smoke.sh` and `docs/runbooks/prod-deploy-checklist.md` before the first real traffic. Apply pending migrations by hand beforehand (`prisma migrate status` is the authority).

Verify (the service URL is printed by deploy):

```bash
URL=$(gcloud run services describe darshya-api --format='value(status.url)')
curl -s $URL/health                       # {"status":"ok",...}
curl -s -o /dev/null -w '%{http_code}\n' -X POST $URL/api/v1/cron/tick           # 401
curl -s -X POST -H "Authorization: Bearer $CRON" $URL/api/v1/cron/tick           # 200 {"ok":true,...}
```

## 5. Map api.darshya.online (Cloudflare DNS)

Option A, simplest, free: Cloud Run domain mapping.

```bash
gcloud domains verify darshya.online          # one-time, adds a TXT record in Cloudflare
gcloud beta run domain-mappings create --service=darshya-api --domain=api.darshya.online --region=us-central1
gcloud beta run domain-mappings describe --domain=api.darshya.online --region=us-central1   # shows the DNS target
```

In Cloudflare DNS, change `api` to the CNAME the command shows (normally `ghs.googlehosted.com`). Leave it DNS-only (grey cloud) until Google reports the certificate as provisioned (minutes to an hour), then switch the proxy on (orange cloud). SSL mode must be Full (strict).

Keep the Cloudflare proxy ON in the end state. The API derives the client IP for rate limiting from `CF-Connecting-IP` only when it can prove the request came through Cloudflare (`lib/rate-limit-key.ts`). Without that every anonymous user shares one bucket (Google's frontend IP). Most robust: set `CF_ORIGIN_SECRET` on the service and add a Cloudflare Transform Rule that sets request header `x-origin-secret` on `api.darshya.online` (see `docs/env-vars.md`). After cutover, grep the log for `CF-Connecting-IP ignored`; if real traffic shows it, set `RATE_LIMIT_TRUST_CF_HEADER=true` as the rollback lever.

Cutover order: deploy, verify on the `run.app` URL, lower the `api` TTL, flip the CNAME, watch `/health` and the first payments. Render service stays up (do not delete) for rollback.

## 6. Razorpay webhook

Razorpay dashboard -> Settings -> Webhooks: the URL is `https://api.darshya.online/api/v1/payments/webhook` (path unchanged from Render, so after DNS cutover nothing changes). To test before cutover, add a second webhook pointing at `https://<run-app-url>/api/v1/payments/webhook` with the same secret, then delete it after cutover. `RAZORPAY_WEBHOOK_SECRET` must match. Webhooks are not retried forever, so cut over at a quiet hour; `reconcile-payments` (in the tick) is the backstop for a missed capture.

## 7. Cloud Scheduler (replaces in-process timers)

3 jobs are free per billing account. One job is enough: `/cron/tick` runs the whole ops chain (email outbox retry, dispatch/offer sweep, auto-refunds, payment reconciliation, aarti reminders, panchang, digest gates, settlement, account purge). Each step is idempotent and claims its work, so a double fire or retry is safe.

```bash
CRON=$(gcloud secrets versions access latest --secret=CRON_AUTH_TOKEN)
gcloud scheduler jobs create http darshya-tick \
  --location=us-central1 --schedule='*/10 * * * *' --time-zone='Asia/Kolkata' \
  --uri="https://api.darshya.online/api/v1/cron/tick" --http-method=POST \
  --headers="Authorization=Bearer $CRON" \
  --attempt-deadline=900s --max-retry-attempts=1 --min-backoff=60s
gcloud scheduler jobs run darshya-tick --location=us-central1     # test now
```

Cost note: every tick wakes an instance, so 10 minutes is about 4,300 wake-ups a month. Each tick is a few seconds of CPU, well inside 180k vCPU-s, but 5 minutes roughly doubles it; start at 10. Raise the Scheduler schedule only if the one-minute offer window for instant-tier pujas matters (a pandit offer expiry is swept on the next tick, up to 10 minutes late).

Rotating the token: `printf %s NEW | gcloud secrets versions add CRON_AUTH_TOKEN --data-file=-`, redeploy the service, update the Scheduler job headers.

Monitoring: `GET /ops/scheduler` shows the last tick of that instance only (memory resets on scale-to-zero). Use Cloud Scheduler job status and Cloud Run logs for `ops_tick_ok` / `ops_tick_failed`.

## 8. Rollback

Traffic rollback (seconds, no rebuild):

```bash
gcloud run revisions list --service=darshya-api --region=us-central1
gcloud run services update-traffic darshya-api --region=us-central1 --to-revisions=darshya-api-00012-abc=100
```

Full rollback to Render: set the Cloudflare `api` record back to `darshya-web`-style Render target for the API (`bhaktisetu-api` onrender hostname), and pause the Scheduler job (`gcloud scheduler jobs pause darshya-tick --location=us-central1`) so Render's own scheduler is the only driver. Never run both ticking against the same DB for long: the steps are idempotent, but there is no reason to double the load.

## What the code does differently on Cloud Run

| Behaviour | Where |
|---|---|
| Binds `0.0.0.0:$PORT` (Cloud Run injects 8080), `/health` static liveness | `src/server.ts`, `src/routes/health.ts` |
| No `prisma migrate deploy` at boot unless `RUN_MIGRATIONS_ON_BOOT=true`; starts with `tsx src/server.ts` (`node dist/server.js` cannot load `@poojly/shared`, which ships raw TS) | `apps/api/Dockerfile` |
| Timers (ops scheduler, offer timeouts, latency reporter) off when `DISABLE_INPROCESS_JOBS=true`, or by default when `K_SERVICE` is set | `src/lib/inprocess-jobs.ts` |
| `POST /api/v1/cron/tick`, bearer `CRON_AUTH_TOKEN`, constant-time, fail closed (401 if unset), 20 req/min limit | `src/routes/cron.ts` |
| Money audit rows, receipts, referral credit, commissions, payout/consultation/store notifications awaited (bounded by `BACKGROUND_AWAIT_MS`, default 4000) before the response | `src/lib/background.ts` and call sites |
