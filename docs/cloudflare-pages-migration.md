# Cloudflare Pages Migration: `poojly-web` → `darshya` (TD13)

> Status: **Migration complete on Cloudflare side as of 2026-05-02.** Code references updated. Old project pending deletion (7-day rollback hold).
>
> **Audit trail:** Initial code-ref cleanup landed in `3c94e77` (mistakenly bundled with the TD9 backup commit due to a stash/rebase race during the cutover session). This file is the canonical playbook; the TD13 commit `chore(infra): ... ` formalises ownership of the migration.

## Why this migration happened

The product rebranded across three names: **Poojly → BhaktiSetu → Darshya**. The Cloudflare Pages project was originally created as `poojly-web` and only the public-facing custom domain (`darshya.online`) reflected the rebrand. Tooling, dashboards, deploy logs, and the `*.pages.dev` URL all still surfaced the old "poojly" name — confusing for any new contributor and a footgun for ops (e.g. CORS regex mistakes, accidental redeploys to the wrong project).

A fresh `darshya` Pages project was created in Cloudflare with the canonical custom domains, and the GitHub Actions deploy was repointed. The legacy `poojly-web` project is now unused but still exists pending the rollback window.

## Project state

| Item                           | Value                                                            |
|--------------------------------|------------------------------------------------------------------|
| New Pages project              | `darshya`                                                        |
| New `*.pages.dev` URL          | https://darshya.pages.dev                                        |
| Production custom domain       | https://darshya.online                                           |
| Apex DNS routing               | Cloudflare DNS → CNAME-flattened to `darshya.pages.dev`          |
| Old (legacy) Pages project     | `poojly-web` — **DO NOT DEPLOY** (kept for 7-day rollback only) |
| Old `*.pages.dev` URL          | https://poojly-web.pages.dev (no live traffic expected)          |
| API backend                    | https://api.darshya.online (Render service `poojly-api`, name unchanged) |

The Render API service is still named `poojly-api` internally (`poojly-api.onrender.com`) — that's intentional back-compat per `CLAUDE.md` (storage keys + service IDs use the legacy slug). Public traffic flows through `api.darshya.online`.

## Code references updated

The following committed files no longer hardcode `poojly-web`:

| File                                  | Change                                              |
|---------------------------------------|-----------------------------------------------------|
| `apps/web/wrangler.toml`              | `name = "poojly-web"` → `name = "darshya"`          |
| `apps/web/package.json`               | `pages:deploy --project-name=poojly-web` → `darshya` |
| `apps/web/CLOUDFLARE.md`              | All references to `poojly-web` → `darshya`          |
| `.github/workflows/deploy-web.yml`    | Hardcoded project name → `${{ vars.CLOUDFLARE_PROJECT_NAME || 'darshya' }}` |
| `DEPLOY.md`                           | URLs + project name updated                         |
| `apps/api/DEPLOY.md`                  | CORS example updated to darshya hosts               |

### Intentionally **not** changed

| File / value                               | Reason                                          |
|--------------------------------------------|-------------------------------------------------|
| `apps/web/package.json` `"name": "@poojly/web"` | Workspace package name — back-compat. Renaming requires updating every `workspace:*` import (`@poojly/ui`, `@poojly/shared`, `@poojly/api-client`, `@poojly/analytics`, `@poojly/tsconfig`). Out of scope for TD13. |
| Storage keys prefixed `poojly_*`           | Per `CLAUDE.md`: "do NOT rename without a migration." Renaming logs out every existing user. |
| Render service `poojly-api` / `poojly-api.onrender.com` | Render doesn't allow renaming services without recreating them; `api.darshya.online` is the canonical public URL anyway. |
| `Bhaktisetu.pdf`, `BHAKTISETU_*` PRD docs   | Historical artefacts; not deployment-affecting. |
| Files under `docs/chat-archive/`           | Frozen historical conversation logs.            |

## GitHub Actions / secrets

`deploy-web.yml` now reads the Pages project name from a repo variable with a fallback:

```yaml
--project-name=${{ vars.CLOUDFLARE_PROJECT_NAME || 'darshya' }}
```

Optional: set `vars.CLOUDFLARE_PROJECT_NAME = darshya` in **Repo → Settings → Secrets and variables → Actions → Variables** if you want explicit control. Without it, the literal `darshya` is used.

