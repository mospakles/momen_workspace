import Link from "next/link";
import { db } from "@/lib/db";
import { OPEN_STATUSES } from "@/lib/constants";
import { addDays, currentMonth, daysUntil, fmtShortDate, money, monthRange, relativeDays, reminderText, startOfDay, toInputDate, whatsappLink } from "@/lib/format";
import { orderTotals } from "@/lib/orders";
import { Empty, Pill, Section, Stat, StatusBadge } from "@/components/ui";
import { TaskList } from "@/components/TaskList";
import { addTask } from "@/actions/misc";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const today = startOfDay();
  const tomorrow = addDays(today, 1);
  const weekAhead = addDays(today, 8);
  const { start: monthStart, end: monthEnd } = monthRange(currentMonth());

  const [openOrders, promises, tasks, todayPayments, todayExpenses, monthPayments, unresolvedIssues] = await Promise.all([
    db.order.findMany({
      where: { status: { in: OPEN_STATUSES } },
      include: { customer: true, payments: true, costs: true },
      orderBy: { dueDate: "asc" },
    }),
    db.paymentPromise.findMany({
      where: { kept: false, promisedDate: { lt: weekAhead } },
      include: { order: { include: { customer: true } } },
      orderBy: { promisedDate: "asc" },
    }),
    db.task.findMany({
      where: { OR: [{ done: false }, { doneAt: { gte: today } }] },
      include: { order: { include: { customer: true } } },
      orderBy: [{ done: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
    }),
    db.payment.findMany({ where: { paidAt: { gte: today, lt: tomorrow } }, include: { order: { include: { customer: true } } } }),
    db.expense.findMany({ where: { date: { gte: today, lt: tomorrow } } }),
    db.payment.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: monthStart, lt: monthEnd } } }),
    db.issue.count({ where: { resolved: false } }),
  ]);

  // Balances owed across all non-cancelled orders, including delivered ones.
  const owing = await db.order.findMany({
    where: { status: { not: "CANCELLED" } },
    include: { customer: true, payments: true, costs: true },
  });
  const totalOwed = owing.reduce((s, o) => s + Math.max(0, orderTotals(o).balance), 0);

  // One row per customer who owes, biggest balance first.
  type Debtor = { customer: (typeof owing)[number]["customer"]; balance: number; outfits: string[]; delivered: boolean };
  const debtors = Object.values(
    owing.reduce<Record<number, Debtor>>((acc, o) => {
      const { balance } = orderTotals(o);
      if (balance <= 0) return acc;
      const d = (acc[o.customerId] ??= { customer: o.customer, balance: 0, outfits: [], delivered: false });
      d.balance += balance;
      d.outfits.push(o.title);
      // Already delivered but not fully paid: the hardest money to collect.
      if (o.status === "DELIVERED") d.delivered = true;
      return acc;
    }, {}),
  ).sort((a, b) => b.balance - a.balance);

  const overdue = openOrders.filter((o) => o.dueDate && o.dueDate < today);
  const dueSoon = openOrders.filter((o) => o.dueDate && o.dueDate >= today && o.dueDate < weekAhead);
  const fittings = openOrders.filter((o) => o.fittingDate && o.fittingDate >= today && o.fittingDate < weekAhead);
  const todayIn = todayPayments.reduce((s, p) => s + p.amount, 0);
  const todayOut = todayExpenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <h1 className="h1">Today</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/orders/new" className="btn-primary">+ New order</Link>
          <Link href="/customers/new" className="btn">+ Customer</Link>
          <Link href="/expenses" className="btn">+ Expense</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Received this month" value={money(monthPayments._sum.amount)} />
        <Stat label="Customers owe you" value={money(totalOwed)} tone={totalOwed > 0 ? "bad" : undefined} hint={<a href="#owing" className="link">See who</a>} />
        <Stat label="Open orders" value={openOrders.length} hint={`${overdue.length} overdue`} />
        <Stat label="Today" value={<span className="text-base">In {money(todayIn)} · Out {money(todayOut)}</span>} hint={unresolvedIssues ? <Link href="/issues" className="link">{unresolvedIssues} unresolved issue(s)</Link> : "No open issues"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="Overdue & due this week" actions={<Link href="/orders" className="link text-sm">All orders</Link>}>
          {overdue.length + dueSoon.length === 0 ? (
            <Empty>Nothing due in the next 7 days.</Empty>
          ) : (
            <ul className="divide-y divide-line/60">
              {[...overdue, ...dueSoon].map((o) => {
                const t = orderTotals(o);
                const late = daysUntil(o.dueDate!) < 0;
                return (
                  <li key={o.id} className="py-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/orders/${o.id}`} className="font-medium link">{o.customer.name}</Link>
                      <span className="text-muted"> · {o.title}</span>
                      <div className="text-xs mt-0.5 flex flex-wrap gap-1.5 items-center">
                        <StatusBadge status={o.status} />
                        {t.balance > 0 && <Pill tone="amber">owes {money(t.balance)}</Pill>}
                      </div>
                    </div>
                    <div className={`text-sm text-right whitespace-nowrap ${late ? "text-red-700 font-medium" : ""}`}>
                      {fmtShortDate(o.dueDate)}
                      <div className="text-xs text-muted">{relativeDays(o.dueDate)}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title="To-do" actions={<Link href="/tasks" className="link text-sm">All tasks</Link>}>
          <form action={addTask} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_9rem_auto] gap-2 mb-3">
            <input name="title" placeholder="Add a task…" className="input col-span-2 sm:col-span-1" required />
            <input name="dueDate" type="date" className="input" defaultValue={toInputDate(new Date())} />
            <button className="btn-primary">Add</button>
          </form>
          <TaskList tasks={tasks} />
        </Section>

        <Section title="Who owes you" actions={<Link href="/orders?filter=owing" className="link text-sm">By order</Link>}>
          <div id="owing" className="scroll-mt-4" />
          {debtors.length === 0 ? (
            <Empty>Everyone is paid up. 🎉</Empty>
          ) : (
            <ul className="divide-y divide-line/60">
              {debtors.map((d) => (
                <li key={d.customer.id} className="py-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/customers/${d.customer.id}`} className="font-medium link">{d.customer.name}</Link>
                    <span className="text-muted"> · {d.outfits.join(", ")}</span>
                    {d.delivered && <div className="mt-0.5"><Pill tone="red">delivered, not paid</Pill></div>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm tabular-nums font-medium text-red-700">{money(d.balance)}</span>
                    {d.customer.phone ? (
                      <a href={whatsappLink(d.customer.phone, reminderText(d.customer.name, d.balance, d.outfits))} target="_blank" className="btn btn-sm">
                        Remind
                      </a>
                    ) : (
                      <span className="text-xs text-muted">no phone</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Payment promises">
          {promises.length === 0 ? (
            <Empty>No promised payments due this week.</Empty>
          ) : (
            <ul className="divide-y divide-line/60">
              {promises.map((p) => {
                const late = daysUntil(p.promisedDate) < 0;
                return (
                  <li key={p.id} className="py-2 flex justify-between gap-3">
                    <div>
                      <Link href={`/orders/${p.orderId}`} className="font-medium link">{p.order.customer.name}</Link>
                      <span className="text-muted"> · {p.order.title}</span>
                      {p.note && <div className="text-xs text-muted">{p.note}</div>}
                    </div>
                    <div className={`text-sm text-right whitespace-nowrap ${late ? "text-red-700 font-medium" : ""}`}>
                      {p.amount ? money(p.amount) : "Balance"}
                      <div className="text-xs">{late ? `broken · ${relativeDays(p.promisedDate)}` : relativeDays(p.promisedDate)}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title="Fittings this week">
          {fittings.length === 0 ? (
            <Empty>No fittings scheduled.</Empty>
          ) : (
            <ul className="divide-y divide-line/60">
              {fittings.map((o) => (
                <li key={o.id} className="py-2 flex justify-between gap-3">
                  <div>
                    <Link href={`/orders/${o.id}`} className="font-medium link">{o.customer.name}</Link>
                    <span className="text-muted"> · {o.title}</span>
                  </div>
                  <div className="text-sm whitespace-nowrap">{fmtShortDate(o.fittingDate)} <span className="text-xs text-muted">{relativeDays(o.fittingDate)}</span></div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {todayPayments.length > 0 && (
          <Section title="Money in today">
            <ul className="divide-y divide-line/60 text-sm">
              {todayPayments.map((p) => (
                <li key={p.id} className="py-2 flex justify-between">
                  <Link href={`/orders/${p.orderId}`} className="link">{p.order.customer.name} · {p.order.title}</Link>
                  <span className="tabular-nums">{money(p.amount)}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
  );
}
