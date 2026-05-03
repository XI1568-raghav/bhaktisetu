# Google AdSense Setup (Darshya)

Layer AQ — display-ad inventory on free pages. Premium subscribers (M3 Bhakti
Pass ₹499/mo, Annual Ratna ₹5000/yr, NRI premium) never see ads. Goal: ₹0.5–2
CPM revenue from `/darshan`, `/content`, `/pujas`, and other free surfaces.

## 1. Create an AdSense account

1. Sign in at <https://www.google.com/adsense/start/> with the Google account
   that owns `darshya.online`.
2. Add the site `darshya.online`. AdSense will ask for ownership verification
   — paste the snippet into `apps/web/app/layout.tsx` if needed (the
   `<AdSenseScript />` we ship is sufficient once `NEXT_PUBLIC_ADSENSE_CLIENT`
   is set).
3. Wait for AdSense approval (typically 1–14 days). Approval requires:
   - Site has substantive content (we ship `/temples`, `/content`, `/pujas`).
   - Site has `/privacy` and `/terms` (we have both).
   - Site has a valid `/ads.txt` (route is wired at `apps/web/app/ads.txt/route.ts`).

## 2. Create ad units

In the AdSense console, under **Ads → By ad unit → Display ads**, create one
unit per slot below. Copy each numeric "data-ad-slot" value:

| Env var                                     | Format     | Page             | Placement                          |
| ------------------------------------------- | ---------- | ---------------- | ---------------------------------- |
| `NEXT_PUBLIC_ADSENSE_SLOT_DARSHAN_BANNER`   | Horizontal | `/darshan/[id]`  | Above the live video player       |
| `NEXT_PUBLIC_ADSENSE_SLOT_DARSHAN_INFEED`  | In-feed    | `/darshan`       | Every 4th card in the live grid   |
| `NEXT_PUBLIC_ADSENSE_SLOT_CONTENT_SIDEBAR` | Vertical   | `/content/[slug]`| Top of related-content sidebar    |
| `NEXT_PUBLIC_ADSENSE_SLOT_PUJAS_BANNER`    | Horizontal | `/pujas`         | Between trending tags and grid    |

For the in-feed unit, choose "In-feed" style and pick the layout that matches a
darshan card (image-left).

## 3. Set Render env vars

On the Render web service for `apps/web`:

```
NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
NEXT_PUBLIC_ADSENSE_SLOT_DARSHAN_BANNER=1234567890
NEXT_PUBLIC_ADSENSE_SLOT_DARSHAN_INFEED=1234567891
NEXT_PUBLIC_ADSENSE_SLOT_CONTENT_SIDEBAR=1234567892
NEXT_PUBLIC_ADSENSE_SLOT_PUJAS_BANNER=1234567893
```

All four are optional. If `NEXT_PUBLIC_ADSENSE_CLIENT` is unset, the loader
script is not injected and `/ads.txt` returns a benign placeholder. If a slot
env is unset, that specific `<AdSlot />` renders nothing.

## 4. Verify

After deploy:

- `curl https://darshya.online/ads.txt` → `google.com, pub-XXXX, DIRECT, f08c47fec0942fa0`.
- View source on `/pujas` → should see `<ins class="adsbygoogle" data-ad-client="ca-pub-…" />`.
- Sign in as a Bhakti Pass / Pro user → ads disappear (premium gate).

## Premium gate

`apps/web/components/useIsPremium.ts` returns true if
`user.subscriptionTier ∈ {pro, premium, bhakti_pass, annual_ratna}` or
`user.isNriPremium === true`. `<AdSlot />` short-circuits to `null` for those
users — both the script and the ad request are skipped.

## Approval pitfalls

- AdSense bans empty content. Don't deploy slots until `/darshan` and
  `/content` show real items.
- AdSense bans religious content that "promotes hatred". Devotional content
  (aarti, puja, panchang) is fine.
- AdSense disallows ads on pages with violent imagery. We don't have any.
- Click your own ads → ban. Use AdSense's preview tool, not production.
