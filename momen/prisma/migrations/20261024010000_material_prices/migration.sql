-- Prices for materials and what was paid on each purchase. Additive only.
-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "unitPrice" INTEGER;

-- AlterTable
ALTER TABLE "MaterialMove" ADD COLUMN     "cost" INTEGER;

