-- Orders can now be in-house work (modelling, adverts, ready-to-wear) with no paying customer.
-- Existing orders become CUSTOMER orders and keep their customer.
ALTER TABLE "Order" ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'CUSTOMER';
ALTER TABLE "Order" ALTER COLUMN "customerId" DROP NOT NULL;
