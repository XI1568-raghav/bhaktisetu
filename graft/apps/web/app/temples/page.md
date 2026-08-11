# apps\web\app\temples\page.tsx

- richToCard · function · L14-L35 — Converts a curated rich-detail temple into browser card data, deriving display tradition and popularity ranking from its deity classification and pilgrimage status.
- firstImageUrl · function · L38-L46 — Extracts a usable image URL from API image payloads that may arrive either as plain strings or as objects with a url property.
- apiToCard · function · L48-L83 — Converts an API temple record into browser card data, inferring its deity-type category from keywords in the deity name since the API does not provide one.
- TemplesPage · function · L85-L129 — Builds the temples page by combining rich-detail cards with API temples, merging images into known temples and appending only genuinely new ones so duplicates never inflate the list.
- canon · function · L101-L107 — Normalizes long API slugs (name-city form) to their short rich-detail slug by progressively stripping hyphenated suffixes until a match is found, preventing duplicate temple entries.
