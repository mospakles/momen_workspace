import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { OPEN_STATUSES } from "@/lib/constants";
import { fmtShortDate, money, relativeDays, startOfDay } from "@/lib/format";
import { deliveryDelta, needsDeposit, orderTotals, orderWho } from "@/lib/orders";
import { Empty, PageHeader, Pill, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

const FILTERS = [
  { value: "open", label: "In progress" },
  { value: "overdue", label: "Overdue" },
  { value: "owing", label: "Owing money" },
  { value: "delivered", label: "Delivered" },
  { value: "inhouse", label: "In-house (shoots, ads, RTW)" },
  { value: "all", label: "All" },
];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string }> }) {
  const { filter = "open", q } = await searchParams;
  const today = startOfDay();

  const where: Prisma.OrderWhereInput = {};
  if (filter === "open") where.status = { in: OPEN_STATUSES };
  if (filter === "overdue") Object.assign(where, { status: { in: OPEN_STATUSES }, dueDate: { lt: today } });
  if (filter === "delivered") where.status = "DELIVERED";
  if (filter === "owing") where.status = { not: "CANCELLED" };
  if (filter === "inhouse") where.purpose = { not: "CUSTOMER" };
  if (q) where.OR = [{ title: { contains: q, mode: "insensitive" } }, { customer: { name: { contains: q, mode: "insensitive" } } }];

  let orders = await db.order.findMany({
    where,
    include: { customer: true, payments: true, costs: true },
    orderBy: filter === "delivered" || filter === "all" || filter === "inhouse" ? { orderDate: "desc" } : { dueDate: "asc" },
  });
  if (filter === "owing") orders = orders.filter((o) => orderTotals(o).balance > 0);

  const sum = orders.reduce(
    (s, o) => {
      const t = orderTotals(o);
      return { price: s.price + o.price, paid: s.paid + t.paid, balance: s.balance + Math.max(0, t.balance), cost: s.cost + t.cost };
    },
    { price: 0, paid: 0, balance: 0, cost: 0 },
  );

  return (
    <div>
      <PageHeader title="Orders" actions={<><Link href="/orders/board" className="btn">Board view</Link><Link href="/orders/new" className="btn-primary">+ New order</Link></>} />
      <div className="flex flex-wrap gap-2 mb-3">
        {FILTERS.map((f) => (
          <Link key={f.value} href={`/orders?filter=${f.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={`btn btn-sm ${filter === f.value ? "!bg-plum !text-white !border-plum" : ""}`}>
            {f.label}
          </Link>
        ))}
      </div>
      <form className="mb-4">
        <input type="hidden" name="filter" value={filter} />
        <input name="q" defaultValue={q} placeholder="Search outfit or customer…" className="input max-w-md" />
      </form>

      {orders.length === 0 ? (
        <Empty>No orders here.</Empty>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>For · Outfit</th>
                <th>Status</th>
                <th>Due</th>
                <th className="text-right">Price</th>
                <th className="text-right">Paid</th>
                <th className="text-right">Balance</th>
                <th className="text-right">Cost</th>
                <th className="text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const t = orderTotals(o);
                const late = o.dueDate && o.dueDate < today && OPEN_STATUSES.includes(o.status);
                const delta = deliveryDelta(o);
                return (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/orders/${o.id}`} className="link font-medium">{orderWho(o)}</Link>
                      <div className="text-muted">{o.title}{o.quantity > 1 ? ` ×${o.quantity}` : ""}</div>
                      {needsDeposit(o) && <Pill tone="red">no deposit</Pill>}
                    </td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className={`whitespace-nowrap ${late ? "text-red-700 font-medium" : ""}`}>
                      {fmtShortDate(o.dueDate)}
                      {o.status === "DELIVERED" ? (
                        delta !== null && (delta > 0 ? <div><Pill tone="green">{delta}d early</Pill></div> : delta < 0 ? <div><Pill tone="red">{-delta}d late</Pill></div> : <div className="text-xs text-muted">on time</div>)
                      ) : (
                        o.dueDate && <div className="text-xs text-muted">{relativeDays(o.dueDate)}</div>
                      )}
                    </td>
                    <td className="text-right tabular-nums">{money(o.price)}</td>
                    <td className="text-right tabular-nums">{money(t.paid)}</td>
                    <td className={`text-right tabular-nums ${t.balance > 0 ? "text-red-700 font-medium" : "text-muted"}`}>{t.balance > 0 ? money(t.balance) : "—"}</td>
                    <td className="text-right tabular-nums text-muted">{money(t.cost)}</td>
                    <td className={`text-right tabular-nums ${t.profit < 0 ? "text-red-700" : "text-emerald-700"}`}>{money(t.profit)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className="px-3 py-2" colSpan={3}>Total ({orders.length})</td>
                <td className="px-3 py-2 text-right tabular-nums">{money(sum.price)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{money(sum.paid)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-red-700">{money(sum.balance)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{money(sum.cost)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{money(sum.price - sum.cost)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
