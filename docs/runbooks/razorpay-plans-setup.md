# Razorpay subscription plans: what the code expects and how to create them

Why this exists: on 2026-10-29 no `RAZORPAY_PLAN_*` variable is set on prod, so a paid plan cannot be charged.
The API now reports `purchasable: false` for such a plan (`GET /api/v1/subscriptions/plans`) and every role's
Subscription page shows a disabled "Opens soon" instead of an enabled Subscribe that errors. Free plans and Cancel
are unaffected. Once you create the plans below and set the variables, the same plan flips to Subscribe by itself
(the flag is computed from the environment on every request, no deploy of new code is needed after the env change
and a restart).

Nothing here is paid until you decide: Razorpay creating a Plan costs nothing; money moves only when a buyer
authorises a subscription. Do not enable it until the legal/GST items in `TASKS.md` are settled.

## 1. Marketplace plans (provider subscriptions, `subscription.service.ts`)

Each plan below is a **monthly** Razorpay plan, billed in **INR**, **interval 1**, amount in paise (rupees x 100).
The code calls `subscriptions.create({ plan_id, total_count: 12, customer_notify: 1 })`, i.e. 12 monthly charges.

| Darshya plan id | Role(s) | Env var (set in Render) | Razorpay plan: period / interval | Amount (INR) | Amount in paise |
|---|---|---|---|---|---|
| `plan-pandit-basic` | pandit | `RAZORPAY_PLAN_PANDIT_BASIC` | monthly / 1 | 999 | 99900 |
| `plan-pandit-pro` | pandit | `RAZORPAY_PLAN_PANDIT_PRO` | monthly / 1 | 2999 | 299900 |
| `plan-astro-basic` | astrologer | `RAZORPAY_PLAN_ASTRO_BASIC` | monthly / 1 | 799 | 79900 |
| `plan-astro-pro` | astrologer | `RAZORPAY_PLAN_ASTRO_PRO` | monthly / 1 | 1999 | 199900 |
| `plan-store-basic` | store owner | `RAZORPAY_PLAN_STORE_BASIC` | monthly / 1 | 1499 | 149900 |
| `plan-store-pro` | store owner | `RAZORPAY_PLAN_STORE_PRO` | monthly / 1 | 3999 | 399900 |
| `plan-wellness-basic` | wellness instructor | `RAZORPAY_PLAN_WELLNESS_BASIC` | monthly / 1 | 699 | 69900 |
| `plan-temple-pro` | temple manager and gaushala manager | `RAZORPAY_PLAN_TEMPLE_PRO` | monthly / 1 | 4999 | 499900 |
| `astro_monthly` | devotee (AI astrologer) | `RAZORPAY_PLAN_ASTRO_MONTHLY` | monthly / 1 | 499 | 49900 |

The `*-free` plans (`plan-pandit-free`, `plan-astro-free`, `plan-store-free`, `plan-wellness-free`, `plan-temple-free`)
need nothing: they cost 0 and never touch Razorpay.

Not purchasable by design, whatever you set:
- `astro_session` (INR 99, one day) has no env mapping, so it cannot be charged through Razorpay Subscriptions.
- `nri_premium_yearly` is withdrawn (`TC-04`): it is not offered at all until its benefits are enforced.

The amounts above are read from `PLANS` in `apps/api/src/services/subscription.service.ts`. If a price there ever
changes, the Razorpay plan must be recreated (a Razorpay plan's amount is immutable) and the env var updated.

## 2. Recurring giving plans (devotee mandates, `recurring.service.ts`) - optional, separate

These use a different variable pattern: `RAZORPAY_PLAN_RECURRING_<PLAN_ID in upper case>`. When unset the code falls
back to an inline plan over the REST API, so they are not needed for the Subscribe buttons above.

| Plan id | Env var | Period / interval | Amount (INR) |
|---|---|---|---|
| `gau_feed_daily` | `RAZORPAY_PLAN_RECURRING_GAU_FEED_DAILY` | daily / 1 | 51 |
| `gau_palan_monthly` | `RAZORPAY_PLAN_RECURRING_GAU_PALAN_MONTHLY` | monthly / 1 | 3000 |
| `wellness_batch_monthly` | `RAZORPAY_PLAN_RECURRING_WELLNESS_BATCH_MONTHLY` | monthly / 1 | 299 |
| `temple_seva_monthly` | `RAZORPAY_PLAN_RECURRING_TEMPLE_SEVA_MONTHLY` | monthly / 1 | 501 |

## 3. Create the plans in the Razorpay dashboard

Prerequisite: a Razorpay account with live keys already set in Render (`RAZORPAY_KEY_ID` starting `rzp_live_`,
`RAZORPAY_KEY_SECRET`) and Subscriptions enabled on the account (Dashboard, Products, Subscriptions; if the menu is
missing, ask Razorpay support to enable it). Do this in **Test mode first** with `rzp_test_` keys to rehearse, then
repeat in Live mode: plan ids differ between modes.

For each row of the table in section 1:
1. Razorpay Dashboard, **Subscriptions**, **Plans**, **+ Create Plan**.
2. **Plan name**: the Darshya plan id, e.g. `plan-pandit-basic` (so you can match it later).
3. **Billing frequency**: Monthly. **Billing interval**: every 1 month.
4. **Amount**: the rupee amount from the table (the dashboard takes rupees; the API takes paise).
5. **Currency**: INR. Description: optional.
6. Create. Copy the plan id shown on the plan page (it looks like `plan_` followed by letters and digits).
   Write it next to the row; never paste it into git, docs or chat.

## 4. Set the variables in Render

1. Render Dashboard, the API service `bhaktisetu` (the only Render service), **Environment**.
2. Add one variable per row you created, with the exact name from the table and the `plan_...` id as the value.
3. Save. Render restarts the service; there is no code deploy to dispatch for this.
4. Do not create a second service or change the plan of the existing one for this.

Also confirm these are set (a missing one makes checkout fail even with plan ids present):
`RAZORPAY_KEY_ID` (live), `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` (or
`RAZORPAY_SUBSCRIPTION_WEBHOOK_SECRET`, which takes precedence for the subscription webhook).

## 5. Webhook

Dashboard, Settings, Webhooks, add `https://api.darshya.online/api/v1/subscriptions/webhook` with the events
`subscription.authenticated`, `subscription.activated`, `subscription.charged`, `subscription.halted`,
`subscription.cancelled`, `subscription.completed`. Use the same secret you set in Render.

## 6. Verify (no money moves)

```
curl -s 'https://api.darshya.online/api/v1/subscriptions/plans?role=PANDIT' | jq '.plans[] | {id, price, purchasable}'
```
- Before: paid plans show `"purchasable": false`; free plans `true`.
- After setting a plan's variable and the restart: that plan shows `true`, and its page button changes from
  "Opens soon" to "Subscribe".
- Then do one real INR 999 purchase yourself (Pandit Basic) in Live mode and cancel it from the Subscription page;
  Razorpay refunds are manual from the dashboard.

## 7. Rollback

Remove the variable (or set it empty) in Render and restart: the plan goes back to "Opens soon" within one request.
Active subscribers are unaffected; cancel them from the Subscription page or the Razorpay dashboard.
