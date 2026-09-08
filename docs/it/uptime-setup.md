# UptimeRobot Setup (Free Tier)

> Founder runbook to wire 4 external HTTPS monitors + SMS alerts + a public status page for Darshya. Completing this unlocks the `uptime_monitors_active = 4` KPI and lights up `https://darshya.online/status` with live data.

## 1. Signup

- URL: https://uptimerobot.com/signUp
- Free tier limits: 50 HTTPS monitors at 5-minute interval, 1 SMS alert/month (supplement with email + Telegram), 1 public status page.
- Use the founder ops email (the same inbox that receives Render + Cloudflare alerts) so escalations don't fragment across multiple addresses.
- Verify the email link UptimeRobot sends; otherwise alerts will queue and never deliver.

## 2. Monitors

After login → Dashboard → **+ New monitor**. Create 4 HTTPS monitors. All four use `Monitor Type = HTTP(s)`, `Monitoring Interval = 5 minutes`, and the default `Keyword/HTTP status` check (any 200 response counts as up).

| Friendly name | URL | Type | Interval | Expect |
|---|---|---|---|---|
| api-health | https://api.darshya.online/health | HTTPS | 5 min | 200 |
| web-root | https://darshya.online | HTTPS | 5 min | 200 |
| api-temples | https://api.darshya.online/api/v1/temples | HTTPS | 5 min | 200 |
| web-panchang | https://darshya.online/panchang | HTTPS | 5 min | 200 |

After each save UptimeRobot does a first probe within ~30 s — if any row shows red, fix the deploy before continuing (otherwise the SMS alert in §3 will fire immediately and burn the monthly quota).

## 3. Alert Contacts (FOUNDER ACTION)

Free tier ships 1 SMS contact and unlimited email contacts. Configure both:

1. Dashboard → **My Settings → Alert Contacts → Add Alert Contact**.
2. Type = **SMS**, paste the founder phone in E.164 format (e.g. `+91XXXXXXXXXX`).
3. UptimeRobot sends an OTP — paste it back to verify. (If the OTP doesn't arrive in ~2 min, retry once; international SMS sometimes loses the first attempt.)
4. Add a second contact: Type = **E-mail**, point at the same founder ops inbox used for signup.
5. Open each of the 4 monitors → **Edit → Alert Contacts to Notify** → tick both the SMS row and the e-mail row.
6. Set **When Down — Notify after this many failed attempts** = **1** for each monitor (default is 0, which means "every check" — we want 1 confirmed failure so transient blips don't burn the monthly SMS).

The SMS quota resets monthly. Two real outages in a month and SMS goes silent — that is the point at which we tighten escalation (Slack/Telegram webhook on the next iteration).

## 4. Public Status Page (FOUNDER ACTION)

1. Dashboard → **Status Pages → + Add status page**.
2. Friendly name = `Darshya`.
3. Custom slug = `darshya` → final URL becomes `https://stats.uptimerobot.com/darshya`.
4. Monitor selection = all 4 monitors from §2.
5. Save. UptimeRobot exposes a public JSON feed at `https://stats.uptimerobot.com/api/getMonitorList/<slug-hash>` — copy that URL from the **Public Status Page → Embed** tab (it is shown alongside the iframe snippet).
6. Set the env var on the **Render** service `darshya-web` (`srv-d970l2ks728c738fc33g`) → Environment. *(Corrected 2026-09-02, `OPS-10`: this step used to say "Set the env var in Cloudflare Pages (Project → Settings → Environment Variables, both Production and Preview)". Cloudflare Pages has not served the web tier since the 2026-07-08 cutover — there is no Pages project to set a variable on. Cloudflare is DNS + edge proxy only.)* Note the var is `NEXT_PUBLIC_*`, so it is baked at **build** time and needs a rebuild, not just a restart:

   ```
   NEXT_PUBLIC_UPTIME_STATUS_URL=https://stats.uptimerobot.com/api/getMonitorList/<slug-hash>
   ```

7. Deploy `darshya-web` explicitly. *(Corrected 2026-09-02, `OPS-10`: this step used to say "Trigger one Cloudflare Pages redeploy (uses 1 of the 500/mo build slots)". There is no Pages build pipeline and no 500/mo build quota.)* `autoDeploy: false` (`render.yaml:60`), so a push deploys nothing — dispatch the deploy by hand per `docs/runbooks/prod-rollback.md`:

   ```bash
   gh workflow run render-diag.yml -f mode=deploy -f sid=srv-d970l2ks728c738fc33g
   ```

   After the deploy reports live, `https://darshya.online/status` will render the live monitor table.

If the env var is absent, the page degrades to a neutral fallback (no crash, just a "Status temporarily unavailable" banner + the 4 monitor names in grey).

## 5. Status Badge Embed

Two options to surface uptime elsewhere (footer, investor deck, README):

- **iframe (zero-code, fastest):**

  ```html
  <iframe
    src="https://stats.uptimerobot.com/<slug-hash>"
    width="100%"
    height="320"
    frameborder="0"
    title="Darshya uptime"
  ></iframe>
  ```

  Works but blocks layout on slow networks and pulls UptimeRobot fonts/CSS.

- **Preferred — consume the same public JSON SSR-side:** the `/status` SSR page at `apps/web/app/status/page.tsx` already does this. To embed in another surface, import the same shape and reuse the table component. No iframe, no third-party CSS, indexable by Google, and the response sits behind Cloudflare cache for 60 s (matching `export const revalidate = 60`).

UptimeRobot free-tier ToS requires a visible "Powered by UptimeRobot" link on any surface that displays their data — the SSR page already renders it in the footer. Keep it there.
