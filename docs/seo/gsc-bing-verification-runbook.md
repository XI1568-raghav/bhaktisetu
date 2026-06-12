# GSC + Bing Webmaster Verification Runbook

> **Roadmap item**: R-Q1-M-002 (P0) · **Authored**: 2026-06-12 · **Time required**: ~30 min · **Owner**: founder
>
> **Goal**: register darshya.online with Google Search Console + Bing Webmaster Tools, submit sitemap, configure email alerts. Unblocks all SEO-data-driven decisions (per `docs/seo/seo-audit-2026-06-12.md` — title-fix audit, broken-link audit, SIDE-FIX-SEO-404 unblock).

## Step 1 — Google Search Console (15 min)

### 1.1 Create / sign in to GSC

1. Open https://search.google.com/search-console (sign in w/ Bhaktisetu Foundation Gmail — use founder@bhaktisetu.com if exists, else founder personal Gmail w/ Foundation-controlled access).
2. Click "Add property" (top-left) → choose "Domain" property type (NOT URL prefix). Domain property verifies via DNS once + covers ALL subdomains + protocols (http/https/www/non-www).
3. Enter `darshya.online` → "Continue".

### 1.2 Domain ownership verification (DNS TXT record)

GSC will display a DNS TXT record like:

```
google-site-verification=AbCdEf1234567890_xxxxxxxxxxxxxxxxxxxxxxx
```

**Where to add this** (depends on domain registrar):

| Registrar | Where to add TXT record |
|---|---|
| Cloudflare | DNS tab → Add record → Type=TXT, Name=`@` (or `darshya.online`), Content=full string, TTL=Auto |
| GoDaddy | DNS Management → Add → Type=TXT, Host=`@`, Value=full string, TTL=600 |
| Namecheap | Advanced DNS → Add new record → TXT, Host=`@`, Value=full string |
| Route 53 | Hosted zones → darshya.online → Create record → TXT → @ → paste string |
| Vercel | Project → Domains → DNS → Add TXT record |

**Verify DNS propagated**:

```bash
dig +short TXT darshya.online | grep google-site-verification
# Expected: returns the full string within 5-30 min after adding
```

### 1.3 Click "Verify" in GSC

Returns: "Ownership verified." → click "Go to property".

### 1.4 Submit sitemap

1. GSC sidebar → Sitemaps.
2. Add a new sitemap: `https://darshya.online/sitemap.xml` (this is the Next.js auto-generated sitemap per `apps/web/app/sitemap.ts`).
3. Click "Submit".
4. Wait 5-15 min → status shows "Success" w/ "Discovered URLs" count (likely ~1,401 per existing audit).

### 1.5 Configure email alerts

1. GSC top-right → Settings (gear icon).
2. User and permissions → click your email → notification settings.
3. Enable email alerts for: Coverage issues, Mobile usability issues, Manual actions, Security issues, Core Web Vitals.

### 1.6 Initial baseline export

1. GSC → Performance → Search results → set date range "Last 28 days".
2. Click Export → CSV → save as `docs/seo/baseline-gsc-2026-06-12.csv`.
3. GSC → Coverage → Pages → set date range last 90 days → Export → save as `docs/findings/raw-gsc-pages-2026-06-12.csv` (this unblocks SIDE-FIX-SEO-404 PER `docs/agent-reports/2026-06-12-side-fix-seo-404-blocked.md`).

## Step 2 — Bing Webmaster Tools (10 min)

### 2.1 Create / sign in to BWT

1. Open https://www.bing.com/webmasters → sign in w/ Microsoft account (create one tied to founder@bhaktisetu.com if needed).
2. Click "Add a site" → enter `https://darshya.online` → click "Add".

### 2.2 Verification — easiest path = import from GSC

Bing offers a 1-click import from Google Search Console (if same email signed in to both):

