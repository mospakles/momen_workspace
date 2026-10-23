"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { bool, date, int, reqStr, str } from "@/lib/form";
import { orderTotals, workerKey } from "@/lib/orders";
import { binCost, binOrder, binPayment } from "@/lib/trash";
import { removePhoto, storePhoto } from "@/lib/uploads";

function touch(orderId: number) {
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/orders/board");
  revalidatePath("/");
}

function orderData(fd: FormData) {
  const purpose = str(fd, "purpose") ?? "CUSTOMER";
  // A customer order must have a customer; in-house work may name a model / wearer.
  const customerId = int(fd, "customerId");
  if (purpose === "CUSTOMER" && !customerId) throw new Error("Pick a customer");
  const status = str(fd, "status") ?? "PENDING";
  let deliveredAt = date(fd, "deliveredAt");
  if (status === "DELIVERED" && !deliveredAt) deliveredAt = new Date();
  return {
    purpose,
    customerId,
    title: reqStr(fd, "title"),
    description: str(fd, "description"),
    fabricSource: str(fd, "fabricSource"),
    quantity: int(fd, "quantity") ?? 1,
    price: int(fd, "price") ?? 0,
    status,
    orderDate: date(fd, "orderDate") ?? new Date(),
    fittingDate: date(fd, "fittingDate"),
    dueDate: date(fd, "dueDate"),
    deliveredAt,
    fitNotes: str(fd, "fitNotes"),
    problems: str(fd, "problems"),
    notes: str(fd, "notes"),
    measurementId: int(fd, "measurementId"),
  };
}

/** readyAt is stamped when an order moves into READY, so "waiting for pickup" can be measured. */
function readyAt(prev: { status: string; readyAt: Date | null } | null, status: string) {
  if (status !== "READY") return prev?.readyAt ?? null;
  return prev?.status === "READY" ? prev.readyAt : new Date();
}

export async function createOrder(fd: FormData) {
  const data = orderData(fd);
  const order = await db.order.create({ data: { ...data, readyAt: readyAt(null, data.status) } });

  // Optional deposit taken when the order was booked.
  const deposit = int(fd, "deposit");
  if (deposit && deposit > 0) {
    await db.payment.create({
      data: { orderId: order.id, amount: deposit, paidAt: order.orderDate, method: str(fd, "depositMethod"), note: "Deposit" },
    });
  }
  if (order.customerId) revalidatePath(`/customers/${order.customerId}`);
  touch(order.id);
  redirect(`/orders/${order.id}`);
}

export async function updateOrder(id: number, fd: FormData) {
  const data = orderData(fd);
  const current = await db.order.findUniqueOrThrow({ where: { id } });
  await db.order.update({ where: { id }, data: { ...data, readyAt: readyAt(current, data.status) } });
  touch(id);
  redirect(`/orders/${id}`);
}

export async function setOrderStatus(id: number, status: string) {
  const current = await db.order.findUniqueOrThrow({ where: { id } });
  let deliveredAt = current.deliveredAt;
  if (status === "DELIVERED" && !deliveredAt) deliveredAt = new Date();
  if (status !== "DELIVERED") deliveredAt = null;
  await db.order.update({ where: { id }, data: { status, deliveredAt, readyAt: readyAt(current, status) } });
  touch(id);
}

export async function deleteOrder(id: number) {
  const customerId = await binOrder(id);
  revalidatePath("/orders");
  revalidatePath("/bin");
  if (customerId) revalidatePath(`/customers/${customerId}`);
  redirect("/orders");
}

// ---- Payments ----

export async function addPayment(orderId: number, fd: FormData) {
  const amount = int(fd, "amount");
  if (!amount) throw new Error("Amount is required");
  await db.payment.create({
    data: { orderId, amount, paidAt: date(fd, "paidAt") ?? new Date(), method: str(fd, "method"), note: str(fd, "note") },
  });
  touch(orderId);
}

export async function deletePayment(orderId: number, id: number) {
  await binPayment(id);
  revalidatePath("/bin");
  touch(orderId);
}

/**
 * "They paid": the full balance, or an amount spread over what they owe, oldest order first.
 * Clearing an order also marks its open payment promises as kept.
 */
async function recordPaid(orderIds: number[], fd: FormData) {
  const orders = await db.order.findMany({
    where: { id: { in: orderIds } },
    include: { payments: true, costs: true },
    orderBy: { orderDate: "asc" },
  });
  const owing = orders.map((o) => ({ o, balance: orderTotals(o).balance })).filter((x) => x.balance > 0);
  const total = owing.reduce((s, x) => s + x.balance, 0);
  let left = fd.get("full") === "1" ? total : (int(fd, "amount") ?? 0);
  if (left <= 0) return;
  const method = str(fd, "method") ?? "Transfer";
  for (const [i, { o, balance }] of owing.entries()) {
    // Anything paid beyond the total goes on the last order.
    const amount = i === owing.length - 1 ? left : Math.min(left, balance);
    if (amount <= 0) break;
    await db.payment.create({ data: { orderId: o.id, amount, method, note: amount >= balance ? "Balance paid" : "Part payment" } });
    if (amount >= balance) await db.paymentPromise.updateMany({ where: { orderId: o.id, kept: false }, data: { kept: true } });
    left -= amount;
    touch(o.id);
  }
}

export async function markOrderPaid(orderId: number, fd: FormData) {
  await recordPaid([orderId], fd);
  const o = await db.order.findUnique({ where: { id: orderId } });
  if (o?.customerId) revalidatePath(`/customers/${o.customerId}`);
}

export async function markCustomerPaid(customerId: number, fd: FormData) {
  const orders = await db.order.findMany({ where: { customerId, purpose: "CUSTOMER", status: { not: "CANCELLED" } }, select: { id: true } });
  await recordPaid(orders.map((o) => o.id), fd);
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  revalidatePath("/reports");
}

