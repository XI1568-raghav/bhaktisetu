# scripts\agents\roadmap\_bulk-create.mjs

Bulk-imports roadmap items from a CSV into per-item markdown files under docs/roadmap/items, refusing to write anything unless all ids are unique, correctly formatted, and consistent with their category letter.

- parseCsv · function · L18-L41 — Parses CSV text into row objects using an RFC-4180 state machine so quoted commas and escaped double-quotes in titles don't corrupt columns.
- yamlStr · function · L43-L47 — Renders a value as a safely double-quoted YAML string by escaping backslashes and quotes so item titles can't break the frontmatter.
- slugify · function · L49-L51 — Converts an item title into a lowercase, hyphenated, 50-char filesystem-safe slug for the generated markdown filename.
- itemMd · function · L53-L114 — Generates a roadmap item's markdown with planned-status frontmatter and deliberate placeholder fields (KPI query, success criteria, agent brief) that the first orchestrator sub-agent cycle is expected to fill in.
