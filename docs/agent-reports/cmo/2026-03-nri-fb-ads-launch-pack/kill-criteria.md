# Kill Criteria — NRI FB Ads ($50 / 7d flight)

Pause aggressively — $50 has zero room for ego.

## Per-creative kill thresholds

| Signal | Threshold | Action |
|---|---|---|
| **CPA** (cost per `order_placed`) | > **$30** at any point after day 2 | Pause that creative |
| **CTR** (link click-through rate) | < **0.8%** by **end of day 3** | Pause that creative |
| **CPC** (cost per link click) | > **$1.50** by end of day 3 | Pause that creative |
| **Landing-page bounce** | > **70%** by day 3 | Pause + diagnose landing-creative mismatch |
| **Pixel `Purchase` events** | **0** by end of day 4 | Pause entire campaign; debug pixel + checkout flow before relaunch |

## Per-audience kill threshold

| Signal | Threshold | Action |
|---|---|---|
| Audience-level CPA | > **$40** by day 4 | Pause that ad set, redirect spend to better-performing geo |

## Winner-double-down rule

If 1 creative × audience cell ships an order_placed at CPA < $15 by day 4: pause the other 5 cells and redirect their remaining budget to the winner for the final 3 days.

## End-of-flight evaluation

| Outcome | Action |
|---|---|
| ≥ 1 order_placed at CPA < $30 | Scale: relaunch with $100-200 budget on the winning creative + audience |
| 0 orders but funnel data exists (clicks + checkout_starts) | Iterate creative or landing page; retry with refined copy |
| 0 funnel data | Investigate pixel / UTM / audience targeting before retrying |
