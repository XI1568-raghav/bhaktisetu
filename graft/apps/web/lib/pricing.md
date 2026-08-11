# apps\web\lib\pricing.ts

- PlanId · type · L6-L6 — Enumerates the four subscription tiers a provider can be on, from free to enterprise.
- ProviderRole · type · L8-L14 — Enumerates the six kinds of service providers whose commission rates differ.
- PlanFeature · interface · L16-L19 — Pairs a marketing feature bullet with an included/excluded flag for plan comparison tables.
- Plan · interface · L21-L32 — Defines a subscription tier's price, listing cap, and commission override that together determine what a provider pays and earns.
- CommissionRate · interface · L34-L39 — Maps a provider role to its free-tier base commission and per-plan commission percentages.
- getPlanById · function · L172-L176 — Resolves a plan ID to its full plan definition, failing loudly on unknown IDs so billing logic never silently uses a wrong tier.
- getPlanFeatures · function · L179-L181 — Returns the feature bullet list for a plan's marketing/comparison display.
- getCommissionRate · function · L184-L188 — Looks up the exact platform commission percentage for a given provider role on a given plan, enforcing that every role+plan combo has an explicit rate.
- formatPrice · function · L200-L215 — Renders a price with the correct locale and currency symbol for INR/USD/GBP, treating zero as "Free" and optionally appending the currency code to disambiguate NRI checkout amounts.
- gbpFromInr · function · L225-L230 — Converts a domestic INR price into a premium NRI GBP price by applying a 10x multiplier against a fixed ₹105/£ reference rate and rounding to the nearest £5 for clean checkout.
- getUpgradePlan · function · L233-L238 — Returns the next higher subscription tier to upsell a provider into, or null when already on the top Enterprise plan.
