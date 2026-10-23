import { db } from "./db";
import { currentMonth } from "./format";

/**
 * Add this month's repeating costs (rent, data…) to Expenses once their day has come.
 * Safe to call on every page load: each one is claimed for the month before it's added.
 */
export async function applyRecurring() {
  const month = currentMonth();
  const today = new Date();
  const due = await db.recurringExpense.findMany({
    where: { active: true, dayOfMonth: { lte: today.getDate() }, OR: [{ lastMonth: null }, { lastMonth: { not: month } }] },
  });
  for (const r of due) {
    const claimed = await db.recurringExpense.updateMany({
      where: { id: r.id, OR: [{ lastMonth: null }, { lastMonth: { not: month } }] },
      data: { lastMonth: month },
    });
    if (!claimed.count) continue;
    await db.expense.create({
      data: {
        date: new Date(today.getFullYear(), today.getMonth(), r.dayOfMonth, 12),
        kind: r.kind,
        category: r.category,
        description: r.description,
        amount: r.amount,
        vendor: r.vendor,
        note: "Added automatically (repeats monthly)",
      },
    });
  }
}
