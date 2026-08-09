# apps\api\src\services\content-draft.service.ts

Layer O organic-outreach service that LLM-generates devotional Reddit/Quora post drafts from a rotating topic pool and persists them into a best-effort content_drafts table for admin approval, never auto-posting.

- RedditPostDraft · interface · L104-L109 — Shape of a generated Reddit post draft returned for admin review, bundling title, body, target subreddit, and suggested flair.
- QuoraAnswerDraft · interface · L111-L115 — Shape of a generated Quora answer draft returned for admin review, bundling headline, body, and topic.
- safeParseJson · function · L119-L128 — Rescues a JSON object from noisy LLM output by trimming everything outside the first '{' and last '}' before parsing, returning {} on failure so callers can treat it as a miss.
- generateRedditPost · function · L130-L163 — Generates one authentic, non-promotional Reddit post draft for a given subreddit and topic via the LLM, returning null when the model output lacks a usable title or body.
- generateQuoraAnswer · function · L165-L195 — Generates one thorough, source-citing Quora answer draft for a given question via the LLM, returning null when the model output lacks a usable title or body.
- ContentDraftInsert · interface · L203-L208 — Input shape for persisting a new draft, fixing the allowed draft types (reddit/quora/twitter) and required fields.
- ensureTable · function · L230-L246 — One-time guard that creates the content_drafts table via raw DDL, retrying with the pgcrypto extension if gen_random_uuid is unavailable, and swallowing failures so cron ticks never crash.
- saveDraft · function · L248-L263 — Inserts a generated draft into content_drafts with status DRAFT so it enters the admin approval queue, logging but never throwing on failure.
- ContentDraftRow · interface · L265-L277 — Row shape returned to the admin UI for the draft review queue, including lifecycle timestamps and rejection/posting metadata.
- listDrafts · function · L279-L318 — Lists up to 200 drafts newest-first, optionally filtered by status, normalizing raw SQL rows into ContentDraftRow objects and returning [] on any failure.
- updateDraftStatus · function · L320-L358 — Transitions a draft to APPROVED/POSTED/REJECTED, stamping the matching lifecycle timestamp and applying optional admin edits (posted URL, rejection reason, title/body) via a dynamically built UPDATE.
