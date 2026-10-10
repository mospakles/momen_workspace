import { db } from "@/lib/db";
import { EXPENSE_CATEGORIES, EXPENSE_KINDS, labelFor } from "@/lib/constants";
import { currentMonth, fmtDate, money, monthLabel, monthRange, toInputDate } from "@/lib/format";
import { addExpense, deleteExpense } from "@/actions/misc";
import { ConfirmButton } from "@/components/ConfirmButton";
import { MonthPicker } from "@/components/MonthPicker";
import { Empty, Field, PageHeader, Pill, Section, Select, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const month = (await searchParams).month || currentMonth();
  const { start, end } = monthRange(month);
  const expenses = await db.expense.findMany({ where: { date: { gte: start, lt: end } }, orderBy: { date: "desc" } });

  const operating = expenses.filter((e) => e.kind === "OPERATING").reduce((s, e) => s + e.amount, 0);
  const capital = expenses.filter((e) => e.kind === "CAPITAL").reduce((s, e) => s + e.amount, 0);
  const byCategory = Object.entries(
    expenses.reduce<Record<string, number>>((acc, e) => ((acc[e.category] = (acc[e.category] ?? 0) + e.amount), acc), {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" subtitle="Shop spending not tied to one outfit. (Tailor pay, embroidery etc. for a specific order go on the order.)" actions={<MonthPicker month={month} basePath="/expenses" />} />

      <Section title="Add expense">
        <form action={addExpense} className="grid grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <Field label="Date"><input name="date" type="date" className="input" defaultValue={toInputDate(new Date())} /></Field>
          <Field label="Type"><Select name="kind" options={EXPENSE_KINDS} defaultValue="OPERATING" /></Field>
          <Field label="Category"><Select name="category" options={EXPENSE_CATEGORIES} defaultValue="MATERIALS" /></Field>
          <Field label="Amount (₦)"><input name="amount" inputMode="numeric" className="input" required /></Field>
          <Field label="What was it?" className="col-span-2"><input name="description" className="input" required placeholder="e.g. 10 yards lining, threads & zips" /></Field>
          <Field label="Vendor / where" className="col-span-2 lg:col-span-3"><input name="vendor" className="input" /></Field>
          <Field label="Note" className="col-span-2 lg:col-span-2"><input name="note" className="input" /></Field>
          <button className="btn-primary col-span-2 lg:col-span-1">Add</button>
        </form>
      </Section>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Day-to-day" value={money(operating)} />
        <Stat label="Big buys" value={money(capital)} />
        <Stat label="Total" value={money(operating + capital)} />
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
                        {e.description}
                        {e.kind === "CAPITAL" && <span className="ml-2"><Pill tone="amber">big buy</Pill></span>}
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
                  <div className="h-1.5 bg-cream rounded mt-1"><div className="h-1.5 bg-plum rounded" style={{ width: `${(amt / (operating + capital)) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
