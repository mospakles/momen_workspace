import Link from "next/link";
import { db } from "@/lib/db";
import { ORDER_COST_CATEGORIES, labelFor } from "@/lib/constants";
import { currentMonth, fmtShortDate, money, monthRange } from "@/lib/format";
import { orderWho, workerKey } from "@/lib/orders";
import { markCostPaid, payWorker } from "@/actions/orders";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Empty, PageHeader, Section, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function WorkersPage() {
  const { start } = monthRange(currentMonth());
  const costs = await db.orderCost.findMany({
    where: { paidTo: { not: null } },
    include: { order: { include: { customer: true } } },
    orderBy: { date: "desc" },
  });

  // One entry per worker, named as first typed.
  type Worker = { key: string; name: string; owed: typeof costs; owedTotal: number; paidThisMonth: number; paidAllTime: number; jobs: number };
  const workers = Object.values(
    costs.reduce<Record<string, Worker>>((acc, c) => {
      const key = workerKey(c.paidTo);
      const w = (acc[key] ??= { key, name: c.paidTo!.trim(), owed: [], owedTotal: 0, paidThisMonth: 0, paidAllTime: 0, jobs: 0 });
      w.jobs += 1;
      if (!c.paidAt) {
        w.owed.push(c);
        w.owedTotal += c.amount;
      } else {
        w.paidAllTime += c.amount;
        if (c.paidAt >= start) w.paidThisMonth += c.amount;
      }
      return acc;
    }, {}),
  ).sort((a, b) => b.owedTotal - a.owedTotal || b.paidThisMonth - a.paidThisMonth);

  const owedTotal = workers.reduce((s, w) => s + w.owedTotal, 0);
  const paidThisMonth = workers.reduce((s, w) => s + w.paidThisMonth, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workers"
        subtitle="Tailors, embroiderers and everyone you pay per outfit. Add their pay as a cost on the order, tick “Not paid yet” if you still owe them."
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Stat label="You owe workers" value={money(owedTotal)} tone={owedTotal > 0 ? "bad" : undefined} />
        <Stat label="Paid this month" value={money(paidThisMonth)} />
        <Stat label="Workers" value={workers.length} />
      </div>

      {workers.length === 0 ? (
        <Empty>No workers yet. When you add a cost on an order, fill in “Paid to” with the person&apos;s name.</Empty>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {workers.map((w) => (
            <Section
              key={w.key}
              title={w.name}
              actions={
                w.owedTotal > 0 && (
                  <form action={payWorker.bind(null, w.key)}>
                    <ConfirmButton className="btn-primary btn-sm" confirmLabel="Mark paid" danger={false} message={`Mark everything owed to ${w.name} (${money(w.owedTotal)}) as paid today?`}>
                      Pay all {money(w.owedTotal)}
                    </ConfirmButton>
                  </form>
                )
              }
            >
              <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                <div><div className="label">Owed</div><div className={`tabular-nums font-medium ${w.owedTotal ? "text-red-700" : ""}`}>{money(w.owedTotal)}</div></div>
                <div><div className="label">This month</div><div className="tabular-nums">{money(w.paidThisMonth)}</div></div>
                <div><div className="label">All time</div><div className="tabular-nums">{money(w.paidAllTime)}</div><div className="text-xs text-muted">{w.jobs} job{w.jobs === 1 ? "" : "s"}</div></div>
              </div>
              {w.owed.length === 0 ? (
                <Empty>All paid up.</Empty>
              ) : (
                <ul className="divide-y divide-line/60 text-sm">
                  {w.owed.map((c) => (
                    <li key={c.id} className="py-2 flex justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/orders/${c.orderId}`} className="link">{orderWho(c.order)} · {c.order.title}</Link>
                        <div className="text-xs text-muted">{labelFor(ORDER_COST_CATEGORIES, c.category)} · {fmtShortDate(c.date)}{c.note ? ` · ${c.note}` : ""}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="tabular-nums text-red-700">{money(c.amount)}</div>
                        <form action={markCostPaid.bind(null, c.id)}><button className="link text-xs">Mark paid</button></form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          ))}
        </div>
      )}
    </div>
  );
}
