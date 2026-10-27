"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { bool, date, int, reqStr, str } from "@/lib/form";
import { toMonth } from "@/lib/format";
import { binExpense, deleteFromBin, restoreFromBin } from "@/lib/trash";
import { BUSINESS_FIELDS } from "@/lib/settings";

// ---- Expenses ----

function expenseData(fd: FormData) {
  const amount = int(fd, "amount");
  if (!amount) throw new Error("Amount is required");
  return {
    amount,
    date: date(fd, "date") ?? new Date(),
    kind: str(fd, "kind") ?? "OPERATING",
    category: str(fd, "category") ?? "OTHER",
    description: reqStr(fd, "description"),
    vendor: str(fd, "vendor"),
    note: str(fd, "note"),
  };
}

export async function addExpense(fd: FormData) {
  await db.expense.create({ data: expenseData(fd) });
  revalidatePath("/expenses");
  revalidatePath("/");
}

export async function updateExpense(id: number, fd: FormData) {
  const e = await db.expense.update({ where: { id }, data: expenseData(fd) });
  revalidatePath("/expenses");
  revalidatePath("/");
  redirect(`/expenses?month=${toMonth(e.date)}`);
}

export async function deleteExpense(id: number) {
  await binExpense(id);
  revalidatePath("/expenses");
  revalidatePath("/bin");
}

export async function deleteExpenseAndReturn(id: number) {
  const e = await binExpense(id);
  revalidatePath("/bin");
  revalidatePath("/expenses");
  revalidatePath("/");
  redirect(`/expenses?month=${toMonth(e.date)}`);
}

// ---- Repeating monthly costs ----

export async function addRecurring(fd: FormData) {
  const amount = int(fd, "amount");
  if (!amount) throw new Error("Amount is required");
  const day = Math.min(28, Math.max(1, int(fd, "dayOfMonth") ?? 1));
  await db.recurringExpense.create({
    data: {
      description: reqStr(fd, "description"),
      category: str(fd, "category") ?? "OTHER",
      kind: str(fd, "kind") ?? "OPERATING",
      vendor: str(fd, "vendor"),
      amount,
      dayOfMonth: day,
    },
  });
  revalidatePath("/expenses");
}

export async function toggleRecurring(id: number, active: boolean) {
  await db.recurringExpense.update({ where: { id }, data: { active } });
  revalidatePath("/expenses");
}

export async function deleteRecurring(id: number) {
  await db.recurringExpense.delete({ where: { id } });
  revalidatePath("/expenses");
}

// ---- Materials stock ----

