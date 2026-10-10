import type { Order, OrderCost, Payment } from "@prisma/client";

export function orderTotals(o: Order & { payments: Payment[]; costs: OrderCost[] }) {
  const paid = o.payments.reduce((s, p) => s + p.amount, 0);
  const cost = o.costs.reduce((s, c) => s + c.amount, 0);
  const balance = o.status === "CANCELLED" ? 0 : o.price - paid;
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
