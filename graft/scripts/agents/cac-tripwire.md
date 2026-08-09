# scripts\agents\cac-tripwire.mjs

- loadState · function · L25-L28 — Loads the persisted week history and breach streak from the state JSON, falling back to an empty tracker if the file is missing or corrupt.
- saveState · function · L30-L32 — Persists the rolling week history and breach streak so the next weekly run can detect consecutive-week breaches.
- fetchMeta · function · L34-L52 — Pulls last-7-days spend and mobile-app-install counts from the Meta Marketing API, degrading gracefully to an 'unavailable' result when credentials or data are missing.
- fetchGoogle · function · L54-L65 — Placeholder for the Google UAC cost/conversion fetch that always reports unavailable until the OAuth refresh-token wiring is implemented.
- pastLaunchPlus14 · function · L67-L72 — Guard that prevents the tripwire from firing until the app has been live for at least 14 days, so early launch noise doesn't trigger the pivot.
- main · function · L74-L177 — Orchestrates the weekly check: aggregates channel spend and installs, computes blended CAC, updates the consecutive-breach streak, and emits the fired/warning/healthy verdict report.
