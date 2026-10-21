"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { bool, date, int, reqStr, str } from "@/lib/form";
import { toMonth } from "@/lib/format";

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
  await db.expense.delete({ where: { id } });
  revalidatePath("/expenses");
}

export async function deleteExpenseAndReturn(id: number) {
  const e = await db.expense.delete({ where: { id } });
  revalidatePath("/expenses");
  revalidatePath("/");
  redirect(`/expenses?month=${toMonth(e.date)}`);
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
