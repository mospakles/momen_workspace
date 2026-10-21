import Link from "next/link";
import { db } from "@/lib/db";
import { fmtDate, money, normalizePhone } from "@/lib/format";
import { orderTotals } from "@/lib/orders";
import { Empty, PageHeader, Pill } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const customers = await db.customer.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : undefined,
    include: { orders: { include: { payments: true, costs: true } }, issues: { where: { resolved: false } } },
    orderBy: { name: "asc" },
  });

  const phoneCounts = customers.reduce<Record<string, number>>((acc, c) => {
    const p = normalizePhone(c.phone);
    if (p) acc[p] = (acc[p] ?? 0) + 1;
    return acc;
  }, {});
  const isDuplicate = (phone: string | null) => (phoneCounts[normalizePhone(phone) ?? ""] ?? 0) > 1;

  return (
    <div>
      <PageHeader title="Customers" subtitle={`${customers.length} customer${customers.length === 1 ? "" : "s"}`} actions={<Link href="/customers/new" className="btn-primary">+ New customer</Link>} />
      <form className="mb-4">
        <input name="q" defaultValue={q} placeholder="Search by name, phone or email…" className="input max-w-md" />
      </form>
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
              {customers.map((c) => {
                const active = c.orders.filter((o) => o.status !== "CANCELLED");
                const spent = active.reduce((s, o) => s + orderTotals(o).paid, 0);
                const owes = active.reduce((s, o) => s + Math.max(0, orderTotals(o).balance), 0);
                const last = c.orders.reduce<Date | null>((d, o) => (!d || o.orderDate > d ? o.orderDate : d), null);
                return (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/customers/${c.id}`} className="link font-medium">{c.name}</Link>
                      {c.issues.length > 0 && <span className="ml-2"><Pill tone="red">issue</Pill></span>}
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
