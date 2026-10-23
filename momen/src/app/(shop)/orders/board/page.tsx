import Link from "next/link";
import { db } from "@/lib/db";
import { OPEN_STATUSES, ORDER_STATUSES, labelFor } from "@/lib/constants";
import { fmtShortDate, relativeDays, startOfDay } from "@/lib/format";
import { needsDeposit, orderWho } from "@/lib/orders";
import { setOrderStatus } from "@/actions/orders";
import { PageHeader, Pill } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const today = startOfDay();
  const orders = await db.order.findMany({
    where: { status: { in: OPEN_STATUSES } },
    include: { customer: true, payments: true },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { orderDate: "asc" }],
  });

  return (
    <div>
      <PageHeader
        title="Production board"
        subtitle="Every outfit in progress, by stage. Use the arrows to move one along."
        actions={<Link href="/orders" className="btn">List view</Link>}
      />
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 snap-x lg:grid lg:grid-cols-5 lg:overflow-visible lg:mx-0 lg:px-0">
        {OPEN_STATUSES.map((status, i) => {
          const column = orders.filter((o) => o.status === status);
          const prev = OPEN_STATUSES[i - 1];
          const next = OPEN_STATUSES[i + 1] ?? "DELIVERED";
          return (
            <section key={status} className="w-64 shrink-0 lg:w-auto lg:min-w-0 snap-start rounded-xl bg-paper/60 border border-line p-2">
              <h2 className="text-sm font-semibold px-1 py-1 flex justify-between">
                {labelFor(ORDER_STATUSES, status)} <span className="text-muted font-normal">{column.length}</span>
              </h2>
              <ul className="space-y-2 mt-1">
                {column.map((o) => {
                  const late = o.dueDate && o.dueDate < today;
                  return (
                    <li key={o.id} className={`card p-3 text-sm ${late ? "border-red-300" : ""}`}>
                      <Link href={`/orders/${o.id}`} className="link font-medium block">{o.title}{o.quantity > 1 ? ` ×${o.quantity}` : ""}</Link>
                      <div className="text-muted text-xs">{orderWho(o)}</div>
                      <div className="flex flex-wrap gap-1 mt-1 text-xs">
                        {o.dueDate && <span className={late ? "text-red-700 font-medium" : "text-muted"}>Due {fmtShortDate(o.dueDate)} · {relativeDays(o.dueDate)}</span>}
                        {needsDeposit(o) && <Pill tone="red">no deposit</Pill>}
                      </div>
                      <div className="flex justify-between mt-2">
                        {prev ? (
                          <form action={setOrderStatus.bind(null, o.id, prev)}><button className="btn btn-sm" title={`Back to ${labelFor(ORDER_STATUSES, prev)}`}>←</button></form>
                        ) : <span />}
                        <form action={setOrderStatus.bind(null, o.id, next)}>
                          <button className="btn btn-sm">{labelFor(ORDER_STATUSES, next)} →</button>
                        </form>
                      </div>
                    </li>
                  );
                })}
                {column.length === 0 && <li className="text-xs text-muted px-1 py-2">Nothing here.</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
