# apps\web\app\learn-sanskrit\lesson\[id]\page.tsx

- Params · interface · L9-L9 — Type describing the route's dynamic segment, carrying the lesson id from the URL.
- generateStaticParams · function · L11-L13 — Pre-renders a static route for every lesson in the catalog at build time.
- generateMetadata · function · L15-L20 — Produces per-lesson SEO title/description from the catalog, falling back to a 'not found' title for unknown ids.
- LessonPage · function · L22-L41 — Server component that loads the requested lesson and renders its header, MDX content, and quiz, returning 404 when the id matches no lesson.