function num(fd: FormData, key: string) {
  const v = str(fd, key);
  const n = v === null ? NaN : Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export async function addMaterial(fd: FormData) {
  const quantity = num(fd, "quantity") ?? 0;
  await db.material.create({
    data: {
      name: reqStr(fd, "name"),
      unit: str(fd, "unit") ?? "yards",
      quantity,
      lowAt: num(fd, "lowAt"),
      unitPrice: int(fd, "unitPrice"),
      note: str(fd, "note"),
      moves: quantity ? { create: { change: quantity, after: quantity, note: "Starting stock" } } : undefined,
    },
  });
  revalidatePath("/stock");
}

/** Bought more (+) or used some (−). Never goes below zero. Logged in the material's history. */
export async function adjustMaterial(id: number, direction: 1 | -1, fd: FormData) {
  const by = num(fd, "by");
  if (!by) return;
  const m = await db.material.findUniqueOrThrow({ where: { id } });
  const after = Math.max(0, m.quantity + direction * Math.abs(by));
  const why = str(fd, "why");
  // What was paid for a purchase also sets the price per unit.
  const paid = direction > 0 ? int(fd, "paid") : null;
  await db.material.update({
    where: { id },
    data: {
      quantity: after,
      ...(paid ? { unitPrice: Math.round(paid / Math.abs(by)) } : {}),
      moves: { create: { change: after - m.quantity, after, cost: paid, note: [direction > 0 ? "Bought" : "Used", why].filter(Boolean).join(" · ") } },
    },
  });
  revalidatePath("/stock");
  revalidatePath(`/stock/${id}`);
}

export async function updateMaterial(id: number, fd: FormData) {
  const m = await db.material.findUniqueOrThrow({ where: { id } });
  const quantity = Math.max(0, num(fd, "quantity") ?? m.quantity);
  await db.material.update({
    where: { id },
    data: {
      name: reqStr(fd, "name"),
      unit: str(fd, "unit") ?? m.unit,
      quantity,
      lowAt: num(fd, "lowAt"),
      unitPrice: int(fd, "unitPrice"),
      note: str(fd, "note"),
      // A typed-in quantity is a stock count correction; keep it in the history.
      moves: quantity !== m.quantity ? { create: { change: quantity - m.quantity, after: quantity, note: "Corrected" } } : undefined,
    },
  });
  revalidatePath("/stock");
  redirect(`/stock/${id}`);
}

export async function deleteMaterial(id: number) {
  await db.material.delete({ where: { id } });
  revalidatePath("/stock");
  redirect("/stock");
}

// ---- Business details ----

export async function saveBusiness(fd: FormData) {
  await db.$transaction(
    BUSINESS_FIELDS.map((f) => {
      const value = String(fd.get(f.key) ?? "").trim();
      return db.setting.upsert({ where: { key: f.key }, create: { key: f.key, value }, update: { value } });
    }),
  );
  for (const p of ["/settings", "/portfolio", "/orders", "/customers"]) revalidatePath(p, "layout");
  redirect("/settings?saved=1");
}

// ---- Tasks ----

export async function addTask(fd: FormData) {
  const orderId = int(fd, "orderId");
  await db.task.create({ data: { title: reqStr(fd, "title"), dueDate: date(fd, "dueDate"), orderId } });
  revalidatePath("/tasks");
  revalidatePath("/");
  if (orderId) revalidatePath(`/orders/${orderId}`);
}

export async function toggleTask(id: number, done: boolean) {
  const t = await db.task.update({ where: { id }, data: { done, doneAt: done ? new Date() : null } });
  revalidatePath("/tasks");
  revalidatePath("/");
  if (t.orderId) revalidatePath(`/orders/${t.orderId}`);
}

export async function deleteTask(id: number) {
  await db.task.delete({ where: { id } });
  revalidatePath("/tasks");
  revalidatePath("/");
}

// ---- Issues ----

export async function addIssue(fd: FormData) {
  const orderId = int(fd, "orderId");
  let customerId = int(fd, "customerId");
  if (orderId && !customerId) {
    customerId = (await db.order.findUnique({ where: { id: orderId } }))?.customerId ?? null;
  }
  await db.issue.create({
    data: {
      title: reqStr(fd, "title"),
      details: str(fd, "details"),
      date: date(fd, "date") ?? new Date(),
      orderId,
      customerId,
    },
  });
  revalidatePath("/issues");
  if (orderId) revalidatePath(`/orders/${orderId}`);
  if (customerId) revalidatePath(`/customers/${customerId}`);
}

export async function resolveIssue(id: number, fd: FormData) {
  await db.issue.update({ where: { id }, data: { resolved: bool(fd, "resolved"), resolution: str(fd, "resolution") } });
  revalidatePath("/issues");
}

export async function deleteIssue(id: number) {
  await db.issue.delete({ where: { id } });
  revalidatePath("/issues");
}

// ---- Bin ----

export async function restoreItem(id: number) {
  let href: string;
  try {
    href = await restoreFromBin(id);
  } catch (e) {
    // Production hides thrown messages, so carry the reason back to the page.
    redirect(`/bin?error=${encodeURIComponent(e instanceof Error ? e.message : "Could not restore it")}`);
  }
  for (const p of ["/bin", "/", "/orders", "/customers", "/expenses", "/workers"]) revalidatePath(p);
  redirect(href);
}

export async function deleteForever(id: number) {
  await deleteFromBin(id);
  revalidatePath("/bin");
}
