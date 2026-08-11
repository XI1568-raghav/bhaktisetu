# scripts\agents\weekly-investor-update.mjs

Generates a Sunday-only (unless FORCE=1) weekly investor update markdown by synthesizing the past 7 days of git commits, agent fleet reports, and SEO keyword-rank movement into a founder-reviewable email draft.

- isSunday · function · L13-L13 — Gates the whole script so it only produces an investor update on Sundays, enforcing the weekly cadence.
- lastNDays · function · L15-L23 — Builds the list of ISO date strings for the trailing n days so reports and commits can be scoped to the Mon–Sun week being summarized.
- gitCommitsLastWeek · function · L25-L35 — Shells out to git log for the last 7 days and parses each commit into hash/subject/author/date records for the update's shipped-work sections.
- classifyCommit · function · L37-L46 — Buckets each commit into feature/fix/docs/chore/etc. by its conventional-commit prefix so the update can highlight shipped features and fixes separately.
- collectAgentReports · function · L48-L58 — Finds this week's agent fleet report files in the report directory and extracts each report's agent name and date for the fleet-activity table.
- summarizeKeywordRank · function · L60-L74 — Computes week-over-week SEO traction — ranked-keyword count delta and top-10 count — by comparing the latest keyword-tracker state snapshot against the one from ~7 days earlier.
- main · function · L76-L157 — Assembles the full investor update — TL;DR metrics, shipped/fixed commit sections, per-agent run counts, SEO snapshot, and founder fill-in sections — and writes it as a dated markdown report.
