"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { date, reqStr, str } from "@/lib/form";
import { MEASUREMENT_FIELDS } from "@/lib/constants";
import { normalizePhone } from "@/lib/format";
import { binCustomer, binMeasurement } from "@/lib/trash";

function customerData(fd: FormData) {
  return {
    name: reqStr(fd, "name"),
    phone: str(fd, "phone"),
    email: str(fd, "email"),
    address: str(fd, "address"),
    birthday: date(fd, "birthday"),
    instagram: str(fd, "instagram"),
    referredBy: str(fd, "referredBy"),
    notes: str(fd, "notes"),
  };
}

/** Another customer with the same phone number, if any. */
async function findByPhone(phone: string | null, exceptId?: number) {
  const target = normalizePhone(phone);
  if (!target) return null;
  const withPhone = await db.customer.findMany({ where: { phone: { not: null }, id: exceptId ? { not: exceptId } : undefined } });
  return withPhone.find((c) => normalizePhone(c.phone) === target) ?? null;
}

export async function createCustomer(fd: FormData) {
  const data = customerData(fd);
  // Same phone = same person. Open the existing record instead of creating a duplicate.
  const existing = await findByPhone(data.phone);
  if (existing) redirect(`/customers/${existing.id}?existing=1`);
  const c = await db.customer.create({ data });
  revalidatePath("/customers");
  redirect(`/customers/${c.id}`);
}

export async function updateCustomer(id: number, fd: FormData) {
  const data = customerData(fd);
  const clash = await findByPhone(data.phone, id);
  if (clash) redirect(`/customers/${id}/edit?clash=${clash.id}`);
  await db.customer.update({ where: { id }, data });
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}

export async function deleteCustomer(id: number) {
  await binCustomer(id);
  revalidatePath("/customers");
  revalidatePath("/bin");
  redirect("/customers");
}

/** Move everything from the duplicate onto `keepId`, fill any blank details, then delete the duplicate. */
export async function mergeCustomer(keepId: number, fd: FormData) {
  const dupId = Number(fd.get("mergeId"));
  if (!dupId || dupId === keepId) throw new Error("Pick the duplicate to merge in");
  const [keep, dup] = await Promise.all([
    db.customer.findUniqueOrThrow({ where: { id: keepId } }),
    db.customer.findUniqueOrThrow({ where: { id: dupId } }),
  ]);
  const fields = ["phone", "email", "address", "birthday", "instagram", "referredBy"] as const;
  const filled = Object.fromEntries(fields.filter((f) => keep[f] == null && dup[f] != null).map((f) => [f, dup[f]]));
  const notes = [keep.notes, dup.notes].filter(Boolean).join("\n\n") || null;

  await db.$transaction([
    db.order.updateMany({ where: { customerId: dupId }, data: { customerId: keepId } }),
    db.measurement.updateMany({ where: { customerId: dupId }, data: { customerId: keepId } }),
    db.issue.updateMany({ where: { customerId: dupId }, data: { customerId: keepId } }),
    db.customer.update({
      where: { id: keepId },
      // Keep the earliest "customer since" date.
      data: { ...filled, notes, createdAt: dup.createdAt < keep.createdAt ? dup.createdAt : keep.createdAt },
    }),
    db.customer.delete({ where: { id: dupId } }),
  ]);
  revalidatePath("/customers");
  revalidatePath("/");
  redirect(`/customers/${keepId}`);
}

function measurementValues(fd: FormData) {
  const values: Record<string, string> = {};
  for (const f of MEASUREMENT_FIELDS) {
    const v = str(fd, `m:${f}`);
    if (v) values[f] = v;
  }
  // Custom rows come in as parallel arrays: customName[] / customValue[]
  const names = fd.getAll("customName").map(String);
  const vals = fd.getAll("customValue").map(String);
  names.forEach((n, i) => {
    if (n.trim() && vals[i]?.trim()) values[n.trim()] = vals[i].trim();
  });
  return values;
}

export async function saveMeasurement(customerId: number, measurementId: number | null, fd: FormData) {
  const data = {
    unit: str(fd, "unit") ?? "in",
    takenAt: date(fd, "takenAt") ?? new Date(),
    notes: str(fd, "notes"),
    values: JSON.stringify(measurementValues(fd)),
  };
  if (measurementId) {
    await db.measurement.update({ where: { id: measurementId }, data });
  } else {
    await db.measurement.create({ data: { ...data, customerId } });
  }
  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}#measurements`);
}

export async function deleteMeasurement(customerId: number, id: number) {
  await binMeasurement(id);
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/bin");
}

export async function deleteMeasurementAndReturn(customerId: number, id: number) {
  await deleteMeasurement(customerId, id);
  redirect(`/customers/${customerId}#measurements`);
}
