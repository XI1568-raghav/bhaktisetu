# Partnership tier matrix

> **Founder approves tier per candidate before sending DM.** Tier choice depends on follower count, engagement quality, niche fit, and budget remaining in cycle.
> **Cycle budget cap: ₹50,000 total** across all 10 confirmed partnerships. If barter-heavy mix, cash spend can be ₹0.

## Tier table

| Tier | Creator size | Our offer | Expected output | Revenue split | Approx cash cost |
|---|---|---|---|---|---|
| **Barter** | 5K-15K | 1 free puja (any deity, any temple in network) + branded content kit (logo + brand color hex + 3-line product description PDF) | 1 Instagram Reel + 1 Story sequence (or YouTube short, creator's choice) | None | ₹0 cash; ₹500-2,000 internal cost of puja |
| **Paid-flat** | 15K-30K | ₹5,000-₹10,000 flat fee + free puja | 1 Reel + 3 Stories + bio link for 7 days | None | ₹5K-10K per creator |
| **Rev-share** | 30K-50K | Dedicated promo code + free puja, no flat fee | 1 Reel + dedicated promo code in bio for 30 days | 10% of first-puja revenue from their promo code, tracked via Stripe coupon, paid monthly via bank transfer | Variable; ₹0 upfront, ~₹150-500/conversion |

## Budget allocation guide (founder picks)

**Conservative (₹15,000 total cycle cost):**

- 6 barter (₹0 cash)
- 3 paid-flat at ₹5,000 each = ₹15,000
- 1 rev-share (no upfront)

**Balanced (₹30,000 total):**

- 4 barter
- 4 paid-flat at ₹7,500 average = ₹30,000
- 2 rev-share

**Aggressive (₹50,000 cap):**

- 2 barter
- 5 paid-flat at ₹10,000 each = ₹50,000
- 3 rev-share

## Tier-assignment criteria (apply per candidate)

- **Default to barter.** Most micro-influencers (5K-20K) will accept free puja + content kit gladly. Cash offers can actually reduce perceived authenticity for spiritual content.
- **Move to paid-flat when:** candidate has done previous paid partnerships, follower count is 15K+, OR the creator's audience demographic is exceptionally NRI-heavy (60%+ overseas) and likely to convert.
- **Move to rev-share when:** candidate is 30K+, has commercial savvy (paid newsletter, course, etc.), AND you want long-tail attribution rather than one-shot impression. Best for sustained relationship.
- **Never combine paid-flat + rev-share** in same cycle for the same creator — pick one.

## What the branded content kit contains (barter tier)

Founder assembles once, reuses for all barter partnerships:

1. Brand logo (SVG + 1024px PNG, transparent bg)
2. Brand color hex codes: saffron `#E16318`, indigo `#4F46E5`, emerald `#059669`
3. 3-line product description (creator can paste in caption):
   > "Darshya books verified-pandit pujas at temples across India with mandatory video proof of every ceremony. NRI dual-currency checkout (INR + USD). 80G receipts where eligible. darshya.online."
4. 2-3 suggested caption templates (creator adapts in their voice)
5. UTM-tagged tracking link: `https://darshya.online/?utm_source=ig&utm_medium=influencer&utm_campaign={{handle}}`

## Promo code generation (rev-share tier)

For each rev-share partnership:

1. Founder generates Stripe coupon (NOT Razorpay — Razorpay coupon attribution is weaker; Stripe handles via `coupon.metadata.influencer_handle`).
2. Code naming convention: `{HANDLE}{10}` (10% discount for first puja, e.g. `RADHA10`, `KRSNA10`). Keep short, easy to type.
3. Code is set to: 10% off first puja, single-use per customer, valid 30 days from creator post.
4. Attribution tracked monthly: `coupon.times_redeemed` × `avg_first_puja_value` × 10% = creator payout.
5. Payout via bank transfer monthly, 30-day lag from end of attribution month.

## Disclosure requirement (ALL tiers — barter, paid-flat, rev-share)

Every post produced under any tier MUST carry disclosure tags. See `disclosure-compliance.md` for exact clauses. Non-compliance = partnership terminated, future offers withdrawn.

## Approval workflow (founder)

1. Open vetted `candidates.md` slots (15 → 10 confirmed).
2. For each PASS candidate, assign tier in slot's "Proposed tier" field.
3. Sum projected cash spend. Confirm ≤ ₹50,000.
4. If over: downgrade highest-cost paid-flat to barter or rev-share.
5. Begin outreach per `outreach-copy.md` variant matched to tier + context.
