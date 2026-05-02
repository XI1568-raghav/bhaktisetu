-- Layer O: Reddit/Quora content draft queue.
-- Stores AI-generated devotional posts before manual admin approval & posting.

CREATE TABLE IF NOT EXISTS "content_drafts" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "type"            TEXT NOT NULL,
  "title"           TEXT NOT NULL,
  "body"            TEXT NOT NULL,
  "target"          TEXT NOT NULL,
  "status"          TEXT NOT NULL DEFAULT 'DRAFT',
  "generated_at"    TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  "approved_at"     TIMESTAMPTZ(3),
  "posted_at"       TIMESTAMPTZ(3),
  "posted_url"      TEXT,
  "rejected_reason" TEXT
);

CREATE INDEX IF NOT EXISTS "content_drafts_status_generated_at_idx"
  ON "content_drafts" ("status", "generated_at");

CREATE INDEX IF NOT EXISTS "content_drafts_type_idx"
  ON "content_drafts" ("type");
