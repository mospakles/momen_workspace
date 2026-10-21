import Link from "next/link";
import { db } from "@/lib/db";
import { EXPENSE_CATEGORIES, EXPENSE_KINDS, labelFor } from "@/lib/constants";
import { usedExpenseChoices } from "@/lib/reports";
import { currentMonth, fmtDate, money, monthLabel, monthRange } from "@/lib/format";
import { addExpense, deleteExpense } from "@/actions/misc";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ExpenseForm } from "@/components/ExpenseForm";
import { MonthPicker } from "@/components/MonthPicker";
import { Empty, PageHeader, Pill, Section, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const month = (await searchParams).month || currentMonth();
  const { start, end } = monthRange(month);
  const [expenses, used] = await Promise.all([
    db.expense.findMany({ where: { date: { gte: start, lt: end } }, orderBy: { date: "desc" } }),
    usedExpenseChoices(),
  ]);

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  // Day-to-day and big buys always show; any custom type appears once it's used this month.
  const byKind = Object.entries(
    expenses.reduce<Record<string, number>>((acc, e) => ((acc[e.kind] = (acc[e.kind] ?? 0) + e.amount), acc), { OPERATING: 0, CAPITAL: 0 }),
  );
  const kindLabel = (k: string) => ({ OPERATING: "Day-to-day", CAPITAL: "Big buys" })[k] ?? k;
  const byCategory = Object.entries(
    expenses.reduce<Record<string, number>>((acc, e) => ((acc[e.category] = (acc[e.category] ?? 0) + e.amount), acc), {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" subtitle="Shop spending not tied to one outfit. (Tailor pay, embroidery etc. for a specific order go on the order.)" actions={<MonthPicker month={month} basePath="/expenses" />} />

      <Section title="Add expense">
        <ExpenseForm action={addExpense} submitLabel="Add" {...used} />
      </Section>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {byKind.map(([k, amt]) => <Stat key={k} label={kindLabel(k)} value={money(amt)} />)}
        <Stat label="Total" value={money(total)} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Section title={`${monthLabel(month)}`} className="lg:col-span-2">
          {expenses.length === 0 ? (
            <Empty>No expenses this month.</Empty>
          ) : (
            <div className="overflow-x-auto -mx-4">
              <table className="table">
                <thead><tr><th>Date</th><th>Description</th><th>Category</th><th className="text-right">Amount</th><th /></tr></thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap">{fmtDate(e.date)}</td>
                      <td>
                        <Link href={`/expenses/${e.id}`} className="link">{e.description}</Link>
                        {e.kind !== "OPERATING" && <span className="ml-2"><Pill tone={e.kind === "CAPITAL" ? "amber" : "plum"}>{e.kind === "CAPITAL" ? "big buy" : labelFor(EXPENSE_KINDS, e.kind)}</Pill></span>}
                        {(e.vendor || e.note) && <div className="text-xs text-muted">{[e.vendor, e.note].filter(Boolean).join(" · ")}</div>}
                      </td>
                      <td className="text-muted whitespace-nowrap">{labelFor(EXPENSE_CATEGORIES, e.category)}</td>
                      <td className="text-right tabular-nums">{money(e.amount)}</td>
                      <td className="w-8"><form action={deleteExpense.bind(null, e.id)}><ConfirmButton message="Delete this expense?">×</ConfirmButton></form></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
        <Section title="By category">
          {byCategory.length === 0 ? <Empty>—</Empty> : (
            <ul className="space-y-2 text-sm">
              {byCategory.map(([cat, amt]) => (
                <li key={cat}>
                  <div className="flex justify-between"><span>{labelFor(EXPENSE_CATEGORIES, cat)}</span><span className="tabular-nums">{money(amt)}</span></div>
                  <div className="h-1.5 bg-cream rounded mt-1"><div className="h-1.5 bg-plum rounded" style={{ width: `${(amt / total) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
