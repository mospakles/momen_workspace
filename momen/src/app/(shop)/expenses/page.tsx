import Link from "next/link";
import { db } from "@/lib/db";
import { EXPENSE_CATEGORIES, EXPENSE_KINDS, labelFor } from "@/lib/constants";
import { usedExpenseChoices } from "@/lib/reports";
import { currentMonth, fmtDate, money, monthLabel, monthRange } from "@/lib/format";
import { addExpense, addRecurring, deleteExpense, deleteRecurring, toggleRecurring } from "@/actions/misc";
import { applyRecurring } from "@/lib/recurring";
import { SelectOrOther } from "@/components/SelectOrOther";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ExpenseForm } from "@/components/ExpenseForm";
import { MonthPicker } from "@/components/MonthPicker";
import { Empty, Field, PageHeader, Pill, Section, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const month = (await searchParams).month || currentMonth();
  const { start, end } = monthRange(month);
  await applyRecurring();
  const [expenses, used, recurring] = await Promise.all([
    db.expense.findMany({ where: { date: { gte: start, lt: end } }, orderBy: { date: "desc" } }),
    usedExpenseChoices(),
    db.recurringExpense.findMany({ orderBy: [{ active: "desc" }, { dayOfMonth: "asc" }] }),
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

      <Section title="Repeats every month">
        <p className="text-sm text-muted mb-3">Rent, data, generator fuel… Added to Expenses by itself on the day you choose each month.</p>
        {recurring.length > 0 && (
          <ul className="divide-y divide-line/60 text-sm mb-4">
            {recurring.map((r) => (
              <li key={r.id} className={`py-2 flex flex-wrap items-center justify-between gap-2 ${r.active ? "" : "opacity-60"}`}>
                <div>
                  <span className="font-medium">{r.description}</span>
                  <span className="text-muted"> · {labelFor(EXPENSE_CATEGORIES, r.category)} · day {r.dayOfMonth}</span>
                  {!r.active && <span className="ml-2"><Pill>paused</Pill></span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums">{money(r.amount)}</span>
                  <form action={toggleRecurring.bind(null, r.id, !r.active)}><button className="btn btn-sm">{r.active ? "Pause" : "Resume"}</button></form>
                  <form action={deleteRecurring.bind(null, r.id)}><ConfirmButton message={`Stop repeating "${r.description}"? Expenses already added stay.`} confirmLabel="Remove">×</ConfirmButton></form>
                </div>
              </li>
            ))}
          </ul>
        )}
        <form action={addRecurring} className="grid grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <Field label="What is it?" className="col-span-2"><input name="description" className="input" required placeholder="e.g. Shop rent" /></Field>
          <Field label="Category"><SelectOrOther name="category" options={EXPENSE_CATEGORIES} defaultValue="RENT" /></Field>
          <Field label="Amount (₦)"><input name="amount" inputMode="numeric" className="input" required /></Field>
          <Field label="Day of month"><input name="dayOfMonth" type="number" min={1} max={28} defaultValue={1} className="input" /></Field>
          <button className="btn-primary">Add monthly cost</button>
        </form>
      </Section>
    </div>
  );
}