Required secrets (already configured, unchanged):

- `CLOUDFLARE_API_TOKEN` — must have **Pages: Edit** scope on the new `darshya` project (Cloudflare account-level tokens already cover both old and new).
- `CLOUDFLARE_ACCOUNT_ID` — unchanged (same Cloudflare account).

## Safe deletion checklist for the old `poojly-web` project

> Run these in order. **Do NOT delete on the same day the migration cutover happened** — keep a 7-day rollback window.

1. **Verify zero recent production traffic.**
   - Cloudflare Dashboard → Pages → `poojly-web` → **Analytics** (or **Web Analytics** if attached).
   - Confirm <100 hits / 24h for the last 7 consecutive days. Any spike means a stale link / cached DNS somewhere — investigate before deleting.

2. **Confirm no DNS records still point at it.**
   - Cloudflare Dashboard → DNS → search for `poojly-web.pages.dev` as a CNAME target.
   - Check `darshya.online`, `www.darshya.online`, `admin.darshya.online`, `api.darshya.online` — all CNAMEs should point at `darshya.pages.dev` (or the Render service for API), **not** `poojly-web.pages.dev`.
   - External DNS (e.g. registrar nameservers if not Cloudflare): `dig +short darshya.online`, `dig +short www.darshya.online`. Both must resolve via the new project.

3. **Check Pages dashboard hit count for the legacy project.**
   - `poojly-web` → **Deployments** tab → confirm latest deployment is **>30 days old** AND request count <100/24h for the last 7 days.

4. **Detach custom domains from `poojly-web` (if any remain).**
   - `poojly-web` → **Custom domains** → if `darshya.online` or any `*.darshya.online` is still attached here, **remove it first** (this is a no-op if the new project already owns it, but Cloudflare will reject deletion with attached custom domains in some account tiers).

5. **Delete the project.**
   - `poojly-web` → **Settings** (top-right tab) → scroll to bottom → **Delete project** → type `poojly-web` to confirm.
   - Deletion is immediate and **irreversible**. The `poojly-web.pages.dev` subdomain becomes available for anyone to claim.

6. **Hold for 7 days, then final cleanup.**
   - After deletion, monitor Sentry / Render API logs / Cloudflare Web Analytics for any 4xx/5xx referrers from `poojly-web.pages.dev`.
   - If clean for 7 more days, delete this section and `docs/cache-bust-after-rebrand.md` if no longer needed.

## Rollback plan

If the new `darshya` project has a critical regression within 7 days of cutover:

**Option A — Re-point GitHub Actions back to legacy (fastest, ~2 min):**

```yaml
# .github/workflows/deploy-web.yml
--project-name=poojly-web
```

Or set the repo variable: `CLOUDFLARE_PROJECT_NAME = poojly-web`. Push any commit to trigger redeploy. The legacy project still has its custom domain config from before cutover — re-attach `darshya.online` to `poojly-web` in Cloudflare Pages → Custom domains.

**Option B — Recreate `darshya` from a known-good Git tag:**

```bash
git checkout v<last-good-tag>      # or the commit before TD13
git tag -a hotfix-rollback -m "rollback: pre-TD13 deploy"
git push --tags
```

Then redeploy via GitHub Actions on that tag.

**Option C — Manual emergency redeploy from a clean checkout:**

```bash
cd apps/web
NEXT_PUBLIC_API_URL=https://api.darshya.online pnpm run pages:deploy
```

This uses the `wrangler` config in `apps/web/wrangler.toml` (now `name = "darshya"`). If you must point at the legacy project temporarily, override on the CLI: `wrangler pages deploy .vercel/output/static --project-name=poojly-web`.

## Verification after migration

After any deploy to the new `darshya` project, run:

```bash
# Frontend reachable on both URLs
curl -s -o /dev/null -w "%{http_code}\n" https://darshya.pages.dev
curl -s -o /dev/null -w "%{http_code}\n" https://darshya.online

# API CORS allows the new origin
curl -s -H "Origin: https://darshya.online" -I https://api.darshya.online/health | grep -i "access-control-allow-origin"

# Old subdomain should still 200 until deletion (it's a separate Pages project)
curl -s -o /dev/null -w "%{http_code}\n" https://poojly-web.pages.dev
```

Expected: `200`, `200`, header echoes `https://darshya.online`, `200` (until step 5 of deletion checklist).
