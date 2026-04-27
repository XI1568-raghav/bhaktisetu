-- Make users.phone nullable so social-login users (Google) can sign up
-- without a phone. Postgres unique indexes already allow multiple NULLs by
-- default, so the @unique constraint on phone keeps working — it just no
-- longer requires every row to have one.

ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;
