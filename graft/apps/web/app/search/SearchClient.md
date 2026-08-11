# apps\web\app\search\SearchClient.tsx

- Entry · interface · L8-L14 — Describes one searchable knowledge-base article (category, slug, title, summary, optional sub-topic) as stored in the static search index.
- Hit · interface · L15-L15 — An index entry augmented with a relevance score so search results can be ranked.
- search · function · L21-L38 — Ranks index entries by requiring every query token to match (AND semantics) and weighting title matches above summary matches.
- SearchClient · function · L40-L127 — Search page component that fetches the static index once, derives ranked results from the URL query param, and renders results or category browse links.
- submit · function · L59-L63 — Navigates to the search URL with the trimmed, encoded query so results stay shareable via the q param.
