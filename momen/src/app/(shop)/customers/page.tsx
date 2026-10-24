import Link from "next/link";
import { db } from "@/lib/db";
import { fmtDate, money, normalizePhone } from "@/lib/format";
import { isInHouse, orderTotals } from "@/lib/orders";
import { Empty, PageHeader, Pill } from "@/components/ui";
import { SearchBox } from "@/components/SearchBox";

export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string }> }) {
  const { q, sort } = await searchParams;
  const best = sort === "best";
  const now = new Date();
  const customers = await db.customer.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : undefined,
    include: { orders: { include: { payments: true, costs: true, promises: true } }, issues: { where: { resolved: false } } },
    orderBy: { name: "asc" },
  });

  // How each customer pays, for the "Best customers" view.
  const rows = customers.map((c) => {
    const active = c.orders.filter((o) => o.status !== "CANCELLED" && !isInHouse(o));
    const spent = active.reduce((s, o) => s + orderTotals(o).paid, 0);
    const owes = active.reduce((s, o) => s + Math.max(0, orderTotals(o).balance), 0);
    const last = active.reduce<Date | null>((d, o) => (!d || o.orderDate > d ? o.orderDate : d), null);
    const broken = active.flatMap((o) => o.promises).filter((p) => !p.kept && p.promisedDate < now).length;
    const takenUnpaid = active.filter((o) => o.status === "DELIVERED" && orderTotals(o).balance > 0).length;
    const tag = broken || takenUnpaid ? "slow" : active.length >= 2 && owes === 0 ? "reliable" : null;
    return { c, active, spent, owes, last, tag };
  });
  if (best) rows.sort((a, b) => b.spent - a.spent || b.active.length - a.active.length);

  const phoneCounts = customers.reduce<Record<string, number>>((acc, c) => {
    const p = normalizePhone(c.phone);
    if (p) acc[p] = (acc[p] ?? 0) + 1;
    return acc;
  }, {});
  const isDuplicate = (phone: string | null) => (phoneCounts[normalizePhone(phone) ?? ""] ?? 0) > 1;

  return (
    <div>
      <PageHeader title="Customers" subtitle={`${customers.length} customer${customers.length === 1 ? "" : "s"}`} actions={<Link href="/customers/new" className="btn-primary">+ New customer</Link>} />
      <div className="flex flex-wrap gap-2 mb-3">
        <Link href={`/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`} className={`btn btn-sm ${!best ? "!bg-plum !text-white !border-plum" : ""}`}>A–Z</Link>
        <Link href={`/customers?sort=best${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={`btn btn-sm ${best ? "!bg-plum !text-white !border-plum" : ""}`}>Best customers</Link>
      </div>
      <SearchBox placeholder="Search by name, phone or email…" className="mb-4" />
      {customers.length === 0 ? (
        <Empty>No customers yet. <Link href="/customers/new" className="link">Add your first one</Link>.</Empty>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th className="text-right">Orders</th>
                <th className="text-right">Total spent</th>
                <th className="text-right">Owes</th>
                <th>Last order</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, active, spent, owes, last, tag }, rank) => {
                return (
                  <tr key={c.id}>
                    <td>
                      {best && <span className="text-muted tabular-nums mr-2">{rank + 1}.</span>}
                      <Link href={`/customers/${c.id}`} className="link font-medium">{c.name}</Link>
                      {c.issues.length > 0 && <span className="ml-2"><Pill tone="red">issue</Pill></span>}
                      {best && tag === "reliable" && <span className="ml-2"><Pill tone="green">reliable</Pill></span>}
                      {best && tag === "slow" && <span className="ml-2"><Pill tone="amber">slow payer</Pill></span>}
                      {isDuplicate(c.phone) && <Link href={`/customers/${c.id}/edit`} className="ml-2"><Pill tone="amber">duplicate?</Pill></Link>}
                    </td>
                    <td className="whitespace-nowrap">{c.phone ?? "—"}</td>
                    <td className="text-right tabular-nums">{active.length}</td>
                    <td className="text-right tabular-nums">{money(spent)}</td>
                    <td className={`text-right tabular-nums ${owes > 0 ? "text-red-700 font-medium" : "text-muted"}`}>{owes > 0 ? money(owes) : "—"}</td>
                    <td className="whitespace-nowrap">{fmtDate(last)}</td>
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
