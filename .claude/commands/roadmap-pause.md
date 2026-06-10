---
description: Pause the roadmap orchestrator (skips next cron cycles)
---

Run:

```bash
node scripts/agents/roadmap/orchestrator-pause.mjs true
```

Engine will skip cycles until `/roadmap-resume` is invoked.
