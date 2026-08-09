# scripts\agents\roadmap\_subagent-runner.mjs

Module that spawns role-specific Opus sub-agents to convert roadmap items into queue files, using a structured write_queue tool (with legacy frontmatter fallback) to fix the glm-5.2 text-format drift that produced zero queue writes.

- SUBAGENT_SYSTEM · function · L48-L79 — Builds the system prompt that instructs a role sub-agent to compose one self-contained, TDD-first Claude Code prompt per roadmap item with the exact queue-file frontmatter fields the orchestrator requires.
- runSubagent · function · L81-L173 — Runs one Opus sub-agent call for a set of roadmap items and extracts queue files from write_queue tool_use blocks (falling back to legacy ---END-QUEUE-FILE--- parsing), returning empty results on timeout or API failure so the orchestrator tolerates partial failure.
