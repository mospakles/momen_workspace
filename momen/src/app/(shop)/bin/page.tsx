import { db } from "@/lib/db";
import { addDays, fmtDate } from "@/lib/format";
import { KEEP_DAYS, purgeBin } from "@/lib/trash";
import { deleteForever, restoreItem } from "@/actions/misc";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Empty, PageHeader, Pill, Section } from "@/components/ui";

export const dynamic = "force-dynamic";

const KINDS: Record<string, string> = { CUSTOMER: "Customer", ORDER: "Order", PAYMENT: "Payment", COST: "Cost", EXPENSE: "Expense", MEASUREMENT: "Measurements" };

export default async function BinPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  await purgeBin();
  const items = await db.trash.findMany({ orderBy: { deletedAt: "desc" } });

  return (
    <div className="space-y-6">
      <PageHeader title="Bin" subtitle={`Deleted customers, orders, measurements, payments, costs and expenses are kept here for ${KEEP_DAYS} days.`} />
      {error && <p className="card border-red-300 bg-red-50 text-sm text-red-800">Couldn&apos;t restore: {error}</p>}
      <Section title={`${items.length} item${items.length === 1 ? "" : "s"}`}>
        {items.length === 0 ? (
          <Empty>The bin is empty.</Empty>
        ) : (
          <ul className="divide-y divide-line/60 text-sm">
            {items.map((t) => (
              <li key={t.id} className="py-2 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <Pill>{KINDS[t.kind] ?? t.kind}</Pill> <span className="font-medium">{t.label}</span>
                  <div className="text-xs text-muted">Deleted {fmtDate(t.deletedAt)} · gone for good after {fmtDate(addDays(t.deletedAt, KEEP_DAYS))}</div>
                </div>
                <div className="flex gap-2">
                  <form action={restoreItem.bind(null, t.id)}><button className="btn btn-sm">Restore</button></form>
                  <form action={deleteForever.bind(null, t.id)}>
                    <ConfirmButton message={`Delete "${t.label}" for good? This cannot be undone.`} confirmLabel="Delete forever">Delete forever</ConfirmButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
