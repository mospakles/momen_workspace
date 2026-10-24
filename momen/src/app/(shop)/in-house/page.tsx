import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { OPEN_STATUSES, ORDER_PURPOSES, labelFor } from "@/lib/constants";
import { fmtShortDate, money, relativeDays, startOfDay } from "@/lib/format";
import { orderTotals, rtwPieces } from "@/lib/orders";
import { Empty, PageHeader, Pill, Stat, StatusBadge } from "@/components/ui";
import { SearchBox } from "@/components/SearchBox";

export const dynamic = "force-dynamic";

// Everything made for the brand rather than a paying customer.
const TABS = [
  { value: "all", label: "All" },
  { value: "RTW", label: "Ready-to-wear" },
  { value: "MODELLING", label: "Shoots" },
  { value: "ADVERT", label: "Ads" },
];

export default async function InHousePage({ searchParams }: { searchParams: Promise<{ type?: string; q?: string }> }) {
  const { type = "all", q } = await searchParams;
  const today = startOfDay();

  const where: Prisma.OrderWhereInput = { purpose: type === "all" ? { not: "CUSTOMER" } : type };
  if (q) where.OR = [{ title: { contains: q, mode: "insensitive" } }, { customer: { name: { contains: q, mode: "insensitive" } } }];
  const orders = await db.order.findMany({
    where,
    include: { customer: true, payments: true, costs: true, sizes: true },
    orderBy: { orderDate: "desc" },
  });
  // In progress first, then finished ones.
  const rows = orders
    .map((o) => ({ o, t: orderTotals(o), p: o.purpose === "RTW" ? rtwPieces(o) : null, open: OPEN_STATUSES.includes(o.status) }))
    .sort((a, b) => Number(b.open) - Number(a.open));

  const spent = rows.reduce((s, r) => s + r.t.cost, 0);
  const sales = rows.filter((r) => r.p).reduce((s, r) => s + r.t.paid, 0);
  const left = rows.reduce((s, r) => s + (r.p?.left ?? 0), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="In-house"
        subtitle="Ready-to-wear batches, photo shoots and ads: work for the brand, not for a customer."
        actions={
          <>
            <Link href="/orders/new?purpose=RTW" className="btn-primary">+ Ready-to-wear batch</Link>
            <Link href="/orders/new?purpose=MODELLING" className="btn">+ Shoot</Link>
            <Link href="/orders/new?purpose=ADVERT" className="btn">+ Ad</Link>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="In progress" value={rows.filter((r) => r.open).length} hint={`${rows.length} in total`} />
        <Stat label="Spent making them" value={money(spent)} />
        <Stat label="Ready-to-wear sales" value={money(sales)} />
        <Stat label="Pieces left to sell" value={left} />
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link key={t.value} href={`/in-house${t.value === "all" ? "" : `?type=${t.value}`}`} className={`btn btn-sm ${type === t.value ? "!bg-plum !text-white !border-plum" : ""}`}>
            {t.label}
          </Link>
        ))}
      </div>
      <SearchBox placeholder="Search by name or model…" />

      {rows.length === 0 ? (
        <Empty>{q ? `Nothing matches “${q}”.` : "Nothing here yet. Use the buttons above to start a ready-to-wear batch, shoot or ad."}</Empty>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>What</th>
                <th>Status</th>
                <th>Due</th>
                <th className="text-right">Spent</th>
                <th className="text-right">Sold</th>
                <th className="text-right">Pieces left</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ o, t, p, open }) => {
                const late = open && o.dueDate && o.dueDate < today;
                return (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/orders/${o.id}`} className="link font-medium">{o.title}{o.quantity > 1 ? ` ×${o.quantity}` : ""}</Link>
                      <div className="text-xs text-muted flex flex-wrap gap-1.5 items-center mt-0.5">
                        <Pill tone="plum">{labelFor(ORDER_PURPOSES, o.purpose)}</Pill>
                        {o.customer && <span>Model: {o.customer.name}</span>}
                      </div>
                    </td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className={`whitespace-nowrap ${late ? "text-red-700 font-medium" : ""}`}>
                      {fmtShortDate(o.dueDate)}
                      {open && o.dueDate && <div className="text-xs text-muted">{relativeDays(o.dueDate)}</div>}
                    </td>
                    <td className="text-right tabular-nums">{money(t.cost)}</td>
                    <td className="text-right tabular-nums">{p ? money(t.paid) : "—"}</td>
                    <td className="text-right tabular-nums">{p ? `${p.left} / ${p.made}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
