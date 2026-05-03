# Store Economics — Dropship Commission Model

> Last refreshed: 2026-05-02. Source of truth for `/store` margin policy.

Darshya's `/store` operates as a **headless dropship** layer on MedusaJS.
The platform never holds inventory — vendors ship directly. We earn commission
on every order, applied at the **category level** (not per-SKU) so vendor
onboarding stays fast.

## Commission tiers

| Category         | Commission %  | Why                                                                |
|------------------|---------------|--------------------------------------------------------------------|
| Brass Diya       | 30%           | High markup on artisan brass; loose price discipline among vendors |
| Rudraksha Mala   | 25%           | Authenticity premium offsets cert + dispute cost                   |
| Pooja Thali Set  | 20%           | Bulk weight raises shipping subsidy; commission absorbs loss       |
| Tulsi Mala       | 25%           | Low ASP — needs higher % for unit economics                        |
| Bhagavad Gita    | 15%           | MRP-printed book; thin floor set by Gita Press / BBT pricing       |

**Floor / ceiling**: 15% floor (commodity scriptures), 30% ceiling (artisan goods).
Higher commission requires written approval from Sunil and a category review
recorded in `docs/store-economics.md` history at the bottom.

## Computation

```
vendorPayout       = unitPrice * (1 - commissionPct/100) * qty
darshyaCommission  = unitPrice * (commissionPct/100) * qty
deliveryFee        = 0 if subtotal >= 499 else 49
gst                = round(subtotal * 0.05)   // 5% on devotional goods (HSN 9603)
total              = subtotal + deliveryFee + gst
```

GST is collected by Darshya and paid centrally; vendor invoices flow B2B with
`reverse_charge=false` in line with rule 46 of CGST rules.

## Vendor payout schedule

- T+7 from `DELIVERED` status (cooling-off for refund window)
- Payouts via UPI (Razorpay Route) — no manual transfer
- KYC + GSTIN verified before first payout

## Refund policy hooks

- `CANCELLED` before `SHIPPED` → 100% refund, 0% commission
- `RETURNED` after `DELIVERED` → 100% refund, commission reversed only if vendor accepts return
- Damaged-in-transit → claim raised against shipping partner; commission held in escrow

## Category routing

Each Medusa product carries a `darshya_category` tag (set in seed script
`apps/medusa-store/scripts/seed-dropship.mjs`). The commission service reads
this tag at order-create time. If absent (legacy import), we apply the
**floor 15%** until ops backfills.

## History

- 2026-05-02 — Initial tier set (5 categories, 15–30%) for dropship launch.
