-- P0 #6 — User.blocked gate. Adds three columns so admins can suspend a
-- user without deleting their data: a boolean for the auth-time check,
-- plus an optional reason + timestamp for audit. All three are nullable
-- or defaulted so the migration is safe to apply with traffic in flight.

ALTER TABLE "users"
  ADD COLUMN "blocked"        BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN "blocked_reason" TEXT,
  ADD COLUMN "blocked_at"     TIMESTAMP(3);

-- Hot path: auth.ts checks `blocked` on every authenticated request.
-- Partial index keeps it tiny — only the (very small) blocked set lives in
-- the index, so the planner can answer "is this user blocked?" without
-- scanning the full table.
CREATE INDEX "users_blocked_idx" ON "users" ("blocked") WHERE "blocked" = true;
