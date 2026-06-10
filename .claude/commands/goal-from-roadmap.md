---
description: Inject a roadmap queue item as the goal for this session
argument-hint: <queueId|itemId|next|next-cmo|next-cto|...>
---

Argument: $ARGUMENTS

Run this bash command and use the output as the current session goal:

```bash
node scripts/agents/roadmap/queue-pick.mjs "$ARGUMENTS"
```

If output starts with `<!-- ROADMAP QUEUE ITEM:`, treat the markdown body as the user request. Begin work following the prompt's instructions verbatim — including TDD, verify, commit w/ `Closes:` trailer.
