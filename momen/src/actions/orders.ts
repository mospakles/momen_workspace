"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { date, int, reqStr, str } from "@/lib/form";
import { UPLOAD_DIR } from "@/lib/uploads";

function touch(orderId: number) {
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/");
}

function orderData(fd: FormData) {
  const status = str(fd, "status") ?? "PENDING";
  let deliveredAt = date(fd, "deliveredAt");
  if (status === "DELIVERED" && !deliveredAt) deliveredAt = new Date();
  return {
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

export async function createOrder(fd: FormData) {
  const customerId = int(fd, "customerId");
  if (!customerId) throw new Error("Pick a customer");
  const order = await db.order.create({ data: { ...orderData(fd), customerId } });

  // Optional deposit taken when the order was booked.
  const deposit = int(fd, "deposit");
  if (deposit && deposit > 0) {
    await db.payment.create({
      data: { orderId: order.id, amount: deposit, paidAt: order.orderDate, method: str(fd, "depositMethod"), note: "Deposit" },
    });
  }
  revalidatePath(`/customers/${customerId}`);
  touch(order.id);
  redirect(`/orders/${order.id}`);
}

export async function updateOrder(id: number, fd: FormData) {
  await db.order.update({ where: { id }, data: orderData(fd) });
  touch(id);
  redirect(`/orders/${id}`);
}

export async function setOrderStatus(id: number, status: string) {
  const current = await db.order.findUniqueOrThrow({ where: { id } });
  let deliveredAt = current.deliveredAt;
  if (status === "DELIVERED" && !deliveredAt) deliveredAt = new Date();
  if (status !== "DELIVERED") deliveredAt = null;
  await db.order.update({ where: { id }, data: { status, deliveredAt } });
  touch(id);
}

export async function deleteOrder(id: number) {
  const photos = await db.photo.findMany({ where: { orderId: id } });
  await db.order.delete({ where: { id } });
  await Promise.all(photos.map((p) => unlink(path.join(UPLOAD_DIR, p.filename)).catch(() => {})));
  revalidatePath("/orders");
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
  await db.payment.delete({ where: { id } });
  touch(orderId);
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
      note: str(fd, "note"),
    },
  });
  touch(orderId);
}

export async function deleteCost(orderId: number, id: number) {
  await db.orderCost.delete({ where: { id } });
  touch(orderId);
}

// ---- Photos ----

const ALLOWED = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".gif"]);

export async function addPhotos(orderId: number, fd: FormData) {
  const files = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  await mkdir(UPLOAD_DIR, { recursive: true });
  for (const file of files) {
    const ext = path.extname(file.name).toLowerCase() || ".jpg";
    if (!ALLOWED.has(ext)) continue;
    const filename = `${orderId}-${randomUUID()}${ext}`;
    await writeFile(path.join(UPLOAD_DIR, filename), Buffer.from(await file.arrayBuffer()));
    await db.photo.create({ data: { orderId, filename, kind: str(fd, "kind") ?? "FITTING", caption: str(fd, "caption") } });
  }
  touch(orderId);
}

export async function deletePhoto(orderId: number, id: number) {
  const p = await db.photo.delete({ where: { id } });
  await unlink(path.join(UPLOAD_DIR, p.filename)).catch(() => {});
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
