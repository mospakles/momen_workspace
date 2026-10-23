// Exports every table to backups/momen-<date>.json. Works against whichever
// database DATABASE_URL points to (run `vercel env pull .env` first for production).
// Run: npm run backup
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { backupName, exportAll } from "../src/lib/backup";

const db = new PrismaClient();

async function main() {
  const data = await exportAll(db);
  const dir = path.join(process.cwd(), "backups");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, backupName(data.exportedAt));
  writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`Saved ${path.relative(process.cwd(), file)} (${data.customers.length} customers, ${data.orders.length} orders)`);
}

main().finally(() => db.$disconnect());
