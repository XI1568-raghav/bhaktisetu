# scripts\agents\roadmap-orchestrator.mjs

- raceWithWall · function · L34-L46 — Bounds a phase promise to a wall-clock budget with a fallback value while guaranteeing the timer handle is unref'd and cleared so a dangling setTimeout can never keep the Node event loop alive past cycle end (the cycle-12 45-min idle RCA).
- writeAlert · function · L48-L54 — Persists a timestamped markdown alert file under docs/roadmap/_alerts so failure modes survive as artifacts instead of evaporating from logs.
- readQueue · function · L56-L71 — Loads the current roadmap queue by extracting and YAML-parsing the frontmatter block of every markdown file in the queue directory, silently dropping unparseable entries.
- readResumeState · function · L89-L100 — Returns a prior cycle's saved Decision-Agent spawn plan only if it is fresh (<25min) and not yet consumed, so a Render mid-cycle kill doesn't force a repeat Opus call.
- saveResumeState · function · L102-L124 — Checkpoints the Decision Agent's spawn/defer/kill plan to disk before sub-agents fire so the next cycle can resume the plan if Render kills this one mid-fan-out.
- markResumeConsumed · function · L126-L134 — Flips the saved resume state's consumed flag after the plan has been executed so a later cycle never re-runs the same spawn plan.
- main · function · L136-L467 — Runs one full orchestration cycle — lock/pause guards, KPI + fleet + experiment ingestion, tripwire evaluation with T-005 halt, resumable Decision Agent call, spawn-cap and no-op guards, then concurrency-2 sub-agent fan-out with surfaced errors.
- shutdownOnSignal · function · L480-L488 — Signal handler that releases the cycle lock before exiting on SIGINT/SIGTERM so an interrupted run doesn't block the next cron trigger until the 15-min TTL expires.