1. "Import from GSC" option → grant permission.
2. Bing fetches GSC-verified properties → select darshya.online → "Import".
3. Verification: instant (uses GSC's prior DNS verification).

**Alternative: XML/meta tag/TXT verification** if GSC import fails:

| Method | Where to add |
|---|---|
| XML file | Upload BingSiteAuth.xml to site root (apps/web/public/) |
| Meta tag | Add to `<head>` in apps/web/app/layout.tsx |
| TXT record | DNS TXT record (same registrar steps as GSC §1.2) |

### 2.3 Submit sitemap to Bing

1. BWT sidebar → Sitemaps.
2. Submit `https://darshya.online/sitemap.xml`.
3. Wait 5-15 min → status shows success.

### 2.4 Configure notifications

BWT → Settings → Notification → enable email alerts for crawl errors, sitemap errors, security issues.

## Step 3 — Verify both crawlers can reach (5 min)

### 3.1 robots.txt check

```bash
curl -s https://darshya.online/robots.txt
# Expected: at minimum
#   User-agent: *
#   Allow: /
#   Sitemap: https://darshya.online/sitemap.xml
```

If missing OR Sitemap line absent → add `apps/web/public/robots.txt` OR `apps/web/app/robots.ts` per Next.js conventions. File next ticket if missing.

### 3.2 sitemap.xml health

```bash
curl -s https://darshya.online/sitemap.xml | head -20
# Expected: XML w/ <urlset> root + <url><loc>...</loc></url> entries
```

If sitemap is huge (>50K URLs) → split into sitemap index. Bhaktisetu currently ~1,401 URLs = safely under 50K.

### 3.3 Fetch as Googlebot test

In GSC sidebar → URL Inspection → enter `https://darshya.online/` (homepage) → click "Test Live URL". Expected: 200 OK, rendered HTML visible.

## Step 4 — Document + monitor (5 min)

### 4.1 Save credentials reference

Create `docs/legal/seo-verification-records.md` (do NOT commit if private repo) OR keep in founder password manager:

```
GSC property: darshya.online (Domain type)
GSC verification method: DNS TXT
GSC verification string: google-site-verification=...
GSC owner email: founder@...

BWT site: https://darshya.online
BWT verification method: GSC-import (or DNS TXT if separate)
BWT account: ...
```

### 4.2 Set monthly review reminder

Calendar: 1st of every month, 30-min slot.

- Open GSC Performance + Coverage tab → screenshot trend
- Note: top 10 ranking keywords + monthly position trend
- Note: crawl errors count (target = 0)
- Note: Core Web Vitals issues (target = all green)

Log to `docs/seo/monthly-snapshots/YYYY-MM.md` for founder review trail.

## Pass criteria

- [ ] GSC property added + DNS TXT verified
- [ ] GSC sitemap submitted + status="Success" + URL discovery count >0
- [ ] GSC email alerts enabled for 5 categories
- [ ] GSC baseline CSV exported to docs/seo/baseline-gsc-2026-06-12.csv
- [ ] GSC Pages report exported to docs/findings/raw-gsc-pages-2026-06-12.csv (UNBLOCKS SIDE-FIX-SEO-404)
- [ ] BWT site added + verified (preferred: GSC-import)
- [ ] BWT sitemap submitted + status success
- [ ] BWT notifications enabled
- [ ] robots.txt verified present + lists sitemap
- [ ] sitemap.xml verified responsive + well-formed
- [ ] Live URL inspection passes for homepage
- [ ] Credentials saved (founder-private)
- [ ] Monthly review calendar reminder set

## Failure modes + debugging

| Failure | Cause | Fix |
|---|---|---|
| DNS TXT not detected after 1h | DNS provider slow propagation | Wait 24h max OR check via dig from multiple geos |
| Sitemap status="Couldn't fetch" | URL returns 404 OR Content-Type wrong | Verify curl https://darshya.online/sitemap.xml returns 200 + XML content-type |
| BWT GSC-import fails | Different email logged in to GSC vs BWT | Sign out, sign in w/ same email both sides |
| URL Inspection fails Live Test | Page returns 500 OR redirect loop | Test manually first via curl |
| Crawl errors > 0 on day 2 | broken internal links (e.g. SIDE-FIX-SEO-404 24 broken slugs) | Document in coverage report, gate to SIDE-FIX ticket |

## What this unblocks

- **SIDE-FIX-SEO-404**: GSC Pages export = the 24-slug source data founder was missing. Once exported to docs/findings/raw-gsc-pages-2026-06-12.csv → next agent cycle picks up SIDE-FIX and proceeds.
- **R-Q3-M-014 SEO audit follow-through**: title-tag fixes per real GSC data, IndexNow integration (after INDEXNOW_KEY generated).
- **Ongoing monthly SEO data** → feeds `/admin/roadmap` dashboard KPI for organic-traffic lane.

## Out of scope

- Configuring Google Tag Manager / GA4 — separate runbook
- Bing Webmaster URL inspection (similar to GSC, redundant for v1)
- Yandex Webmaster (only relevant for Russia traffic, irrelevant for India devotional)
- Baidu Webmaster (China, irrelevant)
- Schema.org markup validation (separate ticket, post-engineering)
- Manual URL submission via GSC URL Inspection → "Request indexing" — useful for individual page push but not daily workflow

## Closes

R-Q1-M-002 — runbook shipped. Status flips to `shipped` after founder completes 13 pass-criteria checkboxes + first monthly snapshot lands at docs/seo/monthly-snapshots/2026-06.md.
