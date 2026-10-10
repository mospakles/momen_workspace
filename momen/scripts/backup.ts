// Exports every table to backups/momen-<date>.json. Works against whichever
// database DATABASE_URL points to (run `vercel env pull .env` first for production).
// Run: npm run backup
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const data = {
    exportedAt: new Date().toISOString(),
    customers: await db.customer.findMany(),
    measurements: await db.measurement.findMany(),
    orders: await db.order.findMany(),
    payments: await db.payment.findMany(),
    promises: await db.paymentPromise.findMany(),
    orderCosts: await db.orderCost.findMany(),
    expenses: await db.expense.findMany(),
    photos: await db.photo.findMany(),
    tasks: await db.task.findMany(),
    issues: await db.issue.findMany(),
  };
  const dir = path.join(process.cwd(), "backups");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `momen-${data.exportedAt.slice(0, 19).replace(/[:T]/g, "-")}.json`);
  writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`Saved ${path.relative(process.cwd(), file)} (${data.customers.length} customers, ${data.orders.length} orders)`);
}

main().finally(() => db.$disconnect());
