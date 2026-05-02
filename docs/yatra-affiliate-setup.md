# Yatra affiliate setup

Layer M1 yatra destination landing pages (`/yatra/destinations/*`) link out to
partner travel sites via the API redirector at `/api/v1/affiliate/click`.

## How clicks flow

1. User clicks "Book via MakeMyTrip" on a yatra detail page.
2. Browser hits `/api/v1/affiliate/click?dest=<slug>&partner=<key>`.
3. API logs the click (server.log) and 302-redirects to the partner URL with
   `utm_source=darshya`, `utm_medium=affiliate`, `utm_campaign=<slug>`, plus
   the partner's affiliate ID if env var is set.

## Affiliate IDs

Apply for each partner's affiliate program, then set the env vars on Render:

| Partner | Apply at | Env var | Param name |
|---|---|---|---|
| MakeMyTrip | https://affiliate.makemytrip.com | `AFF_MAKEMYTRIP_ID` | `affId` |
| Goibibo | https://www.goibibo.com/affiliate (often via CJ Affiliate) | `AFF_GOIBIBO_ID` | `affId` |
| IRCTC Tourism | https://contents.irctc.co.in/en/business/agency.html | `AFF_IRCTC_ID` | `utm_source` (govt programme) |

Without these, links still redirect but Darshya does not earn commission. Set
them ASAP — clicks are happening today.

## Commission

Industry typical: 5-10% on flights/hotels, 7-12% on tour packages.

## Where data is logged

Today: `server.log.info({ event: 'affiliate_click', ... })`. Search Render
logs for `affiliate_click` to see attribution.

Future: persist to `AffiliateClick` Prisma table when traffic justifies a
schema migration.

## Adding a new destination

Edit `apps/web/lib/yatra-destinations.ts` and append a `YatraDestination`. The
detail page + sitemap update automatically.
