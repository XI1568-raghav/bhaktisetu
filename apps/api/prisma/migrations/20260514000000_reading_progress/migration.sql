-- CreateTable
CREATE TABLE "reading_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "book_slug" TEXT NOT NULL,
    "chapter_slug" TEXT NOT NULL,
    "chapter_number" INTEGER NOT NULL,
    "scroll_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_verse" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reading_progress_user_id_book_slug_key" ON "reading_progress"("user_id", "book_slug");

-- CreateIndex
CREATE INDEX "reading_progress_user_id_idx" ON "reading_progress"("user_id");

-- AddForeignKey
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
