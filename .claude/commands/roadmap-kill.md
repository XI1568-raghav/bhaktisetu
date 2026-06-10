---
description: Mark a roadmap item as killed
argument-hint: <itemId> <reason>
---

Argument: $ARGUMENTS

Run:

```bash
node scripts/agents/roadmap/item-kill.mjs $ARGUMENTS
```

Output the result. Script flips status=killed, logs to `_alerts/`, lists downstream-blocked items.
