-- Costs can now be recorded as owed to a worker and marked paid later.
-- Every existing cost was money already paid, so it is marked paid on its own date.
ALTER TABLE "OrderCost" ADD COLUMN "paidAt" TIMESTAMP(3);
UPDATE "OrderCost" SET "paidAt" = "date";
