import type { Customer, Order, OrderCost, Payment } from "@prisma/client";

const PURPOSE_SHORT: Record<string, string> = { MODELLING: "Modelling", ADVERT: "Advert", RTW: "Ready-to-wear" };

export function isInHouse(o: Pick<Order, "purpose">) {
  return o.purpose !== "CUSTOMER";
}

/** Who the order is for: the customer's name, or e.g. "Ready-to-wear" / "Modelling · Ada" for in-house work. */
export function orderWho(o: Pick<Order, "purpose"> & { customer: Pick<Customer, "name"> | null }) {
  if (!isInHouse(o)) return o.customer?.name ?? "—";
  const label = PURPOSE_SHORT[o.purpose] ?? o.purpose;
  return o.customer ? `${label} · ${o.customer.name}` : label;
}

export function orderTotals(o: Order & { payments: Payment[]; costs: OrderCost[] }) {
  const paid = o.payments.reduce((s, p) => s + p.amount, 0);
  const cost = o.costs.reduce((s, c) => s + c.amount, 0);
  // In-house work is never owed; for ready-to-wear, payments are sales of the pieces.
  const balance = o.status === "CANCELLED" || isInHouse(o) ? 0 : o.price - paid;
  return { paid, cost, balance, profit: o.price - cost };
}

/** Days early (+) or late (−) relative to the due date, for delivered orders. */
export function deliveryDelta(o: Pick<Order, "dueDate" | "deliveredAt">) {
  if (!o.dueDate || !o.deliveredAt) return null;
  const a = new Date(o.dueDate);
  const b = new Date(o.deliveredAt);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}
