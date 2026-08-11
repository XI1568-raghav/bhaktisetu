# scripts\agents\roadmap\cxo\it.mjs

Weekly auto-generated IT department advisory that tells the Decision Agent what IT owns, what is ready to ship by revenue-per-hour, what the founder is blocking, and which IT KPIs are live or stale.

- buildAdvisory · function · L8-L48 — Builds the IT advisory markdown by filtering roadmap items to the IT owner, ranking the top 5 ready items by revenue/hour ratio, and listing founder-blocked items plus live KPI status so the Decision Agent can pick next-cycle work.
