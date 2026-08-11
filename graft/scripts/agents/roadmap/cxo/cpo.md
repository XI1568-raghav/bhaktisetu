# scripts\agents\roadmap\cxo\cpo.mjs

Weekly CPO advisory generator that assembles the product owner's item status, top revenue-per-hour candidates, founder blockers, and live KPIs into a markdown brief for the Decision Agent.

- buildAdvisory · function · L8-L48 — Builds the CPO's weekly advisory markdown by filtering roadmap items to the cpo owner, ranking ready work by revenue/hour, and surfacing founder blockers and product KPIs so the Decision Agent can pick next-cycle work.
