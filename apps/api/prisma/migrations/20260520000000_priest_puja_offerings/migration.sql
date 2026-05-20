-- CreateTable: priest_puja_offerings
CREATE TABLE "priest_puja_offerings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "priest_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "deity" TEXT NOT NULL,
    "base_price" DECIMAL(10,2) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "priest_puja_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "priest_puja_offerings_priest_id_idx" ON "priest_puja_offerings"("priest_id");
CREATE INDEX "priest_puja_offerings_is_active_idx" ON "priest_puja_offerings"("is_active");

-- AddForeignKey
ALTER TABLE "priest_puja_offerings" ADD CONSTRAINT "priest_puja_offerings_priest_id_fkey" FOREIGN KEY ("priest_id") REFERENCES "priests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
