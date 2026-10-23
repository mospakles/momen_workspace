import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { fmtDate, money } from "./format";
import { orderWho } from "./orders";
import { removePhoto } from "./uploads";

// Deletes go to the bin: a JSON copy of the record and everything deleted with it.
// Restoring re-inserts the rows with their original ids, so links between them still work.
// Photos stay in storage until the bin entry is purged.

export const KEEP_DAYS = 30;

const orderTree = { payments: true, promises: true, costs: true, photos: true, sizes: true, tasks: { select: { id: true } }, issues: { select: { id: true } } } as const;
type OrderTree = Prisma.OrderGetPayload<{ include: typeof orderTree }>;

async function toBin(kind: string, label: string, data: unknown) {
  await db.trash.create({ data: { kind, label, data: JSON.parse(JSON.stringify(data)) } });
}

export async function binOrder(id: number) {
  const o = await db.order.findUniqueOrThrow({ where: { id }, include: { ...orderTree, customer: true } });
  const { customer, ...order } = o;
  await toBin("ORDER", `${orderWho(o)} · ${o.title}`, order);
  await db.order.delete({ where: { id } });
  return customer?.id ?? null;
}

export async function binCustomer(id: number) {
  const c = await db.customer.findUniqueOrThrow({
    where: { id },
    include: { measurements: true, orders: { include: orderTree }, issues: { select: { id: true } } },
  });
  await toBin("CUSTOMER", `${c.name} (${c.orders.length} order${c.orders.length === 1 ? "" : "s"})`, c);
  await db.customer.delete({ where: { id } });
}

export async function binPayment(id: number) {
  const p = await db.payment.findUniqueOrThrow({ where: { id }, include: { order: { include: { customer: true } } } });
  const { order, ...payment } = p;
  await toBin("PAYMENT", `${money(p.amount)} payment · ${orderWho(order)} · ${order.title}`, payment);
  await db.payment.delete({ where: { id } });
}

export async function binCost(id: number) {
  const c = await db.orderCost.findUniqueOrThrow({ where: { id }, include: { order: true } });
  const { order, ...cost } = c;
  await toBin("COST", `${money(c.amount)} cost${c.paidTo ? ` (${c.paidTo})` : ""} · ${order.title}`, cost);
  await db.orderCost.delete({ where: { id } });
}

export async function binExpense(id: number) {
  const e = await db.expense.findUniqueOrThrow({ where: { id } });
  await toBin("EXPENSE", `${money(e.amount)} · ${e.description} · ${fmtDate(e.date)}`, e);
  await db.expense.delete({ where: { id } });
  return e;
}

// ---- Restore ----

async function restoreOrder(tx: Prisma.TransactionClient, o: OrderTree) {
  const { payments, promises, costs, photos, sizes, tasks, issues, ...order } = o;
  if (order.customerId && !(await tx.customer.findUnique({ where: { id: order.customerId } }))) {
    throw new Error("This order's customer is gone. Restore the customer first.");
  }
  if (order.measurementId && !(await tx.measurement.findUnique({ where: { id: order.measurementId } }))) order.measurementId = null;
  await tx.order.create({ data: order });
  await tx.payment.createMany({ data: payments });
  await tx.paymentPromise.createMany({ data: promises });
  await tx.orderCost.createMany({ data: costs });
  await tx.photo.createMany({ data: photos });
  await tx.rtwSize.createMany({ data: sizes });
  // Tasks and issues weren't deleted, only unlinked; link back the ones that still exist.
  await tx.task.updateMany({ where: { id: { in: tasks.map((t) => t.id) } }, data: { orderId: order.id } });
  await tx.issue.updateMany({ where: { id: { in: issues.map((i) => i.id) } }, data: { orderId: order.id } });
}

/** Put a bin entry back. Returns where to go to see it. */
export async function restoreFromBin(trashId: number) {
  const t = await db.trash.findUniqueOrThrow({ where: { id: trashId } });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = t.data as any;
  let href = "/";
  await db.$transaction(async (tx) => {
    if (t.kind === "ORDER") {
      await restoreOrder(tx, data);
      href = `/orders/${data.id}`;
    } else if (t.kind === "CUSTOMER") {
      const { measurements, orders, issues, ...customer } = data;
      await tx.customer.create({ data: customer });
      await tx.measurement.createMany({ data: measurements });
      for (const o of orders) await restoreOrder(tx, o);
      await tx.issue.updateMany({ where: { id: { in: issues.map((i: { id: number }) => i.id) } }, data: { customerId: customer.id } });
      href = `/customers/${customer.id}`;
    } else if (t.kind === "PAYMENT" || t.kind === "COST") {
      if (!(await tx.order.findUnique({ where: { id: data.orderId } }))) throw new Error("Its order is gone. Restore the order first.");
      if (t.kind === "PAYMENT") await tx.payment.create({ data });
      else await tx.orderCost.create({ data });
      href = `/orders/${data.orderId}`;
    } else if (t.kind === "EXPENSE") {
      await tx.expense.create({ data });
      href = `/expenses/${data.id}`;
    }
    await tx.trash.delete({ where: { id: trashId } });
  });
  return href;
}

// ---- Purge ----

function photosIn(t: { kind: string; data: Prisma.JsonValue }): { filename: string; url: string | null }[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = t.data as any;
  if (t.kind === "ORDER") return d.photos ?? [];
  if (t.kind === "CUSTOMER") return (d.orders ?? []).flatMap((o: { photos?: [] }) => o.photos ?? []);
  return [];
}

export async function deleteFromBin(trashId: number) {
  const t = await db.trash.delete({ where: { id: trashId } });
  await Promise.all(photosIn(t).map(removePhoto));
}

/** Permanently remove bin entries older than KEEP_DAYS. */
export async function purgeBin() {
  const old = await db.trash.findMany({ where: { deletedAt: { lt: new Date(Date.now() - KEEP_DAYS * 86_400_000) } } });
  for (const t of old) await deleteFromBin(t.id);
  return old.length;
}
