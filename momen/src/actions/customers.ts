"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { date, reqStr, str } from "@/lib/form";
import { MEASUREMENT_FIELDS } from "@/lib/constants";

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

export async function createCustomer(fd: FormData) {
  const c = await db.customer.create({ data: customerData(fd) });
  revalidatePath("/customers");
  redirect(`/customers/${c.id}`);
}

export async function updateCustomer(id: number, fd: FormData) {
  await db.customer.update({ where: { id }, data: customerData(fd) });
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}

export async function deleteCustomer(id: number) {
  await db.customer.delete({ where: { id } });
  revalidatePath("/customers");
  redirect("/customers");
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
  await db.measurement.delete({ where: { id } });
  revalidatePath(`/customers/${customerId}`);
}
