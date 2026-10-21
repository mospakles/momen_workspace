import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { fmtDate, toMonth } from "@/lib/format";
import { usedExpenseChoices } from "@/lib/reports";
import { deleteExpenseAndReturn, updateExpense } from "@/actions/misc";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ExpenseForm } from "@/components/ExpenseForm";
import { BackLink, PageHeader, Section } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const [expense, used] = await Promise.all([db.expense.findUnique({ where: { id } }), usedExpenseChoices()]);
  if (!expense) notFound();

  return (
    <div className="space-y-6">
      <div>
        <BackLink href={`/expenses?month=${toMonth(expense.date)}`}>Expenses</BackLink>
        <PageHeader title={expense.description} subtitle={`Added ${fmtDate(expense.createdAt)}`} />
      </div>
      <Section title="Edit expense">
        <ExpenseForm action={updateExpense.bind(null, id)} expense={expense} submitLabel="Save changes" {...used} />
      </Section>
      <form action={deleteExpenseAndReturn.bind(null, id)}>
        <ConfirmButton message="Delete this expense?">Delete expense</ConfirmButton>
      </form>
    </div>
  );
}
