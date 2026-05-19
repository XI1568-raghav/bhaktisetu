-- CreateTable: cows
CREATE TABLE "cows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gaushala_id" UUID NOT NULL,
    "tag_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "breed" TEXT,
    "age_years" INTEGER,
    "gender" TEXT NOT NULL DEFAULT 'female',
    "health_status" TEXT NOT NULL DEFAULT 'healthy',
    "arrival_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cows_gaushala_id_tag_number_key" ON "cows"("gaushala_id", "tag_number");
CREATE INDEX "cows_gaushala_id_created_at_idx" ON "cows"("gaushala_id", "created_at");

-- CreateTable: cow_health_records
CREATE TABLE "cow_health_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cow_id" UUID NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "record_type" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "vet_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cow_health_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cow_health_records_cow_id_recorded_at_idx" ON "cow_health_records"("cow_id", "recorded_at");

-- AddForeignKey
ALTER TABLE "cow_health_records" ADD CONSTRAINT "cow_health_records_cow_id_fkey" FOREIGN KEY ("cow_id") REFERENCES "cows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: volunteers
CREATE TABLE "volunteers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gaushala_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'general',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "volunteers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "volunteers_gaushala_id_active_idx" ON "volunteers"("gaushala_id", "active");
