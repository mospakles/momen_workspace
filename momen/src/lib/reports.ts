import { db } from "./db";
import { monthRange } from "./format";

export async function monthSummary(month: string) {
  const { start, end } = monthRange(month);
  const inMonth = { gte: start, lt: end };

  const [payments, costs, expenses, booked, delivered] = await Promise.all([
    db.payment.findMany({ where: { paidAt: inMonth } }),
    db.orderCost.findMany({ where: { date: inMonth }, include: { order: { select: { purpose: true } } } }),
    db.expense.findMany({ where: { date: inMonth } }),
    db.order.findMany({ where: { orderDate: inMonth, status: { not: "CANCELLED" } } }),
    db.order.findMany({
      where: { deliveredAt: inMonth, status: "DELIVERED", purpose: "CUSTOMER" },
      include: { customer: true, costs: true, payments: true },
      orderBy: { deliveredAt: "asc" },
    }),
  ]);

  const sum = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((s, x) => s + f(x), 0);
  const group = <T,>(xs: T[], key: (x: T) => string, val: (x: T) => number) =>
    Object.entries(xs.reduce<Record<string, number>>((a, x) => ((a[key(x)] = (a[key(x)] ?? 0) + val(x)), a), {})).sort((a, b) => b[1] - a[1]);

  const income = sum(payments, (p) => p.amount);
  const directCosts = sum(costs, (c) => c.amount);
  const operating = expenses.filter((e) => e.kind !== "CAPITAL");
  const capital = expenses.filter((e) => e.kind === "CAPITAL");
  const operatingTotal = sum(operating, (e) => e.amount);
  const capitalTotal = sum(capital, (e) => e.amount);
  const grossProfit = income - directCosts;
  const netProfit = grossProfit - operatingTotal;

  return {
    income,
    paymentsByMethod: group(payments, (p) => p.method ?? "Other", (p) => p.amount),
    directCosts,
    costsByCategory: group(costs, (c) => c.category, (c) => c.amount),
    // Making outfits for modelling, adverts and ready-to-wear (already included in directCosts).
    inHouseByPurpose: group(costs.filter((c) => c.order.purpose !== "CUSTOMER"), (c) => c.order.purpose, (c) => c.amount),
    operatingTotal,
    operatingByCategory: group(operating, (e) => e.category, (e) => e.amount),
    capital,
    capitalTotal,
    grossProfit,
    netProfit,
    cashAfterBigBuys: netProfit - capitalTotal,
    bookedCount: booked.length,
    bookedValue: sum(booked, (o) => o.price),
    delivered,
  };
}

/** Expense types and categories used so far, for the expense form's suggestions. */
export async function usedExpenseChoices() {
  const [kinds, categories] = await Promise.all([
    db.expense.findMany({ distinct: ["kind"], select: { kind: true } }),
    db.expense.findMany({ distinct: ["category"], select: { category: true } }),
  ]);
  return { usedKinds: kinds.map((k) => k.kind).sort(), usedCategories: categories.map((c) => c.category).sort() };
}

/** Typical price, cost and profit per kind of outfit, from delivered customer orders in the last 12 months. */
export async function outfitTypes() {
  const since = new Date();
  since.setFullYear(since.getFullYear() - 1);
  const orders = await db.order.findMany({
    where: { purpose: "CUSTOMER", status: "DELIVERED", orderDate: { gte: since } },
    include: { costs: true },
  });
  const groups = orders.reduce<Record<string, { name: string; count: number; price: number; cost: number }>>((acc, o) => {
    const key = o.title.trim().toLowerCase().replace(/\s+/g, " ");
    const g = (acc[key] ??= { name: o.title.trim(), count: 0, price: 0, cost: 0 });
    const qty = Math.max(1, o.quantity);
    g.count += qty;
    g.price += o.price;
    g.cost += o.costs.reduce((s, c) => s + c.amount, 0);
    return acc;
  }, {});
  return Object.values(groups)
    .map((g) => ({ ...g, avgPrice: Math.round(g.price / g.count), avgCost: Math.round(g.cost / g.count), avgProfit: Math.round((g.price - g.cost) / g.count), margin: g.price ? (g.price - g.cost) / g.price : 0 }))
    .sort((a, b) => b.count - a.count || b.avgProfit - a.avgProfit);
}

/** How much of the money spent on big buys has been earned back since the first one. */
export async function bigBuysPayback() {
  const first = await db.expense.findFirst({ where: { kind: "CAPITAL" }, orderBy: { date: "asc" } });
  if (!first) return null;
  const since = { gte: first.date };
  const [capital, income, costs, running] = await Promise.all([
    db.expense.aggregate({ _sum: { amount: true }, where: { kind: "CAPITAL" } }),
    db.payment.aggregate({ _sum: { amount: true }, where: { paidAt: since } }),
    db.orderCost.aggregate({ _sum: { amount: true }, where: { date: since } }),
    db.expense.aggregate({ _sum: { amount: true }, where: { kind: { not: "CAPITAL" }, date: since } }),
  ]);
  const spent = capital._sum.amount ?? 0;
  const profit = (income._sum.amount ?? 0) - (costs._sum.amount ?? 0) - (running._sum.amount ?? 0);
  return { since: first.date, spent, profit, share: spent ? Math.max(0, Math.min(1, profit / spent)) : 1 };
}
