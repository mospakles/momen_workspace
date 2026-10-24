-- History of material quantity changes. Additive only.
-- CreateTable
CREATE TABLE "MaterialMove" (
    "id" SERIAL NOT NULL,
    "materialId" INTEGER NOT NULL,
    "change" DOUBLE PRECISION NOT NULL,
    "after" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialMove_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MaterialMove" ADD CONSTRAINT "MaterialMove_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

