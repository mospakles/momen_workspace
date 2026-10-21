import type { Expense } from "@prisma/client";
import { EXPENSE_CATEGORIES, EXPENSE_KINDS } from "@/lib/constants";
import { toInputDate } from "@/lib/format";
import { Field } from "./ui";
import { SelectOrOther } from "./SelectOrOther";
import { SubmitButton } from "./SubmitButton";

type Option = { value: string; label: string };

/** The standard choices plus any custom ones already used, so they can be picked again. */
function withUsed(base: readonly Option[], used: string[]): Option[] {
  const extra = used.filter((u) => !base.some((b) => b.value === u)).map((u) => ({ value: u, label: u }));
  return [...base, ...extra];
}

export function ExpenseForm({
  action,
  expense,
  submitLabel,
  usedKinds = [],
  usedCategories = [],
}: {
  action: (fd: FormData) => Promise<void>;
  expense?: Expense;
  submitLabel: string;
  usedKinds?: string[];
  usedCategories?: string[];
}) {
  return (
    <form action={action} className="grid grid-cols-2 lg:grid-cols-6 gap-3 items-end">
      <Field label="Date"><input name="date" type="date" className="input" defaultValue={toInputDate(expense?.date ?? new Date())} /></Field>
      <Field label="Type"><SelectOrOther name="kind" options={withUsed(EXPENSE_KINDS, usedKinds)} defaultValue={expense?.kind ?? "OPERATING"} /></Field>
      <Field label="Category"><SelectOrOther name="category" options={withUsed(EXPENSE_CATEGORIES, usedCategories)} defaultValue={expense?.category ?? "MATERIALS"} /></Field>
      <Field label="Amount (₦)"><input name="amount" inputMode="numeric" className="input" required defaultValue={expense?.amount} /></Field>
      <Field label="What was it?" className="col-span-2"><input name="description" className="input" required placeholder="e.g. 10 yards lining, threads & zips" defaultValue={expense?.description} /></Field>
      <Field label="Vendor / where" className="col-span-2 lg:col-span-3"><input name="vendor" className="input" defaultValue={expense?.vendor ?? ""} /></Field>
      <Field label="Note" className="col-span-2 lg:col-span-2"><input name="note" className="input" defaultValue={expense?.note ?? ""} /></Field>
      <SubmitButton className="btn-primary col-span-2 lg:col-span-1">{submitLabel}</SubmitButton>
    </form>
  );
}
