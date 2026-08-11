# apps\web\app\priest\reviews\page.tsx

- RatingFilter · type · L18-L18 — Union type constraining the review list filter to 'all' or an exact star rating.
- formatDate · function · L22-L29 — Formats an ISO timestamp into a short Indian-locale date for display on review cards.
- devoteeLabel · function · L34-L36 — Generates a stable placeholder reviewer name from the user ID because the backend does not yet join devotee identity onto reviews.
- PriestReviewsPage · function · L40-L289 — Client component that loads the priest's reviews, computes aggregate rating stats, and renders summary, filter controls, and the review cards with loading/error states.
