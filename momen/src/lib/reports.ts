import { db } from "./db";
import { monthRange } from "./format";

export async function monthSummary(month: string) {
  const { start, end } = monthRange(month);
  const inMonth = { gte: start, lt: end };

  const [payments, costs, expenses, booked, delivered] = await Promise.all([
    db.payment.findMany({ where: { paidAt: inMonth } }),
    db.orderCost.findMany({ where: { date: inMonth } }),
    db.expense.findMany({ where: { date: inMonth } }),
    db.order.findMany({ where: { orderDate: inMonth, status: { not: "CANCELLED" } } }),
    db.order.findMany({
      where: { deliveredAt: inMonth, status: "DELIVERED" },
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
