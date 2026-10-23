-- Ready-for-pickup tracking, ready-to-wear sizes, portfolio photos, repeating costs, materials stock and the deleted-items bin. Additive only.
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "readyAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "portfolio" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "RtwSize" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "size" TEXT NOT NULL,
    "made" INTEGER NOT NULL DEFAULT 0,
    "sold" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RtwSize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringExpense" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'OPERATING',
    "category" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "vendor" TEXT,
    "dayOfMonth" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastMonth" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'yards',
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lowAt" DOUBLE PRECISION,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trash" (
    "id" SERIAL NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trash_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RtwSize_orderId_size_key" ON "RtwSize"("orderId", "size");

-- AddForeignKey
ALTER TABLE "RtwSize" ADD CONSTRAINT "RtwSize_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Outfits already waiting for pickup count from their last update.
UPDATE "Order" SET "readyAt" = "updatedAt" WHERE "status" = 'READY';
