# apps\darshya-mcp\src\tools\agent-reports.ts

Exposes read-only MCP tools that let agents list and read Darshya's automated-agent markdown reports under docs/agent-reports, with traversal protection and size caps.

- listMarkdown · function · L26-L52 — Recursively collects all .md report files under the reports root as POSIX-style relative paths so they can be listed uniformly across platforms.
- walk · function · L28-L49 — Inner recursive walker that descends into subdirectories and records only regular files ending in .md, silently skipping unreadable entries.
- agentReports · function · L54-L89 — Implements the agent_reports tool: returns up to 50 reports with name, relativePath, and mtime, sorted newest-first so agents see the freshest digests.
- safeResolve · function · L101-L109 — Guards report reads by rejecting absolute paths, drive-letter/colon paths, and '..' escapes so a user-supplied path can never resolve outside the reports root on any platform.
- agentReportRead · function · L111-L166 — Implements the agent_report_read tool: safely reads one report by relative path and truncates oversized content to a character limit, reporting truncation and true length.
