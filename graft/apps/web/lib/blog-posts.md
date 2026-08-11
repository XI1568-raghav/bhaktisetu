# apps\web\lib\blog-posts.ts

- BlogPost · interface · L10-L17 — Defines the shape of a published blog post as consumed by the site, including slug, date, title, excerpt, raw markdown body, and GitHub source link.
- GHContentItem · interface · L19-L24 — Mirrors the GitHub Contents API response fields needed to identify downloadable markdown files in the drafts directory.
- parseFilename · function · L27-L31 — Enforces the YYYY-MM-DD-slug.md filename convention so only properly dated drafts become posts with a date and slug.
- extractTitle · function · L33-L40 — Derives a post's display title from its first markdown H1, falling back to a humanised slug when no heading exists.
- extractExcerpt · function · L42-L52 — Builds a plain-text teaser by stripping frontmatter, headings, and code fences, then truncating the first paragraph to a maximum length.
- listBlogPosts · function · L54-L93 — Lists all published posts by querying the GitHub Contents API for markdown drafts, fetching and parsing each file, and returning them sorted newest-first, degrading to an empty list on any failure.
- getBlogPost · function · L95-L98 — Retrieves a single post by slug from the cached list, returning null when no matching post exists.
- blogPostSlugs · function · L100-L103 — Provides the list of all post slugs, e.g. for static route generation.