// ---- Promises to pay ----

export async function addPromise(orderId: number, fd: FormData) {
  const promisedDate = date(fd, "promisedDate");
  if (!promisedDate) throw new Error("Promised date is required");
  await db.paymentPromise.create({ data: { orderId, promisedDate, amount: int(fd, "amount"), note: str(fd, "note") } });
  touch(orderId);
}

export async function togglePromise(orderId: number, id: number, kept: boolean) {
  await db.paymentPromise.update({ where: { id }, data: { kept } });
  touch(orderId);
}

export async function deletePromise(orderId: number, id: number) {
  await db.paymentPromise.delete({ where: { id } });
  touch(orderId);
}

// ---- Direct costs (tailor, embroidery, buttonholes…) ----

export async function addCost(orderId: number, fd: FormData) {
  const amount = int(fd, "amount");
  if (!amount) throw new Error("Amount is required");
  await db.orderCost.create({
    data: {
      orderId,
      amount,
      category: str(fd, "category") ?? "OTHER",
      date: date(fd, "date") ?? new Date(),
      paidTo: str(fd, "paidTo"),
      // Ticked "not paid yet" = owed to the worker until marked paid.
      paidAt: bool(fd, "owed") ? null : (date(fd, "date") ?? new Date()),
      note: str(fd, "note"),
    },
  });
  touch(orderId);
  revalidatePath("/workers");
}

export async function markCostPaid(id: number) {
  const c = await db.orderCost.update({ where: { id }, data: { paidAt: new Date() } });
  touch(c.orderId);
  revalidatePath("/workers");
}

/** Pay off everything still owed to one worker (matched by name, ignoring case and spacing). */
export async function payWorker(key: string) {
  const owed = await db.orderCost.findMany({ where: { paidAt: null, paidTo: { not: null } } });
  const ids = owed.filter((c) => workerKey(c.paidTo) === key).map((c) => c.id);
  await db.orderCost.updateMany({ where: { id: { in: ids } }, data: { paidAt: new Date() } });
  revalidatePath("/workers");
  revalidatePath("/orders");
  revalidatePath("/");
}

export async function deleteCost(orderId: number, id: number) {
  await binCost(id);
  revalidatePath("/bin");
  touch(orderId);
  revalidatePath("/workers");
}

// ---- Ready-to-wear stock ----

/** Add pieces made in a size (adds to the count if the size already exists). */
export async function addSize(orderId: number, fd: FormData) {
  const size = reqStr(fd, "size").toUpperCase();
  const made = Math.max(1, int(fd, "made") ?? 1);
  await db.rtwSize.upsert({
    where: { orderId_size: { orderId, size } },
    create: { orderId, size, made },
    update: { made: { increment: made } },
  });
  touch(orderId);
  revalidatePath("/stock");
}

export async function deleteSize(orderId: number, id: number) {
  await db.rtwSize.delete({ where: { id } });
  touch(orderId);
  revalidatePath("/stock");
}

/** Sell one piece: counts it as sold and records the money as a payment (a sale) on the batch. */
export async function sellPiece(orderId: number, fd: FormData) {
  const sizeId = int(fd, "sizeId");
  const amount = int(fd, "amount");
  if (!sizeId || !amount) throw new Error("Pick a size and a price");
  const size = await db.rtwSize.findUniqueOrThrow({ where: { id: sizeId } });
  if (size.sold >= size.made) throw new Error(`No size ${size.size} left`);
  const buyer = str(fd, "buyer");
  await db.$transaction([
    db.rtwSize.update({ where: { id: sizeId }, data: { sold: { increment: 1 } } }),
    db.payment.create({
      data: { orderId, amount, paidAt: date(fd, "paidAt") ?? new Date(), method: str(fd, "method"), note: `Sold 1 × ${size.size}${buyer ? ` to ${buyer}` : ""}` },
    }),
  ]);
  touch(orderId);
  revalidatePath("/stock");
}

// ---- Photos ----

const ALLOWED = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".gif"]);

export async function addPhotos(orderId: number, fd: FormData) {
  const files = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  for (const file of files) {
    const ext = path.extname(file.name).toLowerCase() || ".jpg";
    if (!ALLOWED.has(ext)) continue;
    const filename = `${orderId}-${randomUUID()}${ext}`;
    const url = await storePhoto(filename, Buffer.from(await file.arrayBuffer()), file.type || "image/jpeg");
    await db.photo.create({ data: { orderId, filename, url, kind: str(fd, "kind") ?? "FITTING", caption: str(fd, "caption") } });
  }
  touch(orderId);
}

export async function setPortfolio(orderId: number, photoId: number, portfolio: boolean) {
  await db.photo.update({ where: { id: photoId }, data: { portfolio } });
  touch(orderId);
  revalidatePath("/portfolio");
}

export async function deletePhoto(orderId: number, id: number) {
  await removePhoto(await db.photo.delete({ where: { id } }));
  touch(orderId);
}

export async function updateOrderNotes(orderId: number, fd: FormData) {
  await db.order.update({
    where: { id: orderId },
    data: { fitNotes: str(fd, "fitNotes"), problems: str(fd, "problems") },
  });
  touch(orderId);
}

export async function markDelivered(orderId: number, fd: FormData) {
  await db.order.update({
    where: { id: orderId },
    data: { status: "DELIVERED", deliveredAt: date(fd, "deliveredAt") ?? new Date() },
  });
  touch(orderId);
}


export async function setOrderStatusForm(id: number, fd: FormData) {
  const status = str(fd, "status");
  if (status) await setOrderStatus(id, status);
}
