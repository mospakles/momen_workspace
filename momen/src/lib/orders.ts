import type { Customer, Order, OrderCost, Payment } from "@prisma/client";
import { addDays, fmtDate, money } from "./format";

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

/** Same worker however their name was typed: "Mama  Tunde" = "mama tunde". */
export function workerKey(name: string | null) {
  return (name ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

/** Plain-text receipt for WhatsApp: outfit, price, each payment and what's left. */
export function receiptText(o: Order & { customer: Customer | null; payments: Payment[]; costs: OrderCost[] }, shopName: string) {
  const t = orderTotals(o);
  const lines = [
    `*${shopName} · Receipt #${o.id}*`,
    `${o.customer?.name ?? ""}`,
    "",
    `${o.title}${o.quantity > 1 ? ` ×${o.quantity}` : ""}: ${money(o.price)}`,
    "",
    ...(o.payments.length ? ["Payments:", ...o.payments.map((p) => `• ${fmtDate(p.paidAt)}${p.method ? ` (${p.method})` : ""}: ${money(p.amount)}`)] : ["No payments yet."]),
    "",
    `Total paid: ${money(t.paid)}`,
    t.balance > 0 ? `*Balance: ${money(t.balance)}*` : "*Fully paid. Thank you!*",
  ];
  if (t.balance > 0) lines.push("", "Thank you!");
  return lines.join("\n");
}

const STARTED = ["CUTTING", "SEWING", "FITTING", "READY"];

/** Work has started on a customer order but nothing has been paid. */
export function needsDeposit(o: Order & { payments: Payment[] }) {
  return !isInHouse(o) && o.price > 0 && STARTED.includes(o.status) && o.payments.length === 0;
}

/** Per-piece numbers for a ready-to-wear batch. Pieces = sizes made, or the order quantity if no sizes yet. */
export function rtwPieces(o: Order & { costs: OrderCost[]; sizes: { made: number; sold: number }[] }) {
  const made = o.sizes.reduce((s, z) => s + z.made, 0) || o.quantity;
  const sold = o.sizes.reduce((s, z) => s + z.sold, 0);
  const cost = o.costs.reduce((s, c) => s + c.amount, 0);
  const costEach = made ? Math.round(cost / made) : 0;
  const priceEach = made ? Math.round(o.price / made) : 0;
  return { made, sold, left: made - sold, costEach, priceEach, profitEach: priceEach - costEach };
}

export const invoiceNumber = (orderId: number) => `INV-${String(orderId).padStart(4, "0")}`;

/** When an invoice issued today should be paid, from the "due after (days)" business setting. */
export const invoiceDue = (issued: Date, dueDays: string) => addDays(issued, Math.max(0, Number(dueDays) || 0));

/** WhatsApp version of an invoice: items, what's paid, balance and where to pay. */
export function invoiceText(opts: {
  shopName: string;
  number: string;
  customer: string;
  lines: { title: string; qty: number; amount: number }[];
  paid: number;
  due: Date;
  bank: string[];
}) {
  const total = opts.lines.reduce((s, l) => s + l.amount, 0);
  const balance = Math.max(0, total - opts.paid);
  const first = opts.customer.trim().split(/\s+/)[0];
  return [
    `*${opts.shopName} · Invoice ${opts.number}*`,
    `Hello ${first}, here is your invoice.`,
    "",
    ...opts.lines.map((l) => `• ${l.title}${l.qty > 1 ? ` ×${l.qty}` : ""}: ${money(l.amount)}`),
    "",
    `Total: ${money(total)}`,
    ...(opts.paid ? [`Paid: ${money(opts.paid)}`] : []),
    `*Balance due: ${money(balance)}* by ${fmtDate(opts.due)}`,
    ...(opts.bank.length ? ["", "Pay to:", ...opts.bank] : []),
    "",
    "Thank you!",
  ].join("\n");
}
