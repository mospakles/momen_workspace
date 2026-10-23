import type { PrismaClient } from "@prisma/client";
import { del, get, list, put } from "@vercel/blob";

// Everything in the database as one JSON document. Used by `npm run backup`,
// the daily cron and the "Download backup" button.
export async function exportAll(db: PrismaClient) {
  return {
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
    rtwSizes: await db.rtwSize.findMany(),
    recurringExpenses: await db.recurringExpense.findMany(),
    materials: await db.material.findMany(),
    bin: await db.trash.findMany(),
  };
}

export const backupName = (exportedAt: string) => `momen-${exportedAt.slice(0, 19).replace(/[:T]/g, "-")}.json`;

const PREFIX = "backups/";
const KEEP_DAYS = 30;
export const blobBackupsEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/** Save a backup to the private Blob store and drop ones older than KEEP_DAYS. */
export async function saveBackupToBlob(db: PrismaClient) {
  const data = await exportAll(db);
  const blob = await put(`${PREFIX}${backupName(data.exportedAt)}`, JSON.stringify(data), {
    access: "private",
    contentType: "application/json",
  });
  const cutoff = Date.now() - KEEP_DAYS * 86_400_000;
  const old = (await listBackups()).filter((b) => b.uploadedAt.getTime() < cutoff);
  if (old.length) await del(old.map((b) => b.url));
  return { pathname: blob.pathname, customers: data.customers.length, orders: data.orders.length };
}

export async function listBackups() {
  const { blobs } = await list({ prefix: PREFIX });
  return blobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
}

export async function loadBackup(pathname: string) {
  const blob = (await listBackups()).find((b) => b.pathname === pathname);
  if (!blob) return null;
  const res = await get(blob.url, { access: "private" });
  return res?.statusCode === 200 ? res.stream : null;
}
