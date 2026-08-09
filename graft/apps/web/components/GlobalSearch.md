# apps\web\components\GlobalSearch.tsx

- SearchResult · interface · L17-L23 — Describes a single search hit (name, subtitle, destination link) so results from any category can be rendered uniformly.
- SearchResponse · interface · L25-L33 — Shapes the backend search payload into per-category result lists plus a total count for empty-state handling.
- GlobalSearch · function · L35-L222 — Global search dropdown component that queries the search API (min 2 chars, 200ms debounce) and groups matches into Temples/Pujas/Content sections.
- onKey · function · L53-L60 — Opens the search dropdown when '/' is pressed, but only if the user is not currently typing in a form field or editable element.
- onClick · function · L68-L72 — Closes the search dropdown when the user clicks anywhere outside the component container.
- onEsc · function · L73-L75 — Closes the search dropdown when the Escape key is pressed.
